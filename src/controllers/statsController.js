import { pool} from "../lib/db.js"; 

// --- ESTADÍSTICAS ---
export const obtenerActividadSemanal = async (req, res) => {
  const { id } = req.params; // ID del Cuidador
  try {
    const asignacion = await pool.query("SELECT id_paciente FROM asignacion WHERE id_cuidador = $1", [id]);
    if (asignacion.rows.length === 0) return res.json([]);

    const pId = asignacion.rows[0].id_paciente;
    const query = `
      SELECT date, COUNT(*) as count FROM (
        SELECT TO_CHAR(fecha_hora_fin, 'YYYY-MM-DD') as date FROM sesiones_juego 
        WHERE id_cliente = $1 AND fecha_hora_fin >= NOW() - INTERVAL '7 DAY'
        UNION ALL
        SELECT TO_CHAR(fecha, 'YYYY-MM-DD') as date FROM evaluaciones_fisicas 
        WHERE id_cliente = $1 AND fecha >= NOW() - INTERVAL '7 DAY'
      ) AS actividad GROUP BY date ORDER BY date ASC;
    `;
    const resultado = await pool.query(query, [pId]);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json([]);
  }
};

export const obtenerMedsHoy = async (req, res) => {
  const { id } = req.params;
  try {
    const asignacion = await pool.query("SELECT id_paciente FROM asignacion WHERE id_cuidador = $1", [id]);
    if (asignacion.rows.length === 0) return res.json([]);

    const query = `
      SELECT estado_toma as estado, COUNT(*)::int as cantidad
      FROM registro_tomas rt
      JOIN medicamentos m ON rt.id_medicamento = m.id_medicamento
      WHERE m.id_paciente = $1 AND rt.fecha_hora_programada::date = CURRENT_DATE
      GROUP BY estado_toma;
    `;
    const resultado = await pool.query(query, [asignacion.rows[0].id_paciente]);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json([]);
  }
};

// --- JUEGOS Y EVALUACIONES ---
export const obtenerMazoMemoria = async (req, res) => {
  try {
    const response = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");
    const data = await response.json();
    const resp2 = await fetch(`https://deckofcardsapi.com/api/deck/${data.deck_id}/draw/?count=6`);
    const data2 = await resp2.json();
    
    const cards = data2.cards;
    const shuffledDeck = [...cards, ...cards].sort(() => Math.random() - 0.5); // Barajado simple

    res.json({
      deck_id: data.deck_id,
      cards: shuffledDeck.map(c => ({ code: c.code, img: c.images.png }))
    });
  } catch (error) {
    res.status(500).json({ error: "Error en API de cartas" });
  }
};

export const registrarResultadoJuego = async (req, res) => {
  const { id_cliente, id_juego, puntaje, aciertos, errores, tiempo, detalles } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resSesion = await client.query(
      `INSERT INTO sesiones_juego (fecha_hora_fin, id_juego, id_cliente) VALUES (NOW(), $1, $2) RETURNING id_sesion`,
      [id_juego, id_cliente]
    );
    await client.query(
      `INSERT INTO resultados_metricas (puntaje, aciertos, errores, tiempo, detalles, id_sesion) VALUES ($1, $2, $3, $4, $5, $6)`,
      [puntaje, aciertos, errores, tiempo, detalles, resSesion.rows[0].id_sesion]
    );
    await client.query("COMMIT");
    res.status(201).json({ mensaje: "Resultado guardado" });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error al guardar" });
  } finally {
    client.release();
  }
};

export const registrarEvaluacionFisica = async (req, res) => {
  const { id_cliente, nombre_ejercicio, metrica, observaciones } = req.body;
  try {
    const query = `
      INSERT INTO evaluaciones_fisicas (id_cliente, nombre_ejercicio, metrica, observaciones)
      VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const result = await pool.query(query, [id_cliente, nombre_ejercicio, metrica, observaciones]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al guardar la evaluación" });
  }
};

export const obtenerUltimasEvaluaciones = async (req, res) => {
  const { id_paciente } = req.params;
  try {
    const query = `
      SELECT nombre_ejercicio, MAX(fecha) as ultima_fecha
      FROM evaluaciones_fisicas
      WHERE id_cliente = $1
      GROUP BY nombre_ejercicio;
    `;
    const result = await pool.query(query, [id_paciente]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener fechas" });
  }
};