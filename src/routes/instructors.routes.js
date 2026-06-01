const express = require("express");
const router = express.Router();
const instructorController = require("../controllers/instructors.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/role.middleware");

router.get("/", verifyToken, instructorController.getInstructors);
router.post("/", verifyToken, requireAdmin,instructorController.createInstructor);
router.post("/deactivate/me", verifyToken, instructorController.deactivateMyAccount);
router.post("/reactivate/me", verifyToken, instructorController.reactivateMyAccount);
router.put("/:id/reactivate", verifyToken, requireAdmin, instructorController.reactivateInstructor);
router.put("/:id", verifyToken, requireAdmin, instructorController.updateInstructor);
router.delete("/:id", verifyToken, requireAdmin, instructorController.deleteInstructor);

module.exports = router;