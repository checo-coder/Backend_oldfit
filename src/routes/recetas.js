import { Router } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

// GET: Obtener recetas de un paciente
router.get('/paciente/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT * FROM medicamentos WHERE id_paciente = $1 AND estatus = 'activo'",
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Crear nueva receta y tomas
router.post("/", async (req, res) => {
  const { id_paciente, id_geriatra, nombre_medicamento, dosis, frecuencia_horas, fecha_inicio, duracion_dias, indicaciones } = req.body;
  const clienteBD = await pool.connect();

  try {
    await clienteBD.query("BEGIN");

    const queryTratamiento = `
      INSERT INTO medicamentos 
      (id_paciente, id_geriatra, nombre_medicamento, dosis, frecuencia_horas, fecha_inicio, duracion_dias, indicaciones) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_medicamento;
    `;
    const valuesTratamiento = [id_paciente, id_geriatra, nombre_medicamento, dosis, frecuencia_horas, fecha_inicio, duracion_dias, indicaciones];

    const resTratamiento = await clienteBD.query(queryTratamiento, valuesTratamiento);
    const nuevoIdMedicamento = resTratamiento.rows[0].id_medicamento;

    const horariosProgramados = [];
    let fechaActual = fecha_inicio ? new Date(fecha_inicio) : new Date(); 

    const diasACalcular = duracion_dias ? parseInt(duracion_dias) : 30;
    const horasFrecuencia = parseInt(frecuencia_horas);
    const totalTomas = (24 / horasFrecuencia) * diasACalcular;

    for (let i = 0; i < totalTomas; i++) {
      horariosProgramados.push(new Date(fechaActual));
      fechaActual = new Date(fechaActual.getTime() + horasFrecuencia * 60 * 60 * 1000);
    }

    const queryToma = `
      INSERT INTO registro_tomas (id_medicamento, fecha_hora_programada, estado_toma)
      VALUES ($1, $2, 'pendiente');
    `;

    const promesasDeInsercion = horariosProgramados.map((hora) =>
      clienteBD.query(queryToma, [nuevoIdMedicamento, hora]),
    );

    await Promise.all(promesasDeInsercion);
    await clienteBD.query("COMMIT");
    
    res.status(201).json({ mensaje: "Tratamiento asignado y calendario generado con éxito", id_medicamento: nuevoIdMedicamento });
  } catch (error) {
    await clienteBD.query("ROLLBACK");
    console.error("Error al guardar tratamiento:", error);
    res.status(500).json({ mensaje: "Error interno al generar las tomas" });
  } finally {
    clienteBD.release();
  }
});

// PUT: Modificar receta
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_medicamento, dosis, frecuencia_horas, duracion_dias, indicaciones } = req.body;
    try {
        const updateQuery = `
            UPDATE medicamentos 
            SET nombre_medicamento = $1, dosis = $2, frecuencia_horas = $3, duracion_dias = $4, indicaciones = $5
            WHERE id_medicamento = $6 RETURNING *
        `;
        const result = await pool.query(updateQuery, [nombre_medicamento, dosis, frecuencia_horas, duracion_dias, indicaciones, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Receta no encontrada" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error al modificar receta:", err);
        res.status(500).json({ error: "Error al actualizar la receta" });
    }
});

// DELETE: Eliminar receta
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE medicamentos SET estatus = 'inactivo' WHERE id_medicamento = $1", [id]);
        res.json({ message: "Receta eliminada correctamente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;