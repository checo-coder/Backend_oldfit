import jwt from "jsonwebtoken";
import { pool } from "../lib/db.js";
import { ENV } from "../lib/env.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.headers.cookie
      ?.split("; ")
      .find((row) => row.startsWith("jwt="))
      ?.split("=")[1];

    if (!token) {
      console.log("Conexión de socket rechazada: No se proporcionó el token");
      return next(new Error("Sin autorización - No se proporcionó el token"));
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded) {
      console.log("Conexión de socket rechazada: Token inválido");
      return next(new Error("Sin autorización - Token inválido"));
    }

    let query = "";
    
    if (decoded.userRole === "geriatra" || decoded.userRole === "administrador") {
      query = `SELECT id_geriatra AS id, correo AS email, nombre, apellidop, CONCAT(nombre, ' ', apellidop) AS full_name, foto_perfil AS profile_pic, rol 
               FROM geriatras WHERE id_geriatra = $1`;
    } else {
      query = `SELECT id_cliente AS id, correo AS email, nombre, apellidop, CONCAT(nombre, ' ', apellidop) AS full_name, foto_perfil AS profile_pic, rol 
               FROM clientes WHERE id_cliente = $1`;
    }

    const userResult = await pool.query(query, [decoded.userId]);

    if (userResult.rows.length === 0) {
      console.log("Conexión con el socket rechazada: Usuario no encontrado");
      return next(new Error("Usuario no encontrado"));
    }

    socket.user = userResult.rows[0];
    socket.userId = userResult.rows[0].id.toString(); 

    console.log(`Socket autenticado para el usuario: ${socket.user.full_name} (ID: ${socket.userId}, Rol: ${socket.user.rol})`);

    next();
  } catch (error) {
    console.log("Error en la autenticación del socket:", error.message);
    next(new Error("Sin autorización - Error en la autenticación"));
  }
};