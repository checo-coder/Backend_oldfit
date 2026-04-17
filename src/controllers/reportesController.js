import { pool} from "../lib/db.js"; 

// 1. Obtener solo el último reporte (para el Dashboard)
export const obtenerUltimoReporte = async (req, res) => {
  const { id_cliente } = req.params; // ID del paciente
  try {
    const query = `
      SELECT id_reporte, titulo, url_pdf, fecha_creacion 
      FROM reportes_pdf 
      WHERE id_cliente = $1 
      ORDER BY fecha_creacion DESC 
      LIMIT 1
    `;
    const result = await pool.query(query, [id_cliente]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ mensaje: "No hay reportes disponibles" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el último reporte" });
  }
};

// 2. Obtener historial completo
export const obtenerHistorialReportes = async (req, res) => {
  const { id_cliente } = req.params;
  try {
    const query = `
      SELECT id_reporte, titulo, url_pdf, fecha_creacion 
      FROM reportes_pdf 
      WHERE id_cliente = $1 
      ORDER BY fecha_creacion DESC
    `;
    const result = await pool.query(query, [id_cliente]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener historial de reportes" });
  }
};

export const guardarReporte = async (req, res) => {
  const { id_cliente, id_geriatra, titulo, url_pdf } = req.body;

  try {
    const query = `
      INSERT INTO reportes_pdf (id_cliente, id_geriatra, titulo, url_pdf) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *;
    `;
    
    const nuevoReporte = await pool.query(query, [id_cliente, id_geriatra, titulo, url_pdf]);
    res.status(201).json(nuevoReporte.rows[0]);
    
  } catch (error) {
    console.error("Error al guardar reporte en BD:", error);
    res.status(500).json({ error: "No se pudo guardar el reporte." });
  }
};

