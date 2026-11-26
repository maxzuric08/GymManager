// Convierte a hash bcrypt las contraseñas que todavía están en texto plano.
// Es idempotente: las que ya son hash se saltean, así que se puede correr varias veces.
// Uso: npm run db:hash-passwords
const pool = require("../src/db");
const { hashPassword, isBcryptHash } = require("../src/utils/password");

const TABLES = [
  { table: "administrators", id: "admin_id" },
  { table: "instructors", id: "instructor_id" },
  { table: "users", id: "user_id" },
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const { table, id } of TABLES) {
      const { rows } = await client.query(`SELECT ${id} AS id, password FROM ${table}`);
      let migrated = 0;
      for (const row of rows) {
        if (isBcryptHash(row.password)) continue;
        await client.query(`UPDATE ${table} SET password = $1 WHERE ${id} = $2`, [await hashPassword(row.password), row.id]);
        migrated += 1;
      }
      console.log(`✓ ${table}: ${migrated} migradas, ${rows.length - migrated} ya estaban hasheadas`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error al migrar contraseñas:", error.message);
    process.exit(1);
  });
