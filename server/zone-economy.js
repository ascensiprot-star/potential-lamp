/**
 * Zone Economy — Layer 3 of the Truvornex 100% Vision
 * Simon's autonomous zone intelligence: demand forecasting, idle resource matching,
 * public Zone API for city governments and NGOs.
 */
import { Router } from 'express';
import { pool } from './db.js';
import * as simon from './simon.js';

const router = Router();

const SERVICE_CATEGORIES = ['cleaning', 'plumbing', 'hvac', 'moving', 'gardening', 'chef', 'handyman', 'fitness', 'tutoring', 'driving'];

const LIVING_WAGE_FLOOR_PKR = 800;

/* ── Seasonal/hourly demand shape ───────────────────────────────────────── */
function demandShape(category, hour, month, dayOfWeek) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPeak = hour >= 9 && hour <= 14;
    const isEvening = hour >= 17 && hour <= 20;

    const baseSeasonality = {
        hvac:      month >= 4 && month <= 8 ? 1.6 : 0.7,
        gardening: month >= 2 && month <= 5 ? 1.5 : 0.6,
        heating:   month >= 10 || month <= 1 ? 1.5 : 0.5,
        cleaning:  1.0 + (isWeekend ? 0.4 : 0),
        moving:    month >= 5 && month <= 8 ? 1.3 : 0.9,
        tutoring:  !isWeekend ? 1.2 : 0.7,
    }[category] || 1.0;

    const timeMult = isPeak ? 1.3 : isEvening ? 1.1 : 0.75;
    const raw = Math.min(100, Math.round(50 * baseSeasonality * timeMult + (Math.random() * 10 - 5)));
    return Math.max(10, raw);
}

/* ── Price model with living-wage floor ─────────────────────────────────── */
function suggestedPrice(category, demandIndex) {
    const basePrices = {
        cleaning: 1200, plumbing: 2000, hvac: 2500, moving: 3500,
        gardening: 800, chef: 1800, handyman: 1500, fitness: 1000,
        tutoring: 700, driving: 600,
    };
    const base = basePrices[category] || 1000;
    const surge = demandIndex > 75 ? 1.2 : demandIndex > 60 ? 1.08 : 1.0;
    const price = Math.round(base * surge / 100) * 100;
    return Math.max(price, LIVING_WAGE_FLOOR_PKR * 2);
}

/* ── Generate 72-hour forecast for a zone ───────────────────────────────── */
async function generateForecast(zoneId, area, categories) {
    const now = new Date();
    const slots = [];
    const cats = categories || SERVICE_CATEGORIES;

    for (const category of cats) {
        const catSlots = [];
        for (let h = 0; h < 72; h++) {
            const forecastTime = new Date(now.getTime() + h * 3600 * 1000);
            const hour = forecastTime.getUTCHours();
            const month = forecastTime.getUTCMonth();
            const dow = forecastTime.getUTCDay();

            const demandIndex = demandShape(category, hour, month, dow);
            const estimatedPrice = suggestedPrice(category, demandIndex);
            const supplyShortfall = demandIndex > 80 && hour >= 9 && hour <= 14;

            catSlots.push({
                hour: forecastTime.toISOString(),
                demand_index: demandIndex,
                estimated_price_pkr: estimatedPrice,
                supply_shortfall: supplyShortfall,
                living_wage_floor_pkr: LIVING_WAGE_FLOOR_PKR,
            });

            try {
                await pool.query(`
                    INSERT INTO demand_forecasts
                        (zone_id, area, category, forecast_hour, demand_index, estimated_price_pkr, supply_shortfall)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                    ON CONFLICT (zone_id, category, forecast_hour) DO UPDATE
                        SET demand_index = EXCLUDED.demand_index,
                            estimated_price_pkr = EXCLUDED.estimated_price_pkr,
                            supply_shortfall = EXCLUDED.supply_shortfall,
                            generated_at = NOW()
                `, [zoneId, area, category, forecastTime.toISOString(), demandIndex, estimatedPrice, supplyShortfall]);
            } catch (_) {}
        }
        slots.push({ category, slots: catSlots });
    }

    const topOpp = cats.reduce((best, cat) => {
        const peakSlot = slots.find(s => s.category === cat)?.slots?.find(s => s.demand_index > 75);
        return peakSlot && (!best || peakSlot.demand_index > best.demand_index)
            ? { category: cat, ...peakSlot } : best;
    }, null);

    return {
        zone_id: zoneId,
        area,
        generated_at: now.toISOString(),
        forecast_window: '72h',
        living_wage_floor_pkr: LIVING_WAGE_FLOOR_PKR,
        top_opportunity: topOpp ? {
            category: topOpp.category,
            demand_index: topOpp.demand_index,
            estimated_price_pkr: topOpp.estimated_price_pkr,
            window: topOpp.hour,
            supply_shortfall: topOpp.supply_shortfall,
        } : null,
        by_category: slots,
    };
}

/* ── GET /api/zones — list all zones ────────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, name, area, city, health_score, demand_index, active_providers, updated_at
            FROM neighborhood_zones
            ORDER BY health_score DESC
            LIMIT 50
        `);
        res.json({ zones: rows });
    } catch (err) {
        res.json({ zones: [] });
    }
});

/* ── PUBLIC: GET /api/zones/:zoneId/forecast ────────────────────────────── */
router.get('/:zoneId/forecast', async (req, res) => {
    const { zoneId } = req.params;
    const { area = 'your area', categories } = req.query;
    const cats = categories ? categories.split(',').map(c => c.trim().toLowerCase()).filter(c => SERVICE_CATEGORIES.includes(c)) : null;

    try {
        const existing = await pool.query(`
            SELECT df.category, json_agg(
                json_build_object(
                    'hour', df.forecast_hour,
                    'demand_index', df.demand_index,
                    'estimated_price_pkr', df.estimated_price_pkr,
                    'supply_shortfall', df.supply_shortfall,
                    'living_wage_floor_pkr', df.living_wage_floor_pkr
                ) ORDER BY df.forecast_hour
            ) AS slots
            FROM demand_forecasts df
            WHERE df.zone_id = $1
              AND df.forecast_hour BETWEEN NOW() AND NOW() + INTERVAL '72 hours'
              AND df.generated_at >= NOW() - INTERVAL '2 hours'
            GROUP BY df.category
        `, [zoneId]);

        if (existing.rows.length > 0) {
            return res.json({
                zone_id: zoneId,
                area,
                generated_at: new Date().toISOString(),
                forecast_window: '72h',
                living_wage_floor_pkr: LIVING_WAGE_FLOOR_PKR,
                cached: true,
                by_category: existing.rows,
            });
        }

        const forecast = await generateForecast(zoneId, area, cats);
        res.json(forecast);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── AUTH REQUIRED below this point ─────────────────────────────────────── */
function requireAuth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

/* ── POST /api/zones/idle-slots — declare provider availability ─────────── */
router.post('/idle-slots', requireAuth, async (req, res) => {
    const { starts_at, ends_at, categories = [], zone_id } = req.body;
    const providerId = req.session.user.id;

    if (!starts_at || !ends_at) return res.status(400).json({ error: 'starts_at and ends_at required' });
    if (new Date(ends_at) <= new Date(starts_at)) return res.status(400).json({ error: 'ends_at must be after starts_at' });

    try {
        const { rows } = await pool.query(`
            INSERT INTO idle_slots(provider_id, starts_at, ends_at, categories, zone_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [providerId, starts_at, ends_at, categories, zone_id || null]);

        res.json({ idle_slot: rows[0], message: 'Idle window registered. Simon will match micro-jobs in your area.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/zones/idle-slots — get my idle slots ──────────────────────── */
router.get('/idle-slots', requireAuth, async (req, res) => {
    const providerId = req.session.user.id;
    try {
        const { rows } = await pool.query(`
            SELECT is.*, mj.title AS matched_job_title, mj.category AS matched_job_category,
                   mj.price_pkr AS matched_job_price
            FROM idle_slots is
            LEFT JOIN micro_jobs mj ON mj.id = is.matched_micro_job_id
            WHERE is.provider_id = $1 AND is.starts_at >= NOW() - INTERVAL '7 days'
            ORDER BY is.starts_at DESC
            LIMIT 30
        `, [providerId]);
        res.json({ idle_slots: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── POST /api/zones/micro-jobs/match — Simon idle matching ─────────────── */
async function handleMatchIdle(req, res) {
    const providerId = req.session.user.id;

    try {
        const openSlots = await pool.query(`
            SELECT * FROM idle_slots
            WHERE provider_id = $1 AND status = 'open' AND starts_at >= NOW()
            ORDER BY starts_at ASC LIMIT 5
        `, [providerId]);

        if (openSlots.rows.length === 0) {
            return res.json({ matches: [], message: 'No open idle windows. Add availability first.' });
        }

        const slot = openSlots.rows[0];
        const durationHours = (new Date(slot.ends_at) - new Date(slot.starts_at)) / 3600000;
        const cats = slot.categories?.length > 0 ? slot.categories : SERVICE_CATEGORIES;

        const existing = await pool.query(`
            SELECT * FROM micro_jobs
            WHERE status = 'open'
              AND (zone_id = $1 OR $1 IS NULL)
              AND category = ANY($2::text[])
              AND estimated_duration_hours <= $3
            ORDER BY price_pkr DESC LIMIT 5
        `, [slot.zone_id, cats, durationHours]);

        let matches = existing.rows;

        if (matches.length === 0) {
            const aiMatches = await simon.generateIdleMatches({
                provider_id: providerId,
                slot_start: slot.starts_at,
                slot_end: slot.ends_at,
                categories: cats,
                zone_id: slot.zone_id,
            });

            for (const job of (aiMatches || [])) {
                try {
                    const { rows: newJob } = await pool.query(`
                        INSERT INTO micro_jobs(zone_id, area, category, title, description, estimated_duration_hours, price_pkr, scheduled_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
                    `, [slot.zone_id || 'local', job.area || 'your area', job.category, job.title, job.description, job.duration_hours || 1, job.price_pkr, slot.starts_at]);
                    matches.push(newJob[0]);
                } catch (_) {}
            }
        }

        res.json({
            slot,
            matches: matches.slice(0, 5),
            message: matches.length > 0
                ? `Simon found ${matches.length} micro-job${matches.length > 1 ? 's' : ''} matching your ${Math.round(durationHours)}h window.`
                : 'No micro-jobs available for this window right now. Simon will notify you when one appears.',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
router.post('/micro-jobs/match', requireAuth, handleMatchIdle);
router.post('/match-idle', requireAuth, handleMatchIdle);

/* ── PATCH /api/zones/micro-jobs/:id/accept ─────────────────────────────── */
router.patch('/micro-jobs/:id/accept', requireAuth, async (req, res) => {
    const providerId = req.session.user.id;
    try {
        const { rows: job } = await pool.query(
            `SELECT * FROM micro_jobs WHERE id = $1 AND status = 'open'`, [req.params.id]
        );
        if (job.length === 0) return res.status(404).json({ error: 'Job not found or already taken' });

        await pool.query(
            `UPDATE micro_jobs SET status='assigned', provider_id=$1 WHERE id=$2`,
            [providerId, req.params.id]
        );

        await pool.query(`
            UPDATE idle_slots SET status='matched', matched_micro_job_id=$1
            WHERE provider_id=$2 AND status='open'
              AND starts_at <= $3 AND ends_at >= $3
        `, [req.params.id, providerId, job[0].scheduled_at || new Date().toISOString()]);

        res.json({ message: 'Job accepted. Customer will be notified.', job: job[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/zones/micro-jobs — browse open micro-jobs ─────────────────── */
router.get('/micro-jobs', async (req, res) => {
    const { zone_id, category, limit = 20 } = req.query;
    try {
        const { rows } = await pool.query(`
            SELECT mj.*, u.full_name AS provider_name
            FROM micro_jobs mj
            LEFT JOIN users u ON u.id = mj.provider_id
            WHERE mj.status = 'open'
              AND ($1::TEXT IS NULL OR mj.zone_id = $1)
              AND ($2::TEXT IS NULL OR mj.category = $2)
            ORDER BY mj.price_pkr DESC, mj.created_at DESC
            LIMIT $3
        `, [zone_id || null, category || null, Math.min(parseInt(limit) || 20, 100)]);
        res.json({ micro_jobs: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/zones/savings-goals — get my savings goals ────────────────── */
router.get('/savings-goals', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM savings_goals WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC`,
            [req.session.user.id]
        );
        res.json({ savings_goals: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── POST /api/zones/savings-goals ──────────────────────────────────────── */
router.post('/savings-goals', requireAuth, async (req, res) => {
    const { title, target_pkr, deadline, category } = req.body;
    if (!title || !target_pkr) return res.status(400).json({ error: 'title and target_pkr required' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO savings_goals(user_id, title, target_pkr, deadline, category)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [req.session.user.id, title, target_pkr, deadline || null, category || null]);
        res.json({ savings_goal: rows[0], message: 'Simon will now route idle-time micro-jobs toward this target.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/zones/:zoneId/idle-slots — open slots in a zone (public) ───── */
router.get('/:zoneId/idle-slots', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT is.id, is.starts_at, is.ends_at, is.categories, is.status, is.zone_id,
                   u.full_name AS provider_name
            FROM idle_slots is
            JOIN users u ON u.id = is.provider_id
            WHERE is.zone_id = $1 AND is.status = 'open' AND is.starts_at >= NOW()
            ORDER BY is.starts_at ASC LIMIT 50
        `, [req.params.zoneId]);
        res.json({ idle_slots: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── POST /api/zones/:zoneId/idle-slots — declare availability in a zone ── */
router.post('/:zoneId/idle-slots', requireAuth, async (req, res) => {
    const { starts_at, ends_at, categories = [] } = req.body;
    const { zoneId } = req.params;
    const providerId = req.session.user.id;
    if (!starts_at || !ends_at) return res.status(400).json({ error: 'starts_at and ends_at required' });
    if (new Date(ends_at) <= new Date(starts_at)) return res.status(400).json({ error: 'ends_at must be after starts_at' });
    try {
        const { rows } = await pool.query(`
            INSERT INTO idle_slots(provider_id, starts_at, ends_at, categories, zone_id)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [providerId, starts_at, ends_at, categories, zoneId]);
        res.json({ idle_slot: rows[0], message: 'Idle window registered. Simon will match micro-jobs in your area.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── GET /api/zones/:zoneId/micro-jobs — open micro-jobs in a zone ───────── */
router.get('/:zoneId/micro-jobs', async (req, res) => {
    const { category, limit = 20 } = req.query;
    try {
        const { rows } = await pool.query(`
            SELECT mj.*, u.full_name AS provider_name
            FROM micro_jobs mj
            LEFT JOIN users u ON u.id = mj.provider_id
            WHERE mj.status = 'open' AND mj.zone_id = $1
              AND ($2::TEXT IS NULL OR mj.category = $2)
            ORDER BY mj.price_pkr DESC, mj.created_at DESC
            LIMIT $3
        `, [req.params.zoneId, category || null, Math.min(parseInt(limit) || 20, 100)]);
        res.json({ micro_jobs: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
