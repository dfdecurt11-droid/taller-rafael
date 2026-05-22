const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres", // tu usuario
  host: "localhost", // servidor DB
  database: "Taller_Sandra", // nombre de tu BD
  password: "pgadmin2026", // tu contraseña
  port: 5432, // puerto por defecto
});

module.exports = pool;
