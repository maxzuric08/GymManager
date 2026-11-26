const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

if (process.env.NODE_ENV !== "production") {
  configuredOrigins.push("http://localhost:5173", "http://127.0.0.1:5173");
}

const allowedOrigins = new Set(configuredOrigins);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
    return callback(new Error("Origen no permitido por CORS"));
  },
}));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ limit: "8mb", extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "GymManager backend funcionando" });
});

const healthCheck = async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Healthcheck de base de datos falló:", error.message);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
};

app.get("/health", healthCheck);
app.healthCheck = healthCheck;
app.use("/auth", require("./routes/auth.routes"));
app.use("/users", require("./routes/users.routes"));
app.use("/plans", require("./routes/plans.routes"));
app.use("/branches", require("./routes/branches.routes"));
app.use("/instructors", require("./routes/instructors.routes"));
app.use("/classes", require("./routes/classes.routes"));
app.use("/bookings", require("./routes/bookings.routes"));
app.use("/attendance", require("./routes/attendance.routes"));
app.use("/medical-certificates", require("./routes/medicalCertificates.routes"));
app.use("/notifications", require("./routes/notifications.routes"));
app.use("/payments", require("./routes/payments.routes"));
app.use("/recommendations", require("./routes/recommendations.routes"));

module.exports = app;
