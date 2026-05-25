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
        const { plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit } = req.body;

        const result = await pool.query(
            `UPDATE plans
             SET plan_type = $1,
                 cost = $2,
                 duration = $3,
                 benefits = $4,
                 class_limit = $5,
                 status = $6,
                 duration_value = $7,
                 duration_unit = $8
             WHERE plan_id = $9
             RETURNING *`,
            [
                plan_type,
                cost,
                duration,
                benefits,
                class_limit,
                status,
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

const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM plans WHERE plan_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Plan no encontrado" });
        }

        res.json({ message: "Plan eliminado", plan: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar plan" });
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

module.exports = {
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    updateUserPlan
};
