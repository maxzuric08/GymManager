const pool = require("../db");

const getUserBookings = async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT b.booking_id, b.status as booking_status, c.class_id, c.class_name, c.class_date, c.start_time, c.end_time, i.first_name, i.last_name
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
        const { user_id, class_id } = req.body;

        // 1. Validar que el usuario tenga una membresía activa
        const userQuery = await pool.query("SELECT plan_id FROM users WHERE user_id = $1", [user_id]);
        if (!userQuery.rows[0].plan_id) {
            return res.status(400).json({ error: "Debes tener un plan activo para poder reservar clases." });
        }

        // 2. Validar que no esté reservado ya
        const bookingExists = await pool.query(
            "SELECT * FROM bookings WHERE user_id = $1 AND class_id = $2 AND status = 'confirmed'", 
            [user_id, class_id]
        );
        if (bookingExists.rows.length > 0) {
            return res.status(400).json({ error: "Ya tenés una reserva confirmada para esta clase." });
        }

        // 3. Crear la reserva
        const result = await pool.query(
            "INSERT INTO bookings (user_id, class_id, status) VALUES ($1, $2, 'confirmed') RETURNING *",
            [user_id, class_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la reserva." });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE bookings SET status = 'cancelled' WHERE booking_id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Reserva no encontrada." });
        res.json({ message: "Reserva cancelada con éxito.", booking: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al cancelar la reserva." });
    }
};

module.exports = { getUserBookings, createBooking, cancelBooking };