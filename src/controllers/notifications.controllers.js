const pool = require("../db");
const { sendMembershipExpirationEmail } = require("../services/emailService");

const sendMembershipExpirationNotifications = async (req, res) => {
  try {
    console.log("🔔 Iniciando verificación de membresías próximas a vencer...");

    // Obtener usuarios cuyas membresías vencen en los próximos 7 días
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT u.user_id, u.first_name, u.email, u.plan_expiration_date, p.plan_type
       FROM users u
       JOIN plans p ON u.plan_id = p.plan_id
       WHERE u.plan_expiration_date BETWEEN $1 AND $2
       AND u.email IS NOT NULL
       AND u.email != ''`,
      [today, sevenDaysFromNowStr]
    );

    console.log(`📧 Encontrados ${result.rows.length} usuarios con membresías próximas a vencer`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const user of result.rows) {
      const success = await sendMembershipExpirationEmail(
        user.email,
        user.first_name || user.user_id,
        user.plan_type,
        user.plan_expiration_date
      );

      if (success) {
        emailsSent++;
      } else {
        emailsFailed++;
      }
    }

    const message = `✅ Notificaciones enviadas: ${emailsSent} exitosas, ${emailsFailed} fallidas`;
    console.log(message);

    if (res) {
      res.json({
        message,
        processed: result.rows.length,
        sent: emailsSent,
        failed: emailsFailed
      });
    }

    return { success: true, sent: emailsSent, failed: emailsFailed };
  } catch (error) {
    console.error("❌ Error enviando notificaciones de membresía:", error);
    if (res) {
      res.status(500).json({ error: "Error enviando notificaciones" });
    }
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendMembershipExpirationNotifications
};
