import express from "express";
import { 
  obtenerActividadSemanal, 
  obtenerMedsHoy, 
  obtenerMazoMemoria, 
  registrarResultadoJuego,
  registrarEvaluacionFisica,
  obtenerUltimasEvaluaciones
} from "../controllers/statsController.js";
import { verificarToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/actividad/:id", verificarToken, obtenerActividadSemanal);
router.get("/medicamentos-hoy/:id", verificarToken, obtenerMedsHoy);
router.get("/juegos/memoria", obtenerMazoMemoria);
router.post("/juegos/registrar", verificarToken, registrarResultadoJuego);
router.post("/evaluacion-fisica", verificarToken, registrarEvaluacionFisica);
router.get("/evaluaciones/ultimo/:id_paciente", verificarToken, obtenerUltimasEvaluaciones);

export default router;