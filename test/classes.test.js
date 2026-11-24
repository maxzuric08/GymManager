const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../src/db");
const {
  deleteClass,
  updateClassAndCancelBookings,
  notifyCancelledBookings,
} = require("../src/controllers/classes.controllers");
const { buildClassCancellationEmail } = require("../src/services/emailService");

const UPDATE_SQL = "UPDATE classes SET status = $2 WHERE class_id = $1 RETURNING *";

// Cliente falso que registra las sentencias y responde según un guion.
const createClientDb = (handlers = {}) => {
  const log = [];
  const client = {
    released: false,
    async query(sql, params) {
      const key = /UPDATE bookings/.test(sql) ? "bookings" : /UPDATE classes/.test(sql) ? "classes" : sql;
      log.push(key);
      const handler = handlers[key];
      if (handler instanceof Error) throw handler;
      return handler ? handler(params) : { rows: [] };
    },
    release() { this.released = true; },
  };
  return { log, client, db: { connect: async () => client } };
};

test("desactivar una clase futura cancela sus reservas dentro de la misma transacción", async () => {
  const { log, client, db } = createClientDb({
    classes: () => ({ rows: [{ class_id: 7, status: "inactive" }] }),
    bookings: (params) => {
      assert.equal(params[0], 7);
      assert.equal(params[1], "Clase desactivada por el administrador");
      return { rows: [{ booking_id: 1, user_id: 10 }, { booking_id: 2, user_id: 11 }] };
    },
  });

  const result = await updateClassAndCancelBookings(UPDATE_SQL, [7, "inactive"], 7, db);

  assert.deepEqual(log, ["BEGIN", "classes", "bookings", "COMMIT"]);
  assert.equal(result.cancelledBookings.length, 2);
  assert.equal(client.released, true);
});

test("una clase que queda activa no toca las reservas", async () => {
  const { log, db } = createClientDb({
    classes: () => ({ rows: [{ class_id: 7, status: "scheduled" }] }),
  });

  const result = await updateClassAndCancelBookings(UPDATE_SQL, [7, "scheduled"], 7, db);

  assert.deepEqual(log, ["BEGIN", "classes", "COMMIT"]);
  assert.deepEqual(result.cancelledBookings, []);
});

test("marcar la clase como cancelada también cancela las reservas", async () => {
  const { log, db } = createClientDb({
    classes: () => ({ rows: [{ class_id: 7, status: "cancelled" }] }),
    bookings: () => ({ rows: [{ booking_id: 1, user_id: 10 }] }),
  });

  await updateClassAndCancelBookings(UPDATE_SQL, [7, "cancelled"], 7, db);

  assert.deepEqual(log, ["BEGIN", "classes", "bookings", "COMMIT"]);
});

test("si falla la cancelación de reservas se revierte todo y no se confirma la baja", async () => {
  const { log, client, db } = createClientDb({
    classes: () => ({ rows: [{ class_id: 7, status: "inactive" }] }),
    bookings: new Error("falla a mitad de camino"),
  });

  await assert.rejects(() => updateClassAndCancelBookings(UPDATE_SQL, [7, "inactive"], 7, db), /falla a mitad de camino/);

  assert.deepEqual(log, ["BEGIN", "classes", "bookings", "ROLLBACK"]);
  assert.equal(log.includes("COMMIT"), false);
  assert.equal(client.released, true);
});

test("una clase inexistente devuelve null y hace rollback", async () => {
  const { log, db } = createClientDb({ classes: () => ({ rows: [] }) });

  assert.equal(await updateClassAndCancelBookings(UPDATE_SQL, [99, "inactive"], 99, db), null);
  assert.deepEqual(log, ["BEGIN", "classes", "ROLLBACK"]);
});

test("se avisa a cada socio afectado y un mail fallido no interrumpe a los demás", async () => {
  const db = {
    query: async (sql, params) => {
      assert.deepEqual(params[0], [10, 11]);
      return { rows: [
        { user_id: 10, first_name: "Ana", email: "ana@example.com" },
        { user_id: 11, first_name: null, email: "beto@example.com" },
      ] };
    },
  };
  const sent = [];
  const sendEmail = async (details) => {
    sent.push(details);
    if (details.userEmail === "ana@example.com") throw new Error("SMTP caído");
    return true;
  };

  await notifyCancelledBookings(
    { class_name: "Spinning", class_date: "2026-11-25", start_time: "18:00:00", end_time: "19:00:00" },
    [{ user_id: 10 }, { user_id: 11 }],
    db,
    sendEmail
  );

  assert.deepEqual(sent.map((mail) => mail.userEmail), ["ana@example.com", "beto@example.com"]);
  assert.equal(sent[1].userName, "socio");
});

test("sin reservas afectadas no se consulta ni se envía nada", async () => {
  const db = { query: async () => { throw new Error("no debería consultar"); } };
  await notifyCancelledBookings({}, [], db, async () => { throw new Error("no debería enviar"); });
});

test("el mail de cancelación nombra la clase y escapa el HTML", () => {
  const mail = buildClassCancellationEmail({
    userEmail: "ana@example.com",
    userName: "<b>Ana</b>",
    className: "Spinning",
    classDate: "2026-11-25",
    startTime: "18:00:00",
    endTime: "19:00:00",
  });

  assert.equal(mail.to, "ana@example.com");
  assert.match(mail.html, /Spinning/);
  assert.match(mail.html, /18:00 a 19:00/);
  assert.doesNotMatch(mail.html, /<b>Ana<\/b>/);
});

test("el endpoint de desactivar informa cuántas reservas se cancelaron", async () => {
  const { db } = createClientDb({
    classes: () => ({ rows: [{ class_id: 7, class_name: "Spinning", status: "inactive" }] }),
    bookings: () => ({ rows: [{ booking_id: 1, user_id: 10 }] }),
  });
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  pool.connect = db.connect;
  pool.query = async () => ({ rows: [] }); // sin mails que enviar
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return value; },
  };

  try {
    await deleteClass({ params: { id: "7" } }, response, () => {});
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.cancelled_bookings, 1);
  assert.match(response.body.message, /1 reserva/);
});
