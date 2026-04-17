import express from "express";
import cookieParser from "cookie-parser";
import 'dotenv/config';
import cors from "cors";
import http from "http";
import { Server } from "socket.io"; // Asegúrate de tener instalado socket.io

// --- 1. IMPORTACIONES (Nombres únicos para evitar choques) ---
import { connectDB, pool } from "./lib/db.js"; 
import { ENV } from "./lib/env.js";

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
const PORT = ENV.PORT || 4000;

// Configuración de Socket.io (Unificada para Web y Móvil)
const io = new Server(server, { 
  cors: { 
    origin: ["http://localhost:5173"], // Tu React Web
    credentials: true 
  } 
});

// --- 3. MIDDLEWARES ---
app.use(express.json({ limit: "5mb" })); 
app.use(cookieParser());
app.use(cors({ 
  origin: "http://localhost:5173", 
  credentials: true 
}));

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

// --- 6. ENDPOINTS ESPECIALES (Móvil/Hardware) ---

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
  
  // BANDERA SERVIDOR 1: ¿Llegó la petición?
  console.log(`\n🚩 [SERVER DEBUG] Petición recibida del Paciente: ${id_paciente}, ${latitud}, ${longitud}`);
  
  if (!id_paciente || !latitud || !longitud) {
    console.log("   ❌ Error: Datos incompletos");
    return res.status(400).json({ error: "Datos de GPS incompletos" });
  }

  // BANDERA SERVIDOR 2: ¿A qué sala vamos a emitir?
  const sala = `sala-${id_paciente}`;
  console.log(`   📡 Emitiendo a la sala: ${sala}`);

  // Emitimos el evento que el cuidador está escuchando
  io.to(sala).emit("ubicacion-actualizada", {
    id_paciente,
    latitud,
    longitud
  });
  
  res.status(200).json({ mensaje: "Ubicación retransmitida con éxito" });
});

// --- 5. LÓGICA DE SOCKETS (Comunicación Bidireccional) ---

io.on("connection", (socket) => {
  console.log("🟢 Nuevo dispositivo conectado:", socket.id);

  // --- MÓDULO: RASTREO GPS ---
  // El cuidador se une a la sala del paciente para monitorearlo
  socket.on("unirse-rastreo", (idPaciente) => {
    socket.join(`sala-${idPaciente}`);
    console.log(`📡 Cuidador unido a la sala de seguridad: ${idPaciente}`);
  });

  // Retransmisión de ubicación en primer plano
  socket.on("enviar-ubicacion", (datos) => {
    io.to(`sala-${datos.id_paciente}`).emit("ubicacion-actualizada", datos);
  });

  // --- MÓDULO: CHAT ---
  // Unirse a una conversación específica
  socket.on("unirse-chat", (idConversacion) => {
    socket.join(`chat-${idConversacion}`);
    console.log(`💬 Usuario entró al chat #${idConversacion}`);
  });

  // Envío de mensajes en tiempo real
  socket.on("enviar-mensaje", (data) => {
    // Retransmitimos a todos los integrantes de la sala de chat
    io.to(`chat-${data.id_conversacion}`).emit("recibir-mensaje", {
      ...data,
      fecha_envio: new Date(),
    });
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("🔴 Dispositivo desconectado");
  });
});
// --- 8. ENCENDIDO ---
server.listen(PORT, async () => {
  console.log("🚀 Servidor Unificado Old-Fit corriendo en: " + PORT);
  await connectDB(); 
});