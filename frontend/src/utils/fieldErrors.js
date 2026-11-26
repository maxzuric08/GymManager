// Asocia un mensaje de error del backend con el campo del formulario al que
// se refiere, para mostrarlo junto al campo. Devuelve null si no hay coincidencia
// (en ese caso el formulario cae al modal de error general).
export function mapErrorToField(message, rules) {
  const text = String(message || "");
  const match = rules.find(([pattern]) => pattern.test(text));
  return match ? match[1] : null;
}
