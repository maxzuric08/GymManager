const pool = require("../db");

// Función para calcular fecha de vencimiento basada en duration_value y duration_unit
const calculateExpirationDate = (durationValue, durationUnit) => {
  const today = new Date();
  const expirationDate = new Date(today);

  const value = parseInt(durationValue) || 1;
  const unit = (durationUnit || 'months').toLowerCase();

  switch (unit) {
    case 'days':
    case 'día':
    case 'días':
      expirationDate.setDate(expirationDate.getDate() + value);
      break;
    case 'weeks':
    case 'semana':
    case 'semanas':
      expirationDate.setDate(expirationDate.getDate() + (value * 7));
      break;
    case 'months':
    case 'mes':
    case 'meses':
    default:
      expirationDate.setMonth(expirationDate.getMonth() + value);
      break;
  }

  return expirationDate.toISOString().split('T')[0];
};

const getPlans =  async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM plans ORDER BY plan_id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener planes" });
    }
};

const createPlan =  async (req, res) => {
    try {
        const { plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit } = req.body;

        const result = await pool.query(
            `INSERT INTO plans (plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [
                plan_type,
                cost,
                duration,
                benefits,
                class_limit,
                status || "active",
                duration_value || 1,
                duration_unit || "months"
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear plan" });
    }
};

const updatePlan =  async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_type, cost, duration, benefits, class_limit, duration_value, duration_unit } = req.body;

        const result = await pool.query(
            `UPDATE plans
             SET plan_type = $1,
                 cost = $2,
                 duration = $3,
                 benefits = $4,
                 class_limit = $5,
                 duration_value = $6,
                 duration_unit = $7
             WHERE plan_id = $8
             RETURNING *`,
            [
                plan_type,
                cost,
                duration,
                benefits,
                class_limit,
                duration_value || 1,
                duration_unit || "months",
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Plan no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar plan" });
    }
};

const updateUserPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: "Debes seleccionar un plan" });
    }

    const planExists = await pool.query(
      "SELECT * FROM plans WHERE plan_id = $1 AND status = 'active'",
      [plan_id]
    );

    if (planExists.rows.length === 0) {
      return res.status(404).json({ error: "Plan no encontrado o inactivo" });
    }

    // Calcular fecha de vencimiento basada en la duración del plan
    const plan = planExists.rows[0];
    const expirationDate = calculateExpirationDate(plan.duration_value, plan.duration_unit);

    const result = await pool.query(
      "UPDATE users SET plan_id = $1, plan_expiration_date = $2 WHERE user_id = $3 RETURNING *",
      [plan_id, expirationDate, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      message: "Membresía asignada correctamente",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al asignar membresía" });
  }
};

const deactivatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el plan existe
    const planExists = await pool.query(
      "SELECT * FROM plans WHERE plan_id = $1",
      [id]
    );

    if (planExists.rows.length === 0) {
      return res.status(404).json({ error: "Plan no encontrado" });
    }

    // Desactivar el plan (los usuarios existentes pueden seguir usando hasta que venza)
    const result = await pool.query(
      "UPDATE plans SET status = 'inactive' WHERE plan_id = $1 RETURNING *",
      [id]
    );

    // Contar cuántos usuarios todavía tienen este plan activo
    const usersWithPlan = await pool.query(
      `SELECT COUNT(*) as count FROM users
       WHERE plan_id = $1 AND user_status = 'active' AND plan_expiration_date >= CURRENT_DATE`,
      [id]
    );

    res.json({
      message: "Plan desactivado correctamente. Los usuarios existentes pueden seguir usando hasta que venza su membresía.",
      plan: result.rows[0],
      activeUsersCount: usersWithPlan.rows[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al desactivar el plan" });
  }
};

const removeMembership = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener info del usuario antes de remover
    const userQuery = await pool.query(
      "SELECT user_id, plan_id FROM users WHERE user_id = $1",
      [id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const result = await pool.query(
      "UPDATE users SET plan_id = NULL, plan_expiration_date = NULL WHERE user_id = $1 RETURNING user_id, username, plan_id, plan_expiration_date",
      [id]
    );

    res.json({
      message: "Membresía removida correctamente",
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al remover la membresía" });
  }
};

const reactivatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE plans SET status = 'active' WHERE plan_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plan no encontrado" });
    }

    res.json({
      message: "Plan reactivado correctamente",
      plan: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al reactivar plan" });
  }
};

module.exports = {
    getPlans,
    createPlan,
    updatePlan,
    updateUserPlan,
    deactivatePlan,
    removeMembership,
    reactivatePlan
};
