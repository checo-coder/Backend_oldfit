import { pool} from "../lib/db.js"; 

/**
 * 1. Obtener los datos del médico asignado.
 * Si es paciente, lo busca en su propio registro.
 * Si es cuidador, busca al médico del paciente que tiene asignado.
 */
export const obtenerMiGeriatra = async (req, res) => {
  const idUsuario = req.user.idUsuario;
  const rol = req.user.rol;

  try {
    let query = "";

    if (rol === "cuidador") {
      // Buscamos: Cuidador -> Asignación -> Paciente -> Geriatra
      query = `
        SELECT 
          g.id_geriatra, 
          g.nombre, 
          g.apellidop, 
          g.apellidom,
          g.cedula
        FROM asignacion a
        JOIN clientes c ON a.id_paciente = c.id_cliente
        JOIN geriatras g ON c.id_geriatra = g.id_geriatra
        WHERE a.id_cuidador = $1
        LIMIT 1;
      `;
    } else {
      // Buscamos: Paciente -> Geriatra directo
      query = `
        SELECT 
          g.id_geriatra, 
          g.nombre, 
          g.apellidop, 
          g.apellidom,
          g.cedula
        FROM clientes c
        JOIN geriatras g ON c.id_geriatra = g.id_geriatra
        WHERE c.id_cliente = $1
        LIMIT 1;
      `;
    }

    const resultado = await pool.query(query, [idUsuario]);

    if (resultado.rows.length > 0) {
      res.json(resultado.rows[0]);
    } else {
      res.status(404).json({ 
        mensaje: "No se encontró un geriatra vinculado a tu cuenta o a tu paciente asignado." 
      });
    }
  } catch (error) {
    console.error("Error en obtenerMiGeriatra:", error);
    res.status(500).json({ error: "Error interno al buscar el médico asignado." });
  }
};

/**
 * 2. Obtener o crear el ID de la conversación entre el cliente y el médico.
 */
export const accederConversacion = async (req, res) => {
  const { id_geriatra } = req.params;
  const id_cliente = req.user.idUsuario;

  try {
    // Verificar si ya existe la conversación
    let chat = await pool.query(
      "SELECT id_conversacion FROM conversacion WHERE id_cliente = $1 AND id_geriatra = $2",
      [id_cliente, id_geriatra]
    );

    if (chat.rows.length === 0) {
      // Si no existe, crear una nueva
      chat = await pool.query(
        "INSERT INTO conversacion (id_cliente, id_geriatra) VALUES ($1, $2) RETURNING id_conversacion",
        [id_cliente, id_geriatra]
      );
    }

    res.json(chat.rows[0]);
  } catch (error) {
    console.error("Error en accederConversacion:", error);
    res.status(500).json({ error: "Error al intentar acceder a la conversación." });
  }
};

/**
 * 3. Listar el historial de mensajes de una conversación.
 */
export const listarMensajes = async (req, res) => {
  const { id_conversacion } = req.params;

  try {
    const mensajes = await pool.query(
      `SELECT 
        id_mensaje, 
        id_remitente, 
        tipo_remitente, 
        contenido_texto, 
        fecha_envio as "fechaEnvio"
       FROM mensajes 
       WHERE id_conversacion = $1 
       ORDER BY fecha_envio ASC`,
      [id_conversacion]
    );
    res.json(mensajes.rows);
  } catch (error) {
    console.error("Error en listarMensajes:", error);
    res.status(500).json({ error: "Error al cargar el historial de mensajes." });
  }
};

/**
 * 4. Guardar un mensaje enviado en la base de datos.
 */
export const guardarMensaje = async (req, res) => {
  const { id_conversacion, contenido_texto, tipo_remitente } = req.body;
  const id_remitente = req.user.idUsuario;

  if (!contenido_texto || contenido_texto.trim() === "") {
    return res.status(400).json({ error: "El contenido del mensaje no puede estar vacío." });
  }

  try {
    const nuevoMensaje = await pool.query(
      `INSERT INTO mensajes (id_conversacion, id_remitente, tipo_remitente, contenido_texto) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id_mensaje, id_remitente, tipo_remitente, contenido_texto, fecha_envio as "fechaEnvio"`,
      [id_conversacion, id_remitente, tipo_remitente, contenido_texto]
    );
    
    res.status(201).json(nuevoMensaje.rows[0]);
  } catch (error) {
    console.error("Error en guardarMensaje:", error);
    res.status(500).json({ error: "No se pudo registrar el mensaje en el historial." });
  }
};