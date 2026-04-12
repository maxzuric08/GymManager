const express = require("express");
const router = express.Router();
const planController = require("../controllers/plans.controllers");

router.get("/plans", planController.getPlans);
router.post("/addPlan", planController.createPlan);
router.put("/updatePlan", planController.updatePlan);
router.delete("/deletePlan",planController.deletePlan);
router.put("/updateUserPlan", planController.updateUserPlan);

module.exports = router;