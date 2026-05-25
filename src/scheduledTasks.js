const cron = require('node-cron');
const { sendMembershipExpirationNotifications } = require('./controllers/notifications.controllers');

// Ejecutar verificación de membresías a vencer todos los días a las 8 AM
const initializeScheduledTasks = () => {
  console.log("⏰ Inicializando tareas programadas...");

  // Cron: 0 8 * * * = todos los días a las 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log("\n🔔 Ejecutando verificación de membresías próximas a vencer...");
    try {
      const result = await sendMembershipExpirationNotifications();
      console.log(`✅ Tarea completada: ${result.sent} emails enviados`);
    } catch (error) {
      console.error("❌ Error en tarea programada:", error);
    }
  });

  console.log("✅ Tareas programadas inicializadas (diariamente a las 8 AM)");
};

module.exports = initializeScheduledTasks;
