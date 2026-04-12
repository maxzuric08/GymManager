const express = require("express");
const router = express.Router();
const instructorController = require("../controllers/instructors.controllers");

router.get("/instructors", instructorController.getInstructors);
router.post("/addInstructor", instructorController.createInstructor);
router.put("/updateInstructor"), instructorController.updateInstructor);
router.delete("/deleteInstructor"), instructorController.deleteInstructor);

module.exports = router;