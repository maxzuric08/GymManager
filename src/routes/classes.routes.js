const express = require("express");
const router = express.Router();
const classController = require("../controllers/classes.controllers");

router.get("/",classController.getClasses);
router.post("/",classController.createClass);
router.put("/:id", classController.updateClass);
router.delete("/:id", classController.deleteClass);

module.exports = router;
