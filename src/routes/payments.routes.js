const express = require("express");
const controller = require("../controllers/payments.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireUser, requireAdmin } = require("../middleware/role.middleware");

const router = express.Router();
router.post("/webhook", controller.webhook);
router.get("/return", controller.paymentReturn);
router.get("/all", verifyToken, requireAdmin, controller.getAllPayments);
router.get("/me", verifyToken, requireUser, controller.getMyPayments);
router.post("/checkout", verifyToken, requireUser, controller.createCheckout);

module.exports = router;
