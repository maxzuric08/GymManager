const express = require("express");
const router = express.Router();
const instructorController = require("../controllers/instructors.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin, requireInstructor, requireRole } = require("../middleware/role.middleware");

router.get("/", verifyToken, requireAdmin, instructorController.getInstructors);
router.post("/", verifyToken, requireAdmin,instructorController.createInstructor);
router.put("/availability/me", verifyToken, requireInstructor, instructorController.updateMyAvailability);
router.post("/deactivate/me", verifyToken, requireInstructor, instructorController.deactivateMyAccount);
router.post("/reactivate/me", verifyToken, requireRole("instructor"), instructorController.reactivateMyAccount);
router.put("/:id/reactivate", verifyToken, requireAdmin, instructorController.reactivateInstructor);
router.put("/:id", verifyToken, requireAdmin, instructorController.updateInstructor);
router.delete("/:id", verifyToken, requireAdmin, instructorController.deleteInstructor);

module.exports = router;
