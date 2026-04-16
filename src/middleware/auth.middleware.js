import jwt from "jsonwebtoken";
import { pool } from "../lib/db.js";
import { ENV } from "../lib/env.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: "Sin autorización - No se proporcionó el token" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded) return res.status(401).json({ message: "Sin autorización - Token inválido" });

    let query = "";
    
    // Usamos el userRole que guardamos en el utils.js para saber a qué tabla ir
    if (decoded.userRole === "geriatra" || decoded.userRole === "administrador") {
      query = `SELECT id_geriatra AS id, correo AS email, nombre, apellidop, CONCAT(nombre, ' ', apellidop) AS full_name, foto_perfil AS profile_pic, rol 
               FROM geriatras WHERE id_geriatra = $1`;
    } else {
      query = `SELECT id_cliente AS id, correo AS email, nombre, apellidop, CONCAT(nombre, ' ', apellidop) AS full_name, foto_perfil AS profile_pic, rol 
               FROM clientes WHERE id_cliente = $1`;
    }

    const userResult = await pool.query(query, [decoded.userId]);

    if (userResult.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    req.user = userResult.rows[0]; 
    next();
  } catch (error) {
    console.log("Error en protectRoute del middleware:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};