import { Router } from 'express';
import { pool } from './db.js';
import { broadcastNotification } from './notifications-routes.js';
import { createNotification } from './db.js';
import { serverError } from './utils.js';

const router = Router();

/* ═══════════════════════════════════════
   TRANSPORT / RIDE SHARES
═══════════════════════════════════════ */
router.get('/transport', async (req, res) => {
    const { type = 'carpool', from_location, to_location } = req.query;
    try {
        let q = `SELECT rs.*, u.full_name AS driver_name, u.email AS driver_email,
            (SELECT COUNT(*) FROM ride_passengers rp WHERE rp.ride_id = rs.id AND rp.status = 'confirmed') AS passengers_confirmed
            FROM ride_shares rs JOIN users u ON u.id = rs.driver_id
            WHERE rs.status = 'open' AND rs.type = $1`;
        const params = [type];
        let pi = 2;
        if (from_location) { q += ` AND rs.from_location ILIKE $${pi++}`; params.push(`%${from_location}%`); }
        if (to_location) { q += ` AND rs.to_location ILIKE $${pi++}`; params.push(`%${to_location}%`); }
        q += ` ORDER BY rs.created_at DESC LIMIT 50`;
        const { rows } = await pool.query(q, params);
        res.json({ rides: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/transport', async (req, res) => {
    const userId = req.session.user.id;
    const { type = 'carpool', from_location, to_location, departure_at, seats_total = 1, price_pkr = 0, vehicle, notes, contact_phone, recurring = false } = req.body;
    if (!from_location || !to_location) return res.status(400).json({ error: 'from_location and to_location required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO ride_shares (driver_id, type, from_location, to_location, departure_at, seats_total, seats_available, price_pkr, vehicle, notes, contact_phone, recurring)
            VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$11) RETURNING *
        `, [userId, type, from_location, to_location, departure_at || null, seats_total, price_pkr, vehicle, notes, contact_phone, recurring]);
        res.json({ ride: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/transport/:id/join', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows: ride } = await pool.query(`SELECT * FROM ride_shares WHERE id = $1 AND status = 'open'`, [req.params.id]);
        if (!ride[0]) return res.status(404).json({ error: 'Ride not available' });
        if (ride[0].driver_id === userId) return res.status(400).json({ error: 'You are the driver' });
        if (ride[0].seats_available <= 0) return res.status(400).json({ error: 'No seats available' });
        await pool.query(`INSERT INTO ride_passengers (ride_id, passenger_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, userId]);
        await pool.query(`UPDATE ride_shares SET seats_available = seats_available - 1, status = CASE WHEN seats_available - 1 <= 0 THEN 'full' ELSE 'open' END WHERE id = $1`, [req.params.id]);
        const { rows: u } = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
        await createNotification({ userId: ride[0].driver_id, type: 'transport', title: 'New passenger', body: `${u[0]?.full_name || 'Someone'} requested a seat for ${ride[0].from_location} → ${ride[0].to_location}`, data: { ride_id: req.params.id } });
        broadcastNotification(ride[0].driver_id, { type: 'transport', title: 'New seat request', body: `${u[0]?.full_name} joined your ride` });
        res.json({ success: true });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   BLOOD DONORS
═══════════════════════════════════════ */
router.get('/blood-donors', async (req, res) => {
    const { blood_type, zone_id } = req.query;
    try {
        let q = `SELECT bd.*, u.full_name, u.email FROM blood_donors bd JOIN users u ON u.id = bd.user_id WHERE bd.available = TRUE`;
        const params = [];
        let pi = 1;
        if (blood_type) { q += ` AND bd.blood_type = $${pi++}`; params.push(blood_type); }
        q += ` ORDER BY bd.last_donation_at ASC NULLS FIRST LIMIT 50`;
        const { rows } = await pool.query(q, params);
        res.json({ donors: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/blood-donors', async (req, res) => {
    const userId = req.session.user.id;
    const { blood_type, contact_phone, notes, zone_id } = req.body;
    if (!blood_type) return res.status(400).json({ error: 'blood_type required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO blood_donors (user_id, zone_id, blood_type, contact_phone, notes)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (user_id) DO UPDATE SET blood_type=$3, contact_phone=$4, notes=$5, available=TRUE
            RETURNING *
        `, [userId, zone_id || null, blood_type, contact_phone, notes]);
        res.json({ donor: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.patch('/blood-donors/availability', async (req, res) => {
    const userId = req.session.user.id;
    const { available } = req.body;
    try {
        await pool.query(`UPDATE blood_donors SET available = $1, last_donation_at = CASE WHEN $1 = FALSE THEN NOW() ELSE last_donation_at END WHERE user_id = $2`, [available, userId]);
        res.json({ success: true });
    } catch (err) {
        serverError(res, err);
    }
});

router.get('/blood-requests', async (req, res) => {
    const { blood_type } = req.query;
    try {
        let q = `SELECT br.*, u.full_name AS requester_name FROM blood_requests br JOIN users u ON u.id = br.requester_id WHERE br.fulfilled = FALSE`;
        const params = [];
        if (blood_type) { q += ` AND br.blood_type = $1`; params.push(blood_type); }
        q += ` ORDER BY CASE urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END, br.created_at DESC`;
        const { rows } = await pool.query(q, params);
        res.json({ requests: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/blood-requests', async (req, res) => {
    const userId = req.session.user.id;
    const { blood_type, urgency = 'urgent', hospital, notes, units_needed = 1, zone_id } = req.body;
    if (!blood_type) return res.status(400).json({ error: 'blood_type required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO blood_requests (requester_id, zone_id, blood_type, urgency, hospital, notes, units_needed)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
        `, [userId, zone_id || null, blood_type, urgency, hospital, notes, units_needed]);
        // Notify matching donors
        const { rows: donors } = await pool.query(`SELECT user_id FROM blood_donors WHERE blood_type = $1 AND available = TRUE LIMIT 20`, [blood_type]);
        for (const d of donors) {
            broadcastNotification(d.user_id, { type: 'blood', title: `🩸 ${urgency === 'emergency' ? 'EMERGENCY' : 'Urgent'} Blood Request`, body: `${blood_type} needed at ${hospital || 'nearby location'}` });
        }
        res.json({ request: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   NOTICE BOARD
═══════════════════════════════════════ */
router.get('/notice-board', async (req, res) => {
    const { type, q } = req.query;
    try {
        let sql = `SELECT nb.*, u.full_name AS poster_name FROM notice_board nb JOIN users u ON u.id = nb.user_id WHERE nb.active = TRUE AND (nb.expires_at IS NULL OR nb.expires_at > NOW())`;
        const params = [];
        let pi = 1;
        if (type) { sql += ` AND nb.type = $${pi++}`; params.push(type); }
        if (q) { sql += ` AND (nb.title ILIKE $${pi} OR nb.body ILIKE $${pi})`; params.push(`%${q}%`); pi++; }
        sql += ` ORDER BY nb.created_at DESC LIMIT 60`;
        const { rows } = await pool.query(sql, params);
        res.json({ posts: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/notice-board', async (req, res) => {
    const userId = req.session.user.id;
    const { type, title, body, price_pkr, contact_phone, expires_at, zone_id } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO notice_board (user_id, zone_id, type, title, body, price_pkr, contact_phone, expires_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
        `, [userId, zone_id || null, type, title, body, price_pkr || null, contact_phone, expires_at || null]);
        res.json({ post: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.delete('/notice-board/:id', async (req, res) => {
    await pool.query(`UPDATE notice_board SET active = FALSE WHERE id = $1 AND user_id = $2`, [req.params.id, req.session.user.id]);
    res.json({ success: true });
});

/* ═══════════════════════════════════════
   TOOL LIBRARY
═══════════════════════════════════════ */
router.get('/tool-library', async (req, res) => {
    const { category } = req.query;
    try {
        let q = `SELECT ti.*, u.full_name AS owner_name FROM tool_items ti JOIN users u ON u.id = ti.owner_id WHERE 1=1`;
        const params = [];
        if (category) { q += ` AND ti.category = $1`; params.push(category); }
        q += ` ORDER BY ti.available DESC, ti.created_at DESC LIMIT 60`;
        const { rows } = await pool.query(q, params);
        res.json({ items: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/tool-library', async (req, res) => {
    const userId = req.session.user.id;
    const { name, category = 'general', description, deposit_pkr = 0, zone_id } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO tool_items (owner_id, zone_id, name, category, description, deposit_pkr)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
        `, [userId, zone_id || null, name, category, description, deposit_pkr]);
        res.json({ item: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/tool-library/:id/borrow', async (req, res) => {
    const userId = req.session.user.id;
    const { return_by } = req.body;
    if (!return_by) return res.status(400).json({ error: 'return_by required' });
    try {
        const { rows: item } = await pool.query(`SELECT * FROM tool_items WHERE id = $1 AND available = TRUE`, [req.params.id]);
        if (!item[0]) return res.status(400).json({ error: 'Item not available' });
        if (item[0].owner_id === userId) return res.status(400).json({ error: 'Cannot borrow your own item' });
        const { rows } = await pool.query(`INSERT INTO tool_loans (item_id, borrower_id, return_by) VALUES ($1,$2,$3) RETURNING *`, [req.params.id, userId, return_by]);
        await pool.query(`UPDATE tool_items SET available = FALSE WHERE id = $1`, [req.params.id]);
        const { rows: u } = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
        await createNotification({ userId: item[0].owner_id, type: 'tool', title: 'Tool borrowed', body: `${u[0]?.full_name || 'Someone'} borrowed your "${item[0].name}", to return by ${return_by}`, data: { item_id: req.params.id } });
        broadcastNotification(item[0].owner_id, { type: 'tool', title: 'Tool borrowed', body: `${u[0]?.full_name} took your ${item[0].name}` });
        res.json({ loan: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/tool-library/:id/return', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(`
            UPDATE tool_loans SET status = 'returned', returned_at = NOW()
            WHERE item_id = $1 AND borrower_id = $2 AND status = 'active' RETURNING *
        `, [req.params.id, userId]);
        if (rows[0]) await pool.query(`UPDATE tool_items SET available = TRUE WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   JOB BOARD
═══════════════════════════════════════ */
router.get('/job-board', async (req, res) => {
    const { category, job_type, q } = req.query;
    try {
        let sql = `SELECT jp.*, u.full_name AS poster_name FROM job_posts jp JOIN users u ON u.id = jp.poster_id WHERE jp.status = 'open'`;
        const params = [];
        let pi = 1;
        if (category) { sql += ` AND jp.category = $${pi++}`; params.push(category); }
        if (job_type) { sql += ` AND jp.job_type = $${pi++}`; params.push(job_type); }
        if (q) { sql += ` AND (jp.title ILIKE $${pi} OR jp.description ILIKE $${pi})`; params.push(`%${q}%`); pi++; }
        sql += ` ORDER BY jp.created_at DESC LIMIT 50`;
        const { rows } = await pool.query(sql, params);
        res.json({ jobs: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/job-board', async (req, res) => {
    const userId = req.session.user.id;
    const { title, description, category = 'general', wage_pkr, duration, job_type = 'gig', zone_id } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO job_posts (poster_id, zone_id, title, description, category, wage_pkr, duration, job_type)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
        `, [userId, zone_id || null, title, description, category, wage_pkr || null, duration, job_type]);
        res.json({ job: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/job-board/:id/apply', async (req, res) => {
    const userId = req.session.user.id;
    const { message } = req.body;
    try {
        const { rows: job } = await pool.query(`SELECT * FROM job_posts WHERE id = $1 AND status = 'open'`, [req.params.id]);
        if (!job[0]) return res.status(404).json({ error: 'Job not found or closed' });
        const { rows } = await pool.query(`INSERT INTO job_applications (job_id, applicant_id, message) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`, [req.params.id, userId, message]);
        const { rows: u } = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
        await createNotification({ userId: job[0].poster_id, type: 'job', title: 'New applicant', body: `${u[0]?.full_name || 'Someone'} applied for "${job[0].title}"`, data: { job_id: req.params.id } });
        broadcastNotification(job[0].poster_id, { type: 'job', title: 'New application', body: `${u[0]?.full_name} applied for ${job[0].title}` });
        res.json({ application: rows[0] || { message: 'Already applied' } });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   FOOD SHARING
═══════════════════════════════════════ */
router.get('/food-sharing', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT fs.*, u.full_name AS sharer_name FROM food_shares fs JOIN users u ON u.id = fs.user_id
            WHERE fs.active = TRUE AND (fs.available_until IS NULL OR fs.available_until > NOW())
            ORDER BY fs.is_free DESC, fs.created_at DESC LIMIT 50
        `);
        res.json({ items: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/food-sharing', async (req, res) => {
    const userId = req.session.user.id;
    const { title, description, quantity, is_free = true, price_pkr = 0, available_until, zone_id } = req.body;
    if (!title || !quantity) return res.status(400).json({ error: 'title and quantity required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO food_shares (user_id, zone_id, title, description, quantity, is_free, price_pkr, available_until)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
        `, [userId, zone_id || null, title, description, quantity, is_free, price_pkr, available_until || null]);
        res.json({ item: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/food-sharing/:id/claim', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(`
            UPDATE food_shares SET claimed_by = $1, claimed_at = NOW(), active = FALSE
            WHERE id = $2 AND active = TRUE AND claimed_by IS NULL RETURNING *
        `, [userId, req.params.id]);
        if (!rows[0]) return res.status(400).json({ error: 'Item already claimed' });
        const { rows: u } = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
        await createNotification({ userId: rows[0].user_id, type: 'food', title: 'Food claimed!', body: `${u[0]?.full_name || 'Someone'} claimed "${rows[0].title}"`, data: {} });
        broadcastNotification(rows[0].user_id, { type: 'food', title: 'Food claimed', body: `${u[0]?.full_name} took your ${rows[0].title}` });
        res.json({ success: true });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   COMMUNITY WATCH
═══════════════════════════════════════ */
router.get('/community-watch', async (req, res) => {
    const { type } = req.query;
    try {
        let q = `SELECT wr.*, CASE WHEN wr.anonymous THEN 'Anonymous' ELSE u.full_name END AS reporter_name
            FROM watch_reports wr LEFT JOIN users u ON u.id = wr.reporter_id WHERE 1=1`;
        const params = [];
        if (type) { q += ` AND wr.type = $1`; params.push(type); }
        q += ` ORDER BY wr.upvotes DESC, wr.created_at DESC LIMIT 50`;
        const { rows } = await pool.query(q, params);
        res.json({ reports: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/community-watch', async (req, res) => {
    const userId = req.session.user.id;
    const { type, title, description, location_text, anonymous = false, zone_id } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO watch_reports (reporter_id, zone_id, type, title, description, location_text, anonymous)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
        `, [userId, zone_id || null, type, title, description, location_text, anonymous]);
        res.json({ report: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/community-watch/:id/upvote', async (req, res) => {
    try {
        await pool.query(`UPDATE watch_reports SET upvotes = upvotes + 1 WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   LOCAL BUSINESSES
═══════════════════════════════════════ */
router.get('/local-businesses', async (req, res) => {
    const { category, q } = req.query;
    try {
        let sql = `SELECT lb.*, u.full_name AS owner_name FROM local_businesses lb JOIN users u ON u.id = lb.owner_id WHERE 1=1`;
        const params = [];
        let pi = 1;
        if (category) { sql += ` AND lb.category = $${pi++}`; params.push(category); }
        if (q) { sql += ` AND (lb.name ILIKE $${pi} OR lb.description ILIKE $${pi})`; params.push(`%${q}%`); pi++; }
        sql += ` ORDER BY lb.verified DESC, lb.rating_avg DESC, lb.created_at DESC LIMIT 60`;
        const { rows } = await pool.query(sql, params);
        res.json({ businesses: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/local-businesses', async (req, res) => {
    const userId = req.session.user.id;
    const { name, category, description, address, phone, hours, payment_methods = ['cash'], zone_id } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO local_businesses (owner_id, zone_id, name, category, description, address, phone, hours, payment_methods)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
        `, [userId, zone_id || null, name, category, description, address, phone, hours, payment_methods]);
        res.json({ business: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   EVENT REQUESTS (request → admin approval)
═══════════════════════════════════════ */
router.get('/event-requests', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT er.*, u.full_name AS requester_name FROM event_requests er JOIN users u ON u.id = er.requester_id
            ORDER BY er.created_at DESC LIMIT 50
        `);
        res.json({ requests: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/event-requests', async (req, res) => {
    const userId = req.session.user.id;
    const { title, description, category = 'community', proposed_date, venue, expected_attendees = 50, zone_id } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO event_requests (requester_id, zone_id, title, description, category, proposed_date, venue, expected_attendees)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
        `, [userId, zone_id || null, title, description, category, proposed_date || null, venue, expected_attendees]);
        res.json({ request: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.patch('/event-requests/:id', async (req, res) => {
    const { status, admin_notes } = req.body;
    try {
        const { rows } = await pool.query(`
            UPDATE event_requests SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *
        `, [status, admin_notes, req.params.id]);
        if (rows[0] && status === 'approved') {
            // Create the real event automatically
            const er = rows[0];
            const { rows: event } = await pool.query(`
                INSERT INTO events (organizer_id, title, description, category, event_date, venue, status)
                VALUES ($1,$2,$3,$4,$5,$6,'upcoming') RETURNING *
            `, [er.requester_id, er.title, er.description || '', er.category, er.proposed_date || NOW(), er.venue || 'TBD']);
            await pool.query(`UPDATE event_requests SET approved_event_id = $1 WHERE id = $2`, [event[0].id, er.id]);
            await createNotification({ userId: er.requester_id, type: 'event', title: '🎉 Event Approved!', body: `Your event "${er.title}" has been approved!`, data: { event_id: event[0].id } });
            broadcastNotification(er.requester_id, { type: 'event', title: 'Event approved!', body: er.title });
        }
        res.json({ request: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   LOAD SHEDDING REPORTS
═══════════════════════════════════════ */
router.get('/load-shedding', async (req, res) => {
    const { zone_id } = req.query;
    try {
        const { rows } = await pool.query(`
            SELECT ls.*, COALESCE(u.full_name, 'Anonymous') AS reporter_name
            FROM load_shedding_reports ls LEFT JOIN users u ON u.id = ls.reporter_id
            WHERE ls.created_at > NOW() - interval '7 days'
            ORDER BY ls.created_at DESC LIMIT 50
        `);
        res.json({ reports: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/load-shedding', async (req, res) => {
    const userId = req.session.user.id;
    const { area_name, started_at, notes, zone_id } = req.body;
    try {
        const { rows } = await pool.query(`
            INSERT INTO load_shedding_reports (reporter_id, zone_id, area_name, started_at, notes)
            VALUES ($1,$2,$3,$4,$5) RETURNING *
        `, [userId, zone_id || null, area_name, started_at || new Date().toISOString(), notes]);
        res.json({ report: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.patch('/load-shedding/:id/restored', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(`
            UPDATE load_shedding_reports SET restored_at = NOW(),
            duration_hours = EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600.0
            WHERE id = $1 AND reporter_id = $2 RETURNING *
        `, [req.params.id, userId]);
        res.json({ report: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

/* ═══════════════════════════════════════
   RELIGIOUS EVENTS
═══════════════════════════════════════ */
router.get('/religious-events', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT re.*, u.full_name AS organizer_name FROM religious_events re JOIN users u ON u.id = re.organizer_id
            ORDER BY re.event_date ASC NULLS LAST LIMIT 50
        `);
        res.json({ events: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/religious-events', async (req, res) => {
    const userId = req.session.user.id;
    const { type, title, description, event_date, location, open_to_all = true, zone_id } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO religious_events (organizer_id, zone_id, type, title, description, event_date, location, open_to_all)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
        `, [userId, zone_id || null, type, title, description, event_date || null, location, open_to_all]);
        res.json({ event: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

export default router;
