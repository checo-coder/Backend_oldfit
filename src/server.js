import express from "express";
import cookieParser from "cookie-parser";
import 'dotenv/config';
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// --- 1. IMPORTACIONES ---
import { connectDB, pool } from "./lib/db.js"; 


// Rutas Web
import authRoutesWeb from "./routes/auth.route.js";
import messageRoutesWeb from "./routes/message.route.js";
import evaluationRoutesWeb from "./routes/evaluation.route.js";
import adminRoutes from "./routes/admin.js";
import geriatraRoutes from "./routes/geriatras.js";
import recetasRoutes from "./routes/recetas.js";
import citasRoutesWeb from "./routes/citas.js";

// Rutas Móviles
import authRoutesMovil from "./routes/authRoutesMovil.js";
import chatRoutesMovil from "./routes/chatRoutes.js";
import medsRoutesMovil from "./routes/medsRoutes.js";
import statsRoutesMovil from "./routes/statsRoutes.js";
import gpsRoutesMovil from "./routes/gpsRoutes.js";
import citasRoutesMovil from "./routes/citasRoutes.js";
import reportesRoutesMovil from "./routes/reportesRoutes.js";

// --- 2. CONFIGURACIÓN INICIAL ---
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// URL del Frontend (Variable de entorno obligatoria para producción)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --- 3. MIDDLEWARES (Orden Crítico) ---

// CORS: Debe ir antes que las rutas para permitir el paso de cookies
app.use(cors({ 
  origin: CLIENT_URL, 
  credentials: true 
}));

// Aumentamos el límite a 50mb para soportar imágenes de Cloudinary en Base64
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Configuración de Socket.io (Usando la misma CLIENT_URL)
const io = new Server(server, { 
  cors: { 
    origin: [CLIENT_URL],
    credentials: true 
  } 
});

// --- 4. REGISTRO DE RUTAS WEB ---
app.use("/api/auth", authRoutesWeb);
app.use("/api/messages", messageRoutesWeb);
app.use("/api/evaluations", evaluationRoutesWeb);
app.use('/api/admin', adminRoutes);        
app.use('/api/geriatra', geriatraRoutes);  
app.use('/api/recetas', recetasRoutes);    
app.use('/api/citas', citasRoutesWeb); 

// --- 5. REGISTRO DE RUTAS MÓVILES ---
app.use("/api/movil/auth", authRoutesMovil);
app.use("/api/movil/chat", chatRoutesMovil);
app.use("/api/movil/meds", medsRoutesMovil);
app.use("/api/movil/stats", statsRoutesMovil);
app.use("/api/movil/gps", gpsRoutesMovil);
app.use("/api/movil/citas", citasRoutesMovil);
app.use("/api/movil/reportes", reportesRoutesMovil);

// --- 6. ENDPOINTS ESPECIALES ---

app.post("/api/guardar-token", async (req, res) => {
  const { id_cliente, token } = req.body;
  try {
    await pool.query(
      "UPDATE clientes SET push_token = $1 WHERE id_cliente = $2",
      [token, id_cliente]
    );
    res.status(200).json({ mensaje: "Token actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al vincular token" });
  }
});

app.post("/ubicacion-fondo", (req, res) => {
  const { id_paciente, latitud, longitud } = req.body;
  
  console.log(`\n🚩 [SERVER DEBUG] GPS Paciente: ${id_paciente}, ${latitud}, ${longitud}`);
  
  if (!id_paciente || !latitud || !longitud) {
    return res.status(400).json({ error: "Datos de GPS incompletos" });
  }

  const sala = `sala-${id_paciente}`;
  io.to(sala).emit("ubicacion-actualizada", {
    id_paciente,
    latitud,
    longitud
  });
  
  res.status(200).json({ mensaje: "Ubicación retransmitida con éxito" });
});

// --- 7. LÓGICA DE SOCKETS ---

io.on("connection", (socket) => {
  console.log("🟢 Nuevo dispositivo conectado:", socket.id);

  socket.on("unirse-rastreo", (idPaciente) => {
    socket.join(`sala-${idPaciente}`);
    console.log(`📡 Cuidador unido a la sala de seguridad: ${idPaciente}`);
  });

  socket.on("enviar-ubicacion", (datos) => {
    io.to(`sala-${datos.id_paciente}`).emit("ubicacion-actualizada", datos);
  });

  socket.on("unirse-chat", (idConversacion) => {
    socket.join(`chat-${idConversacion}`);
  });

  socket.on("enviar-mensaje", (data) => {
    io.to(`chat-${data.id_conversacion}`).emit("recibir-mensaje", {
      ...data,
      fecha_envio: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Dispositivo desconectado");
  });
});

// --- 8. ENCENDIDO ---
server.listen(PORT, async () => {
  console.log("🚀 Servidor Unificado corriendo en puerto: " + PORT);
  console.log("🌍 Aceptando peticiones desde: " + CLIENT_URL);
  await connectDB(); 
});