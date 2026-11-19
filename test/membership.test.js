const assert = require("node:assert/strict");
const test = require("node:test");

const {
  assignMembership,
  calculateExpirationDate,
} = require("../src/services/membership.service");
const { buildMembershipConfirmationEmail } = require("../src/services/emailService");
const { processPayment } = require("../src/controllers/payments.controllers");

const plan = {
  plan_id: 3,
  plan_type: "Premium",
  cost: 12000,
  benefits: "Musculacion y clases",
  class_limit: 8,
  duration_value: 1,
  duration_unit: "months",
};

test("calcula los vencimientos desde una unica regla", () => {
  assert.equal(calculateExpirationDate(10, "days", "2026-01-25"), "2026-02-04");
  assert.equal(calculateExpirationDate(2, "weeks", "2026-01-25"), "2026-02-08");
  assert.equal(calculateExpirationDate(1, "months", "2026-01-25"), "2026-02-25");
});

test("asignar una membresia actualiza el plan y devuelve sus fechas", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return {
        rows: [{ user_id: 7, username: "ana", first_name: "Ana", email: "ana@example.com", plan_id: 3, plan_expiration_date: params[1] }],
      };
    },
  };

  const membership = await assignMembership(client, { userId: 7, plan, startDate: "2026-01-25" });

  assert.equal(membership.startDate, "2026-01-25");
  assert.equal(membership.expirationDate, "2026-02-25");
  assert.deepEqual(calls[0].params, [3, "2026-02-25", 7]);
});

test("el email de confirmacion incluye los datos de la membresia", () => {
  const email = buildMembershipConfirmationEmail({
    userEmail: "ana@example.com",
    userName: "Ana <Socio>",
    plan,
    startDate: "2026-01-25",
    expirationDate: "2026-02-25",
  });

  assert.equal(email.to, "ana@example.com");
  assert.match(email.subject, /Confirmacion/);
  assert.match(email.html, /Premium/);
  assert.match(email.html, /12\.000/);
  assert.match(email.html, /Musculacion y clases/);
  assert.match(email.html, /Ana &lt;Socio&gt;/);
});

function paymentDependencies({ status = "approved", processedAt = null } = {}) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes("FROM payments pay")) {
        return {
          rows: [{
            ...plan,
            payment_id: 20,
            user_id: 7,
            processed_at: processedAt,
            current_plan_id: null,
            current_plan_expiration_date: null,
            username: "ana",
            first_name: "Ana",
            last_name: "Gimenez",
            email: "ana@example.com",
          }],
        };
      }
      if (sql.includes("UPDATE users")) {
        return {
          rows: [{
            user_id: 7,
            username: "ana",
            first_name: "Ana",
            last_name: "Gimenez",
            email: "ana@example.com",
            plan_id: 3,
            plan_expiration_date: params[1],
          }],
        };
      }
      return { rows: [] };
    },
    release() {},
  };
  const notifications = [];
  return {
    queries,
    notifications,
    dependencies: {
      pool: { async connect() { return client; } },
      mercadoPago: {
        async getPayment() {
          return {
            id: "mp-1",
            external_reference: "gym-payment-20",
            transaction_amount: 12000,
            currency_id: "ARS",
            status,
            status_detail: status,
            payment_method_id: "visa",
            date_approved: "2026-01-25T10:00:00Z",
          };
        },
      },
      async sendMembershipConfirmation(payload) { notifications.push(payload); },
    },
  };
}

test("un pago aprobado confirma una sola vez la membresia", async () => {
  const fixture = paymentDependencies();
  await processPayment("mp-1", fixture.dependencies);

  assert.equal(fixture.notifications.length, 1);
  assert.equal(fixture.notifications[0].user.email, "ana@example.com");
  assert.ok(fixture.queries.some(({ sql }) => sql.includes("processed_at = CURRENT_TIMESTAMP")));
});

test("pagos no aprobados o ya procesados no envian confirmacion", async () => {
  const pending = paymentDependencies({ status: "pending" });
  await processPayment("mp-1", pending.dependencies);
  assert.equal(pending.notifications.length, 0);

  const repeated = paymentDependencies({ processedAt: "2026-01-25T10:30:00Z" });
  await processPayment("mp-1", repeated.dependencies);
  assert.equal(repeated.notifications.length, 0);
});
