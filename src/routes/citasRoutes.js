// src/routes/citasRoutes.js
import express from "express";
import { obtenerCitasPorCliente, cancelarCita } from "../controllers/citasController.js";
import { verificarToken } from "../middleware/auth.js";

const router = express.Router();

// Aplicamos verificarToken para asegurar que solo usuarios logueados vean citas
router.get("/:id_cliente", verificarToken, obtenerCitasPorCliente);
router.delete("/:id_cita", verificarToken, cancelarCita);

export default router;