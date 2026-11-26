const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../src/db");
const {
  createRecurringClasses,
  generateRecurringDates,
  validateRecurrence,
} = require("../src/controllers/classes.controllers");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return value; },
});

// Una fecha lejana en el futuro evita depender del día en que corre el test.
const baseBody = () => ({
  instructor_id: 1,
  branch_id: 1,
  class_name: "Spinning",
  capacity: 15,
  start_time: "10:00",
  end_time: "11:00",
  class_date: "2099-03-02", // lunes
  end_date: "2099-03-20",
  weekdays: [1, 3], // lunes y miércoles
  frequency: "weekly",
});

// Simula la base: el instructor (configurable) y las fechas donde ya tiene una clase solapada.
function mockDb({ instructor, busyDates = [] } = {}) {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const inserted = [];
  const log = [];

  pool.query = async (sql, params) => {
    if (/FROM instructors/.test(sql)) {
      return { rows: [instructor || { instructor_id: 1, username: "ins", status: "active", branch_id: 1, available_from: "08:00:00", available_to: "20:00:00" }] };
    }
    if (/FROM classes/.test(sql)) {
      const busy = busyDates.includes(params[1]);
      return { rows: busy ? [{ class_id: 99, class_name: "Yoga", start_time: "10:30:00", end_time: "11:30:00" }] : [] };
    }
    throw new Error(`consulta inesperada: ${sql}`);
  };
  pool.connect = async () => ({
    async query(sql, params) {
      log.push(sql.trim().split(/\s+/)[0]);
      if (/INSERT INTO classes/.test(sql)) {
        const row = { class_id: 100 + inserted.length, class_date: params[6], class_name: params[2] };
        inserted.push(row);
        return { rows: [row] };
      }
      return { rows: [] };
    },
    release() {},
  });

  return {
    inserted,
    log,
    restore() { pool.query = originalQuery; pool.connect = originalConnect; },
  };
}

async function run(body, dbOptions) {
  const db = mockDb(dbOptions);
  const res = createResponse();
  try {
    await createRecurringClasses({ body }, res);
  } finally {
    db.restore();
  }
  return { res, db };
}

test("genera solo las fechas de los días elegidos dentro del rango, ambos extremos incluidos", () => {
  assert.deepEqual(
    generateRecurringDates("2099-03-02", "2099-03-11", [1, 3]),
    ["2099-03-02", "2099-03-04", "2099-03-09", "2099-03-11"]
  );
  assert.deepEqual(generateRecurringDates("2099-03-03", "2099-03-05", [1]), []);
});

test("validateRecurrence rechaza configuraciones inválidas", () => {
  const ok = { weekdays: [1], start_date: "2099-03-02", end_date: "2099-03-09" };
  assert.equal(validateRecurrence(ok), null);
  assert.match(validateRecurrence({ ...ok, weekdays: [] }), /al menos un día/);
  assert.match(validateRecurrence({ ...ok, weekdays: [7] }), /no son válidos/);
  assert.match(validateRecurrence({ ...ok, end_date: "2099-03-01" }), /anterior/);
  assert.match(validateRecurrence({ ...ok, end_date: "2101-03-09" }), /no puede superar/);
  assert.match(validateRecurrence({ ...ok, frequency: "daily" }), /semanal/);
  assert.match(validateRecurrence({ ...ok, start_date: "2099-02-31" }), /no son válidas/);
});

test("el máximo de 366 días cuenta ambos extremos", () => {
  const base = { weekdays: [1], start_date: "2099-01-01" };
  // 2099-01-01 a 2100-01-01 son 366 fechas: dentro del máximo
  assert.equal(validateRecurrence({ ...base, end_date: "2100-01-01" }), null);
  // un día más son 367 fechas: excede el máximo
  assert.match(validateRecurrence({ ...base, end_date: "2100-01-02" }), /no puede superar 366 días/);
});

test("crea una instancia por cada fecha válida dentro de una transacción", async () => {
  const { res, db } = await run(baseBody());

  assert.equal(res.statusCode, 201, JSON.stringify(res.body));
  assert.equal(res.body.created.length, 6);
  assert.deepEqual(res.body.conflicts, []);
  assert.deepEqual(db.inserted.map((c) => c.class_date), [
    "2099-03-02", "2099-03-04", "2099-03-09", "2099-03-11", "2099-03-16", "2099-03-18",
  ]);
  assert.deepEqual([db.log[0], db.log.at(-1)], ["BEGIN", "COMMIT"]);
});

test("las fechas con solapamiento se informan y no se crean; el resto sí", async () => {
  const { res, db } = await run(baseBody(), { busyDates: ["2099-03-04", "2099-03-16"] });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.created.length, 4);
  assert.deepEqual(res.body.conflicts.map((c) => c.class_date), ["2099-03-04", "2099-03-16"]);
  assert.match(res.body.conflicts[0].error, /ya tiene la clase Yoga/);
  assert.ok(!db.inserted.some((c) => ["2099-03-04", "2099-03-16"].includes(c.class_date)));
});

test("si todas las fechas tienen conflicto responde 409 y no abre transacción", async () => {
  const body = { ...baseBody(), end_date: "2099-03-04" };
  const { res, db } = await run(body, { busyDates: ["2099-03-02", "2099-03-04"] });

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.created.length, 0);
  assert.equal(res.body.conflicts.length, 2);
  assert.deepEqual(db.log, []);
});

test("un error del instructor que no depende de la fecha corta la operación con 400", async () => {
  const instructor = { instructor_id: 1, username: "ins", status: "active", branch_id: 2, available_from: "08:00:00", available_to: "20:00:00" };
  const { res, db } = await run(baseBody(), { instructor });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /sucursal diferente/);
  assert.deepEqual(db.inserted, []);
});

test("rechaza fecha de inicio pasada, rango sin días coincidentes y exceso de instancias", async () => {
  const past = await run({ ...baseBody(), class_date: "2020-01-06", end_date: "2020-02-06" });
  assert.equal(past.res.statusCode, 400);
  assert.match(past.res.body.error, /fechas pasadas/);

  const empty = await run({ ...baseBody(), end_date: "2099-03-03", weekdays: [5] });
  assert.equal(empty.res.statusCode, 400);
  assert.match(empty.res.body.error, /no incluye/);

  const tooMany = await run({ ...baseBody(), end_date: "2099-12-31", weekdays: [0, 1, 2, 3, 4, 5, 6] });
  assert.equal(tooMany.res.statusCode, 400);
  assert.match(tooMany.res.body.error, /máximo permitido/);
});

test("si falla un INSERT se revierte toda la transacción", async () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const log = [];
  pool.query = async (sql) => (/FROM instructors/.test(sql)
    ? { rows: [{ instructor_id: 1, status: "active", branch_id: 1, available_from: "08:00:00", available_to: "20:00:00" }] }
    : { rows: [] });
  pool.connect = async () => ({
    async query(sql) {
      log.push(sql.trim().split(/\s+/)[0]);
      if (/INSERT/.test(sql) && log.filter((l) => l === "INSERT").length === 2) throw new Error("boom");
      return { rows: [{ class_id: 1 }] };
    },
    release() {},
  });
  const originalError = console.error;
  console.error = () => {};
  const res = createResponse();

  try {
    await createRecurringClasses({ body: baseBody() }, res);
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    console.error = originalError;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(log.at(-1), "ROLLBACK");
  assert.ok(!log.includes("COMMIT"));
});
