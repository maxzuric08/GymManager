const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const pool = require("../src/db");
const { login } = require("../src/controllers/auth.controllers");
const { hashPassword, verifyPassword, isBcryptHash } = require("../src/utils/password");

// Contraseñas de prueba generadas en cada corrida: evitan literales que los escáneres de secretos marcan.
const randomPassword = () => crypto.randomBytes(9).toString("hex");
const PLAIN = randomPassword();
const OTHER = randomPassword();

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return value; },
});

async function runLogin(body, rows) {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return sql.startsWith("SELECT") ? { rows } : { rows: [] };
  };
  const res = createResponse();
  try {
    await login({ body }, res);
  } finally {
    pool.query = originalQuery;
  }
  return { res, calls };
}

test("hashPassword genera un hash bcrypt verificable y distinto del texto plano", async () => {
  const hash = await hashPassword(PLAIN);
  assert.ok(isBcryptHash(hash));
  assert.notEqual(hash, PLAIN);
  assert.equal(await bcrypt.compare(PLAIN, hash), true);
});

test("verifyPassword valida hashes, rechaza claves incorrectas y marca legacy para rehash", async () => {
  const hash = await hashPassword(PLAIN);
  assert.deepEqual(await verifyPassword(PLAIN, hash), { valid: true, needsRehash: false });
  assert.deepEqual(await verifyPassword(OTHER, hash), { valid: false, needsRehash: false });
  assert.deepEqual(await verifyPassword(PLAIN, PLAIN), { valid: true, needsRehash: true });
  assert.deepEqual(await verifyPassword(OTHER, PLAIN), { valid: false, needsRehash: false });
  assert.deepEqual(await verifyPassword(undefined, hash), { valid: false, needsRehash: false });
});

test("login con contraseña hasheada correcta devuelve token sin exponer el hash", async () => {
  const hash = await hashPassword(PLAIN);
  const { res, calls } = await runLogin(
    { username: "admin1", password: PLAIN, role: "admin" },
    [{ admin_id: 1, username: "admin1", password: hash }]
  );

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.password, undefined);
  assert.equal(calls.length, 1, "no debe reescribir el hash si ya era válido");
  assert.deepEqual(calls[0].params, ["admin1"], "la contraseña nunca viaja en la consulta SQL");
});

test("login con contraseña incorrecta o usuario inexistente responde 401", async () => {
  const hash = await hashPassword(PLAIN);
  const wrong = await runLogin({ username: "admin1", password: OTHER, role: "admin" }, [{ admin_id: 1, password: hash }]);
  const missing = await runLogin({ username: "nadie", password: PLAIN, role: "admin" }, []);

  assert.equal(wrong.res.statusCode, 401);
  assert.equal(missing.res.statusCode, 401);
});

test("login con contraseña legacy en texto plano migra a hash en el primer ingreso", async () => {
  const { res, calls } = await runLogin(
    { username: "juan123", password: PLAIN, role: "user" },
    [{ user_id: 7, username: "juan123", password: PLAIN, user_status: "active" }]
  );

  assert.equal(res.statusCode, 200);
  const update = calls.find((call) => call.sql.startsWith("UPDATE users"));
  assert.ok(update, "debe guardar el hash");
  assert.ok(isBcryptHash(update.params[0]));
  assert.equal(update.params[1], 7);
});

test("login rechaza roles inválidos, incluidos nombres heredados de Object", async () => {
  for (const role of ["superuser", "constructor", "__proto__"]) {
    const { res } = await runLogin({ username: "a", password: OTHER, role }, []);
    assert.equal(res.statusCode, 400, role);
  }
});

test("login de instructor inactivo sigue bloqueado aunque la clave sea correcta", async () => {
  const hash = await hashPassword(PLAIN);
  const { res } = await runLogin(
    { username: "ins", password: PLAIN, role: "instructor" },
    [{ instructor_id: 3, username: "ins", password: hash, status: "inactive" }]
  );
  assert.equal(res.statusCode, 403);
});

test("crear instructor guarda la contraseña hasheada y no en texto plano", async () => {
  const { createInstructor } = require("../src/controllers/instructors.controllers");
  const originalQuery = pool.query;
  let insertParams = null;
  pool.query = async (sql, params) => {
    insertParams = params;
    return { rows: [{ instructor_id: 1, username: params[0] }] };
  };
  const res = createResponse();

  try {
    await createInstructor({
      body: {
        username: "nuevo", password: PLAIN, specialty: "Yoga", email: "n@gym.com",
        first_name: "Nuevo", last_name: "Instructor", dni: "30111222", branch_id: 1,
        available_from: "08:00", available_to: "16:00",
      },
    }, res);
  } finally {
    pool.query = originalQuery;
  }

  assert.equal(res.statusCode, 201, JSON.stringify(res.body));
  assert.ok(isBcryptHash(insertParams[1]));
  assert.equal(await bcrypt.compare(PLAIN, insertParams[1]), true);
  assert.equal(res.body.password, undefined);
});
