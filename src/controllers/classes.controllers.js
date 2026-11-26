const pool = require("../db");
const { getArgentinaDate, getArgentinaTimeShort } = require("../utils/argentinaTime");
const { sendClassCancellationEmail } = require("../services/emailService");

const ARGENTINA_SQL_DATE = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date";
const ARGENTINA_SQL_TIME = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::time";
const UNAVAILABLE_CLASS_STATUSES = ["cancelled", "inactive"];
const CLASS_DEACTIVATED_REASON = "Clase desactivada por el administrador";

// Cancela las reservas confirmadas de una clase que todavía no empezó. Las de
// clases ya dictadas se conservan intactas como historial/asistencia.
async function cancelFutureBookings(client, classId, reason = CLASS_DEACTIVATED_REASON) {
  const result = await client.query(
    `UPDATE bookings b
        SET status = 'cancelled',
            cancellation_reason = $2
       FROM classes c
      WHERE b.class_id = c.class_id
        AND c.class_id = $1
        AND b.status = 'confirmed'
        AND (
            c.class_date > ${ARGENTINA_SQL_DATE} OR
            (c.class_date = ${ARGENTINA_SQL_DATE} AND c.start_time > ${ARGENTINA_SQL_TIME})
        )
      RETURNING b.booking_id, b.user_id`,
    [classId, reason]
  );
  return result.rows;
}

// Actualiza la clase y, si queda no disponible, cancela sus reservas en la misma
// transacción: o se aplican las dos cosas o ninguna.
async function updateClassAndCancelBookings(updateSql, params, classId, db = pool) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(updateSql, params);
    const gymClass = result.rows[0];
    if (!gymClass) {
      await client.query("ROLLBACK");
      return null;
    }
    const cancelledBookings = UNAVAILABLE_CLASS_STATUSES.includes(gymClass.status)
      ? await cancelFutureBookings(client, classId)
      : [];
    await client.query("COMMIT");
    return { gymClass, cancelledBookings };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// El aviso se manda después del COMMIT: si el mail falla, la cancelación igual queda.
async function notifyCancelledBookings(gymClass, cancelledBookings, db = pool, sendEmail = sendClassCancellationEmail) {
  if (!cancelledBookings.length) return;
  const users = await db.query(
    "SELECT user_id, first_name, email FROM users WHERE user_id = ANY($1::int[]) AND email IS NOT NULL AND BTRIM(email) <> ''",
    [cancelledBookings.map((booking) => booking.user_id)]
  );
  await Promise.allSettled(users.rows.map((user) => sendEmail({
    userEmail: user.email,
    userName: user.first_name || "socio",
    className: gymClass.class_name,
    classDate: gymClass.class_date,
    startTime: gymClass.start_time,
    endTime: gymClass.end_time,
  })));
}

function validateClassDateTime(classDate, startTime, endTime) {
  if (!classDate) return "Debes ingresar una fecha para la clase";
  if (!startTime || !endTime) return "Debes ingresar hora de inicio y termino";
  if (endTime <= startTime) return "La hora de termino debe ser mayor a la hora de inicio";

  const now = new Date();
  const today = getArgentinaDate(now);

  if (classDate < today) return "No se pueden crear o actualizar clases en fechas pasadas";

  if (classDate === today) {
    const currentTime = getArgentinaTimeShort(now);
    if (startTime <= currentTime) return "No se puede programar una clase hoy en una hora ya pasada";
  }

  return null;
}

const MAX_RECURRENCE_DAYS = 366;
const MAX_RECURRENCE_INSTANCES = 60;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMs = (dateStr) => Date.parse(`${dateStr}T00:00:00Z`);

// Date.parse acepta fechas inexistentes como 2099-02-31 y las desplaza; se compara el ida y vuelta.
const isRealDate = (dateStr) => !Number.isNaN(toUtcMs(dateStr)) && new Date(toUtcMs(dateStr)).toISOString().slice(0, 10) === dateStr;

// Genera las fechas (YYYY-MM-DD) entre startDate y endDate, ambas inclusive, que
// caen en alguno de los días de semana indicados (0 = domingo ... 6 = sábado).
function generateRecurringDates(startDate, endDate, weekdays) {
  const days = new Set(weekdays);
  const dates = [];
  for (let ms = toUtcMs(startDate); ms <= toUtcMs(endDate); ms += DAY_MS) {
    const date = new Date(ms);
    if (days.has(date.getUTCDay())) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

// Valida la configuración de la recurrencia. Devuelve un mensaje o null.
function validateRecurrence({ frequency, weekdays, start_date, end_date }) {
  if (frequency && frequency !== "weekly") return "Por ahora solo se admite frecuencia semanal";
  if (!Array.isArray(weekdays) || weekdays.length === 0) return "Debes elegir al menos un día de la semana";
  if (!weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) return "Los días de la semana no son válidos";
  if (!DATE_PATTERN.test(start_date || "") || !DATE_PATTERN.test(end_date || "")) return "Debes indicar fecha de inicio y de fin";
  if (!isRealDate(start_date) || !isRealDate(end_date)) return "Las fechas indicadas no son válidas";
  if (end_date < start_date) return "La fecha de fin no puede ser anterior a la de inicio";
  // +1 porque el período incluye ambos extremos
  if ((toUtcMs(end_date) - toUtcMs(start_date)) / DAY_MS + 1 > MAX_RECURRENCE_DAYS) {
    return `El período no puede superar ${MAX_RECURRENCE_DAYS} días`;
  }
  return null;
}

function validateClassFields({ instructor_id, branch_id, class_name, capacity }) {
  if (!instructor_id) return "Debes seleccionar un instructor";
  if (!branch_id) return "Debes seleccionar una sucursal";
  if (!class_name || !class_name.trim()) return "Debes ingresar un nombre para la clase";
  if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) return "La capacidad debe ser un numero entero mayor a 0";
  return null;
}

function normalizeTime(value) {
  return value && value.length === 5 ? `${value}:00` : value;
}

async function validateInstructorAssignment({ instructorId, branchId, classDate, startTime, endTime, excludeClassId = null }) {
  const instructorResult = await pool.query(
    `SELECT instructor_id, username, status, branch_id, available_from, available_to
       FROM instructors
      WHERE instructor_id = $1`,
    [instructorId]
  );

  if (!instructorResult.rows[0]) return { status: 404, error: "Instructor no encontrado" };

  const instructor = instructorResult.rows[0];
  if (instructor.status !== "active") {
    return { status: 400, error: "No se puede asignar un instructor inactivo" };
  }

  if (!instructor.available_from || !instructor.available_to) {
    return { status: 400, error: "El instructor no tiene un horario de disponibilidad completo" };
  }

  if (!instructor.branch_id) {
    return { status: 400, error: "El instructor no tiene una sucursal asignada" };
  }

  if (Number(instructor.branch_id) !== Number(branchId)) {
    return { status: 400, error: "El instructor pertenece a una sucursal diferente" };
  }

  const normalizedStart = normalizeTime(startTime);
  const normalizedEnd = normalizeTime(endTime);
  const availableFrom = normalizeTime(instructor.available_from);
  const availableTo = normalizeTime(instructor.available_to);

  if (normalizedStart < availableFrom || normalizedEnd > availableTo) {
    return {
      status: 400,
      error: `Turno bloqueado: el instructor solo esta disponible de ${instructor.available_from.slice(0, 5)} a ${instructor.available_to.slice(0, 5)}`,
    };
  }

  const overlapResult = await pool.query(
    `SELECT class_id, class_name, start_time, end_time
       FROM classes
      WHERE instructor_id = $1
        AND class_date = $2
        AND status NOT IN ('cancelled', 'inactive')
        AND ($5::integer IS NULL OR class_id <> $5)
        AND start_time < $4
        AND end_time > $3
      LIMIT 1`,
    [instructorId, classDate, startTime, endTime, excludeClassId]
  );

  if (overlapResult.rows[0]) {
    const conflict = overlapResult.rows[0];
    return {
      status: 409,
      error: `El instructor ya tiene la clase ${conflict.class_name} de ${conflict.start_time.slice(0, 5)} a ${conflict.end_time.slice(0, 5)}`,
    };
  }

  return null;
}

const getClasses = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM classes ORDER BY class_date ASC, start_time ASC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener clases" });
  }
};

const saveClass = async (req, res, classId = null) => {
  const { instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status } = req.body;

  const fieldsError = validateClassFields({ instructor_id, branch_id, class_name, capacity });
  if (fieldsError) return res.status(400).json({ error: fieldsError });

  const dateError = validateClassDateTime(class_date, start_time, end_time);
  if (dateError) return res.status(400).json({ error: dateError });

  const assignmentError = await validateInstructorAssignment({
    instructorId: instructor_id,
    branchId: branch_id,
    classDate: class_date,
    startTime: start_time,
    endTime: end_time,
    excludeClassId: classId,
  });
  if (assignmentError) return res.status(assignmentError.status).json({ error: assignmentError.error });

  if (classId) {
    const updated = await updateClassAndCancelBookings(
      `UPDATE classes
          SET instructor_id = $1, branch_id = $2, class_name = $3, capacity = $4,
              start_time = $5, end_time = $6, class_date = $7, status = $8
        WHERE class_id = $9
        RETURNING *`,
      [instructor_id, branch_id, class_name.trim(), Number(capacity), start_time, end_time, class_date, status || "scheduled", classId],
      classId
    );
    if (!updated) return res.status(404).json({ error: "Clase no encontrada" });
    await notifyCancelledBookings(updated.gymClass, updated.cancelledBookings).catch((error) => console.error("Error avisando cancelaciones:", error));
    return res.json({ ...updated.gymClass, cancelled_bookings: updated.cancelledBookings.length });
  }

  const result = await pool.query(
    `INSERT INTO classes
      (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [instructor_id, branch_id, class_name.trim(), Number(capacity), start_time, end_time, class_date, status || "scheduled"]
  );
  return res.status(201).json(result.rows[0]);
};

const createClass = async (req, res) => {
  try {
    return await saveClass(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al crear la clase" });
  }
};

// Crea una clase por cada fecha de la recurrencia. Cada instancia pasa por las
// mismas validaciones que una clase individual (fecha/hora, disponibilidad,
// sucursal y solapamiento del instructor). Las inválidas no se crean y se
// informan junto con el motivo; las válidas se guardan juntas en una transacción.
const createRecurringClasses = async (req, res) => {
  try {
    const { instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, end_date, weekdays, frequency, status } = req.body;

    const fieldsError = validateClassFields({ instructor_id, branch_id, class_name, capacity });
    if (fieldsError) return res.status(400).json({ error: fieldsError });

    if (!start_time || !end_time) return res.status(400).json({ error: "Debes ingresar hora de inicio y termino" });
    if (end_time <= start_time) return res.status(400).json({ error: "La hora de termino debe ser mayor a la hora de inicio" });

    const recurrenceError = validateRecurrence({ frequency, weekdays, start_date: class_date, end_date });
    if (recurrenceError) return res.status(400).json({ error: recurrenceError });

    if (class_date < getArgentinaDate()) {
      return res.status(400).json({ error: "No se pueden crear o actualizar clases en fechas pasadas" });
    }

    const dates = generateRecurringDates(class_date, end_date, weekdays);
    if (dates.length === 0) {
      return res.status(400).json({ error: "El rango elegido no incluye ninguno de los días de la semana seleccionados" });
    }
    if (dates.length > MAX_RECURRENCE_INSTANCES) {
      return res.status(400).json({ error: `La recurrencia genera ${dates.length} clases; el máximo permitido es ${MAX_RECURRENCE_INSTANCES}` });
    }

    const valid = [];
    const conflicts = [];
    for (const date of dates) {
      const dateError = validateClassDateTime(date, start_time, end_time);
      const assignmentError = dateError ? null : await validateInstructorAssignment({
        instructorId: instructor_id,
        branchId: branch_id,
        classDate: date,
        startTime: start_time,
        endTime: end_time,
      });

      // Los errores 400/404 del instructor no dependen de la fecha: se informan una sola vez.
      if (assignmentError && assignmentError.status !== 409) {
        return res.status(assignmentError.status).json({ error: assignmentError.error });
      }

      if (dateError || assignmentError) {
        conflicts.push({ class_date: date, error: dateError || assignmentError.error });
      } else {
        valid.push(date);
      }
    }

    const created = [];
    if (valid.length > 0) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const date of valid) {
          const result = await client.query(
            `INSERT INTO classes
              (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [instructor_id, branch_id, class_name.trim(), Number(capacity), start_time, end_time, date, status || "scheduled"]
          );
          created.push(result.rows[0]);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    const summary = { total_requested: dates.length, created, conflicts };
    if (created.length === 0) {
      return res.status(409).json({ error: "No se pudo crear ninguna clase: todas las fechas tienen conflictos", ...summary });
    }
    return res.status(201).json({
      message: conflicts.length
        ? `Se crearon ${created.length} de ${dates.length} clases. ${conflicts.length} tuvieron conflictos y no se crearon.`
        : `Se crearon ${created.length} clases.`,
      ...summary,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al crear las clases recurrentes" });
  }
};

const updateClass = async (req, res) => {
  try {
    return await saveClass(req, res, Number(req.params.id));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al actualizar la clase" });
  }
};

const deleteClass = async (req, res) => {
  try {
    const updated = await updateClassAndCancelBookings(
      "UPDATE classes SET status = 'inactive' WHERE class_id = $1 RETURNING *",
      [req.params.id],
      req.params.id
    );
    if (!updated) return res.status(404).json({ error: "Clase no encontrada" });
    await notifyCancelledBookings(updated.gymClass, updated.cancelledBookings).catch((error) => console.error("Error avisando cancelaciones:", error));
    const count = updated.cancelledBookings.length;
    return res.json({
      message: count
        ? `Clase desactivada. Se cancelaron ${count} reserva(s) y se avisó a los socios.`
        : "Clase desactivada",
      class: updated.gymClass,
      cancelled_bookings: count,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al desactivar la clase" });
  }
};

const reactivateClass = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE classes SET status = 'active' WHERE class_id = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Clase no encontrada" });
    // Política: las reservas canceladas NO se restauran. Los socios ya fueron
    // avisados y pudieron reservar otra cosa, así que deben reservar de nuevo.
    return res.json({
      message: "Clase reactivada. Las reservas canceladas no se restauran: los socios deben reservar nuevamente.",
      class: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al reactivar la clase" });
  }
};

module.exports = {
  getClasses,
  createClass,
  createRecurringClasses,
  generateRecurringDates,
  validateRecurrence,
  updateClass,
  deleteClass,
  reactivateClass,
  cancelFutureBookings,
  updateClassAndCancelBookings,
  notifyCancelledBookings,
};
