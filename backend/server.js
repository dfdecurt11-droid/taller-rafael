// backend/server.js
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Importa la conexión de db.js

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================================
// MIDDLEWARES (CORREGIDOS PARA IMÁGENES BASE64 GRANDES)
// =========================================================================
app.use(cors());
// Se amplía el límite a 50mb para evitar que Express rechace fotos pesadas
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// =========================================================================
// 1. ENDPOINTS DE ADMINISTRACIÓN (LOGIN Y PERFIL)
// =========================================================================

// Login de Administrador (Verifica correo y contraseña)
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

// CORREGIDO: Endpoint unificado para actualizar el perfil completo del Administrador
app.put('/api/admin/perfil', async (req, res) => {
    const { email_actual, nuevo_email, nueva_contrasena, nueva_foto } = req.body;
    
    try {
        // 1. Verificar si el administrador existe en la base de datos
        const checkAdmin = await db.query('SELECT * FROM administradores WHERE email = $1', [email_actual]);
        if (checkAdmin.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
        }

        const adminActual = checkAdmin.rows[0];

        // 2. Si un campo viene vacío (null o vació), conserva el dato actual
        const finalEmail = nuevo_email && nuevo_email.trim() !== "" ? nuevo_email : adminActual.email;
        const finalContrasena = nueva_contrasena && nueva_contrasena.trim() !== "" ? nueva_contrasena : adminActual.contrasena;
        const finalFoto = nueva_foto && nueva_foto.trim() !== "" ? nueva_foto : adminActual.foto_perfil;

        // 3. Ejecutar la actualización en PostgreSQL
        const queryText = `
            UPDATE administradores 
            SET email = $1, contrasena = $2, foto_perfil = $3 
            WHERE email = $4 
            RETURNING id, email, foto_perfil`;
            
        const result = await db.query(queryText, [finalEmail, finalContrasena, finalFoto, email_actual]);
        
        res.json({ 
            success: true, 
            message: 'Ajustes actualizados correctamente', 
            user: result.rows[0] 
        });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Error interno en la base de datos al guardar los ajustes' });
    }
});


// =========================================================================
// 2. CRUD DE TRABAJADORES (GUARDAR, LEER, EDITAR, ELIMINAR)
// =========================================================================

// GUARDAR / AÑADIR un nuevo trabajador
app.post('/api/trabajadores', async (req, res) => {
    const { nombres, apellidos, dni, telefono, area_trabajo, sueldo_base } = req.body;
    try {
        const queryText = `
            INSERT INTO trabajadores (nombres, apellidos, dni, telefono, area_trabajo, sueldo_base) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const values = [nombres, apellidos, dni, telefono, area_trabajo, sueldo_base];
        
        const result = await db.query(queryText, values);
        res.status(201).json({ success: true, message: 'Trabajador añadido con éxito', trabajador: result.rows[0] });
    } catch (error) {
        console.error('Error al añadir trabajador:', error);
        res.status(500).json({ error: 'Error al añadir el trabajador. Asegúrate de que el DNI no esté duplicado.' });
    }
});

// LEER / LISTAR todos los trabajadores
app.get('/api/trabajadores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM trabajadores ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al listar trabajadores:', error);
        res.status(500).json({ error: 'Error al obtener la lista de trabajadores' });
    }
});

// EDITAR / ACTUALIZAR los datos de un trabajador
app.put('/api/trabajadores/:id', async (req, res) => {
    const { id } = req.params;
    const { nombres, apellidos, dni, telefono, area_trabajo, sueldo_base } = req.body;
    try {
        const queryText = `
            UPDATE trabajadores 
            SET nombres = $1, apellidos = $2, dni = $3, telefono = $4, area_trabajo = $5, sueldo_base = $6
            WHERE id = $7 RETURNING *`;
        const values = [nombres, apellidos, dni, telefono, area_trabajo, sueldo_base, id];
        
        const result = await db.query(queryText, values);
        
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Trabajador actualizado con éxito', trabajador: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
        }
    } catch (error) {
        console.error('Error al editar trabajador:', error);
        res.status(500).json({ error: 'Error al actualizar los datos del trabajador' });
    }
});

// ELIMINAR un trabajador de la base de datos
app.delete('/api/trabajadores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const queryText = 'DELETE FROM trabajadores WHERE id = $1 RETURNING *';
        const result = await db.query(queryText, [id]);
        
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Trabajador eliminado correctamente' });
        } else {
            res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar trabajador:', error);
        res.status(500).json({ error: 'Error al eliminar el trabajador' });
    }
});


// =========================================================================
// 3. ENDPOINTS PARA REPORTES
// =========================================================================

// REPORTE GENERAL: Devuelve totales globales de la empresa y la lista completa
app.get('/api/reportes/general', async (req, res) => {
    try {
        const queryResumen = `
            SELECT 
                COUNT(*) as total_trabajadores,
                SUM(sueldo_base) as planilla_total_semanal,
                ROUND(AVG(sueldo_base), 2) as sueldo_promedio,
                ROUND(SUM(pago_por_hora), 2) as costo_total_por_hora
            FROM trabajadores`;
        
        const statsResult = await db.query(queryResumen);
        const listaResult = await db.query('SELECT id, nombres, apellidos, area_trabajo, sueldo_base, pago_por_hora FROM trabajadores ORDER BY id ASC');
        
        res.json({
            resumen: statsResult.rows[0],
            detalles: listaResult.rows
        });
    } catch (error) {
        console.error('Error en reporte general:', error);
        res.status(500).json({ error: 'Error al generar el reporte general' });
    }
});

// REPORTE POR ÁREA DE TRABAJO: Filtra y agrupa los datos según el área
app.get('/api/reportes/area/:area', async (req, res) => {
    const { area } = req.params;
    try {
        const queryTextDetalles = 'SELECT * FROM trabajadores WHERE area_trabajo ILIKE $1 ORDER BY id ASC';
        const queryTextResumen = `
            SELECT 
                COUNT(*) as total_trabajadores,
                SUM(sueldo_base) as subtotal_planilla
            FROM trabajadores WHERE area_trabajo ILIKE $1`;

        const detalles = await db.query(queryTextDetalles, [area]);
        const resumen = await db.query(queryTextResumen, [area]);

        res.json({
            area: area,
            total_empleados: parseInt(resumen.rows[0].total_trabajadores) || 0,
            planilla_area: parseFloat(resumen.rows[0].subtotal_planilla) || 0,
            trabajadores: detalles.rows
        });
    } catch (error) {
        console.error('Error en reporte por área:', error);
        res.status(500).json({ error: 'Error al generar el reporte por área' });
    }
});

// REPORTE INDIVIDUAL: Devuelve la información detallada de un solo empleado buscando por ID o DNI
app.get('/api/reportes/trabajador/:id_o_dni', async (req, res) => {
    const { id_o_dni } = req.params;
    try {
        const queryText = `
            SELECT *, 
            sueldo_base as pago_semana_normal
            FROM trabajadores 
            WHERE id::text = $1 OR dni = $1`;
            
        const result = await db.query(queryText, [id_o_dni]);

        if (result.rows.length > 0) {
            res.json({ success: true, reporte: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Trabajador no encontrado para el reporte' });
        }
    } catch (error) {
        console.error('Error en reporte individual:', error);
        res.status(500).json({ error: 'Error al generar el reporte individual' });
    }
});


// =========================================================================
// INICIALIZACIÓN DEL SERVIDOR
// =========================================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`🔗 API base disponible en: http://localhost:${PORT}/api`);
});