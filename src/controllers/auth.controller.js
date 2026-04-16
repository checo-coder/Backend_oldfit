import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { generateToken } from "../lib/utils.js";
import { pool } from "../lib/db.js"; 
import bcrypt from "bcryptjs";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { nombre, apellidop, correo, contrasena, rol } = req.body;

  try {
    if (!nombre || !apellidop || !correo || !contrasena || !rol) {
      return res.status(400).json({ message: "Ingrese todos los campos obligatorios" });
    }

    if (contrasena.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener 6 carácteres como mínimo" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({ message: "Formato inválido de correo" });
    }

    const userCheckQuery = `
      SELECT correo FROM geriatras WHERE correo = $1
      UNION
      SELECT correo FROM clientes WHERE correo = $1;
    `;
    const userCheck = await pool.query(userCheckQuery, [correo]);
    if (userCheck.rows.length > 0) return res.status(400).json({ message: "El correo ya está registrado" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    let savedUser;
    
    if (rol === "geriatra" || rol === "administrador") {
      const insertGeriatra = `
        INSERT INTO geriatras (nombre, apellidop, correo, contrasena, rol) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id_geriatra AS id, nombre, apellidop, correo, foto_perfil, rol;
      `;
      const result = await pool.query(insertGeriatra, [nombre, apellidop, correo, hashedPassword, rol]);
      savedUser = result.rows[0];
    } else if (rol === "cuidador" || rol === "Persona Mayor") {
      const insertCliente = `
        INSERT INTO clientes (nombre, apellidop, correo, contrasena, rol) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id_cliente AS id, nombre, apellidop, correo, foto_perfil, rol;
      `;
      const result = await pool.query(insertCliente, [nombre, apellidop, correo, hashedPassword, rol]);
      savedUser = result.rows[0];
    } else {
      return res.status(400).json({ message: "Rol inválido" });
    }

    generateToken(savedUser.id, savedUser.rol, res);

    res.status(201).json({
      _id: savedUser.id,
      fullName: `${savedUser.nombre} ${savedUser.apellidop}`,
      email: savedUser.correo,
      profilePic: savedUser.foto_perfil,
      role: savedUser.rol,
    });

    try {
      await sendWelcomeEmail(savedUser.correo, savedUser.nombre, ENV.CLIENT_URL, savedUser.rol);
    } catch (error) {
      console.error("Error al enviar correo de bienvenida:", error);
    }
  } catch (error) {
    console.error("Error en el controller de registro:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const login = async (req, res) => {
  const { correo, contrasena } = req.body;
  try {
    let userResult = await pool.query("SELECT * FROM geriatras WHERE correo = $1", [correo]);
    let table = "geriatra";

    if (userResult.rows.length === 0) {
      userResult = await pool.query("SELECT * FROM clientes WHERE correo = $1", [correo]);
      table = "cliente";
    }

    if (userResult.rows.length === 0) return res.status(400).json({ message: "Credenciales inválidas" });

    const user = userResult.rows[0];

    const isPasswordCorrect = await bcrypt.compare(contrasena, user.contrasena);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Credenciales inválidas" });

    const userId = table === "geriatra" ? user.id_geriatra : user.id_cliente;
    generateToken(userId, user.rol, res);

    res.status(200).json({
      id: userId,
      nombre: user.nombre,
      rol: user.rol,
      foto_perfil: user.foto_perfil
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const logout = (_, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json({ message: "Cierre de sesión exitoso" });
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ message: "Se requiere la imagen de perfil" });

    const userId = req.user.id;
    const userRole = req.user.rol;

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    let updatedUser;

    if (userRole === "geriatra" || userRole === "administrador") {
      const updateQuery = `
        UPDATE geriatras SET foto_perfil = $1 WHERE id_geriatra = $2 
        RETURNING id_geriatra AS id, nombre, apellidop, correo, foto_perfil, rol;
      `;
      const result = await pool.query(updateQuery, [uploadResponse.secure_url, userId]);
      updatedUser = result.rows[0];
    } else {
      const updateQuery = `
        UPDATE clientes SET foto_perfil = $1 WHERE id_cliente = $2 
        RETURNING id_cliente AS id, nombre, apellidop, correo, foto_perfil, rol;
      `;
      const result = await pool.query(updateQuery, [uploadResponse.secure_url, userId]);
      updatedUser = result.rows[0];
    }

    res.status(200).json({
      _id: updatedUser.id,
      fullName: `${updatedUser.nombre} ${updatedUser.apellidop}`,
      email: updatedUser.correo,
      profilePic: updatedUser.foto_perfil,
      role: updatedUser.rol,
    });
  } catch (error) {
    console.error("Error al actualizar foto de perfil: ", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};