// ============================================================================
// SERVIDOR COMPLETO Y FUNCIONAL - TALLER RAFAEL'S
// ============================================================================

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SEGURIDAD
// ============================================================================
app.use(helmet());
app.use(compression());

// ============================================================================
// LIMITADOR
// ============================================================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Demasiadas solicitudes. Intenta más tarde."
  }
});

app.use(limiter);

// ============================================================================
// CORS
// ============================================================================
const allowedOrigins = [
  "https://taller-rafael-1.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

app.use(
  cors({
    origin: function (origin, callback) {

      // Permitir Postman y apps móviles
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS bloqueado"));
      }
    },

    methods: ["GET", "POST", "PUT", "DELETE"],

    credentials: true
  })
);

// ============================================================================
// MIDDLEWARES
// ============================================================================
app.use(express.json({ limit: "20mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb"
  })
);

// ============================================================================
// FUNCIÓN RESPUESTA
// ============================================================================
function respuesta(
  res,
  status,
  success,
  message,
  data = null
) {
  return res.status(status).json({
    success,
    message,
    data
  });
}

// ============================================================================
// VALIDAR TRABAJADOR
// ============================================================================
function validarTrabajador(data) {

  const {
    nombres,
    apellidos,
    dni,
    telefono,
    area_trabajo,
    sueldo_base
  } = data;

  if (
    !nombres ||
    !apellidos ||
    !dni ||
    !telefono ||
    !area_trabajo ||
    sueldo_base === undefined
  ) {
    return "Todos los campos son obligatorios";
  }

  if (!/^\d{8}$/.test(dni)) {
    return "El DNI debe tener 8 dígitos";
  }

  if (isNaN(sueldo_base) || sueldo_base <= 0) {
    return "Sueldo inválido";
  }

  return null;
}

// ============================================================================
// LOGIN
// ============================================================================
app.post("/api/login", async (req, res) => {

  try {

    const { email, contrasena } = req.body;

    if (!email || !contrasena) {

      return respuesta(
        res,
        400,
        false,
        "Completa todos los campos"
      );
    }

    const result = await db.query(
      `
      SELECT *
      FROM administradores
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {

      return respuesta(
        res,
        401,
        false,
        "Credenciales incorrectas"
      );
    }

    const admin = result.rows[0];

    // ========================================================================
    // SI LA CONTRASEÑA YA ESTÁ EN HASH
    // ========================================================================
    let passwordCorrecta = false;

    if (
      admin.contrasena.startsWith("$2a$") ||
      admin.contrasena.startsWith("$2b$")
    ) {

      passwordCorrecta = await bcrypt.compare(
        contrasena,
        admin.contrasena
      );

    } else {

      // ======================================================================
      // SI TODAVÍA ES TEXTO NORMAL
      // ======================================================================
      passwordCorrecta =
        contrasena === admin.contrasena;
    }

    if (!passwordCorrecta) {

      return respuesta(
        res,
        401,
        false,
        "Credenciales incorrectas"
      );
    }

    delete admin.contrasena;

    return respuesta(
      res,
      200,
      true,
      "Login exitoso",
      admin
    );

  } catch (error) {

    console.error("ERROR LOGIN:", error);

    return respuesta(
      res,
      500,
      false,
      "Error interno del servidor"
    );
  }
});

// ============================================================================
// ACTUALIZAR PERFIL ADMIN
// ============================================================================
app.put("/api/admin/perfil", async (req, res) => {

  try {

    const {
      email_actual,
      nuevo_email,
      nueva_contrasena,
      nueva_foto
    } = req.body;

    const buscarAdmin = await db.query(
      `
      SELECT *
      FROM administradores
      WHERE email = $1
      `,
      [email_actual]
    );

    if (buscarAdmin.rows.length === 0) {

      return respuesta(
        res,
        404,
        false,
        "Administrador no encontrado"
      );
    }

    const admin = buscarAdmin.rows[0];

    const emailFinal =
      nuevo_email || admin.email;

    let passwordFinal =
      admin.contrasena;

    if (nueva_contrasena) {

      passwordFinal = await bcrypt.hash(
        nueva_contrasena,
        10
      );
    }

    const fotoFinal =
      nueva_foto || admin.foto_perfil;

    const result = await db.query(
      `
      UPDATE administradores
      SET
        email = $1,
        contrasena = $2,
        foto_perfil = $3
      WHERE email = $4
      RETURNING id, email, foto_perfil
      `,
      [
        emailFinal,
        passwordFinal,
        fotoFinal,
        email_actual
      ]
    );

    return respuesta(
      res,
      200,
      true,
      "Perfil actualizado",
      result.rows[0]
    );

  } catch (error) {

    console.error("ERROR PERFIL:", error);

    return respuesta(
      res,
      500,
      false,
      "Error actualizando perfil"
    );
  }
});

// ============================================================================
// CREAR TRABAJADOR
// ============================================================================
app.post("/api/trabajadores", async (req, res) => {

  try {

    const error = validarTrabajador(req.body);

    if (error) {

      return respuesta(
        res,
        400,
        false,
        error
      );
    }

    const {
      nombres,
      apellidos,
      dni,
      telefono,
      area_trabajo,
      sueldo_base
    } = req.body;

    // =========================================================================
    // VALIDAR DNI DUPLICADO
    // =========================================================================
    const existe = await db.query(
      `
      SELECT id
      FROM trabajadores
      WHERE dni = $1
      `,
      [dni]
    );

    if (existe.rows.length > 0) {

      return respuesta(
        res,
        409,
        false,
        "El DNI ya existe"
      );
    }

    const result = await db.query(
      `
      INSERT INTO trabajadores
      (
        nombres,
        apellidos,
        dni,
        telefono,
        area_trabajo,
        sueldo_base,
        horas
      )
      VALUES ($1,$2,$3,$4,$5,$6,0)
      RETURNING *
      `,
      [
        nombres,
        apellidos,
        dni,
        telefono,
        area_trabajo,
        sueldo_base
      ]
    );

    return respuesta(
      res,
      201,
      true,
      "Trabajador creado correctamente",
      result.rows[0]
    );

  } catch (error) {

    console.error("ERROR CREAR:", error);

    return respuesta(
      res,
      500,
      false,
      "Error creando trabajador"
    );
  }
});

// ============================================================================
// LISTAR TRABAJADORES
// ============================================================================
app.get("/api/trabajadores", async (req, res) => {

  try {

    const result = await db.query(
      `
      SELECT *
      FROM trabajadores
      ORDER BY id ASC
      `
    );

    return respuesta(
      res,
      200,
      true,
      "Lista obtenida",
      result.rows
    );

  } catch (error) {

    console.error("ERROR LISTAR:", error);

    return respuesta(
      res,
      500,
      false,
      "Error obteniendo trabajadores"
    );
  }
});

// ============================================================================
// OBTENER TRABAJADOR
// ============================================================================
app.get("/api/trabajadores/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const result = await db.query(
      `
      SELECT *
      FROM trabajadores
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {

      return respuesta(
        res,
        404,
        false,
        "Trabajador no encontrado"
      );
    }

    return respuesta(
      res,
      200,
      true,
      "Trabajador encontrado",
      result.rows[0]
    );

  } catch (error) {

    console.error("ERROR OBTENER:", error);

    return respuesta(
      res,
      500,
      false,
      "Error obteniendo trabajador"
    );
  }
});

// ============================================================================
// ACTUALIZAR TRABAJADOR
// ============================================================================
app.put("/api/trabajadores/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const error = validarTrabajador(req.body);

    if (error) {

      return respuesta(
        res,
        400,
        false,
        error
      );
    }

    const {
      nombres,
      apellidos,
      dni,
      telefono,
      area_trabajo,
      sueldo_base,
      horas = 0
    } = req.body;

    const result = await db.query(
      `
      UPDATE trabajadores
      SET
        nombres = $1,
        apellidos = $2,
        dni = $3,
        telefono = $4,
        area_trabajo = $5,
        sueldo_base = $6,
        horas = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        nombres,
        apellidos,
        dni,
        telefono,
        area_trabajo,
        sueldo_base,
        horas,
        id
      ]
    );

    if (result.rows.length === 0) {

      return respuesta(
        res,
        404,
        false,
        "Trabajador no encontrado"
      );
    }

    return respuesta(
      res,
      200,
      true,
      "Trabajador actualizado",
      result.rows[0]
    );

  } catch (error) {

    console.error("ERROR ACTUALIZAR:", error);

    return respuesta(
      res,
      500,
      false,
      "Error actualizando trabajador"
    );
  }
});

// ============================================================================
// ELIMINAR TRABAJADOR
// ============================================================================
app.delete("/api/trabajadores/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM trabajadores
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {

      return respuesta(
        res,
        404,
        false,
        "Trabajador no encontrado"
      );
    }

    return respuesta(
      res,
      200,
      true,
      "Trabajador eliminado"
    );

  } catch (error) {

    console.error("ERROR ELIMINAR:", error);

    return respuesta(
      res,
      500,
      false,
      "Error eliminando trabajador"
    );
  }
});

// ============================================================================
// RUTA PRINCIPAL
// ============================================================================
app.get("/", (req, res) => {

  res.json({
    success: true,
    message: "Servidor funcionando correctamente 🚀"
  });
});

// ============================================================================
// RUTA 404
// ============================================================================
app.use((req, res) => {

  res.status(404).json({
    success: false,
    message: "Ruta no encontrada"
  });
});

// ============================================================================
// ERRORES GLOBALES
// ============================================================================
app.use((error, req, res, next) => {

  console.error("ERROR GLOBAL:", error);

  res.status(500).json({
    success: false,
    message: "Error interno del servidor"
  });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
app.listen(PORT, () => {

  console.log(`
=================================================
🚀 SERVIDOR INICIADO
🌐 Puerto: ${PORT}
=================================================
  `);
});