// Reglas estructuradas de un plan. Un único lugar define qué valores son válidos
// y qué significan, para que alta, edición, reserva y pantallas usen lo mismo.
//
// Semántica del límite de reservas (class_limit):
//   - null (campo vacío)  -> sin límite: el socio puede tener cualquier cantidad
//                            de reservas futuras activas a la vez.
//   - entero >= 1         -> máximo de reservas futuras activas simultáneas.
//   - 0 y negativos no se admiten (un plan que no permite reservar no tiene sentido).
// Cancelar una reserva libera un lugar del límite.

const DURATION_UNITS = {
  days: { label: "día(s)", max: 3650 },
  weeks: { label: "semana(s)", max: 520 },
  months: { label: "mes(es)", max: 120 },
};
const PLAN_STATUSES = ["active", "inactive"];
const MAX_COST = 99999999.99; // DECIMAL(10, 2)
const MAX_CLASS_LIMIT = 1000;
const MAX_NAME_LENGTH = 50;
const MAX_BENEFITS_LENGTH = 500;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

function parseInteger(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : NaN;
  const text = String(value).trim();
  return /^-?\d+$/.test(text) ? Number(text) : NaN;
}

function formatDurationLabel(value, unit) {
  return `${value} ${DURATION_UNITS[unit]?.label || unit}`;
}

function describeClassLimit(classLimit) {
  return classLimit === null || classLimit === undefined
    ? "Sin límite de reservas"
    : `Hasta ${classLimit} reserva${Number(classLimit) === 1 ? "" : "s"} futura${Number(classLimit) === 1 ? "" : "s"} activa${Number(classLimit) === 1 ? "" : "s"} a la vez`;
}

// Valida y normaliza los datos de un plan. Devuelve { error, field } si hay un
// problema o { values } con los datos listos para guardar.
function validatePlanInput(body = {}, { partialStatus = false } = {}) {
  const planType = String(body.plan_type ?? "").trim();
  if (!planType) return { error: "El nombre del plan es obligatorio", field: "plan_type" };
  if (planType.length > MAX_NAME_LENGTH) {
    return { error: `El nombre del plan no puede superar ${MAX_NAME_LENGTH} caracteres`, field: "plan_type" };
  }

  if (isBlank(body.cost)) return { error: "El costo es obligatorio", field: "cost" };
  const cost = Number(body.cost);
  if (!Number.isFinite(cost) || cost < 0) return { error: "El costo debe ser un número mayor o igual a 0", field: "cost" };
  if (cost > MAX_COST) return { error: "El costo es demasiado alto", field: "cost" };

  const unit = isBlank(body.duration_unit) ? "months" : String(body.duration_unit).trim();
  if (!Object.hasOwn(DURATION_UNITS, unit)) {
    return { error: "La unidad de duración debe ser días, semanas o meses", field: "duration_unit" };
  }

  const durationValue = isBlank(body.duration_value) ? 1 : parseInteger(body.duration_value);
  if (!Number.isInteger(durationValue) || durationValue < 1) {
    return { error: "La duración debe ser un número entero mayor a 0", field: "duration_value" };
  }
  if (durationValue > DURATION_UNITS[unit].max) {
    return { error: `La duración no puede superar ${DURATION_UNITS[unit].max} ${DURATION_UNITS[unit].label}`, field: "duration_value" };
  }

  let classLimit = null;
  if (!isBlank(body.class_limit)) {
    classLimit = parseInteger(body.class_limit);
    if (!Number.isInteger(classLimit) || classLimit < 1) {
      return { error: "El límite de reservas debe ser un entero mayor o igual a 1 (vacío significa sin límite)", field: "class_limit" };
    }
    if (classLimit > MAX_CLASS_LIMIT) {
      return { error: `El límite de reservas no puede superar ${MAX_CLASS_LIMIT}`, field: "class_limit" };
    }
  }

  const benefits = isBlank(body.benefits) ? null : String(body.benefits).trim();
  if (benefits && benefits.length > MAX_BENEFITS_LENGTH) {
    return { error: `Los beneficios no pueden superar ${MAX_BENEFITS_LENGTH} caracteres`, field: "benefits" };
  }

  let status = "active";
  if (!partialStatus && !isBlank(body.status)) {
    status = String(body.status).trim();
    if (!PLAN_STATUSES.includes(status)) return { error: "El estado del plan no es válido", field: "status" };
  }

  return {
    values: {
      plan_type: planType,
      cost,
      duration: formatDurationLabel(durationValue, unit),
      duration_value: durationValue,
      duration_unit: unit,
      class_limit: classLimit,
      benefits,
      status,
    },
  };
}

module.exports = {
  DURATION_UNITS,
  describeClassLimit,
  formatDurationLabel,
  validatePlanInput,
};
