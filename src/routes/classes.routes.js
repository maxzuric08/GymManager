const express = require("express");
const router = express.Router();
const classController = require("../controllers/classes.controllers");

router.get("/Classes",classController.getClasses);
router.post("/AddClass",classController.createClass);
router.put("/UpdateClass", classController.updateClass);
router.delete("/DeleteClass", classController.deleteClass);

module.exports = router;
