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
        const { 
            username, password, specialty, email, phone, 
            first_name, last_name, dni, birth_date, branch_id, 
            available_from, available_to 
        } = req.body;

        // 🛡️ VALIDACIONES DEFENSIVAS
        if (dni && !/^\d+$/.test(dni)) return res.status(400).json({ error: "El DNI debe contener únicamente números" });
        if (first_name && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(first_name)) return res.status(400).json({ error: "El nombre solo puede contener letras." });
        if (last_name && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(last_name)) return res.status(400).json({ error: "El apellido solo puede contener letras." });
        if (phone && !/^[\d\s\-]+$/.test(phone)) return res.status(400).json({ error: "El teléfono solo admite números, guiones y espacios." });
        if (!email || !/^[^\s@]+@[^\s@]+\.com$/.test(email)) return res.status(400).json({ error: "El email es obligatorio, debe contener un @ y terminar en .com" });
        if (available_from && available_to) {
            if (available_from >= available_to) {
                return res.status(400).json({ error: "La hora de fin de disponibilidad debe ser mayor a la hora de inicio." });
            }
        }

        const result = await pool.query(
            `INSERT INTO instructors 
            (username, password, specialty, email, phone, first_name, last_name, dni, birth_date, branch_id, available_from, available_to)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING *`,
            [
                username, password, specialty, email, phone, 
                first_name, last_name, dni || null, 
                birth_date || null, branch_id || null, 
                available_from || null, available_to || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        // Trampa de Duplicados
        if (error.code === '23505') return res.status(400).json({ error: "El DNI o Usuario ya están registrados." });
        console.error(error);
        res.status(500).json({ error: "Error al crear instructor" });
    }
};

const updateInstructor = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            username, specialty, email, phone, 
            first_name, last_name, dni, birth_date, branch_id, 
            available_from, available_to 
        } = req.body;

        // 🛡️ VALIDACIONES DEFENSIVAS
        if (dni && !/^\d+$/.test(dni)) return res.status(400).json({ error: "El DNI debe contener únicamente números" });
        if (first_name && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(first_name)) return res.status(400).json({ error: "El nombre solo puede contener letras." });
        if (last_name && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(last_name)) return res.status(400).json({ error: "El apellido solo puede contener letras." });
        if (phone && !/^[\d\s\-]+$/.test(phone)) return res.status(400).json({ error: "El teléfono solo admite números, guiones y espacios." });
        if (!email || !/^[^\s@]+@[^\s@]+\.com$/.test(email)) return res.status(400).json({ error: "El email es obligatorio, debe contener un @ y terminar en .com" });

        const result = await pool.query(
            `UPDATE instructors
             SET username = $1, specialty = $2, email = $3, phone = $4, 
                 first_name = $5, last_name = $6, dni = $7, birth_date = $8, 
                 branch_id = $9, available_from = $10, available_to = $11
             WHERE instructor_id = $12
             RETURNING *`,
            [
                username, specialty, email, phone, 
                first_name, last_name, dni || null, 
                birth_date || null, branch_id || null, 
                available_from || null, available_to || null, 
                id
            ]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Instructor no encontrado" });
        
        res.json(result.rows[0]);
    } catch (error) {
        // Trampa de Duplicados
        if (error.code === '23505') return res.status(400).json({ error: "El DNI o Usuario ya están registrados." });
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

        if (result.rows.length === 0) return res.status(404).json({ error: "Instructor no encontrado" });
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