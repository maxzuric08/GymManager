const pool = require("../db");

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
        const { plan_type, cost, duration, benefits, class_limit, status } = req.body;

        const result = await pool.query(
            `INSERT INTO plans (plan_type, cost, duration, benefits, class_limit, status)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING *`,
            [plan_type, cost, duration, benefits, class_limit, status || "active"]
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
        const { plan_type, cost, duration, benefits, class_limit, status } = req.body;

        const result = await pool.query(
            `UPDATE plans
             SET plan_type = $1,
                 cost = $2,
                 duration = $3,
                 benefits = $4,
                 class_limit = $5,
                 status = $6
             WHERE plan_id = $7
             RETURNING *`,
            [plan_type, cost, duration, benefits, class_limit, status, id]
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



const updateUserPlan =  async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_id } = req.body;

        const result = await pool.query(
            "UPDATE users SET plan_id = $1 WHERE user_id = $2 RETURNING *",
            [plan_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({
            message: "Membresía asignada correctamente",
            user: result.rows[0]
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
