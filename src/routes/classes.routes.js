const express = require("express");
const router = express.Router();
const classController = require("../controllers/classes.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/role.middleware");

router.get("/",verifyToken, classController.getClasses);
router.post("/",verifyToken, requireAdmin,classController.createClass);
router.put("/:id", verifyToken, classController.updateClass);
router.delete("/:id", verifyToken, requireAdmin, classController.deleteClass);

module.exports = router;
