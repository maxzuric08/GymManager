const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branches.controllers");
const verifyToken = require("../middleware/auth.middleware");

// Lista de sucursales para los selectores de los formularios.
router.get("/", verifyToken, branchController.getBranches);

module.exports = router;
