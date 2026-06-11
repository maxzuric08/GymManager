const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ limit: "8mb", extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "GymManager backend funcionando" });
});
app.use("/auth", require("./routes/auth.routes"));
app.use("/users", require("./routes/users.routes"));
app.use("/plans", require("./routes/plans.routes"));
app.use("/instructors", require("./routes/instructors.routes"));
app.use("/classes", require("./routes/classes.routes"));
app.use("/bookings", require("./routes/bookings.routes"));
app.use("/attendance", require("./routes/attendance.routes"));
app.use("/medical-certificates", require("./routes/medicalCertificates.routes"));
app.use("/notifications", require("./routes/notifications.routes"));

module.exports = app;
