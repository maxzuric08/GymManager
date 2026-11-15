const cron = require("node-cron");
const pool = require("./db");
const { runMembershipExpirationNotifications } = require("./controllers/notifications.controllers");
const { ARGENTINA_TIME_ZONE } = require("./utils/argentinaTime");

const initializeScheduledTasks = ({
  cronClient = cron,
  db = pool,
  runNotifications = runMembershipExpirationNotifications,
} = {}) => {
  console.log("⏰ Inicializando tareas programadas...");

  cronClient.schedule("*/15 * * * *", async () => {
    const result = await runNotifications({ db, trigger: "scheduled" });
    const status = result.success ? "✅" : "❌";
    console.log(`${status} Recordatorio de vencimiento: ${result.sent} enviados, ${result.failed} fallidos, ${result.skipped} omitidos`);
  }, { timezone: ARGENTINA_TIME_ZONE, noOverlap: true });

  cronClient.schedule("0 0 * * *", async () => {
    console.log("\n🗑️ Desactivando planes vencidos...");
    try {
      const result = await db.query(`
        UPDATE users
        SET plan_id = NULL, plan_expiration_date = NULL
        WHERE plan_expiration_date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
          AND plan_id IS NOT NULL
        RETURNING user_id
      `);
      console.log(`✅ ${result.rowCount} membresía(s) vencida(s) desactivada(s)`);
    } catch (error) {
      console.error("❌ Error al desactivar planes vencidos:", error);
    }
  }, { timezone: ARGENTINA_TIME_ZONE, noOverlap: true });

  console.log("✅ Tareas programadas inicializadas");
};

module.exports = initializeScheduledTasks;
