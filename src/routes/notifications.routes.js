const express = require("express");
const router = express.Router();
const { sendMembershipExpirationNotifications } = require("../controllers/notifications.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/role.middleware");

// Solo admins pueden ejecutar manualmente las notificaciones
router.post("/send-expiration-reminders", verifyToken, requireAdmin, sendMembershipExpirationNotifications);

module.exports = router;
