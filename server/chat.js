import { Router } from 'express';
import { pool } from './db.js';
import { broadcastNotification } from './notifications-routes.js';
import { createNotification } from './db.js';

const router = Router();

// GET /api/chat/conversations
router.get('/conversations', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(`
            SELECT DISTINCT ON (thread_key)
                cm.thread_key,
                cm.content AS last_message,
                cm.created_at AS last_message_at,
                cm.read,
                CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END AS other_user_id,
                u.full_name AS other_user_name,
                u.avatar_url AS other_user_avatar
            FROM chat_messages cm
            JOIN users u ON u.id = CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END
            WHERE cm.sender_id = $1 OR cm.receiver_id = $1
            ORDER BY thread_key, cm.created_at DESC
        `, [userId]);
        res.json({ conversations: rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/messages/:threadKey
router.get('/messages/:threadKey', async (req, res) => {
    const userId = req.session.user.id;
    const { threadKey } = req.params;
    if (!threadKey.includes(userId)) return res.status(403).json({ error: 'Not your conversation' });
    try {
        const { rows } = await pool.query(
            `SELECT cm.*, u.full_name AS sender_name, u.avatar_url AS sender_avatar
             FROM chat_messages cm JOIN users u ON u.id = cm.sender_id
             WHERE cm.thread_key = $1 ORDER BY cm.created_at ASC`,
            [threadKey]
        );
        await pool.query(`UPDATE chat_messages SET read = true WHERE thread_key = $1 AND receiver_id = $2`, [threadKey, userId]);
        res.json({ messages: rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/messages
router.post('/messages', async (req, res) => {
    const senderId = req.session.user.id;
    const { receiver_id, content, type } = req.body;
    if (!receiver_id || !content) return res.status(400).json({ error: 'receiver_id and content required' });
    const threadKey = [senderId, receiver_id].sort().join('_');
    try {
        const { rows } = await pool.query(
            `INSERT INTO chat_messages (sender_id, receiver_id, thread_key, content, type)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [senderId, receiver_id, threadKey, content, type || 'text']
        );
        const msg = rows[0];
        // Get sender info for notification
        const { rows: senderRows } = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [senderId]);
        const senderName = senderRows[0]?.full_name || 'Someone';
        const notification = { type: 'chat', title: `New message from ${senderName}`, body: content.slice(0, 80), data: { thread_key: threadKey, sender_id: senderId } };
        broadcastNotification(receiver_id, notification);
        await createNotification({ userId: receiver_id, type: 'chat', title: notification.title, body: notification.body, data: notification.data });
        res.json({ message: msg });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/users - list all users to start new conversations
router.get('/users', async (req, res) => {
    const userId = req.session.user.id;
    const q = req.query.q || '';
    try {
        const { rows } = await pool.query(`
            SELECT id, full_name, email, role FROM users
            WHERE id != $1 AND ($2 = '' OR full_name ILIKE $3 OR email ILIKE $3)
            ORDER BY full_name LIMIT 30
        `, [userId, q, `%${q}%`]);
        res.json({ users: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/chat/unread-count
router.get('/unread-count', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(
            `SELECT COUNT(*) FROM chat_messages WHERE receiver_id = $1 AND read = FALSE`,
            [userId]
        );
        res.json({ count: parseInt(rows[0].count) });
    } catch (err) {
        res.json({ count: 0 });
    }
});

export default router;
