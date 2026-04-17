import { pool } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import { buildEvaluationPDF } from "../lib/pdf.generator.js";

const uploadBufferToCloudinary = (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: "raw" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

export const createEvaluation = async (req, res) => {
  const { patientId, type, results } = req.body;
  const evaluatorId = req.user.id;

  try {
    const patientResult = await pool.query(
      "SELECT CONCAT(nombre, ' ', apellidop) AS full_name FROM clientes WHERE id_cliente = $1",
      [patientId]
    );
    const evaluatorResult = await pool.query(
      "SELECT CONCAT(nombre, ' ', apellidop) AS full_name FROM geriatras WHERE id_geriatra = $1",
      [evaluatorId]
    );

    if (patientResult.rows.length === 0) return res.status(404).json({ message: "Paciente no encontrado" });
    if (evaluatorResult.rows.length === 0) return res.status(404).json({ message: "Evaluador no encontrado" });

    const patientName = patientResult.rows[0].full_name;
    const evaluatorName = evaluatorResult.rows[0].full_name;

    // Obtener historial completo para el PDF
    const [cognitivoResult, fisicoResult, medicamentosResult] = await Promise.all([
      pool.query(`
        SELECT j.nombre, j.area_cognitiva, rm.puntaje, rm.aciertos, 
               rm.errores, rm.tiempo, rm.detalles, sj.fecha_hora_fin AS fecha
        FROM sesiones_juego sj
        JOIN juegos j ON sj.id_juego = j.id_juego
        JOIN resultados_metricas rm ON rm.id_sesion = sj.id_sesion
        WHERE sj.id_cliente = $1
        ORDER BY sj.fecha_hora_fin DESC LIMIT 10
      `, [patientId]),
      pool.query(`
        SELECT nombre_ejercicio, metrica, observaciones, fecha
        FROM evaluaciones_fisicas
        WHERE id_cliente = $1
        ORDER BY fecha DESC LIMIT 10
      `, [patientId]),
      pool.query(`
        SELECT nombre_medicamento, dosis, frecuencia_horas, duracion_dias,
               fecha_inicio, fecha_fin, indicaciones, estatus
        FROM medicamentos
        WHERE id_paciente = $1 AND estatus = 'activo'
        ORDER BY fecha_inicio DESC
      `, [patientId])
    ]);

    const pdfBuffer = await buildEvaluationPDF(
      patientName,
      evaluatorName,
      type,
      results,
      cognitivoResult.rows,
      fisicoResult.rows,
      medicamentosResult.rows
    );

    const cloudinaryResponse = await uploadBufferToCloudinary(pdfBuffer, "geriatric_reports");

    // Guardar registro en evaluaciones_fisicas (tabla real del schema)
    // Si quieres un registro del reporte generado, puedes usar una tabla aparte
    // Por ahora devolvemos la URL del PDF directamente
    res.status(201).json({
      message: "Evaluación guardada y PDF generado exitosamente",
      pdf_url: cloudinaryResponse.secure_url,
      paciente: patientName,
      evaluador: evaluatorName,
      tipo: type,
    });

  } catch (error) {
    console.error("Error en createEvaluation:", error);
    res.status(500).json({ message: "Error interno del servidor al crear evaluación" });
  }
};