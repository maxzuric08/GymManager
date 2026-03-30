const express = require("express");
const pool = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

// Ruta de prueba
app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({
            message: "GymManager backend funcionando",
            serverTime: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
});

// LOGIN / LOGOUT
app.post("/login", async (req, res) => {
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

        res.json({
            message: "Login exitoso",
            role,
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en login" });
    }
});

app.post("/logout", (req, res) => {
    res.json({ message: "Logout exitoso" });
});

// ABM USUARIOS
app.get("/users", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users ORDER BY user_id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

app.post("/users", async (req, res) => {
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
});

app.put("/users/:id", async (req, res) => {
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
});

app.delete("/users/:id", async (req, res) => {
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
});

// ABM INSTRUCTORES

app.get("/instructors", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM instructors ORDER BY instructor_id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener instructores" });
    }
});

app.post("/instructors", async (req, res) => {
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
});

app.put("/instructors/:id", async (req, res) => {
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
});

app.delete("/instructors/:id", async (req, res) => {
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
});

// ABM PLANS (MEMBRESÍAS)

app.get("/plans", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM plans ORDER BY plan_id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener planes" });
    }
});

app.post("/plans", async (req, res) => {
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
});

app.put("/plans/:id", async (req, res) => {
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
});

app.delete("/plans/:id", async (req, res) => {
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
});

// =====================================
// SELECCIONAR MEMBRESÍA PARA USUARIO
// =====================================
app.put("/users/:id/plan", async (req, res) => {
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
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});