const OpenAI = require("openai");
const pool = require("../db");

const ARGENTINA_SQL_DATE = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date";
const ARGENTINA_SQL_TIME = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::time";
const MAX_CATALOG_CLASSES = 100;
const NO_RESULTS_MESSAGE = "No encontré clases con cupos disponibles que coincidan con tu consulta por ahora. Podés revisar la cartelera más tarde o probar con otro horario u objetivo.";
const DISCLAIMER = "Esta sugerencia es orientativa y se basa en la oferta disponible del gimnasio.";

class RecommendationProviderError extends Error {
  constructor(message = "No pudimos generar una recomendación en este momento. Intentá nuevamente más tarde.") {
    super(message);
    this.name = "RecommendationProviderError";
    this.status = 503;
  }
}

async function getAvailableFutureClasses(db = pool) {
  const result = await db.query(`
    SELECT c.class_id,
           c.class_name,
           c.class_date,
           c.start_time,
           c.end_time,
           c.capacity,
           i.instructor_id,
           i.first_name AS instructor_first_name,
           i.last_name AS instructor_last_name,
           i.specialty AS instructor_specialty,
           br.location AS branch_location,
           COUNT(b.booking_id) FILTER (WHERE b.status = 'confirmed')::integer AS booked_count
      FROM classes c
      JOIN instructors i ON i.instructor_id = c.instructor_id
 LEFT JOIN branches br ON br.branch_id = c.branch_id
 LEFT JOIN bookings b ON b.class_id = c.class_id
     WHERE c.status IN ('active', 'scheduled')
       AND i.status = 'active'
       AND (
         c.class_date > ${ARGENTINA_SQL_DATE}
         OR (c.class_date = ${ARGENTINA_SQL_DATE} AND c.start_time > ${ARGENTINA_SQL_TIME})
       )
  GROUP BY c.class_id, i.instructor_id, br.location
    HAVING c.capacity IS NULL
        OR COUNT(b.booking_id) FILTER (WHERE b.status = 'confirmed') < c.capacity
  ORDER BY c.class_date ASC, c.start_time ASC
  LIMIT $1
  `, [MAX_CATALOG_CLASSES]);

  return result.rows.map((gymClass) => ({
    ...gymClass,
    capacity: gymClass.capacity === null ? null : Number(gymClass.capacity),
    booked_count: Number(gymClass.booked_count),
    available_slots: gymClass.capacity === null
      ? null
      : Number(gymClass.capacity) - Number(gymClass.booked_count),
  }));
}

function buildCatalogContext(classes) {
  return classes.map((gymClass) => ({
    class_id: gymClass.class_id,
    clase: gymClass.class_name,
    fecha: String(gymClass.class_date).slice(0, 10),
    inicio: String(gymClass.start_time).slice(0, 5),
    fin: String(gymClass.end_time).slice(0, 5),
    cupos_disponibles: gymClass.available_slots,
    capacidad: gymClass.capacity,
    sede: gymClass.branch_location || null,
    instructor: {
      id: gymClass.instructor_id,
      nombre: [gymClass.instructor_first_name, gymClass.instructor_last_name].filter(Boolean).join(" ") || "Instructor asignado",
      especialidad: gymClass.instructor_specialty || null,
    },
  }));
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new RecommendationProviderError("Las recomendaciones no están configuradas en este momento. Consultá nuevamente más tarde.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getStructuredResponseFormat() {
  return {
    type: "json_schema",
    name: "gym_recommendations",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["recommendations"],
      properties: {
        recommendations: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["class_id", "justification"],
            properties: {
              class_id: { type: "integer" },
              justification: { type: "string" },
            },
          },
        },
      },
    },
  };
}

function buildDeveloperPrompt(catalog) {
  return [
    "Sos el asistente de recomendaciones de un gimnasio. Respondés siempre en castellano.",
    "Elegí únicamente class_id presentes en el catálogo. No inventes clases, horarios, cupos, instructores ni especialidades.",
    "Priorizá la consulta del socio (objetivo, horario o preferencia) y devolvé entre una y tres alternativas. Si ninguna sirve, devolvé una lista vacía.",
    "La justificación debe ser breve, amable y referirse solo a la información provista.",
    `CATÁLOGO DISPONIBLE:\n${JSON.stringify(catalog)}`,
  ].join("\n\n");
}

function parseProviderRecommendations(outputText, candidatesById) {
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new RecommendationProviderError();
  }

  if (!Array.isArray(parsed?.recommendations)) {
    throw new RecommendationProviderError();
  }

  const usedIds = new Set();
  return parsed.recommendations.reduce((recommendations, item) => {
    if (recommendations.length === 3) return recommendations;
    const classId = Number(item?.class_id);
    const gymClass = candidatesById.get(classId);
    if (!gymClass || usedIds.has(classId) || typeof item?.justification !== "string") return recommendations;

    usedIds.add(classId);
    recommendations.push({
      class_id: gymClass.class_id,
      class_name: gymClass.class_name,
      class_date: gymClass.class_date,
      start_time: gymClass.start_time,
      end_time: gymClass.end_time,
      capacity: gymClass.capacity,
      available_slots: gymClass.available_slots,
      branch_location: gymClass.branch_location,
      instructor: {
        instructor_id: gymClass.instructor_id,
        first_name: gymClass.instructor_first_name,
        last_name: gymClass.instructor_last_name,
        specialty: gymClass.instructor_specialty,
      },
      justification: item.justification.trim().slice(0, 280),
    });
    return recommendations;
  }, []);
}

async function getRecommendations({ message, db = pool, client, model = process.env.OPENAI_MODEL || "gpt-6-luna" }) {
  const availableClasses = await getAvailableFutureClasses(db);
  if (availableClasses.length === 0) {
    return { disclaimer: DISCLAIMER, message: NO_RESULTS_MESSAGE, recommendations: [] };
  }

  const openai = client || getOpenAIClient();
  let response;
  try {
    response = await openai.responses.create({
      model,
      input: [
        { role: "developer", content: buildDeveloperPrompt(buildCatalogContext(availableClasses)) },
        { role: "user", content: message },
      ],
      text: { format: getStructuredResponseFormat() },
    });
  } catch (error) {
    console.error("Recommendation provider request failed");
    throw new RecommendationProviderError();
  }

  const candidatesById = new Map(availableClasses.map((gymClass) => [Number(gymClass.class_id), gymClass]));
  const recommendations = parseProviderRecommendations(response.output_text, candidatesById);
  if (recommendations.length === 0) {
    return { disclaimer: DISCLAIMER, message: NO_RESULTS_MESSAGE, recommendations: [] };
  }

  return {
    disclaimer: DISCLAIMER,
    message: "Estas son las alternativas que mejor coinciden con lo que buscás:",
    recommendations,
  };
}

module.exports = {
  DISCLAIMER,
  MAX_CATALOG_CLASSES,
  NO_RESULTS_MESSAGE,
  RecommendationProviderError,
  buildCatalogContext,
  getAvailableFutureClasses,
  getOpenAIClient,
  getRecommendations,
  parseProviderRecommendations,
};
