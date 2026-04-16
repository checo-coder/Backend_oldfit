// src/controllers/citasController.js
import { pool} from "../lib/db.js"; 

export const obtenerCitasPorCliente = async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const query = `
      SELECT 
        c.id_cita, 
        c.razon, 
        c.fecha, 
        g.nombre AS nombre_geriatra 
      FROM citas c
      JOIN geriatras g ON c.id_geriatra = g.id_geriatra
      WHERE c.id_cliente = $1 
      AND c.fecha >= NOW()
      ORDER BY c.fecha ASC;
    `;

    const result = await pool.query(query, [id_cliente]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error al obtener citas:", error);
    res.status(500).json({ error: "Error al consultar las citas" });
  }
};

export const cancelarCita = async (req, res) => {
  const { id_cita } = req.params;
  const { rol } = req.user; // Obtenido del token por el middleware verificarToken

  // 1. Verificación de Seguridad: Solo el cuidador puede cancelar
  if (rol !== 'cuidador') {
    return res.status(403).json({ mensaje: "Acceso denegado: Solo los cuidadores pueden cancelar citas." });
  }

  try {
    const query = "DELETE FROM citas WHERE id_cita = $1 RETURNING *";
    const result = await pool.query(query, [id_cita]);

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "La cita no existe o ya fue cancelada." });
    }

    res.status(200).json({ mensaje: "Cita cancelada con éxito", cita: result.rows[0] });
  } catch (error) {
    console.error("Error al cancelar cita:", error);
    res.status(500).json({ error: "Error interno al procesar la cancelación" });
  }
};