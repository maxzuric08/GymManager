const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "GymManager backend funcionando" });
});
app.use("/auth", require("./routes/auth.routes"));
app.use("/users", require("./routes/users.routes"));
app.use("/plans", require("./routes/plans.routes"));
app.use("/instructors", require("./routes/instructors.routes"));
app.use("/classes", require("./routes/classes.routes"));



module.exports = app;