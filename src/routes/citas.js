import { Router } from 'express';
import { pool } from '../lib/db.js';
const router = Router();

// POST: Agendar nueva cita
router.post('/', async (req, res) => {
    const { id_cliente, id_geriatra, dia, hora, razon } = req.body;
    try {
        const fechaHoraPostgres = `${dia} ${hora}:00`;
        const insertQuery = `
            INSERT INTO citas (id_cliente, id_geriatra, fecha, razon)
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const result = await pool.query(insertQuery, [id_cliente, id_geriatra, fechaHoraPostgres, razon]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error al agendar cita:", err);
        res.status(500).json({ error: "Error al registrar la cita" });
    }
});

// DELETE: Cancelar cita
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM citas WHERE id_cita = $1", [id]);
        res.json({ message: "Cita cancelada y eliminada del registro" });
    } catch (err) {
        console.error("Error al cancelar cita:", err);
        res.status(500).json({ error: "Error al cancelar la cita" });
    }
});

export default router;