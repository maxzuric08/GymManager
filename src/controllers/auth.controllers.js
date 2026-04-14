const pool = require("../db");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        let query = "";

        if (role === "admin") {
            query = "SELECT * FROM administrators WHERE username = $1 AND password = $2";
        } else if (role === "instructor") {
            query = "SELECT * FROM instructors WHERE username = $1 AND password = $2";
        } else if (role === "user") {
            query = "SELECT * FROM users WHERE username = $1 AND password = $2";
        } else {
            return res.status(400).json({ error: "Rol inválido" });
        }

        const result = await pool.query(query, [username, password]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        const user = result.rows[0];

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