require("dotenv").config();
const pool = require("./db");
const { sendMembershipExpirationNotifications } = require("./controllers/notifications.controllers");

const testMembershipExpiration = async () => {
  try {
    console.log("🧪 Iniciando prueba de notificaciones de membresía...\n");

    // 1. Crear un plan de prueba que vence mañana
    console.log("1️⃣ Creando plan de prueba (vence mañana)...");
    const planResult = await pool.query(
      `INSERT INTO plans (plan_type, cost, duration, benefits, class_limit, status, duration_value, duration_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ["Plan Prueba", "9999", "1 día", "Plan de prueba", 10, "active", 1, "days"]
    );
    const testPlanId = planResult.rows[0].plan_id;
    console.log(`✅ Plan creado: ID ${testPlanId}\n`);

    // 2. Crear un usuario de prueba con email
    console.log("2️⃣ Creando usuario de prueba...");
    const randomDni = Math.floor(Math.random() * 99999999).toString();
    const userResult = await pool.query(
      `INSERT INTO users (username, password, first_name, last_name, email, dni, plan_id, plan_expiration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        `usuarioPrueba${Date.now()}`,
        "password123",
        "Usuario",
        "Prueba",
        "maxzuric.08@gmail.com",  // 👈 CAMBIAR A TU EMAIL
        randomDni,
        testPlanId,
        new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] // Mañana
      ]
    );
    const testUserId = userResult.rows[0].user_id;
    console.log(`✅ Usuario creado: ID ${testUserId}, Email: maxzuric.08@gmail.comn`);

    // 3. Enviar notificaciones
    console.log("3️⃣ Enviando notificaciones...");
    const result = await sendMembershipExpirationNotifications();
    console.log(`✅ ${result.sent} emails enviados\n`);

    // 4. Mostrar datos
    console.log("📋 Datos de prueba creados:");
    console.log(`   - Plan ID: ${testPlanId}`);
    console.log(`   - Usuario ID: ${testUserId}`);
    console.log(`   - Vencimiento: Mañana (${new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('es-AR')})`);
    console.log(`   - Email: maxzuric.08@gmail.com\n`);

    console.log("✅ Prueba completada!\n");
    console.log("Nota: Revisa tu email en maxzuric.08@gmail.com para ver la notificación");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en la prueba:", error);
    process.exit(1);
  }
};

testMembershipExpiration();
