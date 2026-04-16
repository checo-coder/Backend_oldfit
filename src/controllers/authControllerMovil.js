// src/controllers/authController.js
import { pool} from "../lib/db.js"; 
import jwt from "jsonwebtoken";
import { ENV } from "../lib/env.js";

export const login = async (req, res) => {
  const { correo, contrasena } = req.body;
  try {
    const respuestaBD = await pool.query("SELECT * FROM clientes WHERE correo = $1", [correo]);
    if (respuestaBD.rows.length === 0) return res.status(401).json({ mensaje: "Usuario no encontrado" });

    const usuarioBD = respuestaBD.rows[0];
    if (contrasena !== usuarioBD.contrasena) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const payload = { idUsuario: usuarioBD.id_cliente, rol: usuarioBD.rol, nombre: usuarioBD.nombre };
    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: "300h" });

    // Lógica para el ID del paciente asignado
    let idPacienteAsignado = usuarioBD.rol === "Persona Mayor" ? usuarioBD.id_cliente : null;
    if (usuarioBD.rol === "cuidador") {
      const asignacion = await pool.query("SELECT id_paciente FROM asignacion WHERE id_cuidador = $1", [usuarioBD.id_cliente]);
      if (asignacion.rows.length > 0) idPacienteAsignado = asignacion.rows[0].id_paciente;
    }

    res.json({ token, rol: usuarioBD.rol, id_paciente_asignado: idPacienteAsignado });
  } catch (error) {
    res.status(500).json({ mensaje: "Error en el login" });
  }
};

export const signup = async (req, res) => {
    const {
    nombre,
    apellidoP,
    apellidoM,
    correo,
    contraseña,
    fecha_nacimiento,
    rol,
    id_cuidador_vinculado,
  } = req.body;

  const clienteBD = await pool.connect();

  try {
    // Iniciamos la transacción
    await clienteBD.query("BEGIN");

    // INSERTAR CLIENTE
    // En Postgres, usamos RETURNING id_cliente para obtener el ID generado inmediatamente
    const queryUser = `
            INSERT INTO "clientes" 
            ("nombre", "apellidop", "apellidom", "correo", "contrasena", "fecha_de_nacimiento", "rol", "estatus") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'activo')
            RETURNING id_cliente;
        `;
    const valuesUser = [
      nombre,
      apellidoP,
      apellidoM,
      correo,
      contraseña,
      fecha_nacimiento,
      rol,
    ];

    const resUser = await clienteBD.query(queryUser, valuesUser);
    const nuevoIdPaciente = resUser.rows[0].id_cliente;

    // VINCULACIÓN CON TABLA "Asignacion"
    if (rol === "Persona Mayor" && id_cuidador_vinculado) {
      const queryAsignacion = `
                INSERT INTO "asignacion" (id_cuidador, id_paciente, fecha_asignacion) 
                VALUES ($1, $2, CURRENT_TIMESTAMP);
            `;
      await clienteBD.query(queryAsignacion, [
        id_cuidador_vinculado,
        nuevoIdPaciente,
      ]);
    }

    // Si todo salió bien, guardamos cambios
    await clienteBD.query("COMMIT");
    res.status(201).json({ mensaje: "Registro exitoso", id: nuevoIdPaciente });
  } catch (error) {
    // Si hay error (como correo repetido), deshacemos todo
    await clienteBD.query("ROLLBACK");
    console.error(error);

    if (error.code === "23505") {
      res.status(409).json({ mensaje: "El correo electrónico ya existe." });
    } else if (error.code === "23503") {
      res
        .status(400)
        .json({ mensaje: "El ID del cuidador no es válido o no existe." });
    } else {
      res.status(500).json({ mensaje: "Error interno en el servidor." });
    }
  } finally {
    // Liberamos el cliente de la piscina de conexiones
    clienteBD.release();
  }
};


export const obtenerPerfilCompleto = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Datos del Cliente + Datos de su Geriatra (usando apellidop y apellidom)
    const usuarioRes = await pool.query(
      `SELECT c.id_cliente, c.nombre, c.apellidop, c.apellidom, c.correo, c.rol, c.fecha_de_nacimiento,
              g.nombre as nombre_geriatra, 
              g.apellidop as apellidop_geriatra, 
              g.apellidom as apellidom_geriatra, 
              g.cedula as cedula_geriatra
       FROM clientes c
       LEFT JOIN geriatras g ON c.id_geriatra = g.id_geriatra
       WHERE c.id_cliente = $1`,
      [id]
    );

    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const usuario = usuarioRes.rows[0];

    // Cálculo de edad
    if (usuario.fecha_de_nacimiento) {
      const hoy = new Date();
      const cumple = new Date(usuario.fecha_de_nacimiento);
      let edad = hoy.getFullYear() - cumple.getFullYear();
      if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) {
        edad--;
      }
      usuario.edad = edad;
    }

    // 2. Vínculo (Cuidador <-> Paciente) en tabla asignacion
    let queryVinculo = usuario.rol === 'cuidador' 
      ? `SELECT c.nombre, c.apellidop, c.apellidom, c.correo FROM asignacion a JOIN clientes c ON a.id_paciente = c.id_cliente WHERE a.id_cuidador = $1`
      : `SELECT c.nombre, c.apellidop, c.apellidom, c.correo FROM asignacion a JOIN clientes c ON a.id_cuidador = c.id_cliente WHERE a.id_paciente = $1`;

    const vinculoRes = await pool.query(queryVinculo, [id]);
    
    res.json({
      usuario,
      vinculo: vinculoRes.rows[0] || null
    });

  } catch (error) {
    console.error("Error al obtener perfil completo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};