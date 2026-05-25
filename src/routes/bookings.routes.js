const { Router } = require("express");
const router = Router();
const { getUserBookings, createBooking, cancelBooking, getClassStudents } = require("../controllers/bookings.controllers");
const verifyToken = require("../middleware/auth.middleware");

router.get("/my-bookings", verifyToken, getUserBookings);
router.get("/class/:classId/students", verifyToken, getClassStudents);
router.post("/", verifyToken, createBooking);
router.put("/:id/cancel", verifyToken, cancelBooking);

module.exports = router;