const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controllers");
const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/role.middleware");

router.get("/", verifyToken, requireAdmin, userController.getUsers);
router.post("/", verifyToken, requireAdmin, userController.createUser);
router.put("/:id", verifyToken, requireAdmin, userController.updateUser);
router.delete("/:id", verifyToken, requireAdmin, userController.deleteUser);

module.exports = router;