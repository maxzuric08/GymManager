const express = require("express");
const router = express.Router();
const planController = require("../controllers/plans.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin }= require("../middleware/role.middleware");

router.get("/", verifyToken, planController.getPlans);
router.post("/", verifyToken, requireAdmin, planController.createPlan);
router.put("/user/:id", verifyToken, requireAdmin, planController.updateUserPlan);
router.put("/user/:id/remove-membership", verifyToken, requireAdmin, planController.removeMembership);
router.put("/:id/deactivate", verifyToken, requireAdmin, planController.deactivatePlan);
router.put("/:id/reactivate", verifyToken, requireAdmin, planController.reactivatePlan);
router.put("/:id", verifyToken, requireAdmin, planController.updatePlan);

module.exports = router;
