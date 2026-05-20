// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importación directa corregida

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================================
// CONFIGURACIÓN DE BASE DE DATOS (PARA SUPABASE Y RENDER)
// =========================================================================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =========================================================================
// MIDDLEWARES
// =========================================================================
app.use(cors());
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
        if (checkAdmin.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
        }

        const adminActual = checkAdmin.rows[0];
        const finalEmail = nuevo_email && nuevo_email.trim() !== "" ? nuevo_email : adminActual.email;
        const finalContrasena = nueva_contrasena && nueva_contrasena.trim() !== "" ? nueva_contrasena : adminActual.contrasena;
        const finalFoto = nueva_foto && nueva_foto.trim() !== "" ? nueva_foto : adminActual.foto_perfil;

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
        res.status(500).json({ success: false, message: 'Error interno al guardar ajustes' });
    }
});

// =========================================================================
// 2. CRUD DE TRABAJADORES
// =========================================================================

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
        res.status(500).json({ error: 'Error al añadir el trabajador.' });
    }
});

app.get('/api/trabajadores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM trabajadores ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al listar trabajadores:', error);
        res.status(500).json({ error: 'Error al obtener la lista de trabajadores' });
    }
});

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
            res.json({ success: true, message: 'Trabajador actualizado', trabajador: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
        }
    } catch (error) {
        console.error('Error al editar trabajador:', error);
        res.status(500).json({ error: 'Error al actualizar trabajador' });
    }
});

app.delete('/api/trabajadores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM trabajadores WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Trabajador eliminado' });
        } else {
            res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar trabajador:', error);
        res.status(500).json({ error: 'Error al eliminar trabajador' });
    }
});

// =========================================================================
// 3. ENDPOINTS PARA REPORTES
// =========================================================================

app.get('/api/reportes/general', async (req, res) => {
    try {
        const queryResumen = `
            SELECT COUNT(*) as total_trabajadores, SUM(sueldo_base) as planilla_total_semanal, 
            ROUND(AVG(sueldo_base), 2) as sueldo_promedio FROM trabajadores`;
        
        const statsResult = await db.query(queryResumen);
        const listaResult = await db.query('SELECT * FROM trabajadores ORDER BY id ASC');
        
        res.json({
            resumen: statsResult.rows[0],
            detalles: listaResult.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en reporte general' });
    }
});

// =========================================================================
// INICIALIZACIÓN
// =========================================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});