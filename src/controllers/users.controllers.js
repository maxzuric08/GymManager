const pool = require("../db");


const getUsers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT user_id,
                   branch_id,
                   plan_id,
                   username,
                   dni,
                   first_name,
                   last_name,
                   email,
                   phone,
                   user_status,
                   birth_date,
                   registration_date,
                   plan_expiration_date
            FROM users
            ORDER BY user_id ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
};

const createUser =  async (req, res) => {
    try {
        const {
            branch_id,
            plan_id,
            username,
            password,
            dni,
            first_name,
            last_name,
            email,
            phone,
            birth_date
        } = req.body;

        // Validar que el DNI solo contenga números
        if (!/^\d+$/.test(dni)) {
        return res.status(400).json({ error: "El DNI debe contener únicamente números" });
        }
        
        // Validar Nombre y Apellido (Solo letras y espacios)
        if (first_name && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(first_name)) {
            return res.status(400).json({ error: "El nombre solo puede contener letras." });
        }
        if (last_name && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(last_name)) {
            return res.status(400).json({ error: "El apellido solo puede contener letras." });
        }
        
        // Validar Teléfono (Solo números, guiones y espacios)
        if (phone && !/^[\d\s\-]+$/.test(phone)) {
            return res.status(400).json({ error: "El teléfono solo admite números, guiones y espacios." });
        }
        
        // Validar Formato de Email (Exige @ y termina en .com)
        if (!email || !/^[^\s@]+@[^\s@]+\.com$/.test(email)) {
            return res.status(400).json({ error: "El email es obligatorio, debe contener un @ y terminar en .com" });
        }
        
        // Validar que la fecha de nacimiento no sea en el futuro
        if (birth_date) {
            const today = new Date().toISOString().split("T")[0];
            if (birth_date > today) {
                return res.status(400).json({ error: "La fecha de nacimiento no puede ser en el futuro." });
            }
        }

        const result = await pool.query(
            `INSERT INTO users
            (branch_id, plan_id, username, password, dni, first_name, last_name, email, phone, birth_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING user_id,
                      branch_id,
                      plan_id,
                      username,
                      dni,
                      first_name,
                      last_name,
                      email,
                      phone,
                      user_status,
                      birth_date,
                      registration_date,
                      plan_expiration_date`,
            [branch_id, plan_id, username, password, dni, first_name, last_name, email, phone, birth_date]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear usuario" });
    }
};

const updateUser =  async (req, res) => {
    try {
        const { id } = req.params;
        const {
            branch_id,
            plan_id,
            username,
            password,
            dni,
            first_name,
            last_name,
            email,
            phone,
            birth_date,
            user_status
        } = req.body;

        // Validar que el DNI solo contenga números
        if (!/^\d+$/.test(dni)) {
            return res.status(400).json({ error: "El DNI debe contener únicamente números" });
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
                 user_status = $11
             WHERE user_id = $12
             RETURNING user_id,
                      branch_id,
                      plan_id,
                      username,
                      dni,
                      first_name,
                      last_name,
                      email,
                      phone,
                      user_status,
                      birth_date,
                      registration_date,
                      plan_expiration_date`,
            [branch_id, plan_id, username, password || null, dni, first_name, last_name, email, phone, birth_date, user_status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "UPDATE users SET user_status = 'inactive' WHERE user_id = $1 RETURNING user_id, username, email, user_status",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({ message: "Usuario desactivado", user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al desactivar usuario" });
    }
};

const deactivateMyAccount = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Usuario no autenticado" });
        }

        const result = await pool.query(
            "UPDATE users SET user_status = 'inactive' WHERE user_id = $1 RETURNING user_id, username, email, user_status",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({
            message: "Tu cuenta ha sido desactivada correctamente",
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al desactivar tu cuenta" });
    }
};

const reactivateMyAccount = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Usuario no autenticado" });
        }

        const result = await pool.query(
            "UPDATE users SET user_status = 'active' WHERE user_id = $1 RETURNING user_id, username, email, user_status",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({
            message: "Tu cuenta ha sido reactivada correctamente",
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al reactivar tu cuenta" });
    }
};

const reactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "UPDATE users SET user_status = 'active' WHERE user_id = $1 RETURNING user_id, username, email, user_status",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({
            message: "Usuario reactivado correctamente",
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al reactivar usuario" });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    deactivateMyAccount,
    reactivateMyAccount,
    reactivateUser
};
