const pool = require("../db");

const VALID_USER_STATUSES = new Set(["active", "inactive"]);

function validateUserData(data, { passwordRequired = false } = {}) {
  const {
    username, password, dni, first_name, last_name, email, phone,
    birth_date, user_status,
  } = data;

  if (!username || !username.trim()) return "El nombre de usuario es obligatorio";
  if (passwordRequired && (!password || !password.trim())) return "La contrasena es obligatoria";
  if (!dni || !/^\d+$/.test(dni)) return "El DNI debe contener unicamente numeros";
  if (first_name && !/^[\p{L}\s]+$/u.test(first_name)) return "El nombre solo puede contener letras";
  if (last_name && !/^[\p{L}\s]+$/u.test(last_name)) return "El apellido solo puede contener letras";
  if (phone && !/^[\d\s-]+$/.test(phone)) return "El telefono solo admite numeros, guiones y espacios";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Debes ingresar un email valido";
  if (birth_date && birth_date > new Date().toISOString().split("T")[0]) {
    return "La fecha de nacimiento no puede ser futura";
  }
  if (user_status && !VALID_USER_STATUSES.has(user_status)) return "Estado de usuario invalido";
  return null;
}

function calculateExpirationDate(durationValue, durationUnit) {
  const expirationDate = new Date();
  const value = Number.parseInt(durationValue, 10) || 1;

  if (durationUnit === "days") {
    expirationDate.setDate(expirationDate.getDate() + value);
  } else if (durationUnit === "weeks") {
    expirationDate.setDate(expirationDate.getDate() + (value * 7));
  } else {
    expirationDate.setMonth(expirationDate.getMonth() + value);
  }

  return expirationDate.toISOString().split("T")[0];
}

async function getActivePlan(planId) {
  if (!planId) return null;
  const result = await pool.query(
    `SELECT plan_id, duration_value, duration_unit
       FROM plans
      WHERE plan_id = $1 AND status = 'active'`,
    [planId]
  );
  return result.rows[0] || null;
}

async function branchExists(branchId) {
  if (!branchId) return true;
  const result = await pool.query("SELECT 1 FROM branches WHERE branch_id = $1", [branchId]);
  return Boolean(result.rows[0]);
}

function databaseErrorResponse(error, res, action) {
  if (error.code === "23505") {
    return res.status(400).json({ error: "El usuario o DNI ya esta registrado" });
  }
  if (error.code === "23503") {
    return res.status(400).json({ error: "La sucursal o el plan seleccionado no existe" });
  }
  console.error(error);
  return res.status(500).json({ error: `Error al ${action} usuario` });
}

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.branch_id, u.plan_id, p.plan_type, u.username, u.dni,
             u.first_name, u.last_name, u.email, u.phone, u.user_status,
             u.birth_date, u.registration_date, u.plan_expiration_date
        FROM users u
        LEFT JOIN plans p ON p.plan_id = u.plan_id
       ORDER BY u.user_id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      branch_id, plan_id, username, password, dni, first_name, last_name,
      email, phone, birth_date,
    } = req.body;

    const validationError = validateUserData(req.body, { passwordRequired: true });
    if (validationError) return res.status(400).json({ error: validationError });

    if (!(await branchExists(branch_id))) {
      return res.status(400).json({ error: "La sucursal seleccionada no existe" });
    }

    const plan = await getActivePlan(plan_id);
    if (plan_id && !plan) {
      return res.status(400).json({ error: "El plan seleccionado no existe o esta inactivo" });
    }
    const expirationDate = plan
      ? calculateExpirationDate(plan.duration_value, plan.duration_unit)
      : null;

    const result = await pool.query(
      `INSERT INTO users
        (branch_id, plan_id, username, password, dni, first_name, last_name,
         email, phone, birth_date, plan_expiration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING user_id, branch_id, plan_id, username, dni, first_name,
                 last_name, email, phone, user_status, birth_date,
                 registration_date, plan_expiration_date`,
      [branch_id || null, plan_id || null, username.trim(), password, dni,
       first_name, last_name, email, phone, birth_date || null, expirationDate]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return databaseErrorResponse(error, res, "crear");
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      branch_id, plan_id, username, password, dni, first_name, last_name,
      email, phone, birth_date,
    } = req.body;

    const validationError = validateUserData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const existingResult = await pool.query(
      "SELECT user_id, plan_id, plan_expiration_date FROM users WHERE user_id = $1",
      [id]
    );
    const existingUser = existingResult.rows[0];
    if (!existingUser) return res.status(404).json({ error: "Usuario no encontrado" });

    if (!(await branchExists(branch_id))) {
      return res.status(400).json({ error: "La sucursal seleccionada no existe" });
    }

    const normalizedPlanId = plan_id || null;
    const planChanged = Number(existingUser.plan_id || 0) !== Number(normalizedPlanId || 0);
    let expirationDate = existingUser.plan_expiration_date;

    if (!normalizedPlanId) {
      expirationDate = null;
    } else if (planChanged || !expirationDate) {
      const plan = await getActivePlan(normalizedPlanId);
      if (!plan) {
        return res.status(400).json({ error: "El plan seleccionado no existe o esta inactivo" });
      }
      expirationDate = calculateExpirationDate(plan.duration_value, plan.duration_unit);
    }

    const result = await pool.query(
      `UPDATE users
          SET branch_id = $1,
              plan_id = $2,
              username = $3,
              password = COALESCE(NULLIF($4, ''), password),
              dni = $5,
              first_name = $6,
              last_name = $7,
              email = $8,
              phone = $9,
              birth_date = $10,
              plan_expiration_date = $11
        WHERE user_id = $12
        RETURNING user_id, branch_id, plan_id, username, dni, first_name,
                  last_name, email, phone, user_status, birth_date,
                  registration_date, plan_expiration_date`,
      [branch_id || null, normalizedPlanId, username.trim(), password || null,
       dni, first_name, last_name, email, phone, birth_date || null,
       expirationDate, id]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    return databaseErrorResponse(error, res, "actualizar");
  }
};

async function deactivateUserAccount(client, userId) {
  const userResult = await client.query(
    `UPDATE users
        SET user_status = 'inactive'
      WHERE user_id = $1
      RETURNING user_id, username, email, user_status`,
    [userId]
  );

  if (!userResult.rows[0]) return null;

  const bookingsResult = await client.query(
    `UPDATE bookings b
        SET status = 'cancelled',
            cancellation_reason = 'Cuenta desactivada'
       FROM classes c
      WHERE b.class_id = c.class_id
        AND b.user_id = $1
        AND b.status = 'confirmed'
        AND (
            c.class_date > CURRENT_DATE OR
            (c.class_date = CURRENT_DATE AND c.start_time > LOCALTIME)
        )
      RETURNING b.booking_id`,
    [userId]
  );

  return {
    user: userResult.rows[0],
    cancelledBookings: bookingsResult.rowCount,
  };
}

const deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await deactivateUserAccount(client, req.params.id);
    if (!result) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    await client.query("COMMIT");
    return res.json({
      message: "Usuario desactivado",
      user: result.user,
      cancelledBookings: result.cancelledBookings,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Error al desactivar usuario" });
  } finally {
    client.release();
  }
};

const deactivateMyAccount = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await deactivateUserAccount(client, req.user.id);
    if (!result) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    await client.query("COMMIT");
    return res.json({
      message: "Tu cuenta ha sido desactivada correctamente",
      user: result.user,
      cancelledBookings: result.cancelledBookings,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Error al desactivar tu cuenta" });
  } finally {
    client.release();
  }
};

const reactivateMyAccount = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users
          SET user_status = 'active'
        WHERE user_id = $1
        RETURNING user_id, username, email, user_status`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json({
      message: "Tu cuenta ha sido reactivada correctamente",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al reactivar tu cuenta" });
  }
};

const reactivateUser = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users
          SET user_status = 'active'
        WHERE user_id = $1
        RETURNING user_id, username, email, user_status`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json({
      message: "Usuario reactivado correctamente",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al reactivar usuario" });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  deactivateMyAccount,
  reactivateMyAccount,
  reactivateUser,
};
