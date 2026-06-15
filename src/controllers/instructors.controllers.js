const pool = require("../db");

function validateAvailability(availableFrom, availableTo) {
  const hasStart = Boolean(availableFrom);
  const hasEnd = Boolean(availableTo);

  if (hasStart !== hasEnd) return "Debes completar tanto Disponible Desde como Disponible Hasta";
  if (hasStart && availableFrom >= availableTo) return "La hora de fin debe ser mayor a la hora de inicio";
  return null;
}

function validateInstructorData({ username, dni, first_name, last_name, phone, email, birth_date, available_from, available_to }) {
  if (!username || !username.trim()) return "El nombre de usuario es obligatorio";
  if (dni && !/^\d+$/.test(dni)) return "El DNI debe contener unicamente numeros";
  if (first_name && !/^[\p{L}\s]+$/u.test(first_name)) return "El nombre solo puede contener letras";
  if (last_name && !/^[\p{L}\s]+$/u.test(last_name)) return "El apellido solo puede contener letras";
  if (phone && !/^[\d\s-]+$/.test(phone)) return "El telefono solo admite numeros, guiones y espacios";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Debes ingresar un email valido";
  if (birth_date && birth_date > new Date().toISOString().split("T")[0]) {
    return "La fecha de nacimiento no puede ser futura";
  }
  return validateAvailability(available_from, available_to);
}

async function findFutureScheduleConflict(instructorId, availableFrom, availableTo, branchId) {
  const result = await pool.query(
    `SELECT class_id, class_name, class_date, start_time, end_time, branch_id
       FROM classes
      WHERE instructor_id = $1
        AND class_date >= CURRENT_DATE
        AND status NOT IN ('cancelled', 'inactive')
        AND (
          $2::time IS NULL OR $3::time IS NULL OR
          start_time < $2::time OR end_time > $3::time OR
          $4::integer IS NULL OR branch_id IS DISTINCT FROM $4::integer
        )
      ORDER BY class_date, start_time
      LIMIT 1`,
    [instructorId, availableFrom || null, availableTo || null, branchId || null]
  );
  return result.rows[0] || null;
}

const getInstructors = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT instructor_id, username, specialty, email, phone, first_name, last_name,
             dni, birth_date, branch_id, available_from, available_to, status
        FROM instructors
       ORDER BY instructor_id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener instructores" });
  }
};

const createInstructor = async (req, res) => {
  try {
    const {
      username, password, specialty, email, phone, first_name, last_name, dni,
      birth_date, branch_id, available_from, available_to,
    } = req.body;

    const validationError = validateInstructorData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!username || !password) return res.status(400).json({ error: "Usuario y contrasena son obligatorios" });

    const result = await pool.query(
      `INSERT INTO instructors
        (username, password, specialty, email, phone, first_name, last_name, dni,
         birth_date, branch_id, available_from, available_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING instructor_id, username, specialty, email, phone, first_name,
                 last_name, dni, birth_date, branch_id, available_from, available_to, status`,
      [username, password, specialty, email, phone, first_name, last_name, dni || null,
       birth_date || null, branch_id || null, available_from || null, available_to || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ error: "El DNI o usuario ya estan registrados" });
    if (error.code === "23503") return res.status(400).json({ error: "La sucursal seleccionada no existe" });
    console.error(error);
    res.status(500).json({ error: "Error al crear instructor" });
  }
};

const updateInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username, password, specialty, email, phone, first_name, last_name, dni,
      birth_date, branch_id, available_from, available_to,
    } = req.body;

    const validationError = validateInstructorData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const existing = await pool.query("SELECT instructor_id FROM instructors WHERE instructor_id = $1", [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Instructor no encontrado" });

    const conflict = await findFutureScheduleConflict(id, available_from, available_to, branch_id);
    if (conflict) {
      return res.status(409).json({
        error: `El cambio deja fuera de disponibilidad la clase ${conflict.class_name} del ${new Date(conflict.class_date).toLocaleDateString("es-AR")} de ${conflict.start_time.slice(0, 5)} a ${conflict.end_time.slice(0, 5)}`,
      });
    }

    const result = await pool.query(
      `UPDATE instructors
          SET username = $1, password = COALESCE(NULLIF($2, ''), password), specialty = $3,
              email = $4, phone = $5, first_name = $6, last_name = $7, dni = $8,
              birth_date = $9, branch_id = $10, available_from = $11, available_to = $12
        WHERE instructor_id = $13
        RETURNING instructor_id, username, specialty, email, phone, first_name,
                  last_name, dni, birth_date, branch_id, available_from, available_to, status`,
      [username, password || null, specialty, email, phone, first_name, last_name,
       dni || null, birth_date || null, branch_id || null, available_from || null,
       available_to || null, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ error: "El DNI o usuario ya estan registrados" });
    if (error.code === "23503") return res.status(400).json({ error: "La sucursal seleccionada no existe" });
    console.error(error);
    res.status(500).json({ error: "Error al actualizar instructor" });
  }
};

async function findNextFutureClass(instructorId) {
  const result = await pool.query(
    `SELECT class_name, class_date, start_time
       FROM classes
      WHERE instructor_id = $1
        AND class_date >= CURRENT_DATE
        AND status NOT IN ('cancelled', 'inactive')
      ORDER BY class_date, start_time
      LIMIT 1`,
    [instructorId]
  );
  return result.rows[0] || null;
}

async function ensureInstructorCanBeDeactivated(instructorId) {
  const futureClass = await findNextFutureClass(instructorId);
  if (!futureClass) return null;
  return `No se puede desactivar: tiene la clase ${futureClass.class_name} el ${new Date(futureClass.class_date).toLocaleDateString("es-AR")} a las ${futureClass.start_time.slice(0, 5)}`;
}
const deleteInstructor = async (req, res) => {
  try {
    const conflict = await ensureInstructorCanBeDeactivated(req.params.id);
    if (conflict) return res.status(409).json({ error: conflict });
    const result = await pool.query(
      "UPDATE instructors SET status = 'inactive' WHERE instructor_id = $1 RETURNING instructor_id, username, email, status",
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Instructor no encontrado" });
    res.json({ message: "Instructor desactivado", instructor: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al desactivar instructor" });
  }
};

const deactivateMyAccount = async (req, res) => {
  try {
    const conflict = await ensureInstructorCanBeDeactivated(req.user.id);
    if (conflict) return res.status(409).json({ error: conflict });
    const result = await pool.query(
      "UPDATE instructors SET status = 'inactive' WHERE instructor_id = $1 RETURNING instructor_id, username, email, status",
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Instructor no encontrado" });
    res.json({ message: "Tu cuenta ha sido desactivada correctamente", instructor: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al desactivar tu cuenta" });
  }
};

const reactivateMyAccount = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE instructors SET status = 'active' WHERE instructor_id = $1 RETURNING instructor_id, username, email, status",
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Instructor no encontrado" });
    res.json({ message: "Tu cuenta ha sido reactivada correctamente", instructor: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al reactivar tu cuenta" });
  }
};

const reactivateInstructor = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE instructors SET status = 'active' WHERE instructor_id = $1 RETURNING instructor_id, username, email, status",
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Instructor no encontrado" });
    res.json({ message: "Instructor reactivado correctamente", instructor: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al reactivar instructor" });
  }
};

const updateMyAvailability = async (req, res) => {
    try {
        const { available_from, available_to } = req.body;

        if (!available_from || !available_to) {
            return res.status(400).json({ error: "Debés ingresar ambos horarios" });
        }

        if (available_from >= available_to) {
            return res.status(400).json({ error: "La hora de fin debe ser mayor a la hora de inicio" });
        }

        const instructorResult = await pool.query(
            "SELECT branch_id FROM instructors WHERE instructor_id = $1",
            [req.user.id]
        );

        if (instructorResult.rows.length === 0) {
            return res.status(404).json({ error: "Instructor no encontrado" });
        }

        const conflict = await findFutureScheduleConflict(
            req.user.id,
            available_from,
            available_to,
            instructorResult.rows[0].branch_id
        );

        if (conflict) {
            return res.status(409).json({
                error: `El cambio deja fuera de disponibilidad la clase ${conflict.class_name} del ${new Date(conflict.class_date).toLocaleDateString("es-AR")} de ${conflict.start_time.slice(0, 5)} a ${conflict.end_time.slice(0, 5)}`,
            });
        }

        const result = await pool.query(
            `UPDATE instructors SET available_from = $1, available_to = $2
             WHERE instructor_id = $3
             RETURNING instructor_id, username, available_from, available_to`,
            [available_from, available_to, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Instructor no encontrado" });
        }

        res.json({ message: "Disponibilidad actualizada correctamente", instructor: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar disponibilidad" });
    }
};

module.exports = {
  getInstructors,
  createInstructor,
  updateInstructor,
  deleteInstructor,
  deactivateMyAccount,
  reactivateMyAccount,
  reactivateInstructor,
  updateMyAvailability,
};
