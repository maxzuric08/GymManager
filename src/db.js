const { Pool } = require("pg");
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "gymmanager",
    password: "Mzr_080311",
    port: 5432,

})
module.exports = pool;