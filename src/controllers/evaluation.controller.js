import { pool } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import { buildEvaluationPDF } from "../lib/pdf.generator.js";

// Función auxiliar para subir un Buffer a Cloudinary
const uploadBufferToCloudinary = (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(      
      { folder: folderName, resource_type: "image", format:"pdf", access_mode:"public", type:"upload" }, // "document" para PDFs
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
  const evaluatorId = req.user.id; // Viene del token JWT

  try {
    // 1. Obtener nombres para el PDF
    const usersResult = await pool.query(
      "SELECT id_geriatra, nombre, rol FROM geriatras WHERE id_geriatra IN ($1, $2)",
      [patientId, evaluatorId]
    );
    
    const patient = usersResult.rows.find(u => u.id === patientId);
    const evaluator = usersResult.rows.find(u => u.id === evaluatorId);

    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // 2. Generar el PDF en memoria
    const pdfBuffer = await buildEvaluationPDF(patient.full_name, evaluator.full_name, type, results);

    // 3. Subir el PDF a Cloudinary
    const cloudinaryResponse = await uploadBufferToCloudinary(pdfBuffer, "geriatric_reports");

    // 4. Guardar en la base de datos PostgreSQL
    const insertQuery = `
      INSERT INTO evaluations (patient_id, evaluator_id, type, results, pdf_report_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    // Al pasar 'results' (que es un objeto JS), el paquete 'pg' lo convierte a JSON automáticamente
    const newEvalResult = await pool.query(insertQuery, [
      patientId, 
      evaluatorId, 
      type, 
      results, 
      cloudinaryResponse.secure_url
    ]);

    res.status(201).json({
      message: "Evaluación guardada y PDF generado exitosamente",
      evaluation: newEvalResult.rows[0]
    });

  } catch (error) {
    console.error("Error en createEvaluation:", error);
    res.status(500).json({ message: "Error interno del servidor al crear evaluación" });
  }
};