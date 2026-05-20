// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Configura las credenciales de tu PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'Taller_Sandra',
    password: process.env.DB_PASSWORD || 'database',
    port: process.env.DB_PORT || 5432,
});

pool.on('connect', () => {
    console.log('📌 Conexión exitosa con PostgreSQL');
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};