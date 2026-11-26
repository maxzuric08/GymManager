const test = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "test";
process.env.FRONTEND_URL = "https://gymmanager-frontend.onrender.com";

const pool = require("../src/db");
const app = require("../src/app");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("healthcheck confirma la disponibilidad de PostgreSQL", async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [{ '?column?': 1 }] });

  try {
    const res = response();
    await app.healthCheck({}, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { status: "ok", database: "ok" });
  } finally {
    pool.query = originalQuery;
  }
});

test("healthcheck devuelve 503 si PostgreSQL no está disponible", async () => {
  const originalQuery = pool.query;
  pool.query = async () => { throw new Error("connection refused"); };

  try {
    const res = response();
    await app.healthCheck({}, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { status: "error", database: "unavailable" });
  } finally {
    pool.query = originalQuery;
  }
});
