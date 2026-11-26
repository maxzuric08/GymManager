const pool = require("../db");

const getBranches = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT branch_id, location, size FROM branches ORDER BY branch_id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener sucursales" });
  }
};

module.exports = { getBranches };
