require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../src/db");

const required = [
  "DEMO_ADMIN_USERNAME",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_USER_USERNAME",
  "DEMO_USER_PASSWORD",
  "DEMO_USER_EMAIL",
  "DEMO_USER_DNI",
  "DEMO_MEMBER_USERNAME",
  "DEMO_MEMBER_PASSWORD",
  "DEMO_MEMBER_EMAIL",
  "DEMO_MEMBER_DNI",
];

function requiredEnvironment() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables para el demo: ${missing.join(", ")}`);
}

async function seedDemo() {
  requiredEnvironment();
  const client = await pool.connect();

  try {
    const [adminPassword, userPassword, memberPassword, instructorPassword] = await Promise.all([
      bcrypt.hash(process.env.DEMO_ADMIN_PASSWORD, 10),
      bcrypt.hash(process.env.DEMO_USER_PASSWORD, 10),
      bcrypt.hash(process.env.DEMO_MEMBER_PASSWORD, 10),
      bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
    ]);

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO administrators (username, password, hierarchy, first_name, last_name, email)
       VALUES ($1, $2, 'superadmin', 'Admin', 'Demo', $3)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, email = EXCLUDED.email`,
      [process.env.DEMO_ADMIN_USERNAME, adminPassword, process.env.DEMO_USER_EMAIL],
    );

    const branch = await client.query(
      `INSERT INTO branches (location, size)
       SELECT 'Sede Demo', 'Demo'
       WHERE NOT EXISTS (SELECT 1 FROM branches WHERE location = 'Sede Demo')
       RETURNING branch_id`,
    );
    const branchId = branch.rows[0]?.branch_id || (await client.query(
      "SELECT branch_id FROM branches WHERE location = 'Sede Demo' ORDER BY branch_id LIMIT 1",
    )).rows[0].branch_id;

    const plan = await client.query(
      `INSERT INTO plans (plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit)
       SELECT 'Demo mensual', 1000, '1 mes', 'Acceso a clases grupales', 20, 'active', 1, 'months'
       WHERE NOT EXISTS (SELECT 1 FROM plans WHERE plan_type = 'Demo mensual')
       RETURNING plan_id`,
    );
    const planId = plan.rows[0]?.plan_id || (await client.query(
      "SELECT plan_id FROM plans WHERE plan_type = 'Demo mensual' ORDER BY plan_id LIMIT 1",
    )).rows[0].plan_id;

    await client.query(
      `INSERT INTO users (branch_id, username, password, dni, first_name, last_name, email, user_status)
       VALUES ($1, $2, $3, $4, 'Socio', 'Demo', $5, 'active')
       ON CONFLICT (username) DO UPDATE
       SET branch_id = EXCLUDED.branch_id, plan_id = NULL, password = EXCLUDED.password,
           email = EXCLUDED.email, user_status = 'active', plan_expiration_date = NULL`,
      [branchId, process.env.DEMO_USER_USERNAME, userPassword, process.env.DEMO_USER_DNI, process.env.DEMO_USER_EMAIL],
    );

    const member = await client.query(
      `INSERT INTO users (branch_id, plan_id, username, password, dni, first_name, last_name, email, user_status, plan_expiration_date)
       VALUES ($1, $2, $3, $4, $5, 'Socio', 'Con Plan', $6, 'active', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 30)
       ON CONFLICT (username) DO UPDATE
       SET branch_id = EXCLUDED.branch_id, plan_id = EXCLUDED.plan_id, password = EXCLUDED.password,
           email = EXCLUDED.email, user_status = 'active', plan_expiration_date = EXCLUDED.plan_expiration_date
       RETURNING user_id`,
      [branchId, planId, process.env.DEMO_MEMBER_USERNAME, memberPassword, process.env.DEMO_MEMBER_DNI, process.env.DEMO_MEMBER_EMAIL],
    );
    const memberId = member.rows[0].user_id;

    await client.query(
      `INSERT INTO instructors (username, password, specialty, email, first_name, last_name, dni, branch_id, available_from, available_to, status)
       VALUES
         ('demo.yoga', $1, 'Yoga y movilidad', 'yoga.demo@example.invalid', 'Sofia', 'Lopez', '30111222', $2, '08:00', '13:00', 'active'),
         ('demo.funcional', $1, 'Entrenamiento funcional', 'funcional.demo@example.invalid', 'Valentina', 'Diaz', '31222333', $2, '17:00', '21:00', 'active'),
         ('demo.pilates', $1, 'Pilates', 'pilates.demo@example.invalid', 'Martin', 'Suarez', '32333444', $2, '18:00', '21:00', 'active'),
         ('demo.cross', $1, 'Cross training', 'cross.demo@example.invalid', 'Lucas', 'Mendez', '33444555', $2, '08:00', '12:00', 'inactive')
       ON CONFLICT (username) DO UPDATE
       SET specialty = EXCLUDED.specialty, branch_id = EXCLUDED.branch_id, available_from = EXCLUDED.available_from,
           available_to = EXCLUDED.available_to, status = EXCLUDED.status`,
      [instructorPassword, branchId],
    );

    const instructors = await client.query(
      "SELECT instructor_id, username FROM instructors WHERE username = ANY($1::text[])",
      [["demo.yoga", "demo.funcional", "demo.pilates"]],
    );
    const instructorIds = Object.fromEntries(instructors.rows.map((row) => [row.username, row.instructor_id]));
    const argentinaToday = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date";
    const classes = [
      ["demo.yoga", "Yoga Integral", 12, "09:00", "10:00", 1],
      ["demo.funcional", "Entrenamiento Funcional", 10, "18:00", "19:00", 2],
      ["demo.pilates", "Pilates Mat", 8, "19:00", "20:00", 3],
      ["demo.funcional", "Spinning", 6, "19:00", "20:00", 1],
    ];

    const classIds = {};
    for (const [instructorUsername, className, capacity, startTime, endTime, daysAhead] of classes) {
      const result = await client.query(
        `INSERT INTO classes (instructor_id, branch_id, class_name, capacity, start_time, end_time, class_date, status)
         SELECT $1, $2, $3, $4, $5, $6, ${argentinaToday} + $7, 'active'
         WHERE NOT EXISTS (
           SELECT 1 FROM classes
           WHERE instructor_id = $1 AND class_name = $3 AND class_date = ${argentinaToday} + $7
             AND start_time = $5::time AND end_time = $6::time
         )
         RETURNING class_id`,
        [instructorIds[instructorUsername], branchId, className, capacity, startTime, endTime, daysAhead],
      );
      classIds[className] = result.rows[0]?.class_id || (await client.query(
        `SELECT class_id FROM classes
         WHERE instructor_id = $1 AND class_name = $2 AND class_date = ${argentinaToday} + $3 AND start_time = $4::time
         ORDER BY class_id LIMIT 1`,
        [instructorIds[instructorUsername], className, daysAhead, startTime],
      )).rows[0].class_id;
    }

    await client.query(
      `INSERT INTO bookings (user_id, class_id, status)
       SELECT $1, $2, 'confirmed'
       WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE user_id = $1 AND class_id = $2)`,
      [memberId, classIds.Spinning],
    );

    await client.query("COMMIT");
    console.log("✅ Demo accounts, instructors, classes and booking created without storing passwords in the repository");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

seedDemo()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error("❌ Demo seed failed:", error.message);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  });
