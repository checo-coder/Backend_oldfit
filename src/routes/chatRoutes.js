import express from "express";
import { 
  obtenerMiGeriatra, 
  accederConversacion, 
  listarMensajes, 
  guardarMensaje 
} from "../controllers/chatController.js";
import { verificarToken } from "../middleware/auth.js";

const router = express.Router();

// Todas estas rutas están protegidas por el token

// Obtener el médico asignado (Ruta: /api/chat/mi-geriatra)
router.get("/mi-geriatra", verificarToken, obtenerMiGeriatra);

// Obtener o crear conversación (Ruta: /api/chat/conversacion/:id_geriatra)
router.get("/conversacion/:id_geriatra", verificarToken, accederConversacion);

// Ver historial de mensajes (Ruta: /api/chat/mensajes/:id_conversacion)
router.get("/mensajes/:id_conversacion", verificarToken, listarMensajes);

// Enviar un mensaje (Ruta: /api/chat/enviar)
router.post("/enviar", verificarToken, guardarMensaje);

export default router;