const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getTomorrowArgentinaDate,
  getMembershipExpirationNotificationRuns,
  listMembershipExpirationNotificationRuns,
  runMembershipExpirationNotifications,
} = require("../src/controllers/notifications.controllers");
const initializeScheduledTasks = require("../src/scheduledTasks");

const eligibleUser = {
  user_id: 17,
  first_name: "Ana",
  email: "ana@example.com",
  plan_type: "Mensual",
  plan_expiration_date: "2026-11-16",
};

const createQueuedDb = (responses) => {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
  };
};

test("calcula mañana con la fecha de Argentina", () => {
  assert.equal(getTomorrowArgentinaDate(new Date("2026-11-15T02:30:00Z")), "2026-11-15");
  assert.equal(getTomorrowArgentinaDate(new Date("2026-11-15T03:30:00Z")), "2026-11-16");
});

test("la simulación consulta candidatos sin enviar ni escribir auditoría", async () => {
  const db = createQueuedDb([{ rows: [eligibleUser] }]);
  let emailCalls = 0;

  const result = await runMembershipExpirationNotifications({
    db,
    dryRun: true,
    now: new Date("2026-11-15T12:00:00Z"),
    sendEmail: async () => { emailCalls++; return { success: true }; },
  });

  assert.equal(result.success, true);
  assert.equal(result.candidates.length, 1);
  assert.equal(emailCalls, 0);
  assert.equal(db.calls.length, 1);
});

test("envía una vez cuando logra reclamar el registro idempotente", async () => {
  const db = createQueuedDb([
    { rows: [{ notification_run_id: 8 }] },
    { rows: [eligibleUser] },
    { rows: [{ membership_notification_delivery_id: 22 }] },
    { rows: [] },
    { rows: [] },
  ]);
  let emailCalls = 0;

  const result = await runMembershipExpirationNotifications({
    db,
    now: new Date("2026-11-15T12:00:00Z"),
    sendEmail: async () => { emailCalls++; return { success: true }; },
  });

  assert.deepEqual({ sent: result.sent, failed: result.failed, skipped: result.skipped }, { sent: 1, failed: 0, skipped: 0 });
  assert.equal(emailCalls, 1);
});

test("omite un vencimiento ya reclamado sin enviar un correo duplicado", async () => {
  const db = createQueuedDb([
    { rows: [{ notification_run_id: 8 }] },
    { rows: [eligibleUser] },
    { rows: [] },
    { rows: [] },
  ]);
  let emailCalls = 0;

  const result = await runMembershipExpirationNotifications({
    db,
    now: new Date("2026-11-15T12:00:00Z"),
    sendEmail: async () => { emailCalls++; return { success: true }; },
  });

  assert.deepEqual({ sent: result.sent, failed: result.failed, skipped: result.skipped }, { sent: 0, failed: 0, skipped: 1 });
  assert.equal(emailCalls, 0);
});

test("registra un fallo de correo y no lo reporta como enviado", async () => {
  const db = createQueuedDb([
    { rows: [{ notification_run_id: 8 }] },
    { rows: [eligibleUser] },
    { rows: [{ membership_notification_delivery_id: 22 }] },
    { rows: [] },
    { rows: [] },
  ]);

  const result = await runMembershipExpirationNotifications({
    db,
    now: new Date("2026-11-15T12:00:00Z"),
    sendEmail: async () => ({ success: false, error: "SMTP no disponible" }),
  });

  assert.deepEqual({ sent: result.sent, failed: result.failed, skipped: result.skipped }, { sent: 0, failed: 1, skipped: 0 });
  assert.match(db.calls[3].sql, /delivery_status = 'failed'/);
  assert.deepEqual(db.calls[3].params, [22, "SMTP no disponible"]);
});

test("registra el cron cada 15 minutos en horario de Argentina sin solapamiento", () => {
  const schedules = [];
  initializeScheduledTasks({
    cronClient: { schedule: (...args) => schedules.push(args) },
    db: { query: async () => ({ rowCount: 0 }) },
    runNotifications: async () => ({ success: true, sent: 0, failed: 0, skipped: 0 }),
  });

  assert.equal(schedules[0][0], "*/15 * * * *");
  assert.deepEqual(schedules[0][2], { timezone: "America/Argentina/Buenos_Aires", noOverlap: true });
});

test("el endpoint administrativo devuelve las ejecuciones almacenadas", async () => {
  const db = createQueuedDb([{ rows: [{ notification_run_id: 4, failures: [] }] }]);
  const response = { body: null, json(value) { this.body = value; return value; }, status() { return this; } };

  await listMembershipExpirationNotificationRuns({ query: {} }, response, db);

  assert.deepEqual(response.body, { runs: [{ notification_run_id: 4, failures: [] }] });
  assert.equal(db.calls[0].params[1], 20);
});

test("el handler de la ruta usa la conexión aunque Express le pase next como tercer argumento", async () => {
  const pool = require("../src/db");
  const originalQuery = pool.query;
  const db = createQueuedDb([{ rows: [{ notification_run_id: 9, failures: [] }] }]);
  pool.query = db.query;
  const response = { body: null, json(value) { this.body = value; return value; }, status() { return this; } };

  try {
    await getMembershipExpirationNotificationRuns({ query: {} }, response, () => {});
  } finally {
    pool.query = originalQuery;
  }

  assert.deepEqual(response.body, { runs: [{ notification_run_id: 9, failures: [] }] });
});
