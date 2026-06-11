const pool = require("../db");

const VALID_STATUSES = ["present", "absent", "late", "excused"];

const isValidDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

const getClassAttendance = async (req, res) => {
    try {
        const { classId } = req.params;
        const classResult = await pool.query(
            `SELECT c.class_id, c.class_name, c.class_date, c.start_time, c.end_time,
                    c.capacity, c.status, i.first_name AS instructor_first_name,
                    i.last_name AS instructor_last_name
             FROM classes c
             LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
             WHERE c.class_id = $1`,
            [classId]
        );

        if (classResult.rows.length === 0) {
            return res.status(404).json({ error: "Clase no encontrada" });
        }

        const studentsResult = await pool.query(
            `SELECT b.booking_id,
                    u.user_id,
                    u.username,
                    u.first_name,
                    u.last_name,
                    u.dni,
                    a.attendance_id,
                    a.status AS attendance_status,
                    a.notes,
                    a.check_in_time
             FROM bookings b
             JOIN users u ON b.user_id = u.user_id
             LEFT JOIN attendance a ON a.booking_id = b.booking_id
             WHERE b.class_id = $1 AND b.status = 'confirmed'
             ORDER BY u.first_name ASC, u.last_name ASC`,
            [classId]
        );

        res.json({ class: classResult.rows[0], students: studentsResult.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener la asistencia" });
    }
};

const saveClassAttendance = async (req, res) => {
    const client = await pool.connect();

    try {
        const { classId } = req.params;
        const { attendances } = req.body;

        if (!Array.isArray(attendances) || attendances.length === 0) {
            return res.status(400).json({ error: "Debes enviar al menos una asistencia" });
        }

        const bookingIds = attendances.map((item) => Number(item.booking_id));
        if (bookingIds.some((id) => !Number.isInteger(id)) || new Set(bookingIds).size !== bookingIds.length) {
            return res.status(400).json({ error: "Las reservas enviadas no son validas" });
        }

        if (attendances.some((item) => !VALID_STATUSES.includes(item.status))) {
            return res.status(400).json({ error: "Estado de asistencia invalido" });
        }

        await client.query("BEGIN");

        const classResult = await client.query("SELECT class_id FROM classes WHERE class_id = $1", [classId]);
        if (classResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Clase no encontrada" });
        }

        const bookingsResult = await client.query(
            `SELECT booking_id
             FROM bookings
             WHERE class_id = $1 AND status = 'confirmed' AND booking_id = ANY($2::int[])`,
            [classId, bookingIds]
        );

        if (bookingsResult.rows.length !== bookingIds.length) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Alguna reserva no pertenece a la clase" });
        }

        for (const item of attendances) {
            await client.query(
                `INSERT INTO attendance (booking_id, class_id, status, notes, marked_by_admin, check_in_time)
                 VALUES ($1, $2, $3, $4, $5,
                         CASE WHEN $3 IN ('present', 'late') THEN CURRENT_TIMESTAMP ELSE NULL END)
                 ON CONFLICT (booking_id)
                 DO UPDATE SET status = EXCLUDED.status,
                               notes = EXCLUDED.notes,
                               marked_by_admin = EXCLUDED.marked_by_admin,
                               check_in_time = CASE
                                   WHEN EXCLUDED.status IN ('present', 'late') THEN CURRENT_TIMESTAMP
                                   ELSE NULL
                               END`,
                [item.booking_id, classId, item.status, item.notes?.trim() || null, req.user.id]
            );
        }

        await client.query("COMMIT");
        res.json({ message: "Asistencias guardadas correctamente" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ error: "Error al guardar asistencias" });
    } finally {
        client.release();
    }
};

const getClassAttendanceStatistics = async (req, res) => {
    try {
        const { classId } = req.params;
        const result = await pool.query(
            `SELECT c.class_id,
                    c.class_name,
                    c.class_date,
                    c.capacity,
                    COUNT(DISTINCT b.booking_id)::integer AS booked,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'present')::integer AS present,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'absent')::integer AS absent,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'late')::integer AS late,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'excused')::integer AS excused,
                    ROUND(CASE WHEN COUNT(DISTINCT b.booking_id) = 0 THEN 0
                         ELSE 100.0 * COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status IN ('present', 'late'))
                              / COUNT(DISTINCT b.booking_id) END, 2) AS attendance_rate,
                    ROUND(CASE WHEN COALESCE(c.capacity, 0) = 0 THEN 0
                         ELSE 100.0 * COUNT(DISTINCT b.booking_id) / c.capacity END, 2) AS occupancy_rate
             FROM classes c
             LEFT JOIN bookings b ON b.class_id = c.class_id AND b.status = 'confirmed'
             LEFT JOIN attendance a ON a.booking_id = b.booking_id
             WHERE c.class_id = $1
             GROUP BY c.class_id`,
            [classId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Clase no encontrada" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener estadisticas de la clase" });
    }
};

const getAttendanceOverview = async (req, res) => {
    try {
        const { date_from, date_to } = req.query;

        if (!isValidDate(date_from) || !isValidDate(date_to)) {
            return res.status(400).json({ error: "Formato de fecha invalido" });
        }

        const from = date_from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const to = date_to || new Date().toISOString().slice(0, 10);

        if (from > to) {
            return res.status(400).json({ error: "La fecha desde no puede ser posterior a la fecha hasta" });
        }

        const classesResult = await pool.query(
            `SELECT c.class_id,
                    c.class_name,
                    c.class_date,
                    c.start_time,
                    c.capacity,
                    COALESCE(i.first_name || ' ' || i.last_name, i.username, 'Sin instructor') AS instructor_name,
                    COUNT(DISTINCT b.booking_id)::integer AS booked,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'present')::integer AS present,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'absent')::integer AS absent,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'late')::integer AS late,
                    COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status = 'excused')::integer AS excused,
                    ROUND(CASE WHEN COUNT(DISTINCT b.booking_id) = 0 THEN 0
                         ELSE 100.0 * COUNT(DISTINCT b.booking_id) FILTER (WHERE a.status IN ('present', 'late'))
                              / COUNT(DISTINCT b.booking_id) END, 2) AS attendance_rate,
                    ROUND(CASE WHEN COALESCE(c.capacity, 0) = 0 THEN 0
                         ELSE 100.0 * COUNT(DISTINCT b.booking_id) / c.capacity END, 2) AS occupancy_rate
             FROM classes c
             LEFT JOIN instructors i ON c.instructor_id = i.instructor_id
             LEFT JOIN bookings b ON b.class_id = c.class_id AND b.status = 'confirmed'
             LEFT JOIN attendance a ON a.booking_id = b.booking_id
             WHERE c.class_date BETWEEN $1 AND $2
             GROUP BY c.class_id, i.instructor_id
             ORDER BY c.class_date DESC, c.start_time DESC`,
            [from, to]
        );

        const summary = classesResult.rows.reduce(
            (totals, item) => ({
                classes: totals.classes + 1,
                booked: totals.booked + item.booked,
                present: totals.present + item.present,
                absent: totals.absent + item.absent,
                late: totals.late + item.late,
                excused: totals.excused + item.excused,
                capacity: totals.capacity + (item.capacity || 0)
            }),
            { classes: 0, booked: 0, present: 0, absent: 0, late: 0, excused: 0, capacity: 0 }
        );

        summary.attendance_rate = summary.booked
            ? Number((((summary.present + summary.late) * 100) / summary.booked).toFixed(2))
            : 0;
        summary.occupancy_rate = summary.capacity
            ? Number(((summary.booked * 100) / summary.capacity).toFixed(2))
            : 0;

        res.json({ date_from: from, date_to: to, summary, classes: classesResult.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener estadisticas de asistencia" });
    }
};

module.exports = {
    getClassAttendance,
    saveClassAttendance,
    getClassAttendanceStatistics,
    getAttendanceOverview
};
