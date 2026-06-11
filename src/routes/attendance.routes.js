const express = require("express");
const router = express.Router();
const controller = require("../controllers/attendance.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/role.middleware");

router.get("/statistics/overview", verifyToken, requireAdmin, controller.getAttendanceOverview);
router.get("/classes/:classId/statistics", verifyToken, requireAdmin, controller.getClassAttendanceStatistics);
router.get("/classes/:classId", verifyToken, requireAdmin, controller.getClassAttendance);
router.put("/classes/:classId", verifyToken, requireAdmin, controller.saveClassAttendance);

module.exports = router;
