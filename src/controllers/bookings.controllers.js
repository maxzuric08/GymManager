const pool = require("../db");

const getUserBookings = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error("Error: req.user is missing or has no id. req.user:", req.user);
            return res.status(401).json({ error: "Usuario no autenticado" });
        }

        const userId = req.user.id;
        const query = `
            SELECT b.booking_id, b.status as booking_status, c.class_id, c.class_name, c.class_date, c.start_time, c.end_time,
                   i.first_name as instructor_first_name, i.last_name as instructor_last_name
            FROM bookings b
            JOIN classes c ON b.class_id = c.class_id
            JOIN instructors i ON c.instructor_id = i.instructor_id
            WHERE b.user_id = $1 AND b.status = 'confirmed'
            ORDER BY c.class_date ASC, c.start_time ASC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las reservas." });
    }
};

const createBooking = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error("Error: req.user is missing or has no id. req.user:", req.user);
            return res.status(401).json({ error: "Usuario no autenticado" });
        }

        const userId = req.user.id;
        const { class_id } = req.body;

        if (!class_id) {
            return res.status(400).json({ error: "Debes especificar una clase." });
        }

        // 1. Validar que el usuario tenga una membresía activa
        const userQuery = await pool.query("SELECT plan_id FROM users WHERE user_id = $1", [userId]);

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        if (!userQuery.rows[0].plan_id) {
            return res.status(400).json({ error: "Debes tener un plan activo para poder reservar clases." });
        }

        // 2. Validar que la clase exista
        const classQuery = await pool.query("SELECT * FROM classes WHERE class_id = $1", [class_id]);
        if (classQuery.rows.length === 0) {
            return res.status(404).json({ error: "Clase no encontrada." });
        }

        // 3. Validar que no esté reservado ya
        const bookingExists = await pool.query(
            "SELECT * FROM bookings WHERE user_id = $1 AND class_id = $2 AND status = 'confirmed'",
            [userId, class_id]
        );
        if (bookingExists.rows.length > 0) {
            return res.status(400).json({ error: "Ya tenés una reserva confirmada para esta clase." });
        }

        // 4. Crear la reserva
        const result = await pool.query(
            "INSERT INTO bookings (user_id, class_id, status) VALUES ($1, $2, 'confirmed') RETURNING *",
            [userId, class_id]
        );
        res.status(201).json({
            message: "Reserva confirmada con éxito.",
            booking: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la reserva." });
    }
};

const cancelBooking = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error("Error: req.user is missing or has no id. req.user:", req.user);
            return res.status(401).json({ error: "Usuario no autenticado" });
        }

        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que la reserva pertenezca al usuario autenticado
        const bookingQuery = await pool.query(
            "SELECT * FROM bookings WHERE booking_id = $1",
            [id]
        );

        if (bookingQuery.rows.length === 0) {
            return res.status(404).json({ error: "Reserva no encontrada." });
        }

        if (bookingQuery.rows[0].user_id !== userId) {
            return res.status(403).json({ error: "No tienes permiso para cancelar esta reserva." });
        }

        const result = await pool.query(
            "UPDATE bookings SET status = 'cancelled' WHERE booking_id = $1 RETURNING *",
            [id]
        );

        res.json({ message: "Reserva cancelada con éxito.", booking: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al cancelar la reserva." });
    }
};

const getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;

        if (!classId) {
            return res.status(400).json({ error: "ID de clase requerido" });
        }

        const result = await pool.query(
            `SELECT u.user_id, u.first_name, u.last_name, u.username, u.dni, b.booking_id, b.status
             FROM bookings b
             JOIN users u ON b.user_id = u.user_id
             WHERE b.class_id = $1 AND b.status = 'confirmed'
             ORDER BY u.first_name ASC`,
            [classId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener estudiantes de la clase." });
    }
};

module.exports = { getUserBookings, createBooking, cancelBooking, getClassStudents };