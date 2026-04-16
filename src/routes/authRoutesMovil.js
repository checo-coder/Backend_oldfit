// src/routes/authRoutes.js
import express from "express";
import { login, signup, obtenerPerfilCompleto } from "../controllers/authControllerMovil.js";
import { verificarToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.get("/perfil/:id", verificarToken, obtenerPerfilCompleto);

export default router;