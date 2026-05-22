const { Pool } = require('pg');

// Es vital usar process.env.DATABASE_URL para que Render tome la conexión de Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requerido para conexiones externas como Supabase
  }
});

module.exports = pool;