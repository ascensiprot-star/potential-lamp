import { Router } from 'express';
import { pool } from './db.js';
import { broadcastNotification, } from './notifications-routes.js';
import { createNotification } from './db.js';

const router = Router();

// GET /api/committees - list committees (zone-filtered if zone_id query)
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.*,
                u.full_name AS organizer_name,
                (SELECT COUNT(*) FROM committee_members cm WHERE cm.committee_id = c.id) AS member_count,
                (SELECT COUNT(*) FROM committee_members cm WHERE cm.committee_id = c.id AND cm.user_id = $1) AS is_member
            FROM committees c
            JOIN users u ON u.id = c.organizer_id
            ORDER BY c.created_at DESC
        `, [req.session?.user?.id || null]);
        res.json({ committees: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/committees/:id - get one committee with members
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.*, u.full_name AS organizer_name
            FROM committees c JOIN users u ON u.id = c.organizer_id
            WHERE c.id = $1
        `, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Not found' });
        const { rows: members } = await pool.query(`
            SELECT cm.*, u.full_name, u.email,
                (SELECT SUM(amount_pkr) FROM committee_contributions cc WHERE cc.member_id = cm.user_id AND cc.committee_id = $1) AS total_contributed
            FROM committee_members cm JOIN users u ON u.id = cm.user_id
            WHERE cm.committee_id = $1 ORDER BY cm.payout_position ASC NULLS LAST
        `, [req.params.id]);
        const { rows: contribs } = await pool.query(`
            SELECT cc.*, u.full_name AS member_name FROM committee_contributions cc
            JOIN users u ON u.id = cc.member_id
            WHERE cc.committee_id = $1 ORDER BY cc.paid_at DESC LIMIT 50
        `, [req.params.id]);
        res.json({ committee: rows[0], members, contributions: contribs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/committees - create committee
router.post('/', async (req, res) => {
    const userId = req.session.user.id;
    const { name, description, monthly_amount_pkr, member_limit = 12, total_rounds = 12, payout_day = 1, zone_id } = req.body;
    if (!name || !monthly_amount_pkr) return res.status(400).json({ error: 'name and monthly_amount_pkr required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO committees (name, description, organizer_id, zone_id, monthly_amount_pkr, member_limit, total_rounds, payout_day)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `, [name, description, userId, zone_id || null, monthly_amount_pkr, member_limit, total_rounds, payout_day]);
        const committee = rows[0];
        // auto-add organizer as member
        await pool.query(`
            INSERT INTO committee_members (committee_id, user_id, payout_position)
            VALUES ($1, $2, 1)
        `, [committee.id, userId]);
        const { rows: countRows } = await pool.query(
            `SELECT COUNT(*) AS member_count FROM committee_members WHERE committee_id = $1`,
            [committee.id]
        );
        res.json({ committee: { ...committee, member_count: countRows[0].member_count } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/committees/:id/join - join a committee
router.post('/:id/join', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows: c } = await pool.query(`SELECT * FROM committees WHERE id = $1`, [req.params.id]);
        if (!c[0]) return res.status(404).json({ error: 'Not found' });
        if (c[0].status !== 'recruiting') return res.status(400).json({ error: 'Committee not accepting members' });
        const { rows: memberCount } = await pool.query(`SELECT COUNT(*) FROM committee_members WHERE committee_id = $1`, [req.params.id]);
        if (parseInt(memberCount[0].count) >= c[0].member_limit) return res.status(400).json({ error: 'Committee is full' });
        const position = parseInt(memberCount[0].count) + 1;
        await pool.query(`
            INSERT INTO committee_members (committee_id, user_id, payout_position) VALUES ($1, $2, $3)
            ON CONFLICT (committee_id, user_id) DO NOTHING
        `, [req.params.id, userId, position]);
        // Notify organizer
        const { rows: usr } = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
        await createNotification({ userId: c[0].organizer_id, type: 'committee', title: 'New committee member', body: `${usr[0]?.full_name || 'Someone'} joined your committee "${c[0].name}"`, data: { committee_id: c[0].id } });
        broadcastNotification(c[0].organizer_id, { type: 'committee', title: 'New member joined', body: `${usr[0]?.full_name} joined ${c[0].name}` });
        res.json({ success: true, position });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Already a member' });
        res.status(500).json({ error: err.message });
    }
});

// POST /api/committees/:id/contribute - record contribution
router.post('/:id/contribute', async (req, res) => {
    const userId = req.session.user.id;
    const { round_number, amount_pkr } = req.body;
    try {
        const { rows } = await pool.query(`
            INSERT INTO committee_contributions (committee_id, member_id, round_number, amount_pkr)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [req.params.id, userId, round_number, amount_pkr]);
        await pool.query(`UPDATE committee_members SET contributed_rounds = contributed_rounds + 1 WHERE committee_id = $1 AND user_id = $2`, [req.params.id, userId]);
        res.json({ contribution: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/committees/:id/activate - organizer starts the committee
router.patch('/:id/activate', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(`SELECT * FROM committees WHERE id = $1 AND organizer_id = $2`, [req.params.id, userId]);
        if (!rows[0]) return res.status(403).json({ error: 'Not your committee' });
        const { rows: updated } = await pool.query(`
            UPDATE committees SET status = 'active', current_round = 1, next_payout_at = NOW() + interval '1 month'
            WHERE id = $1 RETURNING *
        `, [req.params.id]);
        // Notify all members
        const { rows: members } = await pool.query(`SELECT user_id FROM committee_members WHERE committee_id = $1`, [req.params.id]);
        for (const m of members) {
            if (m.user_id === userId) continue;
            await createNotification({ userId: m.user_id, type: 'committee', title: `Committee "${rows[0].name}" is now active!`, body: `Round 1 has begun. Make your first contribution of PKR ${rows[0].monthly_amount_pkr}.`, data: { committee_id: req.params.id } });
            broadcastNotification(m.user_id, { type: 'committee', title: `${rows[0].name} is now active!`, body: 'Round 1 started' });
        }
        res.json({ committee: updated[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
