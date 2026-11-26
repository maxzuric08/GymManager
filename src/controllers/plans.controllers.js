const pool = require("../db");
const {
  assignMembership,
  getActivePlan,
  notifyMembershipConfirmation,
} = require("../services/membership.service");
const { validatePlanInput } = require("../services/planRules");

const DUPLICATE_NAME_ERROR = "Ya existe un plan activo con ese nombre";

// Dos planes activos no pueden compartir nombre (sin distinguir mayúsculas).
async function findActivePlanNameConflict(planType, excludePlanId = null, db = pool) {
    const result = await db.query(
        `SELECT plan_id FROM plans
          WHERE status = 'active'
            AND LOWER(BTRIM(plan_type)) = LOWER(BTRIM($1))
            AND ($2::integer IS NULL OR plan_id <> $2)
          LIMIT 1`,
        [planType, excludePlanId]
    );
    return result.rows[0] || null;
}

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
        const { error, field, values } = validatePlanInput(req.body);
        if (error) return res.status(400).json({ error, field });

        if (values.status === "active" && await findActivePlanNameConflict(values.plan_type)) {
            return res.status(409).json({ error: DUPLICATE_NAME_ERROR, field: "plan_type" });
        }

        const result = await pool.query(
            `INSERT INTO plans (plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [
                values.plan_type,
                values.cost,
                values.duration,
                values.benefits,
                values.class_limit,
                values.status,
                values.duration_value,
                values.duration_unit
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
        const { error, field, values } = validatePlanInput(req.body, { partialStatus: true });
        if (error) return res.status(400).json({ error, field });

        const existing = await pool.query("SELECT plan_id, status FROM plans WHERE plan_id = $1", [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: "Plan no encontrado" });
        }

        if (existing.rows[0].status === "active" && await findActivePlanNameConflict(values.plan_type, Number(id))) {
            return res.status(409).json({ error: DUPLICATE_NAME_ERROR, field: "plan_type" });
        }

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
                values.plan_type,
                values.cost,
                values.duration,
                values.benefits,
                values.class_limit,
                values.duration_value,
                values.duration_unit,
                id
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar plan" });
    }
};

const updateUserPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: "Debes seleccionar un plan" });
    }

    await client.query("BEGIN");
    const plan = await getActivePlan(client, plan_id);
    if (!plan) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Plan no encontrado o inactivo" });
    }

    const membership = await assignMembership(client, { userId: id, plan });
    if (!membership.user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    await client.query("COMMIT");

    await notifyMembershipConfirmation({
      user: membership.user,
      plan,
      startDate: membership.startDate,
    });

    res.json({
      message: "Membresía asignada correctamente",
      user: membership.user,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(error);
    res.status(500).json({ error: "Error al asignar membresía" });
  } finally {
    client.release();
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

    const existing = await pool.query("SELECT plan_id, plan_type FROM plans WHERE plan_id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Plan no encontrado" });
    }

    if (await findActivePlanNameConflict(existing.rows[0].plan_type, Number(id))) {
      return res.status(409).json({ error: `${DUPLICATE_NAME_ERROR}. Renombrá uno de los dos antes de reactivar.` });
    }

    const result = await pool.query(
      "UPDATE plans SET status = 'active' WHERE plan_id = $1 RETURNING *",
      [id]
    );

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
