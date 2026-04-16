import { Router } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

// GET: Resumen del panel médico
router.get('/:id/resumen', async (req, res) => {
    const { id } = req.params;
    try {
        const citasQuery = `
            SELECT 
                c.id_cita, 
                cl.nombre || ' ' || cl.apellidop AS nombre_paciente, 
                TO_CHAR(c.fecha, 'HH24:MI') AS hora, 
                c.razon 
            FROM citas c
            JOIN clientes cl ON c.id_cliente = cl.id_cliente
            WHERE c.id_geriatra = $1 
            ORDER BY c.fecha ASC
        `;
        const citasResult = await pool.query(citasQuery, [id]);
        const mensajesNuevos = 0; 

        res.json({
            citasProgramadas: citasResult.rowCount, 
            citasDetalle: citasResult.rows,         
            mensajesSinLeer: mensajesNuevos
        });
    } catch (err) {
        console.error("Error al obtener el resumen del geriatra:", err);
        res.status(500).json({ error: "Error al consultar la base de datos" });
    }
});

// GET: Obtener pacientes asignados al geriatra
router.get('/:id/pacientes', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT id_cliente, nombre, apellidop, apellidom 
            FROM clientes 
            WHERE id_geriatra = $1 AND rol = 'Persona Mayor' 
            ORDER BY nombre ASC`;
        
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener pacientes asignados" });
    }
});

// GET: Consultar todas las citas del geriatra
router.get('/:id/citas', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                c.id_cita, 
                c.razon, 
                c.fecha, 
                cl.nombre, 
                cl.apellidop 
            FROM citas c
            JOIN clientes cl ON c.id_cliente = cl.id_cliente
            WHERE c.id_geriatra = $1
            ORDER BY c.fecha ASC
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener citas:", err);
        res.status(500).json({ error: "Error al consultar las citas" });
    }
});

export default router;