require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../src/db");

const required = [
  "DEMO_ADMIN_USERNAME",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_USER_USERNAME",
  "DEMO_USER_PASSWORD",
  "DEMO_USER_EMAIL",
  "DEMO_USER_DNI",
];

function requiredEnvironment() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables para el demo: ${missing.join(", ")}`);
}

async function seedDemo() {
  requiredEnvironment();
  const client = await pool.connect();

  try {
    const [adminPassword, userPassword] = await Promise.all([
      bcrypt.hash(process.env.DEMO_ADMIN_PASSWORD, 10),
      bcrypt.hash(process.env.DEMO_USER_PASSWORD, 10),
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

    await client.query(
      `INSERT INTO plans (plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit)
       SELECT 'Demo mensual', 1000, '1 mes', 'Acceso a clases grupales', 20, 'active', 1, 'months'
       WHERE NOT EXISTS (SELECT 1 FROM plans WHERE plan_type = 'Demo mensual')
       RETURNING plan_id`,
    );

    await client.query(
      `INSERT INTO users (branch_id, username, password, dni, first_name, last_name, email, user_status)
       VALUES ($1, $2, $3, $4, 'Socio', 'Demo', $5, 'active')
       ON CONFLICT (username) DO UPDATE
       SET branch_id = EXCLUDED.branch_id, plan_id = NULL, password = EXCLUDED.password,
           email = EXCLUDED.email, user_status = 'active', plan_expiration_date = NULL`,
      [branchId, process.env.DEMO_USER_USERNAME, userPassword, process.env.DEMO_USER_DNI, process.env.DEMO_USER_EMAIL],
    );

    await client.query("COMMIT");
    console.log("✅ Demo accounts created or updated without storing their passwords in the repository");
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
