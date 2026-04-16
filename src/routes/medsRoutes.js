import express from "express";
import { 
  asignarTratamiento, 
  obtenerTomas24h, 
  marcarTomaTomada, 
  obtenerHistorial 
} from "../controllers/medsController.js";
import { verificarToken } from "../middleware/auth.js";

const router = express.Router();

// Ruta para el Geriatra (Web)
router.post("/tratamientos", asignarTratamiento);

// Rutas para la App Móvil (Protegidas)
router.get("/tomas/:id_paciente", verificarToken, obtenerTomas24h);
router.put("/tomas/:id_toma/tomada", verificarToken, marcarTomaTomada);
router.get("/historial/:id_paciente", verificarToken, obtenerHistorial);

export default router;