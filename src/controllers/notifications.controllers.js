const pool = require("../db");
const { sendMembershipExpirationEmail } = require("../services/emailService");
const { getArgentinaDate } = require("../utils/argentinaTime");

const MEMBERSHIP_EXPIRATION_NOTIFICATION = "membership_expiration";

const getTomorrowArgentinaDate = (now = new Date()) => {
  const [year, month, day] = getArgentinaDate(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
};

const getEligibleMemberships = async (db, expirationDate) => {
  const result = await db.query(
    `SELECT u.user_id, u.first_name, u.email, u.plan_expiration_date, p.plan_type
       FROM users u
       JOIN plans p ON u.plan_id = p.plan_id
      WHERE u.user_status = 'active'
        AND u.plan_id IS NOT NULL
        AND u.plan_expiration_date = $1
        AND u.email IS NOT NULL
        AND BTRIM(u.email) <> ''
      ORDER BY u.user_id ASC`,
    [expirationDate]
  );
  return result.rows;
};

const updateRun = async (db, runId, values) => {
  await db.query(
    `UPDATE membership_notification_runs
        SET status = $2, processed_count = $3, sent_count = $4, failed_count = $5,
            skipped_count = $6, error_message = $7, completed_at = CURRENT_TIMESTAMP
      WHERE notification_run_id = $1`,
    [runId, values.status, values.processed, values.sent, values.failed, values.skipped, values.error || null]
  );
};

const runMembershipExpirationNotifications = async ({
  db = pool,
  sendEmail = sendMembershipExpirationEmail,
  dryRun = false,
  trigger = "scheduled",
  now = new Date(),
} = {}) => {
  const expirationDate = getTomorrowArgentinaDate(now);
  let runId = null;
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    if (dryRun) {
      const users = await getEligibleMemberships(db, expirationDate);
      return { success: true, dryRun: true, expirationDate, candidates: users, processed, sent, failed, skipped };
    }

    const runResult = await db.query(
      `INSERT INTO membership_notification_runs
        (notification_type, target_expiration_date, trigger)
       VALUES ($1, $2, $3)
       RETURNING notification_run_id`,
      [MEMBERSHIP_EXPIRATION_NOTIFICATION, expirationDate, trigger]
    );
    runId = runResult.rows[0].notification_run_id;

    const users = await getEligibleMemberships(db, expirationDate);
    processed = users.length;

    for (const user of users) {
      const claimResult = await db.query(
        `INSERT INTO membership_notification_deliveries
          (notification_run_id, user_id, notification_type, expiration_date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, notification_type, expiration_date) DO NOTHING
         RETURNING membership_notification_delivery_id`,
        [runId, user.user_id, MEMBERSHIP_EXPIRATION_NOTIFICATION, user.plan_expiration_date]
      );

      if (claimResult.rows.length === 0) {
        skipped++;
        continue;
      }

      const deliveryId = claimResult.rows[0].membership_notification_delivery_id;
      let emailResult;
      try {
        emailResult = await sendEmail(user.email, user.first_name || user.user_id, user.plan_type, user.plan_expiration_date);
      } catch (error) {
        emailResult = { success: false, error: error.message };
      }

      if (emailResult.success) {
        sent++;
        await db.query(
          `UPDATE membership_notification_deliveries
              SET delivery_status = 'sent', completed_at = CURRENT_TIMESTAMP
            WHERE membership_notification_delivery_id = $1`,
          [deliveryId]
        );
      } else {
        failed++;
        await db.query(
          `UPDATE membership_notification_deliveries
              SET delivery_status = 'failed', error_message = $2, completed_at = CURRENT_TIMESTAMP
            WHERE membership_notification_delivery_id = $1`,
          [deliveryId, emailResult.error || "No se pudo enviar el email"]
        );
      }
    }

    await updateRun(db, runId, { status: "completed", processed, sent, failed, skipped });
    return { success: true, runId, expirationDate, processed, sent, failed, skipped };
  } catch (error) {
    console.error("❌ Error enviando notificaciones de membresía:", error);
    if (runId) {
      try {
        await updateRun(db, runId, { status: "failed", processed, sent, failed, skipped, error: error.message });
      } catch (updateError) {
        console.error("❌ Error registrando el fallo de la ejecución:", updateError);
      }
    }
    return { success: false, runId, expirationDate, processed, sent, failed, skipped, error: error.message };
  }
};

const sendMembershipExpirationNotifications = async (req, res) => {
  const result = await runMembershipExpirationNotifications({ trigger: "manual" });
  const message = result.success
    ? `Notificaciones procesadas: ${result.sent} enviadas, ${result.failed} fallidas, ${result.skipped} omitidas`
    : "Error al procesar las notificaciones de membresía";
  if (res) res.status(result.success ? 200 : 500).json({ message, ...result });
  return result;
};

const listMembershipExpirationNotificationRuns = async (req, res, db) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 && requestedLimit <= 100 ? requestedLimit : 20;

  try {
    const result = await db.query(
      `SELECT r.notification_run_id, r.notification_type, r.target_expiration_date, r.trigger,
              r.status, r.processed_count, r.sent_count, r.failed_count, r.skipped_count,
              r.error_message, r.started_at, r.completed_at,
              COALESCE(json_agg(json_build_object(
                'deliveryId', d.membership_notification_delivery_id, 'userId', d.user_id,
                'email', u.email, 'status', d.delivery_status, 'error', d.error_message,
                'createdAt', d.created_at, 'completedAt', d.completed_at
              ) ORDER BY d.created_at DESC) FILTER (WHERE d.delivery_status = 'failed'), '[]'::json) AS failures
         FROM membership_notification_runs r
         LEFT JOIN membership_notification_deliveries d ON d.notification_run_id = r.notification_run_id
         LEFT JOIN users u ON u.user_id = d.user_id
        WHERE r.notification_type = $1
        GROUP BY r.notification_run_id
        ORDER BY r.started_at DESC
        LIMIT $2`,
      [MEMBERSHIP_EXPIRATION_NOTIFICATION, limit]
    );
    return res.json({ runs: result.rows });
  } catch (error) {
    console.error("❌ Error obteniendo ejecuciones de notificaciones:", error);
    return res.status(500).json({ error: "Error al obtener las ejecuciones de notificaciones" });
  }
};

// Express invoca los handlers con (req, res, next): no debe aceptar un tercer
// parámetro opcional, porque recibiría `next` en lugar de la conexión.
const getMembershipExpirationNotificationRuns = (req, res) =>
  listMembershipExpirationNotificationRuns(req, res, pool);

module.exports = {
  MEMBERSHIP_EXPIRATION_NOTIFICATION,
  getTomorrowArgentinaDate,
  getEligibleMemberships,
  runMembershipExpirationNotifications,
  sendMembershipExpirationNotifications,
  getMembershipExpirationNotificationRuns,
  listMembershipExpirationNotificationRuns,
};
