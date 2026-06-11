const { Router } = require("express");
const router = Router();
const { getUserBookings, createBooking, cancelBooking, getClassStudents } = require("../controllers/bookings.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireUser } = require("../middleware/role.middleware");

router.get("/my-bookings", verifyToken, requireUser, getUserBookings);
router.get("/class/:classId/students", verifyToken, getClassStudents);
router.post("/", verifyToken, requireUser, createBooking);
router.put("/:id/cancel", verifyToken, requireUser, cancelBooking);

module.exports = router;
