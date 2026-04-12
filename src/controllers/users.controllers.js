const pool = require("../db");


const getUsers = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users ORDER BY user_id ASC");
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

        const result = await pool.query(
            `INSERT INTO users
            (branch_id, plan_id, username, password, dni, first_name, last_name, email, phone, birth_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *`,
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
            dni,
            first_name,
            last_name,
            email,
            phone,
            birth_date,
            user_status
        } = req.body;

        const result = await pool.query(
            `UPDATE users
             SET branch_id = $1,
                 plan_id = $2,
                 username = $3,
                 dni = $4,
                 first_name = $5,
                 last_name = $6,
                 email = $7,
                 phone = $8,
                 birth_date = $9,
                 user_status = $10
             WHERE user_id = $11
             RETURNING *`,
            [branch_id, plan_id, username, dni, first_name, last_name, email, phone, birth_date, user_status, id]
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
            "DELETE FROM users WHERE user_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({ message: "Usuario eliminado", user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};