const { sendMembershipConfirmationEmail } = require("./emailService");

function toDateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function calculateExpirationDate(durationValue, durationUnit, startDate = new Date()) {
  const start = toDateOnly(startDate);
  const expiration = new Date(`${start}T00:00:00.000Z`);
  const value = Number.parseInt(durationValue, 10) || 1;
  const unit = String(durationUnit || "months").toLowerCase();

  if (["days", "día", "días"].includes(unit)) {
    expiration.setUTCDate(expiration.getUTCDate() + value);
  } else if (["weeks", "semana", "semanas"].includes(unit)) {
    expiration.setUTCDate(expiration.getUTCDate() + (value * 7));
  } else {
    expiration.setUTCMonth(expiration.getUTCMonth() + value);
  }

  return expiration.toISOString().slice(0, 10);
}

async function getActivePlan(client, planId) {
  if (!planId) return null;
  const result = await client.query(
    "SELECT * FROM plans WHERE plan_id = $1 AND status = 'active'",
    [planId]
  );
  return result.rows[0] || null;
}

async function assignMembership(client, { userId, plan, startDate = new Date() }) {
  const membershipStart = toDateOnly(startDate);
  const expirationDate = calculateExpirationDate(
    plan.duration_value,
    plan.duration_unit,
    membershipStart
  );
  const result = await client.query(
    `UPDATE users
        SET plan_id = $1, plan_expiration_date = $2
      WHERE user_id = $3
      RETURNING user_id, branch_id, plan_id, username, dni, first_name, last_name,
                email, phone, user_status, birth_date, registration_date, plan_expiration_date`,
    [plan.plan_id, expirationDate, userId]
  );

  return {
    user: result.rows[0] || null,
    startDate: membershipStart,
    expirationDate,
  };
}

async function notifyMembershipConfirmation({ user, plan, startDate }) {
  if (!user?.email) {
    console.error(`No se envio la confirmacion de membresia: el usuario ${user?.user_id} no tiene email`);
    return false;
  }

  try {
    const sent = await sendMembershipConfirmationEmail({
      userEmail: user.email,
      userName: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username,
      plan,
      startDate,
      expirationDate: user.plan_expiration_date,
    });
    if (!sent) console.error(`No se pudo enviar la confirmacion de membresia al usuario ${user.user_id}`);
    return sent;
  } catch (error) {
    console.error(`No se pudo enviar la confirmacion de membresia al usuario ${user.user_id}:`, error);
    return false;
  }
}

module.exports = {
  assignMembership,
  calculateExpirationDate,
  getActivePlan,
  notifyMembershipConfirmation,
  toDateOnly,
};
