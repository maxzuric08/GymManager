const {
  RecommendationProviderError,
  getRecommendations,
} = require("../services/recommendations.service");

function createRecommendationHandler({ recommend = getRecommendations } = {}) {
  return async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

    if (!message) {
      return res.status(400).json({ error: "Escribí qué objetivo, horario o preferencia estás buscando." });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: "La consulta no puede superar los 500 caracteres." });
    }

    try {
      const recommendation = await recommend({ message });
      return res.json(recommendation);
    } catch (error) {
      if (error instanceof RecommendationProviderError) {
        return res.status(error.status).json({ error: error.message });
      }

      console.error("Recommendation error:", error);
      return res.status(500).json({ error: "No pudimos obtener recomendaciones en este momento." });
    }
  };
}

module.exports = {
  createRecommendationHandler,
  createRecommendation: createRecommendationHandler(),
};
