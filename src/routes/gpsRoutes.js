// src/routes/gpsRoutes.js
import express from "express";
import { 
  configurarZonaSegura, 
  obtenerZonaSegura, 
  eliminarZonaSegura 
} from "../controllers/gpsController.js";
import { verificarToken } from "../middleware/auth.js";

const router = express.Router();

// Rutas protegidas para gestionar la geocerca
router.post("/configurar", verificarToken, configurarZonaSegura);
router.get("/zona/:id_paciente", verificarToken, obtenerZonaSegura);
router.delete("/zona/:id_paciente", verificarToken, eliminarZonaSegura);

export default router;