import express from "express";
import { 
  obtenerUltimoReporte,
  obtenerHistorialReportes
} from "../controllers/reportesController.js";
import { guardarReporte } from "../controllers/reportesController.js";
import { verificarToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/ultimo/:id_cliente/", verificarToken, obtenerUltimoReporte);
router.get("/historial/:id_cliente/", verificarToken, obtenerHistorialReportes);
// POST: /api/movil/reportes/guardar (o donde lo hayas montado en server.js)
router.post("/guardar", verificarToken, guardarReporte);

// GET: /api/movil/reportes/:id_cliente 


export default router;
