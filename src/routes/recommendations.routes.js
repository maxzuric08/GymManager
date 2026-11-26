const { Router } = require("express");
const verifyToken = require("../middleware/auth.middleware");
const { requireUser } = require("../middleware/role.middleware");
const { createRecommendationsRateLimiter } = require("../middleware/recommendationsRateLimit.middleware");
const { createRecommendation } = require("../controllers/recommendations.controllers");

const router = Router();

router.post("/", verifyToken, requireUser, createRecommendationsRateLimiter(), createRecommendation);

module.exports = router;
