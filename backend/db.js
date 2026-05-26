const { Pool } = require("pg");

const pool = new Pool({
<<<<<<< Updated upstream
  connectionString: process.env.DATABASE_URL, // Render te da esta variable
  ssl: { rejectUnauthorized: false } // Render requiere SSL
=======
  user: "postgres", // tu usuario
  host: "localhost", // servidor DB
  database: "Taller_Sandra", // nombre de tu BD
  password: "database", // tu contraseña
  port: 5432, // puerto por defecto
>>>>>>> Stashed changes
});

module.exports = pool;
