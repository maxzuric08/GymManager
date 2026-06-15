const pool = require("../db");

const getUserBookings = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.booking_id,
                    b.status AS booking_status,
                    c.class_id,
                    c.class_name,
                    c.class_date,
                    c.start_time,
                    c.end_time,
                    i.first_name AS instructor_first_name,
                    i.last_name AS instructor_last_name
             FROM bookings b
             JOIN classes c ON b.class_id = c.class_id
             LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
             WHERE b.user_id = $1
               AND b.status = 'confirmed'
               AND (
                   c.class_date > CURRENT_DATE OR
                   (c.class_date = CURRENT_DATE AND c.start_time > LOCALTIME)
               )
             ORDER BY c.class_date ASC, c.start_time ASC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las reservas" });
    }
};

const createBooking = async (req, res) => {
    const client = await pool.connect();

    try {
        const { class_id } = req.body;

        if (!class_id) {
            return res.status(400).json({ error: "Debes especificar una clase" });
        }

        await client.query("BEGIN");

        const userResult = await client.query(
            `SELECT u.user_status,
                    u.plan_id,
                    u.plan_expiration_date,
                    p.status AS plan_status,
                    p.class_limit
             FROM users u
             LEFT JOIN plans p ON u.plan_id = p.plan_id
             WHERE u.user_id = $1
             FOR UPDATE OF u`,
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const user = userResult.rows[0];

        if (user.user_status !== "active") {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Tu cuenta no esta activa" });
        }

        if (!user.plan_id || !user.plan_expiration_date) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Necesitas una membresia vigente para reservar" });
        }

        const expirationDate = new Date(user.plan_expiration_date);
        expirationDate.setHours(23, 59, 59, 999);

        if (expirationDate < new Date()) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Tu membresia esta vencida" });
        }

        const certificateResult = await client.query(
            `SELECT status
             FROM medical_certificates
             WHERE user_id = $1
             ORDER BY uploaded_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (certificateResult.rows[0]?.status !== "approved") {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Necesitas tener el apto medico aprobado" });
        }

        const classResult = await client.query(
            `SELECT class_id, capacity, class_date, start_time, end_time, status
             FROM classes
             WHERE class_id = $1
             FOR UPDATE`,
            [class_id]
        );

        if (classResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Clase no encontrada" });
        }

        const gymClass = classResult.rows[0];

        if (!["active", "scheduled"].includes(gymClass.status)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "La clase no esta disponible" });
        }

        const classAvailability = await client.query(
            `SELECT ($1::date > CURRENT_DATE OR
                    ($1::date = CURRENT_DATE AND $2::time > LOCALTIME)) AS available`,
            [gymClass.class_date, gymClass.start_time]
        );

        if (!classAvailability.rows[0].available) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "No se puede reservar una clase pasada" });
        }

        const bookingExists = await client.query(
            `SELECT booking_id
             FROM bookings
             WHERE user_id = $1 AND class_id = $2 AND status = 'confirmed'`,
            [req.user.id, class_id]
        );

        if (bookingExists.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Ya tenes una reserva para esta clase" });
        }

        const overlappingBooking = await client.query(
            `SELECT b.booking_id, c.class_name, c.start_time, c.end_time
               FROM bookings b
               JOIN classes c ON c.class_id = b.class_id
              WHERE b.user_id = $1
                AND b.status = 'confirmed'
                AND c.class_date = $2
                AND c.status IN ('active', 'scheduled')
                AND c.start_time < $4
                AND c.end_time > $3
              LIMIT 1`,
            [req.user.id, gymClass.class_date, gymClass.start_time, gymClass.end_time]
        );

        if (overlappingBooking.rows.length > 0) {
            const conflict = overlappingBooking.rows[0];
            await client.query("ROLLBACK");
            return res.status(409).json({
                error: `Ya tenes una reserva que se superpone: ${conflict.class_name} de ${conflict.start_time.slice(0, 5)} a ${conflict.end_time.slice(0, 5)}`,
            });
        }

        if (user.class_limit !== null) {
            const activeBookings = await client.query(
                `SELECT COUNT(*)::integer AS total
                   FROM bookings b
                   JOIN classes c ON c.class_id = b.class_id
                  WHERE b.user_id = $1
                    AND b.status = 'confirmed'
                    AND (
                        c.class_date > CURRENT_DATE OR
                        (c.class_date = CURRENT_DATE AND c.start_time > LOCALTIME)
                    )`,
                [req.user.id]
            );

            if (activeBookings.rows[0].total >= Number(user.class_limit)) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    error: `Tu plan permite hasta ${user.class_limit} reservas futuras activas`,
                });
            }
        }

        const occupancyResult = await client.query(
            `SELECT COUNT(*)::integer AS booked
             FROM bookings
             WHERE class_id = $1 AND status = 'confirmed'`,
            [class_id]
        );

        if (gymClass.capacity && occupancyResult.rows[0].booked >= gymClass.capacity) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "La clase no tiene cupos disponibles" });
        }

        const result = await client.query(
            `INSERT INTO bookings (user_id, class_id, status)
             VALUES ($1, $2, 'confirmed')
             RETURNING booking_id, user_id, class_id, booking_date, status`,
            [req.user.id, class_id]
        );

        await client.query("COMMIT");
        res.status(201).json({ message: "Reserva confirmada", booking: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ error: "Error al crear la reserva" });
    } finally {
        client.release();
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE bookings
             SET status = 'cancelled'
             WHERE booking_id = $1
               AND user_id = $2
               AND status = 'confirmed'
               AND EXISTS (
                   SELECT 1
                     FROM classes c
                    WHERE c.class_id = bookings.class_id
                      AND (
                          c.class_date > CURRENT_DATE OR
                          (c.class_date = CURRENT_DATE AND c.start_time > LOCALTIME)
                      )
               )
             RETURNING booking_id, user_id, class_id, booking_date, status`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            const booking = await pool.query(
                `SELECT b.booking_id,
                        (c.class_date > CURRENT_DATE OR
                         (c.class_date = CURRENT_DATE AND c.start_time > LOCALTIME)) AS can_cancel
                   FROM bookings b
                   JOIN classes c ON c.class_id = b.class_id
                  WHERE b.booking_id = $1 AND b.user_id = $2 AND b.status = 'confirmed'`,
                [id, req.user.id]
            );

            if (booking.rows[0] && !booking.rows[0].can_cancel) {
                return res.status(409).json({ error: "No podes cancelar una clase que ya comenzo" });
            }
            return res.status(404).json({ error: "Reserva no encontrada o no te pertenece" });
        }

        res.json({ message: "Reserva cancelada", booking: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al cancelar la reserva" });
    }
};

const getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;
        const classResult = await pool.query(
            "SELECT instructor_id FROM classes WHERE class_id = $1",
            [classId]
        );

        if (classResult.rows.length === 0) {
            return res.status(404).json({ error: "Clase no encontrada" });
        }

        const isAdmin = req.user.role === "admin";
        const isAssignedInstructor =
            req.user.role === "instructor" &&
            Number(classResult.rows[0].instructor_id) === Number(req.user.id);

        if (!isAdmin && !isAssignedInstructor) {
            return res.status(403).json({ error: "No tenes permiso para ver los alumnos de esta clase" });
        }

        const result = await pool.query(
            `SELECT u.user_id,
                    u.first_name,
                    u.last_name,
                    u.username,
                    u.dni,
                    b.booking_id,
                    b.status
             FROM bookings b
             JOIN users u ON b.user_id = u.user_id
             WHERE b.class_id = $1 AND b.status = 'confirmed'
             ORDER BY u.first_name ASC, u.last_name ASC`,
            [classId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener estudiantes de la clase" });
    }
};

module.exports = { getUserBookings, createBooking, cancelBooking, getClassStudents };
