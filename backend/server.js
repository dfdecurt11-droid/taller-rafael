const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================================
// CONFIGURACIÓN CORS
// =========================================================================
const allowedOrigins = [
    "https://taller-rafael-1.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origin (archivos locales, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS bloqueado para el origen: ${origin}`));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
};

app.use(cors(corsOptions));

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// =========================================================================
// 1. ENDPOINTS DE ADMINISTRACIÓN
// =========================================================================
app.post('/api/login', async (req, res) => {
    const { email, contrasena } = req.body;
    try {
        const queryText = 'SELECT id, email, foto_perfil FROM administradores WHERE email = $1 AND contrasena = $2';
        const result = await db.query(queryText, [email, contrasena]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error en Login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/api/admin/perfil', async (req, res) => {
    const { email_actual, nuevo_email, nueva_contrasena, nueva_foto } = req.body;
    try {
        const checkAdmin = await db.query('SELECT * FROM administradores WHERE email = $1', [email_actual]);
        if (checkAdmin.rows.length === 0) return res.status(404).json({ success: false, message: 'Admin no encontrado' });
        
        const adminActual = checkAdmin.rows[0];
        const finalEmail = nuevo_email || adminActual.email;
        const finalContrasena = nueva_contrasena || adminActual.contrasena;
        const finalFoto = nueva_foto || adminActual.foto_perfil;

        const queryText = `UPDATE administradores SET email = $1, contrasena = $2, foto_perfil = $3 WHERE email = $4 RETURNING id, email, foto_perfil`;
        const result = await db.query(queryText, [finalEmail, finalContrasena, finalFoto, email_actual]);
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// =========================================================================
// 2. CRUD DE TRABAJADORES
// =========================================================================
app.post('/api/trabajadores', async (req, res) => {
    const { nombres, apellidos, dni, telefono, area_trabajo, sueldo_base } = req.body;
    try {
        const queryText = `INSERT INTO trabajadores (nombres, apellidos, dni, telefono, area_trabajo, sueldo_base) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const result = await db.query(queryText, [nombres, apellidos, dni, telefono, area_trabajo, sueldo_base]);
        res.status(201).json({ success: true, trabajador: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al añadir trabajador' });
    }
});

app.get('/api/trabajadores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM trabajadores ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar' });
    }
});

// ... (El resto de tus métodos PUT y DELETE se mantienen igual) ...

// =========================================================================
// INICIALIZACIÓN
// =========================================================================
app.listen(PORT, () => {
    console.log(`Corriendo el servidor del INGE en el puerto: ${PORT}`);
});