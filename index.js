const express = require("express");
const pool = require("./db");
const app = express();

app.get("/", async (req, res) => {
    const result = await pool.query("SELECT NOW()");
    res.send("GymManager funcionando 🚀");
});

app.get("/users", async (req, res) => {
    const result = await pool.query("SELECT username FROM users");
    res.json(result.rows);
});

app.listen(3000, () => {
    console.log("Servidor corriendo en puerto 3000");
});