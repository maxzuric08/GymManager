const express = require("express");
const router = express.Router();
const planController = require("../controllers/plans.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin }= require("../middleware/role.middleware");

router.get("/", verifyToken, planController.getPlans);
router.post("/", verifyToken, requireAdmin, planController.createPlan);
router.put("/:id", verifyToken, requireAdmin,  planController.updatePlan);
router.delete("/:id", verifyToken, requireAdmin, planController.deletePlan);
router.put("/user/:id", verifyToken, planController.updateUserPlan);

module.exports = router;