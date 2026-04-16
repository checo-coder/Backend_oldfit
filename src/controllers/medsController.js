import { pool} from "../lib/db.js"; 

// 1. Asignar nuevo tratamiento y generar calendario
export const asignarTratamiento = async (req, res) => {
  const {
    id_paciente,
    id_geriatra,
    nombre_medicamento,
    dosis,
    frecuencia_horas,
    fecha_inicio,
    duracion_dias,
    indicaciones,
  } = req.body;

  const clienteBD = await pool.connect();
  try {
    await clienteBD.query("BEGIN");

    const queryTratamiento = `
      INSERT INTO medicamentos 
      (id_paciente, id_geriatra, nombre_medicamento, dosis, frecuencia_horas, fecha_inicio, duracion_dias, indicaciones) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_medicamento;
    `;
    const resTratamiento = await clienteBD.query(queryTratamiento, [
      id_paciente, id_geriatra, nombre_medicamento, dosis, frecuencia_horas, fecha_inicio, duracion_dias, indicaciones
    ]);
    const nuevoIdMedicamento = resTratamiento.rows[0].id_medicamento;

    // Lógica de cálculo de horarios
    const horariosProgramados = [];
    let fechaActual = new Date(); 
    const diasACalcular = duracion_dias ? duracion_dias : 30;
    const totalTomas = (24 / frecuencia_horas) * diasACalcular;

    for (let i = 0; i < totalTomas; i++) {
      horariosProgramados.push(new Date(fechaActual));
      fechaActual = new Date(fechaActual.getTime() + frecuencia_horas * 60 * 60 * 1000);
    }

    const queryToma = `INSERT INTO registro_tomas (id_medicamento, fecha_hora_programada, estado_toma) VALUES ($1, $2, 'pendiente')`;
    await Promise.all(horariosProgramados.map(hora => clienteBD.query(queryToma, [nuevoIdMedicamento, hora])));

    await clienteBD.query("COMMIT");
    res.status(201).json({ mensaje: "Tratamiento y calendario generados", id_medicamento: nuevoIdMedicamento });
  } catch (error) {
    await clienteBD.query("ROLLBACK");
    res.status(500).json({ mensaje: "Error al generar el tratamiento" });
  } finally {
    clienteBD.release();
  }
};

// 2. Obtener tomas de las próximas 24 horas con seguridad
export const obtenerTomas24h = async (req, res) => {
  const { id_paciente } = req.params;
  const usuarioLogueado = req.user;

  try {
    // Verificación de seguridad según rol
    if (usuarioLogueado.rol === "Persona Mayor" && usuarioLogueado.idUsuario !== parseInt(id_paciente)) {
      return res.status(403).json({ mensaje: "Acceso denegado" });
    }
    
    if (usuarioLogueado.rol === "cuidador") {
      const check = await pool.query("SELECT * FROM asignacion WHERE id_cuidador = $1 AND id_paciente = $2", [usuarioLogueado.idUsuario, id_paciente]);
      if (check.rows.length === 0) return res.status(403).json({ mensaje: "No asignado a este paciente" });
    }

    const query = `
      SELECT r.id_toma, r.fecha_hora_programada, r.estado_toma, m.nombre_medicamento, m.dosis, m.indicaciones
      FROM registro_tomas r
      JOIN medicamentos m ON r.id_medicamento = m.id_medicamento
      WHERE m.id_paciente = $1 AND r.estado_toma = 'pendiente' AND r.fecha_hora_programada <= NOW() + INTERVAL '24 HOURS'
      ORDER BY r.fecha_hora_programada ASC;
    `;
    const respuesta = await pool.query(query, [id_paciente]);
    res.json(respuesta.rows);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al consultar tomas" });
  }
};

// 3. Marcar como tomada
export const marcarTomaTomada = async (req, res) => {
  const { id_toma } = req.params;
  try {
    const query = `UPDATE registro_tomas SET estado_toma = 'tomada', fecha_hora_real = NOW() WHERE id_toma = $1 RETURNING *`;
    const result = await pool.query(query, [id_toma]);
    res.json({ mensaje: "¡Toma registrada!", toma: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar toma" });
  }
};

// 4. Historial (últimas 15)
export const obtenerHistorial = async (req, res) => {
  const { id_paciente } = req.params;
  try {
    const query = `
      SELECT rt.*, tm.nombre_medicamento, tm.dosis FROM registro_tomas rt
      JOIN medicamentos tm ON rt.id_medicamento = tm.id_medicamento
      WHERE tm.id_paciente = $1 AND rt.estado_toma = 'tomada'
      ORDER BY rt.fecha_hora_real DESC LIMIT 15;
    `;
    const result = await pool.query(query, [id_paciente]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener historial" });
  }
};