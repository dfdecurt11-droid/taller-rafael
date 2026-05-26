const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render te da esta variable
  ssl: { rejectUnauthorized: false } // Render requiere SSL
});

module.exports = pool;
