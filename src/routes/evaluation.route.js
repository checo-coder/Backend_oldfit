import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {  createEvaluation } from "../controllers/evaluation.controller.js";
import { pool } from "../lib/db.js";

const router = express.Router();

// Crear evaluación
router.post("/", protectRoute, createEvaluation);

// Obtener el historial completo del paciente (físico + cognitivo)
router.get("/patient/:patientId", protectRoute, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Evaluaciones físicas registradas por el geriatra (tabla real del schema)
    const fisicoQuery = `
      SELECT 
        id_actividad AS id,
        'fisica' AS tipo,
        nombre_ejercicio AS titulo,
        metrica,
        observaciones,
        fecha
      FROM evaluaciones_fisicas
      WHERE id_cliente = $1
      ORDER BY fecha DESC;
    `;

    // Historial cognitivo proveniente de la app móvil
    const cognitivoQuery = `
      SELECT 
        sj.id_sesion AS id,
        'cognitiva' AS tipo,
        j.nombre AS titulo,
        j.area_cognitiva,
        rm.puntaje,
        rm.aciertos,
        rm.errores,
        rm.tiempo,
        rm.detalles,
        sj.fecha_hora_fin AS fecha
      FROM sesiones_juego sj
      JOIN juegos j ON sj.id_juego = j.id_juego
      JOIN resultados_metricas rm ON rm.id_sesion = sj.id_sesion
      WHERE sj.id_cliente = $1
      ORDER BY sj.fecha_hora_fin DESC;
    `;

    // Medicamentos activos del paciente
    const medicamentosQuery = `
      SELECT 
        nombre_medicamento,
        dosis,
        frecuencia_horas,
        duracion_dias,
        fecha_inicio,
        fecha_fin,
        indicaciones,
        estatus
      FROM medicamentos
      WHERE id_paciente = $1 AND estatus = 'activo'
      ORDER BY fecha_inicio DESC;
    `;

    const [fisicoResult, cognitivoResult, medicamentosResult] = await Promise.all([
      pool.query(fisicoQuery, [patientId]),
      pool.query(cognitivoQuery, [patientId]),
      pool.query(medicamentosQuery, [patientId]),
    ]);

    res.status(200).json({
      evaluaciones_fisicas: fisicoResult.rows,
      evaluaciones_cognitivas: cognitivoResult.rows,
      medicamentos_activos: medicamentosResult.rows,
    });
  } catch (error) {
    console.error("Error en get patient evaluations:", error);
    res.status(500).json({ message: "Error al obtener historial clínico" });
  }
});

export default router;