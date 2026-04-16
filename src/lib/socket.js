import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

// Creamos un ID único combinando rol e ID: "geriatra_1" o "cliente_5"
export function getReceiverSocketId(userId, userRole) {
  const roleKey = (userRole === "geriatra" || userRole === "administrador") ? "geriatra" : "cliente";
  return userSocketMap[`${roleKey}_${userId}`];
}

const userSocketMap = {}; 

io.on("connection", (socket) => {
  // socket.user viene del middleware corregido
  const roleKey = (socket.user.rol === "geriatra" || socket.user.rol === "administrador") ? "geriatra" : "cliente";
  const uniqueId = `${roleKey}_${socket.userId}`;
  
  userSocketMap[uniqueId] = socket.id;
  console.log("Usuario conectado:", socket.user.nombre, "| ID Único:", uniqueId);

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    for (const [key, val] of Object.entries(userSocketMap)) {
    if (val === socket.id) {
      delete userSocketMap[key];
      break;
    }
  }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };