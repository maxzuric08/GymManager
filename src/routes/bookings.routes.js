const { Router } = require("express");
const router = Router();
const { getUserBookings, createBooking, cancelBooking } = require("../controllers/bookings.controllers");
const verifyToken = require("../middleware/auth.middleware");

router.get("/user/:userId", verifyToken, getUserBookings);
router.post("/", verifyToken,createBooking);
router.put("/cancel/:id", verifyToken, cancelBooking);

module.exports = router;