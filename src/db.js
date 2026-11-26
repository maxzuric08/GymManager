require("dotenv").config();

const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

const pool = new Pool(databaseUrl
  ? { connectionString: databaseUrl, ssl }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl,
    });

module.exports = pool;
