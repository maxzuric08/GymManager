const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin, requireUser } = require("../middleware/role.middleware");

router.get("/", verifyToken, requireAdmin, userController.getUsers);
router.post("/", verifyToken, requireAdmin, userController.createUser);
router.post("/deactivate/me", verifyToken, requireUser, userController.deactivateMyAccount);
router.post("/reactivate/me", verifyToken, requireUser, userController.reactivateMyAccount);
router.put("/:id/reactivate", verifyToken, requireAdmin, userController.reactivateUser);
router.put("/:id", verifyToken, requireAdmin, userController.updateUser);
router.delete("/:id", verifyToken, requireAdmin, userController.deleteUser);

module.exports = router;
