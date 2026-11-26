const RECOMMENDATIONS_WINDOW_MS = 60 * 1000;
const RECOMMENDATIONS_MAX_REQUESTS = 5;

function createRecommendationsRateLimiter({
  windowMs = RECOMMENDATIONS_WINDOW_MS,
  max = RECOMMENDATIONS_MAX_REQUESTS,
  now = () => Date.now(),
} = {}) {
  const requestsByUser = new Map();

  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();

    const currentTime = now();
    const windowStart = currentTime - windowMs;
    const recentRequests = (requestsByUser.get(userId) || []).filter((timestamp) => timestamp > windowStart);

    if (recentRequests.length >= max) {
      return res.status(429).json({ error: "Alcanzaste el límite de consultas. Esperá un minuto antes de volver a intentarlo." });
    }

    recentRequests.push(currentTime);
    requestsByUser.set(userId, recentRequests);
    return next();
  };
}

module.exports = {
  RECOMMENDATIONS_MAX_REQUESTS,
  RECOMMENDATIONS_WINDOW_MS,
  createRecommendationsRateLimiter,
};
