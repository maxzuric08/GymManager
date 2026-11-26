const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../src/db");
const { getBranches } = require("../src/controllers/branches.controllers");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return value; },
});

test("lista las sucursales con id y nombre legible", async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [{ branch_id: 1, location: "Temuco", size: "Grande" }] });
  const res = createResponse();

  try {
    await getBranches({}, res, () => {});
  } finally {
    pool.query = originalQuery;
  }

  assert.deepEqual(res.body, [{ branch_id: 1, location: "Temuco", size: "Grande" }]);
});

test("si falla la consulta responde 500 con un mensaje claro", async () => {
  const originalQuery = pool.query;
  const originalError = console.error;
  pool.query = async () => { throw new Error("db caída"); };
  console.error = () => {};
  const res = createResponse();

  try {
    await getBranches({}, res, () => {});
  } finally {
    pool.query = originalQuery;
    console.error = originalError;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, "Error al obtener sucursales");
});
