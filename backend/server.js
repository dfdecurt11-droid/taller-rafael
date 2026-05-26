const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================================
// CONFIGURACIÓN CORS
// =========================================================================
const allowedOrigins = [
  "https://taller-rafael-1.onrender.com"
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origin (Postman, archivos locales, etc.)
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

// =========================================================================
// MIDDLEWARES
// =========================================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// =========================================================================
// 1. LOGIN ADMIN
// =========================================================================
app.post('/api/login', async (req, res) => {
    const { email, contrasena } = req.body;

    try {
        const queryText = `
            SELECT id, email, foto_perfil
            FROM administradores
            WHERE email = $1 AND contrasena = $2
        `;

        const result = await db.query(queryText, [email, contrasena]);

        if (result.rows.length > 0) {
            res.json({
                success: true,
                user: result.rows[0]
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

    } catch (error) {
        console.error('Error Login:', error);

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// =========================================================================
// 2. ACTUALIZAR PERFIL ADMIN
// =========================================================================
app.put('/api/admin/perfil', async (req, res) => {
    const {
        email_actual,
        nuevo_email,
        nueva_contrasena,
        nueva_foto
    } = req.body;

    try {

        const checkAdmin = await db.query(
            'SELECT * FROM administradores WHERE email = $1',
            [email_actual]
        );

        if (checkAdmin.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Administrador no encontrado'
            });
        }

        const adminActual = checkAdmin.rows[0];

        const finalEmail = nuevo_email || adminActual.email;
        const finalContrasena = nueva_contrasena || adminActual.contrasena;
        const finalFoto = nueva_foto || adminActual.foto_perfil;

        const queryText = `
            UPDATE administradores
            SET email = $1,
                contrasena = $2,
                foto_perfil = $3
            WHERE email = $4
            RETURNING id, email, foto_perfil
        `;

        const result = await db.query(queryText, [
            finalEmail,
            finalContrasena,
            finalFoto,
            email_actual
        ]);

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {

        console.error('Error actualizar perfil:', error);

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// =========================================================================
// 3. CREAR TRABAJADOR
// =========================================================================
app.post('/api/trabajadores', async (req, res) => {

    const {
        nombres,
        apellidos,
        dni,
        telefono,
        area_trabajo,
        sueldo_base
    } = req.body;

    try {

        const queryText = `
            INSERT INTO trabajadores
            (
                nombres,
                apellidos,
                dni,
                telefono,
                area_trabajo,
                sueldo_base
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await db.query(queryText, [
            nombres,
            apellidos,
            dni,
            telefono,
            area_trabajo,
            sueldo_base
        ]);

        res.status(201).json({
            success: true,
            trabajador: result.rows[0]
        });

    } catch (error) {

        console.error('Error crear trabajador:', error);

        res.status(500).json({
            success: false,
            error: 'Error al añadir trabajador'
        });
    }
});

// =========================================================================
// 4. LISTAR TRABAJADORES
// =========================================================================
app.get('/api/trabajadores', async (req, res) => {

    try {

        const result = await db.query(
            'SELECT * FROM trabajadores ORDER BY id ASC'
        );

        res.json(result.rows);

    } catch (error) {

        console.error('Error listar trabajadores:', error);

        res.status(500).json({
            success: false,
            error: 'Error al listar trabajadores'
        });
    }
});

// =========================================================================
// 5. ACTUALIZAR TRABAJADOR
// =========================================================================
app.put('/api/trabajadores/:id', async (req, res) => {

    const { id } = req.params;

    const {
        nombres,
        apellidos,
        dni,
        telefono,
        area_trabajo,
        sueldo_base
    } = req.body;

    try {

        const queryText = `
            UPDATE trabajadores
            SET
                nombres = $1,
                apellidos = $2,
                dni = $3,
                telefono = $4,
                area_trabajo = $5,
                sueldo_base = $6
            WHERE id = $7
            RETURNING *
        `;

        const result = await db.query(queryText, [
            nombres,
            apellidos,
            dni,
            telefono,
            area_trabajo,
            sueldo_base,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Trabajador no encontrado'
            });
        }

        res.json({
            success: true,
            trabajador: result.rows[0]
        });

    } catch (error) {

        console.error('Error actualizar trabajador:', error);

        res.status(500).json({
            success: false,
            error: 'Error al actualizar trabajador'
        });
    }
});

// =========================================================================
// 6. ELIMINAR TRABAJADOR
// =========================================================================
app.delete('/api/trabajadores/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const result = await db.query(
            'DELETE FROM trabajadores WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Trabajador no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Trabajador eliminado correctamente'
        });

    } catch (error) {

        console.error('Error eliminar trabajador:', error);

        res.status(500).json({
            success: false,
            error: 'Error al eliminar trabajador'
        });
    }
});
// =========================================================================
// 8. LISTAR ASISTENCIAS
// =========================================================================
app.get('/api/asistencias', async (req, res) => {

    try {

        const result = await db.query(`
            SELECT *
            FROM asistencias
            ORDER BY id DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.error("Error listar asistencias:", error);

        res.status(500).json({
            error: "Error al listar asistencias"
        });

    }

});
// =========================================================================
// REGISTRAR ASISTENCIA
// =========================================================================
app.post('/api/asistencias', async (req, res) => {

    const {
        trabajador_id,
        fecha,
        hora_entrada,
        hora_salida,
        horas_trabajadas,
        estado
    } = req.body;

    try {

        const query = `
            INSERT INTO asistencias
            (
                trabajador_id,
                fecha,
                hora_entrada,
                hora_salida,
                horas_trabajadas,
                estado
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await db.query(query, [

            trabajador_id,
            fecha,
            hora_entrada,
            hora_salida,
            horas_trabajadas,
            estado

        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Error al guardar asistencia"
        });

    }

});

// =========================================================================
// RUTA PRINCIPAL
// =========================================================================
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente 🚀');
});

// =========================================================================
// INICIALIZACIÓN DEL SERVIDOR
// =========================================================================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});