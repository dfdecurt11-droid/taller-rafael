// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Usamos connectionString para leer la URL completa de Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para conexiones externas a Supabase
    }
});

pool.on('connect', () => {
    console.log('📌 Conexión exitosa con PostgreSQL (Supabase)');
});

pool.on('error', (err) => {
    console.error('❌ Error inesperado en el cliente de base de datos:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};