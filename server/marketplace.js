import { Router } from 'express';
import { pool } from './db.js';
import { broadcastNotification } from './notifications-routes.js';
import { createNotification } from './db.js';

const router = Router();

// GET /api/marketplace - browse listings
router.get('/', async (req, res) => {
    const { category, zone_id, q, min_price, max_price, condition } = req.query;
    try {
        const conditions = [`ml.status = 'active'`];
        const params = [];
        let pi = 1;
        if (category) { conditions.push(`ml.category = $${pi++}`); params.push(category); }
        if (q) { conditions.push(`(ml.title ILIKE $${pi} OR ml.description ILIKE $${pi})`); params.push(`%${q}%`); pi++; }
        if (min_price) { conditions.push(`ml.price_pkr >= $${pi++}`); params.push(min_price); }
        if (max_price) { conditions.push(`ml.price_pkr <= $${pi++}`); params.push(max_price); }
        if (condition) { conditions.push(`ml.condition = $${pi++}`); params.push(condition); }
        const where = conditions.join(' AND ');
        const { rows } = await pool.query(`
            SELECT ml.*, u.full_name AS seller_name, u.email AS seller_email
            FROM marketplace_listings ml
            JOIN users u ON u.id = ml.seller_id
            WHERE ${where}
            ORDER BY ml.created_at DESC LIMIT 60
        `, params);
        res.json({ listings: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/marketplace/my - my listings
router.get('/my', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ml.*,
                (SELECT COUNT(*) FROM marketplace_orders mo WHERE mo.listing_id = ml.id) AS order_count
            FROM marketplace_listings ml WHERE ml.seller_id = $1
            ORDER BY ml.created_at DESC
        `, [req.session.user.id]);
        res.json({ listings: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/marketplace/:id
router.get('/:id', async (req, res) => {
    try {
        await pool.query(`UPDATE marketplace_listings SET views = views + 1 WHERE id = $1`, [req.params.id]);
        const { rows } = await pool.query(`
            SELECT ml.*, u.full_name AS seller_name, u.email AS seller_email, u.id AS seller_user_id
            FROM marketplace_listings ml JOIN users u ON u.id = ml.seller_id
            WHERE ml.id = $1
        `, [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Not found' });
        res.json({ listing: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/marketplace - create listing
router.post('/', async (req, res) => {
    const userId = req.session.user.id;
    const { title, description, price_pkr, category = 'other', condition = 'good', images = [], negotiable = true, zone_id } = req.body;
    if (!title || !price_pkr) return res.status(400).json({ error: 'title and price_pkr required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO marketplace_listings (seller_id, zone_id, title, description, price_pkr, category, condition, images, negotiable)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `, [userId, zone_id || null, title, description, price_pkr, category, condition, images, negotiable]);
        res.json({ listing: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/marketplace/:id - update/mark sold
router.patch('/:id', async (req, res) => {
    const userId = req.session.user.id;
    const { status, price_pkr, description, title } = req.body;
    try {
        const updates = [];
        const params = [req.params.id, userId];
        let pi = 3;
        if (status) { updates.push(`status = $${pi++}`); params.push(status); }
        if (price_pkr) { updates.push(`price_pkr = $${pi++}`); params.push(price_pkr); }
        if (description) { updates.push(`description = $${pi++}`); params.push(description); }
        if (title) { updates.push(`title = $${pi++}`); params.push(title); }
        if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
        const { rows } = await pool.query(`
            UPDATE marketplace_listings SET ${updates.join(', ')} WHERE id = $1 AND seller_id = $2 RETURNING *
        `, params);
        if (!rows[0]) return res.status(404).json({ error: 'Not found or not your listing' });
        res.json({ listing: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/marketplace/:id/order - place an order / make offer
router.post('/:id/order', async (req, res) => {
    const buyerId = req.session.user.id;
    const { message } = req.body;
    try {
        const { rows: listing } = await pool.query(`SELECT * FROM marketplace_listings WHERE id = $1 AND status = 'active'`, [req.params.id]);
        if (!listing[0]) return res.status(404).json({ error: 'Listing not available' });
        if (listing[0].seller_id === buyerId) return res.status(400).json({ error: 'Cannot buy your own listing' });
        const { rows } = await pool.query(`
            INSERT INTO marketplace_orders (listing_id, buyer_id, seller_id, amount_pkr, message)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [req.params.id, buyerId, listing[0].seller_id, listing[0].price_pkr, message || '']);
        const { rows: buyer } = await pool.query(`SELECT full_name, email FROM users WHERE id = $1`, [buyerId]);
        const buyerName = buyer[0]?.full_name || buyer[0]?.email || 'Someone';
        await createNotification({ userId: listing[0].seller_id, type: 'marketplace', title: 'New offer on your listing', body: `${buyerName} is interested in "${listing[0].title}"`, data: { listing_id: req.params.id, order_id: rows[0].id } });
        broadcastNotification(listing[0].seller_id, { type: 'marketplace', title: 'New offer!', body: `${buyerName}: ${listing[0].title}` });
        // Mark as reserved
        await pool.query(`UPDATE marketplace_listings SET status = 'reserved' WHERE id = $1`, [req.params.id]);
        res.json({ order: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/marketplace/orders/my
router.get('/orders/my', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(`
            SELECT mo.*, ml.title, ml.images, ml.price_pkr,
                buyer.name AS buyer_name, seller.name AS seller_name
            FROM marketplace_orders mo
            JOIN marketplace_listings ml ON ml.id = mo.listing_id
            JOIN users buyer ON buyer.id = mo.buyer_id
            JOIN users seller ON seller.id = mo.seller_id
            WHERE mo.buyer_id = $1 OR mo.seller_id = $1
            ORDER BY mo.created_at DESC
        `, [userId]);
        res.json({ orders: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
