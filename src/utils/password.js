const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

// Un hash bcrypt siempre empieza con $2a$, $2b$ o $2y$ y mide 60 caracteres.
const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$.{53}$/.test(value);

const hashPassword = (plainPassword) => bcrypt.hash(String(plainPassword), SALT_ROUNDS);

// Compara una contraseña ingresada contra lo guardado. Acepta contraseñas
// legacy en texto plano (todavía no migradas) y avisa con needsRehash para que
// el login las convierta a hash la primera vez que el usuario entra.
async function verifyPassword(plainPassword, storedPassword) {
  if (typeof plainPassword !== "string" || typeof storedPassword !== "string" || !storedPassword) {
    return { valid: false, needsRehash: false };
  }

  if (isBcryptHash(storedPassword)) {
    return { valid: await bcrypt.compare(plainPassword, storedPassword), needsRehash: false };
  }

  return { valid: plainPassword === storedPassword, needsRehash: plainPassword === storedPassword };
}

module.exports = { hashPassword, verifyPassword, isBcryptHash };
