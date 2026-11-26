const pool = require("../db");
const jwt = require("jsonwebtoken");
const { hashPassword, verifyPassword } = require("../utils/password");

const ROLE_TABLES = {
    admin: { table: "administrators", id: "admin_id" },
    instructor: { table: "instructors", id: "instructor_id" },
    user: { table: "users", id: "user_id" },
};

const login = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const roleTable = Object.hasOwn(ROLE_TABLES, role) ? ROLE_TABLES[role] : null;
        if (!roleTable) {
            return res.status(400).json({ error: "Rol inválido" });
        }

        const result = await pool.query(
            `SELECT * FROM ${roleTable.table} WHERE username = $1`,
            [username]
        );

        const found = result.rows[0];
        const { valid, needsRehash } = found
            ? await verifyPassword(password, found.password)
            : { valid: false, needsRehash: false };

        if (!valid) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        // Contraseña legacy en texto plano: se convierte a hash en el primer login exitoso.
        if (needsRehash) {
            await pool.query(
                `UPDATE ${roleTable.table} SET password = $1 WHERE ${roleTable.id} = $2`,
                [await hashPassword(password), found[roleTable.id]]
            );
        }

        const user = result.rows[0];

        // Verificar que el usuario no esté inactivo
        if (role === "user" && user.user_status === "inactive") {
            return res.status(403).json({ error: "Tu cuenta ha sido desactivada. Contacta al administrador." });
        }

        if (role === "instructor" && user.status === "inactive") {
            return res.status(403).json({ error: "Tu cuenta ha sido desactivada. Contacta al administrador." });
        }

        delete user.password;

        const token = jwt.sign(
            {
                id:
                    user.admin_id ||
                    user.instructor_id ||
                    user.user_id,
                username: user.username,
                role: role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login exitoso",
            token,
            role,
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en login" });
    }
};

const logout = (req, res) => {
    res.json({ message: "Logout exitoso" });
};

module.exports = {
    login,
    logout
};