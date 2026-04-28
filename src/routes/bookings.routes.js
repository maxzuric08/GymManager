const { Router } = require("express");
const router = Router();
const { getUserBookings, createBooking, cancelBooking } = require("../controllers/bookings.controllers");

router.get("/user/:userId", getUserBookings);
router.post("/", createBooking);
router.put("/cancel/:id", cancelBooking);

module.exports = router;