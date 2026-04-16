// src/controllers/gpsController.js
import { pool} from "../lib/db.js"; 

// A. Guardar o actualizar la zona segura
export const configurarZonaSegura = async (req, res) => {
  const { id_paciente, lat, lon, radio } = req.body;

  try {
    const query = `
      INSERT INTO configuracion_seguridad (id_paciente, zona_segura_lat, zona_segura_lon, zona_segura_radio, fecha_actualizacion)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (id_paciente) 
      DO UPDATE SET 
        zona_segura_lat = EXCLUDED.zona_segura_lat,
        zona_segura_lon = EXCLUDED.zona_segura_lon,
        zona_segura_radio = EXCLUDED.zona_segura_radio,
        fecha_actualizacion = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const resultado = await pool.query(query, [id_paciente, lat, lon, radio]);
    res.status(200).json({
      mensaje: "Zona de seguridad guardada correctamente",
      data: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al guardar zona segura:", error);
    res.status(500).json({ error: "Error interno al guardar la configuración" });
  }
};

// B. Obtener la zona segura de un paciente
export const obtenerZonaSegura = async (req, res) => {
  const { id_paciente } = req.params;
  try {
    const query = `
      SELECT 
        zona_segura_lat as latitude, 
        zona_segura_lon as longitude, 
        zona_segura_radio as radius 
      FROM configuracion_seguridad 
      WHERE id_paciente = $1
    `;
    const resultado = await pool.query(query, [id_paciente]);

    if (resultado.rows.length > 0) {
      res.status(200).json(resultado.rows[0]);
    } else {
      res.status(404).json({ mensaje: "No hay zona configurada" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error interno al obtener zona segura" });
  }
};

// C. Eliminar la zona segura
export const eliminarZonaSegura = async (req, res) => {
  const { id_paciente } = req.params;
  try {
    const query = "DELETE FROM configuracion_seguridad WHERE id_paciente = $1 RETURNING *";
    const resultado = await pool.query(query, [id_paciente]);

    if (resultado.rows.length > 0) {
      res.status(200).json({ mensaje: "Zona de seguridad eliminada" });
    } else {
      res.status(404).json({ mensaje: "No había zona para eliminar" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar zona" });
  }
};