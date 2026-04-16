import { pool} from "../lib/db.js"; 
import { getReceiverSocketId, io } from "../lib/socket.js";
// import cloudinary from "../lib/cloudinary.js" // Descomenta si usas imágenes después

// 1. Obtener la lista de chats activos (La función que arregló el error 500)
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const rol = req.user.rol;
    let query = "";

    if (rol === "geriatra" || rol === "administrador") {
      query = `
        SELECT c.id_cliente AS id, c.nombre || ' ' || c.apellidop AS "fullName", c.foto_perfil AS "profilePic"
        FROM conversacion conv
        JOIN clientes c ON conv.id_cliente = c.id_cliente
        WHERE conv.id_geriatra = $1
      `;
    } else {
      query = `
        SELECT g.id_geriatra AS id, g.nombre || ' ' || g.apellidop AS "fullName", g.foto_perfil AS "profilePic"
        FROM conversacion conv
        JOIN geriatras g ON conv.id_geriatra = g.id_geriatra
        WHERE conv.id_cliente = $1
      `;
    }

    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener conversaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 2. Obtener contactos disponibles para iniciar un chat nuevo
export const getContacts = async (req, res) => {
  const userRole = req.user.rol;
  const userId = req.user.id; // <-- Ahora sacamos el ID del usuario que hace la petición

  try {
    let query;
    let queryParams = [];

    if (userRole === "geriatra" || userRole === "administrador") {
      // El geriatra SOLO ve a los clientes donde él sea el doctor asignado
      query = `
        SELECT id_cliente AS id, nombre || ' ' || apellidop AS "fullName", rol, foto_perfil AS "profilePic" 
        FROM clientes 
        WHERE id_geriatra = $1
      `;
      queryParams = [userId];
    } else {
      // El cliente (paciente/cuidador) SOLO ve a su geriatra asignado
      query = `
        SELECT g.id_geriatra AS id, g.nombre || ' ' || g.apellidop AS "fullName", g.rol, g.foto_perfil AS "profilePic" 
        FROM geriatras g
        JOIN clientes c ON g.id_geriatra = c.id_geriatra
        WHERE c.id_cliente = $1
      `;
      queryParams = [userId];
    }

    const { rows } = await pool.query(query, queryParams);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error en getContacts:", error);
    res.status(500).json({ message: "Error al obtener contactos" });
  }
};

// 3. Obtener mensajes (Ahora usa targetId en lugar de id_conversacion)
export const getMessages = async (req, res) => {
 const targetId = req.params.id || req.params.targetId || req.params.id_conversacion;

  // Si llega vacío o dice "undefined", avisamos en la consola para no fallar en silencio
  if (!targetId || targetId === "undefined") {
    console.log("Error: El backend no recibió el ID del contacto.");
    return res.status(400).json([]);
  }
  const myId = req.user.id;
  const myRole = req.user.rol;

  try {
    // Averiguamos quién es el cliente y quién el geriatra
    const idCliente = (myRole === 'geriatra' || myRole === 'administrador') ? targetId : myId;
    const idGeriatra = (myRole === 'geriatra' || myRole === 'administrador') ? myId : targetId;

    // Buscamos si existe la conversación entre ambos
    const conv = await pool.query(
      "SELECT id_conversacion FROM conversacion WHERE id_cliente = $1 AND id_geriatra = $2",
      [idCliente, idGeriatra]
    );

    // Si nunca han hablado, devolvemos un arreglo vacío (sin error)
    if (conv.rows.length === 0) {
      return res.status(200).json([]);
    }

    const idConversacion = conv.rows[0].id_conversacion;

    const query = `
      SELECT id_mensaje, contenido_texto, fecha_envio, id_remitente, tipo_remitente 
      FROM mensajes 
      WHERE id_conversacion = $1 
      ORDER BY fecha_envio ASC
    `;
    const { rows } = await pool.query(query, [idConversacion]);
    
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error en getMessages:", error);
    res.status(500).json({ message: "Error al recuperar mensajes" });
  }
};

// 4. Enviar un mensaje (Crea la conversación automáticamente si no existe)
export const sendMessage = async (req, res) => {
  const { targetId, contenido_texto } = req.body; // Ahora recibimos targetId del body
  const senderId = req.user.id; 
  const senderRole = req.user.rol;

  try {
    const tipoRemitente = (senderRole === 'geriatra' || senderRole === 'administrador') 
                          ? 'geriatra' : 'cliente';

    const idCliente = tipoRemitente === 'geriatra' ? targetId : senderId;
    const idGeriatra = tipoRemitente === 'geriatra' ? senderId : targetId;

    // 1. Buscamos la conversación
    let conv = await pool.query(
      "SELECT id_conversacion FROM conversacion WHERE id_cliente = $1 AND id_geriatra = $2",
      [idCliente, idGeriatra]
    );

    let idConversacion;

    // 2. Si no existe, la CREAMOS (¡Así ya no tienes que hacer INSERTs manuales!)
    if (conv.rows.length === 0) {
      const newConv = await pool.query(
        "INSERT INTO conversacion (id_cliente, id_geriatra) VALUES ($1, $2) RETURNING id_conversacion",
        [idCliente, idGeriatra]
      );
      idConversacion = newConv.rows[0].id_conversacion;
    } else {
      idConversacion = conv.rows[0].id_conversacion;
    }

    // 3. Insertamos el mensaje
    const query = `
      INSERT INTO mensajes (id_conversacion, id_remitente, tipo_remitente, contenido_texto)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [idConversacion, senderId, tipoRemitente, contenido_texto]);
    const newMessage = rows[0];

    // 4. Lógica de Socket.io
    const receiverRole = tipoRemitente === "geriatra" ? "cliente" : "geriatra";
    const receiverSocketId = getReceiverSocketId(targetId.toString(), receiverRole);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error en sendMessage:", error);
    res.status(500).json({ message: "Error al enviar mensaje" });
  }
};