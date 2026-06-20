import { Router } from 'express';
import { pool } from './db.js';

const router = Router();

const sseClients = new Map();

export function broadcastNotification(userId, notification) {
    const clients = sseClients.get(userId);
    if (!clients) return;
    const payload = `data: ${JSON.stringify(notification)}\n\n`;
    for (const res of clients) {
        try { res.write(payload); } catch (_) {}
    }
}

router.get('/', async (req, res) => {
    const userId = req.session.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const unreadOnly = req.query.unread === 'true';
    try {
        const { rows } = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ${unreadOnly ? 'AND read = FALSE' : ''}
             ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );
        const { rows: cnt } = await pool.query(
            `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE`,
            [userId]
        );
        res.json({ notifications: rows, unread_count: parseInt(cnt[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/read', async (req, res) => {
    const userId = req.session.user.id;
    try {
        await pool.query(
            `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
            [req.params.id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/read-all', async (req, res) => {
    const userId = req.session.user.id;
    try {
        await pool.query(
            `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/stream', (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).end();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    sseClients.get(userId).add(res);

    const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        const clients = sseClients.get(userId);
        if (clients) {
            clients.delete(res);
            if (clients.size === 0) sseClients.delete(userId);
        }
    });
});

export default router;
