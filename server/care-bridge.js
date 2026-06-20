/**
 * Family Care Bridge — Layer 4 of the Truvornex 100% Vision
 *
 * Diaspora users (Helsinki, London, Dubai) book services for family members
 * back home (Hyderabad, Lahore, Karachi). Payment flows as a wallet credit;
 * provider delivers locally; proof photo is sent back to the sender.
 *
 * This intercepts a slice of the $30B Pakistan remittance corridor and converts
 * it into verified, trackable service delivery — better for the family,
 * better for local providers, better for Truvornex's unit economics.
 */
import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db.js';
import { createNotification } from './db.js';

const router = Router();

const EUR_PKR = 310; // default exchange rate; in production this would be live

const OrderSchema = z.object({
    recipient_name:    z.string().min(2).max(100),
    recipient_phone:   z.string().min(10).max(20),
    recipient_city:    z.string().min(2).max(80).default('Hyderabad'),
    recipient_country: z.string().length(2).default('PK'),
    services:          z.array(z.object({
        category: z.string().min(2).max(50),
        notes:    z.string().max(200).optional(),
    })).min(1).max(10),
    notes:             z.string().max(500).optional(),
    currency_sent:     z.enum(['EUR','USD','GBP','AED','CAD','AUD']).default('EUR'),
    amount_sent:       z.number().positive(),
    exchange_rate:     z.number().positive().optional(),
});

const ProofSchema = z.object({
    proof_photo_url: z.string().url(),
    proof_notes:     z.string().max(500).optional(),
});

function requireAuth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

/* ── POST /api/care-bridge — place an order ─────────────────────────────── */
router.post('/', requireAuth, async (req, res) => {
    const parse = OrderSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Validation failed', issues: parse.error.issues });

    const {
        recipient_name, recipient_phone, recipient_city, recipient_country,
        services, notes, currency_sent, amount_sent, exchange_rate,
    } = parse.data;

    const rate = exchange_rate || EUR_PKR;
    const total_pkr = Math.round(amount_sent * rate);

    try {
        const { rows } = await pool.query(`
            INSERT INTO care_bridge_orders(
                sender_id, recipient_name, recipient_phone, recipient_city, recipient_country,
                services, notes, total_pkr, currency_sent, amount_sent, exchange_rate
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
        `, [
            req.session.user.id,
            recipient_name, recipient_phone, recipient_city, recipient_country,
            JSON.stringify(services), notes || null,
            total_pkr, currency_sent, amount_sent, rate,
        ]);

        const order = rows[0];

        await createNotification({
            userId: req.session.user.id,
            type: 'care_bridge_created',
            title: 'Care Bridge Order Placed',
            body: `Your order for ${recipient_name} in ${recipient_city} has been placed. PKR ${total_pkr.toLocaleString()} worth of services will be arranged.`,
            data: { order_id: order.id },
        });

        res.status(201).json({
            order,
            summary: {
                sent: `${amount_sent} ${currency_sent}`,
                received_pkr: total_pkr,
                rate: `1 ${currency_sent} = ${rate} PKR`,
                services_ordered: services.length,
                recipient: `${recipient_name}, ${recipient_city}, ${recipient_country}`,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/care-bridge — list my sent orders ─────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
    const { status, limit = 20 } = req.query;
    try {
        const { rows } = await pool.query(`
            SELECT * FROM care_bridge_orders
            WHERE sender_id = $1
              AND ($2::TEXT IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3
        `, [req.session.user.id, status || null, Math.min(parseInt(limit) || 20, 100)]);
        res.json({ orders: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/care-bridge/my-orders — alias for listing sent orders ──────── */
router.get('/my-orders', requireAuth, async (req, res) => {
    const { status, limit = 20 } = req.query;
    try {
        const { rows } = await pool.query(`
            SELECT * FROM care_bridge_orders
            WHERE sender_id = $1
              AND ($2::TEXT IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3
        `, [req.session.user.id, status || null, Math.min(parseInt(limit) || 20, 100)]);
        res.json({ orders: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/care-bridge/:id — single order detail ─────────────────────── */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT cbo.*, u.full_name AS sender_name, u.email AS sender_email, u.country AS sender_country
            FROM care_bridge_orders cbo
            JOIN users u ON u.id = cbo.sender_id
            WHERE cbo.id = $1 AND cbo.sender_id = $2
        `, [req.params.id, req.session.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ order: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── PATCH /api/care-bridge/:id/status — update order status ────────────── */
router.patch('/:id/status', requireAuth, async (req, res) => {
    const { status } = req.body;
    const allowed = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });

    try {
        const { rows: existing } = await pool.query(
            `SELECT * FROM care_bridge_orders WHERE id = $1 AND sender_id = $2`,
            [req.params.id, req.session.user.id]
        );
        if (existing.length === 0) return res.status(404).json({ error: 'Order not found' });

        const { rows } = await pool.query(`
            UPDATE care_bridge_orders SET status=$1, updated_at=NOW()
            WHERE id=$2 RETURNING *
        `, [status, req.params.id]);

        if (status === 'completed') {
            await createNotification({
                userId: req.session.user.id,
                type: 'care_bridge_completed',
                title: 'Care Bridge Completed',
                body: `Services for ${existing[0].recipient_name} in ${existing[0].recipient_city} have been marked as completed.`,
                data: { order_id: req.params.id },
            });
        }

        res.json({ order: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── POST /api/care-bridge/:id/proof — submit proof photo ───────────────── */
router.post('/:id/proof', requireAuth, async (req, res) => {
    const parse = ProofSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'proof_photo_url (valid URL) required' });

    const { proof_photo_url, proof_notes } = parse.data;

    try {
        const { rows: existing } = await pool.query(
            `SELECT * FROM care_bridge_orders WHERE id = $1`,
            [req.params.id]
        );
        if (existing.length === 0) return res.status(404).json({ error: 'Order not found' });
        const order = existing[0];

        const { rows } = await pool.query(`
            UPDATE care_bridge_orders
            SET proof_photo_url=$1, proof_notes=$2, proof_submitted_at=NOW(), status='proof_sent', updated_at=NOW()
            WHERE id=$3 RETURNING *
        `, [proof_photo_url, proof_notes || null, req.params.id]);

        await createNotification({
            userId: order.sender_id,
            type: 'care_bridge_proof',
            title: 'Proof of Service Received',
            body: `Photo proof for ${order.recipient_name}'s services has been submitted. Your family in ${order.recipient_city} has been taken care of.`,
            data: { order_id: req.params.id, proof_photo_url },
        });

        res.json({
            order: rows[0],
            message: `Proof submitted. ${order.recipient_name}'s sender has been notified.`,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/care-bridge/rates — exchange rate reference ───────────────── */
router.get('/meta/rates', (req, res) => {
    res.json({
        base_currency: 'PKR',
        rates: { EUR: EUR_PKR, USD: 278, GBP: 355, AED: 75, CAD: 205, AUD: 182 },
        note: 'Reference rates. Actual rates locked at order placement.',
        updated_at: new Date().toISOString(),
    });
});

export default router;
