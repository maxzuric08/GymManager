const express = require("express");
const router = express.Router();
const instructorController = require("../controllers/instructors.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/role.middleware");

router.get("/", verifyToken, instructorController.getInstructors);
router.post("/", verifyToken, requireAdmin,instructorController.createInstructor);
router.put("/:id", verifyToken, requireAdmin, instructorController.updateInstructor);
router.delete("/:id", verifyToken, requireAdmin, instructorController.deleteInstructor);

module.exports = router;