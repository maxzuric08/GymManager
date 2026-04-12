const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controllers");

router.get("/users", userController.getUsers);
router.post("/addUser", userController.createUser);
router.put("/updateUser"), userController.updateUser);
router.delete("/deleteUser"), userController.deleteUser);

module.exports = router;