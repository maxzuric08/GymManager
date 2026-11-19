require("dotenv").config();

const pool = require("./db");
const { runMembershipExpirationNotifications } = require("./controllers/notifications.controllers");

const simulateMembershipExpirationCheck = async () => {
  try {
    console.log("🧪 Simulando chequeo de vencimientos de membresía...\n");

    const result = await runMembershipExpirationNotifications({
      db: pool,
      dryRun: true,
      trigger: "manual",
    });

    console.log(`Fecha objetivo: ${result.expirationDate}`);
    console.log(`Socios elegibles: ${result.candidates.length}`);

    for (const user of result.candidates) {
      console.log(`- Usuario ${user.user_id}: ${user.email} (${user.plan_type})`);
    }

    console.log("\n✅ Simulación completada: no se crearon usuarios, planes, envíos ni registros.");
  } catch (error) {
    console.error("❌ Error en la simulación:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

simulateMembershipExpirationCheck();
