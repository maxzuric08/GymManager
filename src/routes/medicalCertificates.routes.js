const express = require("express");
const router = express.Router();
const controller = require("../controllers/medicalCertificates.controllers");
const verifyToken = require("../middleware/auth.middleware");
const { requireAdmin, requireUser } = require("../middleware/role.middleware");

router.get("/me", verifyToken, requireUser, controller.getMyMedicalCertificate);
router.post("/me", verifyToken, requireUser, controller.uploadMedicalCertificate);

router.get("/", verifyToken, requireAdmin, controller.getMedicalCertificates);
router.get("/:id/file", verifyToken, controller.getMedicalCertificateFile);
router.put("/:id/review", verifyToken, requireAdmin, controller.reviewMedicalCertificate);

module.exports = router;