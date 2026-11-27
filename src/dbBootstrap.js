const fs = require("fs/promises");
const path = require("path");
const pool = require("./db");
const { initializeDatabase } = require("./initDb");

async function bootstrapDatabase() {
  const schemaPath = path.join(__dirname, "..", "database", "gymmanager.sql");
  const schema = await fs.readFile(schemaPath, "utf8");

  await pool.query(schema);
  await initializeDatabase(pool);
  console.log("✅ Database schema is ready");
}

bootstrapDatabase()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error("❌ Database bootstrap failed:", error);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  });
