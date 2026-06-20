import { Router } from 'express';
import { pool, ensureWallet, createNotification } from './db.js';
import { broadcastNotification } from './notifications-routes.js';
import { serverError } from './utils.js';

const router = Router();

// GET /api/wallet — balance + recent 20 transactions
router.get('/', async (req, res) => {
    const userId = req.session.user.id;
    try {
        await ensureWallet(userId);
        const { rows: wallet } = await pool.query(
            `SELECT * FROM wallets WHERE user_id = $1`,
            [userId]
        );
        const { rows: txns } = await pool.query(
            `SELECT wt.*, u.full_name AS counterpart_name
             FROM wallet_transactions wt
             LEFT JOIN users u ON (
                 wt.reference_type = 'transfer_in' OR wt.reference_type = 'transfer_out'
             ) AND u.id = wt.reference_id
             WHERE wt.user_id = $1
             ORDER BY wt.created_at DESC LIMIT 30`,
            [userId]
        );
        res.json({ wallet: wallet[0] || { balance: 0, currency: 'PKR' }, transactions: txns });
    } catch (err) {
        serverError(res, err);
    }
});

// GET /api/wallet/transactions — paginated
router.get('/transactions', async (req, res) => {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const offset = (page - 1) * limit;
    try {
        await ensureWallet(userId);
        const { rows } = await pool.query(
            `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        const { rows: cnt } = await pool.query(
            `SELECT COUNT(*) FROM wallet_transactions WHERE user_id = $1`, [userId]
        );
        res.json({ transactions: rows, total: parseInt(cnt[0].count), page, limit });
    } catch (err) {
        serverError(res, err);
    }
});

// POST /api/wallet/topup — simulate top-up (in prod: connect JazzCash/EasyPaisa)
router.post('/topup', async (req, res) => {
    const userId = req.session.user.id;
    const { amount, method = 'jazzcash' } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt < 100 || amt > 200000) return res.status(400).json({ error: 'Amount must be between PKR 100 and 200,000' });
    try {
        await ensureWallet(userId);
        const { rows } = await pool.query(
            `SELECT wallet_mutate($1, 'credit', $2, $3, NULL, $4)`,
            [userId, amt, 'topup', `Top-up via ${method}`]
        );
        res.json({ success: true, transaction: rows[0].wallet_mutate });
    } catch (err) {
        serverError(res, err);
    }
});

// POST /api/wallet/transfer — peer-to-peer transfer
router.post('/transfer', async (req, res) => {
    const senderId = req.session.user.id;
    const { to_email, amount, note } = req.body;
    const amt = parseFloat(amount);
    if (!to_email || !amt || amt < 1) return res.status(400).json({ error: 'to_email and amount required' });
    if (amt > 100000) return res.status(400).json({ error: 'Max single transfer is PKR 100,000' });
    try {
        const { rows: recipient } = await pool.query(
            `SELECT id, full_name, email FROM users WHERE email = $1`, [to_email.toLowerCase()]
        );
        if (!recipient[0]) return res.status(404).json({ error: 'Recipient not found' });
        if (recipient[0].id === senderId) return res.status(400).json({ error: 'Cannot transfer to yourself' });
        const recipientId = recipient[0].id;
        await ensureWallet(senderId);
        await ensureWallet(recipientId);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Debit sender
            const { rows: debit } = await client.query(
                `SELECT wallet_mutate($1, 'debit', $2, 'transfer_out', $3, $4)`,
                [senderId, amt, recipientId, note || `Transfer to ${recipient[0].full_name || to_email}`]
            );
            // Credit recipient
            await client.query(
                `SELECT wallet_mutate($1, 'credit', $2, 'transfer_in', $3, $4)`,
                [recipientId, amt, senderId, note || `Transfer from ${req.session.user.full_name || req.session.user.email}`]
            );
            await client.query('COMMIT');

            const senderName = req.session.user.full_name || req.session.user.email;
            await createNotification({
                userId: recipientId, type: 'wallet',
                title: `PKR ${amt.toLocaleString()} received`,
                body: `${senderName} sent you money${note ? `: ${note}` : ''}`,
                data: { sender_id: senderId, amount: amt }
            });
            broadcastNotification(recipientId, {
                type: 'wallet', title: `PKR ${amt.toLocaleString()} received`,
                body: `From ${senderName}`
            });

            res.json({ success: true, transaction: debit[0].wallet_mutate });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        if (err.message?.includes('Insufficient balance')) return res.status(400).json({ error: 'Insufficient balance' });
        if (err.message?.includes('frozen')) return res.status(400).json({ error: 'Wallet is frozen' });
        serverError(res, err);
    }
});

// POST /api/wallet/withdraw — withdrawal request
router.post('/withdraw', async (req, res) => {
    const userId = req.session.user.id;
    const { amount, account_number, bank_name, account_title } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt < 500) return res.status(400).json({ error: 'Minimum withdrawal is PKR 500' });
    if (!account_number || !bank_name) return res.status(400).json({ error: 'Bank details required' });
    try {
        await ensureWallet(userId);
        const desc = `Withdrawal → ${bank_name} / ${account_title || 'N/A'} / ${account_number}`;
        const { rows } = await pool.query(
            `SELECT wallet_mutate($1, 'hold', $2, 'withdrawal', NULL, $3)`,
            [userId, amt, desc]
        );
        res.json({ success: true, message: 'Withdrawal request submitted. Funds typically arrive within 1-2 business days.', transaction: rows[0].wallet_mutate });
    } catch (err) {
        if (err.message?.includes('Insufficient')) return res.status(400).json({ error: 'Insufficient balance' });
        if (err.message?.includes('frozen')) return res.status(400).json({ error: 'Wallet is frozen' });
        serverError(res, err);
    }
});

// GET /api/wallet/neighbors — list users for P2P transfer search
router.get('/neighbors', async (req, res) => {
    const userId = req.session.user.id;
    const q = req.query.q || '';
    try {
        const { rows } = await pool.query(
            `SELECT id, full_name, email, avatar_url FROM users
             WHERE id != $1 AND ($2 = '' OR full_name ILIKE $3 OR email ILIKE $3)
             ORDER BY full_name LIMIT 20`,
            [userId, q, `%${q}%`]
        );
        res.json({ users: rows });
    } catch (err) {
        serverError(res, err);
    }
});

export default router;
