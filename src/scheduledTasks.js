const cron = require('node-cron');
const pool = require('./db');
const { sendMembershipExpirationNotifications } = require('./controllers/notifications.controllers');

const initializeScheduledTasks = () => {
  console.log("⏰ Inicializando tareas programadas...");

  // Notificaciones de vencimiento — todos los días a las 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log("\n🔔 Ejecutando verificación de membresías próximas a vencer...");
    try {
      const result = await sendMembershipExpirationNotifications();
      console.log(`✅ Tarea completada: ${result.sent} emails enviados`);
    } catch (error) {
      console.error("❌ Error en tarea programada:", error);
    }
  });

  // Desactivación de planes vencidos — todos los días a medianoche
  cron.schedule('0 0 * * *', async () => {
    console.log("\n🗑️ Desactivando planes vencidos...");
    try {
      const result = await pool.query(`
        UPDATE users
        SET plan_id = NULL, plan_expiration_date = NULL
        WHERE plan_expiration_date < CURRENT_DATE
          AND plan_id IS NOT NULL
        RETURNING user_id
      `);
      console.log(`✅ ${result.rowCount} membresía(s) vencida(s) desactivada(s)`);
    } catch (error) {
      console.error("❌ Error al desactivar planes vencidos:", error);
    }
  });

  console.log("✅ Tareas programadas inicializadas");
};

module.exports = initializeScheduledTasks;
