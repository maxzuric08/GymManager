const express = require("express");
const router = express.Router();
const planController = require("../controllers/plans.controllers");

router.get("/", planController.getPlans);
router.post("/", planController.createPlan);
router.put("/:id", planController.updatePlan);
router.delete("/:id",planController.deletePlan);
router.put("/:id", planController.updateUserPlan);

module.exports = router;