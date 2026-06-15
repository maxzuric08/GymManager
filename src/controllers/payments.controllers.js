const pool = require("../db");
const mercadoPago = require("../services/mercadoPago.service");

const calculateExpirationDate = (plan, fromDate = new Date()) => {
  const expiration = new Date(fromDate);
  const value = Number.parseInt(plan.duration_value, 10) || 1;
  const unit = String(plan.duration_unit || "months").toLowerCase();

  if (unit === "days") expiration.setUTCDate(expiration.getUTCDate() + value);
  else if (unit === "weeks") expiration.setUTCDate(expiration.getUTCDate() + value * 7);
  else expiration.setUTCMonth(expiration.getUTCMonth() + value);

  return expiration.toISOString().slice(0, 10);
};

const getMyPayments = async (req, res) => {
  try {
    const [membershipResult, paymentsResult] = await Promise.all([
      pool.query(
        `SELECT u.plan_id, u.plan_expiration_date, p.plan_type
           FROM users u
           LEFT JOIN plans p ON p.plan_id = u.plan_id
          WHERE u.user_id = $1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT pay.payment_id, pay.plan_id, p.plan_type, pay.amount, pay.payment_date,
                pay.payment_status, pay.status_detail, pay.payment_method, pay.currency,
                pay.approved_at, pay.expiry_date
           FROM payments pay
           LEFT JOIN plans p ON p.plan_id = pay.plan_id
          WHERE pay.user_id = $1 AND pay.external_reference IS NOT NULL
          ORDER BY pay.payment_date DESC
          LIMIT 20`,
        [req.user.id]
      ),
    ]);

    res.json({ membership: membershipResult.rows[0] || null, payments: paymentsResult.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los pagos" });
  }
};

const createCheckout = async (req, res) => {
  const client = await pool.connect();
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: "Debes seleccionar un plan" });
    if (
      !process.env.MP_ACCESS_TOKEN
      || !process.env.MP_WEBHOOK_SECRET
      || !process.env.FRONTEND_URL
      || !process.env.BACKEND_PUBLIC_URL
    ) {
      return res.status(503).json({ error: "Falta configurar Mercado Pago en el archivo .env" });
    }

    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [7412, req.user.id]);

    const userResult = await client.query(
      `SELECT user_id,
              plan_id,
              plan_expiration_date,
              (plan_expiration_date - CURRENT_DATE)::int AS days_until_expiration,
              (plan_expiration_date - INTERVAL '5 days')::date AS renewal_available_from
         FROM users
        WHERE user_id = $1 AND user_status = 'active'`,
      [req.user.id]
    );
    const planResult = await client.query(
      "SELECT * FROM plans WHERE plan_id = $1 AND status = 'active'",
      [planId]
    );

    if (!userResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    if (!planResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Plan no encontrado o inactivo" });
    }

    const user = userResult.rows[0];
    if (
      user.plan_id
      && user.plan_expiration_date
      && Number(user.days_until_expiration) > 5
    ) {
      await client.query("ROLLBACK");
      const availableFrom = user.renewal_available_from.toISOString().slice(0, 10);
      return res.status(409).json({
        error: `Todavia tenes una membresia activa. Podras renovar o cambiar de plan desde el ${availableFrom}.`,
        renewal_available_from: availableFrom,
      });
    }

    const plan = planResult.rows[0];
    const existingPending = await client.query(
      `SELECT payment_id, checkout_url
         FROM payments
        WHERE user_id = $1
          AND plan_id = $2
          AND payment_status = 'pending'
          AND checkout_url IS NOT NULL
        ORDER BY payment_date DESC
        LIMIT 1`,
      [req.user.id, plan.plan_id]
    );

    if (existingPending.rows[0]) {
      await client.query("COMMIT");
      return res.status(200).json({
        message: "Ya existe un pago pendiente para este plan",
        checkoutUrl: existingPending.rows[0].checkout_url,
        reused: true,
      });
    }

    await client.query(
      `UPDATE payments
          SET payment_status = 'cancelled',
              status_detail = 'Reemplazado por un nuevo intento de pago'
        WHERE user_id = $1
          AND payment_status = 'pending'
          AND checkout_url IS NULL`,
      [req.user.id]
    );

    const inserted = await client.query(
      `INSERT INTO payments (user_id, plan_id, amount, payment_status, payment_method, currency)
       VALUES ($1, $2, $3, 'pending', 'mercadopago', 'ARS')
       RETURNING payment_id`,
      [req.user.id, plan.plan_id, plan.cost]
    );
    const localPaymentId = inserted.rows[0].payment_id;
    const externalReference = `gym-payment-${localPaymentId}`;

    const preference = await mercadoPago.createPreference(
      {
        items: [{
          id: String(plan.plan_id),
          title: `GymManager - Plan ${plan.plan_type}`,
          description: plan.benefits || `Membresia ${plan.plan_type}`,
          quantity: 1,
          unit_price: Number(plan.cost),
          currency_id: "ARS",
        }],
        external_reference: externalReference,
        back_urls: {
          success: `${process.env.BACKEND_PUBLIC_URL}/payments/return?result=success&ngrok-skip-browser-warning=true`,
          failure: `${process.env.BACKEND_PUBLIC_URL}/payments/return?result=failure&ngrok-skip-browser-warning=true`,
          pending: `${process.env.BACKEND_PUBLIC_URL}/payments/return?result=pending&ngrok-skip-browser-warning=true`,
        },
        notification_url: `${process.env.BACKEND_PUBLIC_URL}/payments/webhook`,
        auto_return: "approved",
      },
      externalReference
    );

    const checkoutUrl = preference.init_point;
    if (!preference.id || !checkoutUrl) {
      throw new Error("Mercado Pago no devolvio una preferencia valida");
    }

    await client.query(
      `UPDATE payments
          SET preference_id = $1, external_reference = $2, checkout_url = $3
        WHERE payment_id = $4`,
      [preference.id, externalReference, checkoutUrl, localPaymentId]
    );
    await client.query("COMMIT");

    res.status(201).json({
      message: "Pago creado",
      checkoutUrl,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error al crear checkout:", error);
    res.status(500).json({ error: error.message || "Error al iniciar el pago" });
  } finally {
    client.release();
  }
};

const processPayment = async (paymentId) => {
  const payment = await mercadoPago.getPayment(String(paymentId));
  if (!payment.external_reference?.startsWith("gym-payment-")) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const localResult = await client.query(
      `SELECT pay.*, p.duration_value, p.duration_unit, p.cost,
              u.plan_id AS current_plan_id,
              u.plan_expiration_date AS current_plan_expiration_date
         FROM payments pay
         JOIN plans p ON p.plan_id = pay.plan_id
         JOIN users u ON u.user_id = pay.user_id
        WHERE pay.external_reference = $1
        FOR UPDATE`,
      [payment.external_reference]
    );
    const localPayment = localResult.rows[0];
    if (!localPayment) {
      await client.query("ROLLBACK");
      return;
    }

    const expectedAmount = Number(localPayment.cost);
    const validAmount = Math.abs(Number(payment.transaction_amount) - expectedAmount) < 0.01;
    const validCurrency = payment.currency_id === "ARS";

    await client.query(
      `UPDATE payments
          SET mp_payment_id = $1, payment_status = $2, status_detail = $3,
              payment_method = $4, approved_at = $5
        WHERE payment_id = $6`,
      [String(payment.id), payment.status, payment.status_detail || null,
       payment.payment_method_id || "mercadopago", payment.date_approved || null,
       localPayment.payment_id]
    );

    if (payment.status === "approved" && !localPayment.processed_at) {
      if (!validAmount || !validCurrency) throw new Error("El monto o moneda del pago no coinciden");
      const approvedDate = payment.date_approved ? new Date(payment.date_approved) : new Date();
      let membershipStart = approvedDate;

      if (
        Number(localPayment.current_plan_id) === Number(localPayment.plan_id)
        && localPayment.current_plan_expiration_date
      ) {
        const currentExpirationValue = localPayment.current_plan_expiration_date;
        const currentExpirationDate = currentExpirationValue instanceof Date
          ? currentExpirationValue.toISOString().slice(0, 10)
          : String(currentExpirationValue).slice(0, 10);
        const currentExpiration = new Date(
          `${currentExpirationDate}T00:00:00Z`
        );
        if (currentExpiration > approvedDate) membershipStart = currentExpiration;
      }

      const expirationDate = calculateExpirationDate(localPayment, membershipStart);

      await client.query(
        "UPDATE users SET plan_id = $1, plan_expiration_date = $2 WHERE user_id = $3",
        [localPayment.plan_id, expirationDate, localPayment.user_id]
      );
      await client.query(
        "UPDATE payments SET expiry_date = $1, processed_at = CURRENT_TIMESTAMP WHERE payment_id = $2",
        [expirationDate, localPayment.payment_id]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const paymentReturn = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const paymentId = req.query.payment_id || req.query.collection_id;
  let result = req.query.result || req.query.status || "pending";

  if (paymentId) {
    try {
      await processPayment(paymentId);
      const remote = await mercadoPago.getPayment(String(paymentId));
      result = remote.status || result;
    } catch (error) {
      console.error("Error verificando pago de retorno:", error);
      result = "error";
    }
  }

  res.redirect(`${frontendUrl}/user?payment=${encodeURIComponent(result)}`);
};

const webhook = async (req, res) => {
  try {
    mercadoPago.validateWebhookSignature(req);
    const type = req.body?.type || req.query.type || req.body?.topic || req.query.topic;
    const dataId = req.body?.data?.id || req.query["data.id"] || req.query.id;
    if (!dataId) return res.sendStatus(200);
    if (type === "payment") await processPayment(dataId);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error procesando webhook de pago:", error);
    if (mercadoPago.isInvalidWebhookSignature(error)) {
      return res.status(401).json({ error: "Firma de webhook invalida" });
    }
    res.status(500).json({ error: "No se pudo procesar la notificacion" });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { user_id, status, date_from, date_to } = req.query;
    const conditions = ["pay.external_reference IS NOT NULL"];
    const params = [];
    let idx = 1;

    if (user_id) { conditions.push(`pay.user_id = $${idx++}`); params.push(user_id); }
    if (status)  { conditions.push(`pay.payment_status = $${idx++}`); params.push(status); }
    if (date_from) { conditions.push(`pay.payment_date::date >= $${idx++}`); params.push(date_from); }
    if (date_to)   { conditions.push(`pay.payment_date::date <= $${idx++}`); params.push(date_to); }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const [paymentsResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT pay.payment_id, pay.user_id, u.username, u.first_name, u.last_name,
                pay.plan_id, p.plan_type, pay.amount, pay.payment_date,
                pay.payment_status, pay.status_detail, pay.payment_method, pay.currency,
                pay.approved_at, pay.expiry_date
           FROM payments pay
           LEFT JOIN users u ON u.user_id = pay.user_id
           LEFT JOIN plans p ON p.plan_id = pay.plan_id
           ${where}
           ORDER BY pay.payment_date DESC
           LIMIT 200`,
        params
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE pay.external_reference IS NOT NULL)::int AS total,
           COALESCE(SUM(pay.amount) FILTER (WHERE pay.payment_status = 'approved'), 0)::numeric AS total_approved_amount,
           COUNT(*) FILTER (WHERE pay.payment_status = 'approved')::int AS approved,
           COUNT(*) FILTER (WHERE pay.payment_status = 'pending')::int AS pending,
           COUNT(*) FILTER (WHERE pay.payment_status = 'rejected')::int AS rejected,
           COUNT(*) FILTER (WHERE pay.payment_status = 'cancelled')::int AS cancelled,
           COUNT(*) FILTER (WHERE pay.payment_status = 'error')::int AS errors
           FROM payments pay
           LEFT JOIN users u ON u.user_id = pay.user_id
           LEFT JOIN plans p ON p.plan_id = pay.plan_id
           ${where}`,
        params
      ),
    ]);

    res.json({ payments: paymentsResult.rows, stats: statsResult.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los pagos" });
  }
};

module.exports = { createCheckout, getMyPayments, paymentReturn, webhook, getAllPayments };
