const pool = require("../db");

const getInstructors = async(req, res) => {
    try {
        const result = await pool.query("SELECT * FROM instructors ORDER BY instructor_id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener instructores" });
    }
};



const createInstructor = async (req, res) => {
    try {
        const { username, password, specialty, email, phone } = req.body;

        const result = await pool.query(
            `INSERT INTO instructors (username, password, specialty, email, phone)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING *`,
            [username, password, specialty, email, phone]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear instructor" });
    }
};

const updateInstructor = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, specialty, email, phone } = req.body;

        const result = await pool.query(
            `UPDATE instructors
             SET username = $1,
                 specialty = $2,
                 email = $3,
                 phone = $4
             WHERE instructor_id = $5
             RETURNING *`,
            [username, specialty, email, phone, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Instructor no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar instructor" });
    }
};


const deleteInstructor = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM instructors WHERE instructor_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Instructor no encontrado" });
        }

        res.json({ message: "Instructor eliminado", instructor: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar instructor" });
    }
};

module.exports = {
    getInstructors,
    createInstructor,
    updateInstructor,
    deleteInstructor
};