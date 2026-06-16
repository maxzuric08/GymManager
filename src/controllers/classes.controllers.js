const pool = require("../db");
const { getArgentinaDate, getArgentinaTimeShort } = require("../utils/argentinaTime");

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
    const result = await pool.query(
      `UPDATE classes
          SET instructor_id = $1, branch_id = $2, class_name = $3, capacity = $4,
              start_time = $5, end_time = $6, class_date = $7, status = $8
        WHERE class_id = $9
        RETURNING *`,
      [instructor_id, branch_id, class_name.trim(), Number(capacity), start_time, end_time, class_date, status || "scheduled", classId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Clase no encontrada" });
    return res.json(result.rows[0]);
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
    const result = await pool.query(
      "UPDATE classes SET status = 'inactive' WHERE class_id = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Clase no encontrada" });
    return res.json({ message: "Clase desactivada", class: result.rows[0] });
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
    return res.json({ message: "Clase reactivada", class: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al reactivar la clase" });
  }
};

module.exports = { getClasses, createClass, updateClass, deleteClass, reactivateClass };
