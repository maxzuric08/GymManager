const assert = require("node:assert/strict");
const test = require("node:test");

const {
  NO_RESULTS_MESSAGE,
  MAX_CATALOG_CLASSES,
  RecommendationProviderError,
  getAvailableFutureClasses,
  getRecommendations,
} = require("../src/services/recommendations.service");
const { createRecommendationHandler } = require("../src/controllers/recommendations.controllers");
const { createRecommendationsRateLimiter } = require("../src/middleware/recommendationsRateLimit.middleware");

const availableClass = {
  class_id: 11,
  class_name: "Funcional",
  class_date: "2026-12-03",
  start_time: "18:00:00",
  end_time: "19:00:00",
  capacity: 10,
  instructor_id: 7,
  instructor_first_name: "Laura",
  instructor_last_name: "Paz",
  instructor_specialty: "Entrenamiento funcional",
  branch_location: "Pilar",
  booked_count: 8,
};

function databaseWith(rows) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows };
    },
  };
}

function providerWith(outputText) {
  const requests = [];
  return {
    requests,
    responses: {
      async create(request) {
        requests.push(request);
        return { output_text: outputText };
      },
    },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
  };
}

test("el catálogo consulta solo clases futuras, activas, con instructor activo y cupos", async () => {
  const db = databaseWith([availableClass]);

  const classes = await getAvailableFutureClasses(db);

  assert.equal(classes[0].available_slots, 2);
  assert.equal(classes[0].capacity, 10);
  assert.match(db.calls[0].sql, /c\.status IN \('active', 'scheduled'\)/);
  assert.match(db.calls[0].sql, /i\.status = 'active'/);
  assert.match(db.calls[0].sql, /COUNT\(b\.booking_id\).*< c\.capacity/s);
  assert.match(db.calls[0].sql, /c\.class_date > \(CURRENT_TIMESTAMP AT TIME ZONE/);
  assert.match(db.calls[0].sql, /LIMIT \$1/);
  assert.deepEqual(db.calls[0].params, [MAX_CATALOG_CLASSES]);
});

test("convierte IDs válidos del proveedor en datos canónicos del calendario", async () => {
  const db = databaseWith([availableClass]);
  const provider = providerWith(JSON.stringify({
    recommendations: [
      { class_id: 11, justification: "Coincide con tu horario y objetivo de fuerza." },
      { class_id: 999, justification: "No debe aparecer." },
      { class_id: 11, justification: "No debe duplicarse." },
    ],
  }));

  const result = await getRecommendations({
    message: "Busco fuerza después de las 17.",
    db,
    client: provider,
    model: "test-model",
  });

  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].class_id, 11);
  assert.equal(result.recommendations[0].available_slots, 2);
  assert.equal(result.recommendations[0].instructor.specialty, "Entrenamiento funcional");
  assert.equal(provider.requests[0].model, "test-model");
  assert.match(provider.requests[0].input[0].content, /CATÁLOGO DISPONIBLE/);
  assert.match(provider.requests[0].input[0].content, /"class_id":11/);
  assert.equal(provider.requests[0].text.format.type, "json_schema");
});

test("no invoca al proveedor cuando no hay clases elegibles", async () => {
  const db = databaseWith([]);
  let providerCalled = false;

  const result = await getRecommendations({
    message: "Quiero pilates",
    db,
    client: { responses: { async create() { providerCalled = true; } } },
  });

  assert.equal(providerCalled, false);
  assert.equal(result.message, NO_RESULTS_MESSAGE);
  assert.deepEqual(result.recommendations, []);
});

test("un fallo o una respuesta inválida del proveedor se traduce a un error seguro", async () => {
  const db = databaseWith([availableClass]);
  const unavailableProvider = { responses: { async create() { throw new Error("credential leaked"); } } };

  await assert.rejects(
    getRecommendations({ message: "Quiero cardio", db, client: unavailableProvider }),
    RecommendationProviderError,
  );

  await assert.rejects(
    getRecommendations({ message: "Quiero cardio", db, client: providerWith("no es JSON") }),
    RecommendationProviderError,
  );
});

test("el endpoint valida la consulta y devuelve el error entendible del proveedor", async () => {
  const handler = createRecommendationHandler({
    recommend: async () => { throw new RecommendationProviderError("Servicio de recomendaciones no disponible."); },
  });
  const invalidResponse = createResponse();
  await handler({ body: { message: " " } }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);

  const providerResponse = createResponse();
  await handler({ body: { message: "Busco yoga" } }, providerResponse);
  assert.equal(providerResponse.statusCode, 503);
  assert.equal(providerResponse.body.error, "Servicio de recomendaciones no disponible.");
});

test("limita las consultas de recomendaciones por socio", () => {
  let currentTime = 1_000;
  const limiter = createRecommendationsRateLimiter({ max: 2, windowMs: 60_000, now: () => currentTime });
  const req = { user: { id: 10 } };
  const response = createResponse();
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };

  limiter(req, response, next);
  limiter(req, response, next);
  limiter(req, response, next);

  assert.equal(nextCalls, 2);
  assert.equal(response.statusCode, 429);
  assert.match(response.body.error, /límite de consultas/);

  currentTime += 60_001;
  limiter(req, response, next);
  assert.equal(nextCalls, 3);
});
