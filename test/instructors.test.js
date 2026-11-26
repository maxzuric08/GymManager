const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../src/db");
const {
  ensureInstructorCanBeDeactivated,
  findNextFutureClass,
} = require("../src/controllers/instructors.controllers");
const { createClass } = require("../src/controllers/classes.controllers");

const createDb = (rows) => {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows };
    },
  };
};

test("un instructor sin clases pendientes se puede desactivar", async () => {
  const db = createDb([]);

  assert.equal(await ensureInstructorCanBeDeactivated(5, db), null);
  assert.deepEqual(db.calls[0].params, [5]);
});

test("una clase futura activa bloquea la baja e informa cuál es", async () => {
  const db = createDb([{ class_name: "Spinning", class_date: "2026-11-25", start_time: "18:30:00" }]);

  const message = await ensureInstructorCanBeDeactivated(5, db);

  assert.match(message, /No se puede desactivar/);
  assert.match(message, /Spinning/);
  assert.match(message, /18:30/);
});

test("el criterio compara la hora de fin en Argentina: una clase de hoy ya terminada no bloquea", async () => {
  const db = createDb([]);

  await findNextFutureClass(5, db);

  const { sql } = db.calls[0];
  assert.match(sql, /class_date > \(CURRENT_TIMESTAMP AT TIME ZONE 'America\/Argentina\/Buenos_Aires'\)::date/);
  assert.match(sql, /end_time > \(CURRENT_TIMESTAMP AT TIME ZONE 'America\/Argentina\/Buenos_Aires'\)::time/);
  // Antes bloqueaba toda clase con fecha >= hoy, aunque ya hubiera terminado.
  assert.doesNotMatch(sql, /class_date >= /);
  assert.match(sql, /status NOT IN \('cancelled', 'inactive'\)/);
});

test("no se puede asignar un instructor inactivo a una clase nueva", async () => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push(sql);
    return { rows: [{ instructor_id: 5, username: "inst", status: "inactive", branch_id: 1 }] };
  };
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return value; },
  };

  try {
    await createClass(
      {
        body: {
          instructor_id: 5,
          branch_id: 1,
          class_name: "Yoga",
          capacity: 10,
          class_date: "2999-01-01",
          start_time: "10:00",
          end_time: "11:00",
        },
      },
      response
    );
  } finally {
    pool.query = originalQuery;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, "No se puede asignar un instructor inactivo");
  assert.equal(queries.some((sql) => /INSERT INTO classes/.test(sql)), false);
});
