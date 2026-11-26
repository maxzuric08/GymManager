const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../src/db");
const { validatePlanInput, describeClassLimit } = require("../src/services/planRules");
const { createPlan, updatePlan, reactivatePlan } = require("../src/controllers/plans.controllers");
const { createBooking } = require("../src/controllers/bookings.controllers");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return value; },
});

const validBody = () => ({
  plan_type: "Premium", cost: "25000", duration_value: "1", duration_unit: "months",
  class_limit: "10", benefits: "Acceso general",
});

test("un plan válido se normaliza y la duración se deriva de valor y unidad", () => {
  const { error, values } = validatePlanInput(validBody());
  assert.equal(error, undefined);
  assert.deepEqual(values, {
    plan_type: "Premium", cost: 25000, duration: "1 mes(es)", duration_value: 1,
    duration_unit: "months", class_limit: 10, benefits: "Acceso general", status: "active",
  });
});

test("límite vacío significa sin límite y se guarda como null", () => {
  for (const empty of ["", "  ", null, undefined]) {
    assert.equal(validatePlanInput({ ...validBody(), class_limit: empty }).values.class_limit, null);
  }
  assert.equal(describeClassLimit(null), "Sin límite de reservas");
  assert.match(describeClassLimit(1), /Hasta 1 reserva futura activa/);
  assert.match(describeClassLimit(5), /Hasta 5 reservas futuras activas/);
});

test("rechaza valores inválidos indicando el campo afectado", () => {
  const cases = [
    [{ plan_type: "  " }, "plan_type"],
    [{ plan_type: "x".repeat(51) }, "plan_type"],
    [{ cost: "" }, "cost"],
    [{ cost: "-5" }, "cost"],
    [{ cost: "abc" }, "cost"],
    [{ duration_value: "0" }, "duration_value"],
    [{ duration_value: "1.5" }, "duration_value"],
    [{ duration_value: "999", duration_unit: "months" }, "duration_value"],
    [{ duration_unit: "years" }, "duration_unit"],
    [{ duration_unit: "constructor" }, "duration_unit"],
    [{ class_limit: "0" }, "class_limit"],
    [{ class_limit: "-3" }, "class_limit"],
    [{ class_limit: "2.5" }, "class_limit"],
    [{ class_limit: "5000" }, "class_limit"],
    [{ benefits: "x".repeat(501) }, "benefits"],
    [{ status: "borrado" }, "field_status"],
  ];
  for (const [override, field] of cases) {
    const result = validatePlanInput({ ...validBody(), ...override });
    assert.ok(result.error, JSON.stringify(override));
    assert.equal(result.field, field === "field_status" ? "status" : field, JSON.stringify(override));
  }
});

// Base falsa para los controladores de planes.
async function withPlansDb(handler, run) {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return handler(sql, params);
  };
  try {
    return { calls, ...(await run()) };
  } finally {
    pool.query = originalQuery;
  }
}

test("crear un plan con datos inválidos responde 400 sin tocar la base", async () => {
  const res = createResponse();
  const { calls } = await withPlansDb(() => ({ rows: [] }), async () => {
    await createPlan({ body: { ...validBody(), class_limit: "0" } }, res);
    return {};
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.field, "class_limit");
  assert.equal(calls.length, 0);
});

test("no permite dos planes activos con el mismo nombre", async () => {
  const res = createResponse();
  await withPlansDb((sql) => (/LOWER\(BTRIM/.test(sql) ? { rows: [{ plan_id: 3 }] } : { rows: [] }), async () => {
    await createPlan({ body: { ...validBody(), plan_type: "premium " } }, res);
    return {};
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.field, "plan_type");
});

test("crear un plan válido guarda el límite normalizado", async () => {
  const res = createResponse();
  const { calls } = await withPlansDb((sql) => (/INSERT/.test(sql) ? { rows: [{ plan_id: 9 }] } : { rows: [] }), async () => {
    await createPlan({ body: { ...validBody(), class_limit: "" } }, res);
    return {};
  });
  assert.equal(res.statusCode, 201);
  const insert = calls.find((call) => /INSERT/.test(call.sql));
  assert.equal(insert.params[4], null, "límite vacío se guarda como null");
  assert.equal(insert.params[2], "1 mes(es)");
});

test("editar excluye al propio plan del chequeo de nombre y 404 si no existe", async () => {
  const missing = createResponse();
  await withPlansDb(() => ({ rows: [] }), async () => {
    await updatePlan({ params: { id: "5" }, body: validBody() }, missing);
    return {};
  });
  assert.equal(missing.statusCode, 404);

  const ok = createResponse();
  const { calls } = await withPlansDb((sql) => {
    if (/SELECT plan_id, status/.test(sql)) return { rows: [{ plan_id: 5, status: "active" }] };
    if (/UPDATE plans/.test(sql)) return { rows: [{ plan_id: 5 }] };
    return { rows: [] };
  }, async () => {
    await updatePlan({ params: { id: "5" }, body: validBody() }, ok);
    return {};
  });
  assert.equal(ok.statusCode, 200);
  assert.equal(calls.find((c) => /LOWER\(BTRIM/.test(c.sql)).params[1], 5);
});

test("reactivar un plan cuyo nombre ya usa otro plan activo se rechaza", async () => {
  const res = createResponse();
  await withPlansDb((sql) => {
    if (/SELECT plan_id, plan_type/.test(sql)) return { rows: [{ plan_id: 2, plan_type: "Premium" }] };
    if (/LOWER\(BTRIM/.test(sql)) return { rows: [{ plan_id: 7 }] };
    return { rows: [] };
  }, async () => {
    await reactivatePlan({ params: { id: "2" } }, res);
    return {};
  });
  assert.equal(res.statusCode, 409);
});

// Cliente falso para el flujo de reserva: responde según la consulta.
function bookingClient({ classLimit, activeBookings }) {
  const log = [];
  return {
    log,
    async query(sql) {
      log.push(sql.trim().split(/\s+/)[0]);
      if (/FROM users u/.test(sql)) {
        return { rows: [{ user_status: "active", plan_id: 1, plan_expiration_date: "2099-01-01", plan_status: "active", class_limit: classLimit, plan_type: "Básico" }] };
      }
      if (/FROM medical_certificates/.test(sql)) return { rows: [{ status: "approved" }] };
      if (/FROM classes/.test(sql) && /FOR UPDATE/.test(sql)) {
        return { rows: [{ class_id: 4, capacity: 10, class_date: "2099-03-02", start_time: "10:00:00", end_time: "11:00:00", status: "active" }] };
      }
      if (/AS available/.test(sql)) return { rows: [{ available: true }] };
      if (/COUNT\(\*\)::integer AS total/.test(sql)) return { rows: [{ total: activeBookings }] };
      if (/COUNT\(\*\)::integer AS booked/.test(sql)) return { rows: [{ booked: 0 }] };
      if (/INSERT INTO bookings/.test(sql)) return { rows: [{ booking_id: 1 }] };
      return { rows: [] };
    },
    release() {},
  };
}

async function book(options) {
  const originalConnect = pool.connect;
  const client = bookingClient(options);
  pool.connect = async () => client;
  const res = createResponse();
  try {
    await createBooking({ user: { id: 1 }, body: { class_id: 4 } }, res);
  } finally {
    pool.connect = originalConnect;
  }
  return res;
}

test("al alcanzar el límite del plan la reserva se bloquea explicando el motivo", async () => {
  const res = await book({ classLimit: 2, activeBookings: 2 });
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /Tu plan Básico permite hasta 2 reservas futuras activas y ya tenés 2/);
  assert.match(res.body.error, /Cancelá una reserva/);
  assert.equal(res.body.class_limit, 2);
  assert.equal(res.body.active_bookings, 2);
});

test("con lugar disponible dentro del límite la reserva se confirma", async () => {
  const res = await book({ classLimit: 2, activeBookings: 1 });
  assert.equal(res.statusCode, 201);
});

test("un plan sin límite no bloquea por cantidad de reservas", async () => {
  const res = await book({ classLimit: null, activeBookings: 500 });
  assert.equal(res.statusCode, 201);
});
