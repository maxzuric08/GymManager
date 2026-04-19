const pool = require("../db");

function validateClassDateTime(class_date, start_time, end_time) {
    if (!class_date) {
        return "Debes ingresar una fecha para la clase";
    }

    if (!start_time || !end_time) {
        return "Debes ingresar hora de inicio y término";
    }

    if (end_time <= start_time) {
        return "La hora de término debe ser mayor a la hora de inicio";
    }

    const now = new Date();

    const localNow = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    const todayStr = localNow.toISOString().split("T")[0];

    if (class_date < todayStr) {
        return "No se pueden crear o actualizar clases en fechas pasadas";
    }

    if (class_date === todayStr) {
        const currentTime =
            String(now.getHours()).padStart(2, "0") +
            ":" +
            String(now.getMinutes()).padStart(2, "0");

        if (start_time <= currentTime) {
            return "No se puede programar una clase hoy en una hora ya pasada";
        }
    }

    return null;
};

const getClasses =  async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM classes ORDER BY class_id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener clases" });
    }
};

const createClass = async (req, res) => {
    try {
        const {
            instructor_id,
            branch_id,
            class_name,
            capacity,
            start_time,
            end_time,
            class_date,
            status
        } = req.body;

        const validationError = validateClassDateTime(
            class_date,
            start_time,
            end_time
        );

        if (validationError) {
            return res.status(400).json({
                error: validationError
            });
        }

        const result = await pool.query(
            `INSERT INTO classes
            (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [
                instructor_id,
                branch_id,
                class_name,
                capacity,
                start_time,
                end_time,
                class_date,
                status || "scheduled"
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al crear la clase"
        });
    }
};

const updateClass = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            instructor_id,
            branch_id,
            class_name,
            capacity,
            start_time,
            end_time,
            class_date,
            status
        } = req.body;

        const validationError = validateClassDateTime(
            class_date,
            start_time,
            end_time
        );

        if (validationError) {
            return res.status(400).json({
                error: validationError
            });
        }

        const result = await pool.query(
            `UPDATE classes
             SET instructor_id = $1,
                 branch_id = $2,
                 class_name = $3,
                 capacity = $4,
                 start_time = $5,
                 end_time = $6,
                 class_date = $7,
                 status = $8
             WHERE class_id = $9
             RETURNING *`,
            [
                instructor_id,
                branch_id,
                class_name,
                capacity,
                start_time,
                end_time,
                class_date,
                status,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Clase no encontrada"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al actualizar la clase"
        });
    }
};

const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM classes WHERE class_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Clase no encontrada" });
        }

        res.json({ message: "Clase eliminada", class: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar la clase" });
    }
};

module.exports = {
    getClasses,
    createClass,
    updateClass,
    deleteClass
};