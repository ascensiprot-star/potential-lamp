import { Router } from 'express';
import { pool } from './db.js';

const router = Router();

// POST /api/location/update - Update user's location and detect zone
router.post('/update', async (req, res) => {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }

    const userId = req.session?.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Update user's last known location
        await pool.query(
            `UPDATE users 
             SET last_lat = $1, last_lng = $2, last_location_at = NOW() 
             WHERE id = $3`,
            [lat, lng, userId]
        );

        // Detect which zone the user falls into using PostGIS
        const { rows: zones } = await pool.query(
            `SELECT id, name, city, health_score, demand_index, active_providers
             FROM neighborhood_zones
             WHERE ST_DWithin(
                 geolocation,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                 radius_meters
             )
             ORDER BY health_score DESC
             LIMIT 1`,
            [lng, lat]
        );

        let detectedZone = null;
        let providersOnlineNearby = 0;
        let topCategories = [];

        if (zones.length > 0) {
            detectedZone = zones[0];
            
            // Update user's detected zone
            await pool.query(
                `UPDATE users SET detected_zone_id = $1 WHERE id = $2`,
                [detectedZone.id, userId]
            );

            // Count providers online within 25km
            const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);
            const { rows: onlineCount } = await pool.query(
                `SELECT COUNT(*) as count
                 FROM provider_presence pp
                 JOIN providers p ON p.user_id = pp.provider_id
                 WHERE pp.is_online = true 
                   AND pp.last_heartbeat > $1
                   AND ST_DWithin(
                       pp.geolocation,
                       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                       25000
                   )`,
                [eightMinutesAgo, lng, lat]
            );
            providersOnlineNearby = parseInt(onlineCount[0].count);

            // Get top categories available nearby
            const { rows: categories } = await pool.query(
                `SELECT p.category_slug, COUNT(*) as count
                 FROM provider_presence pp
                 JOIN providers p ON p.user_id = pp.provider_id
                 WHERE pp.is_online = true 
                   AND pp.last_heartbeat > $1
                   AND ST_DWithin(
                       pp.geolocation,
                       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                       25000
                   )
                 GROUP BY p.category_slug
                 ORDER BY count DESC
                 LIMIT 3`,
                [eightMinutesAgo, lng, lat]
            );
            topCategories = categories.map(c => c.category_slug);
        }

        res.json({
            zone: detectedZone,
            providers_online_nearby: providersOnlineNearby,
            top_categories: topCategories,
            location: { lat, lng }
        });
    } catch (err) {
        console.error('Location update error:', err);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// POST /api/provider/heartbeat - Provider heartbeat for real-time tracking
router.post('/provider/heartbeat', async (req, res) => {
    const { lat, lng, is_accepting_jobs = true, active_booking_id, device_info } = req.body;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }

    const userId = req.session?.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        // Check if user is a provider
        const { rows: providers } = await pool.query(
            `SELECT id FROM providers WHERE user_id = $1 AND status = 'approved'`,
            [userId]
        );
        if (providers.length === 0) {
            return res.status(403).json({ error: 'Not an approved provider' });
        }

        const geolocation = `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
        const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);

        // Detect current zone
        const { rows: zones } = await pool.query(
            `SELECT id::text 
             FROM neighborhood_zones
             WHERE ST_DWithin(
                 geolocation,
                 ${geolocation},
                 radius_meters
             )
             LIMIT 1`
        );
        const currentZoneId = zones.length > 0 ? zones[0].id : null;

        // Upsert into provider_presence
        await pool.query(
            `INSERT INTO provider_presence (provider_id, lat, lng, geolocation, is_online, is_accepting_jobs, last_heartbeat, current_zone_id, active_booking_id, device_info)
             VALUES ($1, $2, $3, ${geolocation}, true, $4, NOW(), $5, $6, $7)
             ON CONFLICT (provider_id) 
             DO UPDATE SET 
                 lat = EXCLUDED.lat,
                 lng = EXCLUDED.lng,
                 geolocation = EXCLUDED.geolocation,
                 is_online = true,
                 is_accepting_jobs = EXCLUDED.is_accepting_jobs,
                 last_heartbeat = EXCLUDED.last_heartbeat,
                 current_zone_id = EXCLUDED.current_zone_id,
                 active_booking_id = EXCLUDED.active_booking_id,
                 device_info = EXCLUDED.device_info`,
            [userId, lat, lng, is_accepting_jobs, currentZoneId, active_booking_id || null, device_info || null]
        );

        // Count active bookings nearby
        const { rows: bookingCount } = await pool.query(
            `SELECT COUNT(*) as count
             FROM bookings
             WHERE status IN ('pending', 'confirmed')
               AND lat IS NOT NULL
               AND lng IS NOT NULL
               AND ST_DWithin(
                   ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
                   ${geolocation},
                   25000
               )`
        );

        // Get demand index for current zone
        let demandIndex = 50;
        let surgeActive = false;
        if (currentZoneId) {
            const { rows: zoneData } = await pool.query(
                `SELECT demand_index FROM neighborhood_zones WHERE id = $1`,
                [currentZoneId]
            );
            if (zoneData.length > 0) {
                demandIndex = parseFloat(zoneData[0].demand_index);
                surgeActive = demandIndex > 70;
            }
        }

        res.json({
            active_bookings_nearby: parseInt(bookingCount[0].count),
            demand_index: demandIndex,
            surge_active: surgeActive,
            zone_id: currentZoneId,
            last_heartbeat: new Date().toISOString()
        });
    } catch (err) {
        console.error('Provider heartbeat error:', err);
        res.status(500).json({ error: 'Failed to process heartbeat' });
    }
});

// GET /api/providers/nearby - Get live provider counts and nearby providers
router.get('/providers/nearby', async (req, res) => {
    const { lat, lng, radius_km: radiusKm, category, online_only } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }

    const radiusMeters = (parseInt(radiusKm) || 25) * 1000;
    const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);

    try {
        // Get total providers in radius
        const { rows: totalProviders } = await pool.query(
            `SELECT COUNT(*) as count
             FROM providers p
             WHERE p.status = 'approved'
               AND p.geolocation IS NOT NULL
               AND ST_DWithin(
                   p.geolocation,
                   ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                   $3
               )`,
            [lng, lat, radiusMeters]
        );

        // Get providers online now
        const { rows: onlineProviders } = await pool.query(
            `SELECT COUNT(*) as count
             FROM provider_presence pp
             JOIN providers p ON p.user_id = pp.provider_id
             WHERE pp.is_online = true 
               AND pp.last_heartbeat > $1
               AND p.geolocation IS NOT NULL
               AND ST_DWithin(
                   p.geolocation,
                   ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                   $4
               )`,
            [eightMinutesAgo, lng, lat, radiusMeters]
        );

        // Get providers accepting jobs now
        const { rows: acceptingProviders } = await pool.query(
            `SELECT COUNT(*) as count
             FROM provider_presence pp
             JOIN providers p ON p.user_id = pp.provider_id
             WHERE pp.is_online = true 
               AND pp.is_accepting_jobs = true
               AND pp.last_heartbeat > $1
               AND p.geolocation IS NOT NULL
               AND ST_DWithin(
                   p.geolocation,
                   ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                   $4
               )`,
            [eightMinutesAgo, lng, lat, radiusMeters]
        );

        // Get breakdown by category
        let categoryQuery = `
            SELECT p.category_slug, COUNT(*) as total,
                   COUNT(CASE WHEN pp.is_online = true AND pp.last_heartbeat > $1 THEN 1 END) as online
            FROM providers p
            LEFT JOIN provider_presence pp ON pp.provider_id = p.user_id
            WHERE p.status = 'approved'
              AND p.geolocation IS NOT NULL
              AND ST_DWithin(
                  p.geolocation,
                  ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                  $4
              )
        `;
        
        let categoryParams = [eightMinutesAgo, lng, lat, radiusMeters];
        
        if (category) {
            categoryQuery += ` AND p.category_slug = $5`;
            categoryParams.push(category);
        }
        
        categoryQuery += ` GROUP BY p.category_slug ORDER BY total DESC`;

        const { rows: byCategory } = await pool.query(categoryQuery, categoryParams);

        // Get actual provider list
        let providersQuery = `
            SELECT 
                p.id,
                p.user_id,
                p.business_name,
                p.category_slug,
                p.description,
                p.service_radius_km,
                u.full_name,
                u.avatar_url,
                pts.score AS trust_score,
                pts.tier,
                pp.is_online,
                pp.is_accepting_jobs,
                pp.last_heartbeat,
                ROUND(ST_Distance(
                    p.geolocation,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) / 1000, 1) AS distance_km,
                (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.user_id::text) AS review_count,
                (SELECT AVG(r.rating) FROM reviews r WHERE r.provider_id = p.user_id::text) AS avg_rating
            FROM providers p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN provider_trust_scores pts ON pts.provider_id = p.user_id
            LEFT JOIN provider_presence pp ON pp.provider_id = p.user_id
            WHERE p.status = 'approved'
              AND p.geolocation IS NOT NULL
              AND ST_DWithin(
                  p.geolocation,
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                  $3
              )
        `;

        let providerParams = [lng, lat, radiusMeters];

        if (category) {
            providersQuery += ` AND p.category_slug = $4`;
            providerParams.push(category);
        }

        if (online_only === 'true') {
            providersQuery += ` AND pp.is_online = true AND pp.last_heartbeat > $5`;
            providerParams.push(eightMinutesAgo);
        }

        providersQuery += `
            ORDER BY
                CASE WHEN pp.is_online = true AND pp.last_heartbeat > $6 THEN 0 ELSE 1 END,
                pts.score DESC NULLS LAST,
                distance_km ASC
            LIMIT 50
        `;
        
        if (online_only !== 'true') {
            providerParams.push(eightMinutesAgo);
        }

        const { rows: providers } = await pool.query(providersQuery, providerParams);

        // Detect zone
        const { rows: zones } = await pool.query(
            `SELECT id, name, city
             FROM neighborhood_zones
             WHERE ST_DWithin(
                 geolocation,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                 radius_meters
             )
             LIMIT 1`,
            [lng, lat]
        );

        const byCategoryObj = {};
        byCategory.forEach(row => {
            byCategoryObj[row.category_slug] = {
                total: parseInt(row.total),
                online: parseInt(row.online)
            };
        });

        res.json({
            total_in_radius: parseInt(totalProviders[0].count),
            online_now: parseInt(onlineProviders[0].count),
            accepting_jobs: parseInt(acceptingProviders[0].count),
            by_category: byCategoryObj,
            providers: providers,
            zone: zones.length > 0 ? { id: zones[0].id, name: zones[0].name, city: zones[0].city } : null,
            last_updated: new Date().toISOString()
        });
    } catch (err) {
        console.error('Nearby providers error:', err);
        res.status(500).json({ error: 'Failed to fetch nearby providers' });
    }
});

// GET /api/zones/detect - Detect zone from coordinates
router.get('/zones/detect', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }

    try {
        // Detect zone
        const { rows: zones } = await pool.query(
            `SELECT id, name, city, health_score, demand_index, active_providers
             FROM neighborhood_zones
             WHERE ST_DWithin(
                 geolocation,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                 radius_meters
             )
             LIMIT 1`,
            [lng, lat]
        );

        if (zones.length === 0) {
            return res.json({
                zone: null,
                providers_online: 0,
                open_bookings: 0,
                health_score: 0,
                surge_active: false,
                top_services_available_now: []
            });
        }

        const zone = zones[0];
        const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);

        // Count providers online in this zone
        const { rows: providerCount } = await pool.query(
            `SELECT COUNT(*) as count
             FROM provider_presence pp
             WHERE pp.is_online = true 
               AND pp.last_heartbeat > $1
               AND pp.current_zone_id = $2`,
            [eightMinutesAgo, zone.id]
        );

        // Count open bookings in this zone
        const { rows: bookingCount } = await pool.query(
            `SELECT COUNT(*) as count
             FROM bookings
             WHERE status = 'pending'
               AND ST_DWithin(
                   ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                   (SELECT geolocation FROM neighborhood_zones WHERE id = $3),
                   (SELECT radius_meters FROM neighborhood_zones WHERE id = $3)
               )`,
            [lng, lat, zone.id]
        );

        // Get top services available now in this zone
        const { rows: services } = await pool.query(
            `SELECT p.category_slug
             FROM provider_presence pp
             JOIN providers p ON p.user_id = pp.provider_id
             WHERE pp.is_online = true 
               AND pp.last_heartbeat > $1
               AND pp.current_zone_id = $2
             GROUP BY p.category_slug
             ORDER BY COUNT(*) DESC
             LIMIT 5`,
            [eightMinutesAgo, zone.id]
        );

        res.json({
            zone: {
                id: zone.id,
                name: zone.name,
                city: zone.city
            },
            providers_online: parseInt(providerCount[0].count),
            open_bookings: parseInt(bookingCount[0].count),
            health_score: parseFloat(zone.health_score),
            surge_active: parseFloat(zone.demand_index) > 70,
            top_services_available_now: services.map(s => s.category_slug)
        });
    } catch (err) {
        console.error('Zone detection error:', err);
        res.status(500).json({ error: 'Failed to detect zone' });
    }
});

// GET /api/location/realtime/neighborhood - SSE endpoint for live neighborhood stats
router.get('/realtime/neighborhood', async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);

    const sendStats = async () => {
        try {
            // Get providers online now
            const { rows: onlineProviders } = await pool.query(
                `SELECT COUNT(*) as count
                 FROM provider_presence pp
                 JOIN providers p ON p.user_id = pp.provider_id
                 WHERE pp.is_online = true 
                   AND pp.last_heartbeat > $1
                   AND p.geolocation IS NOT NULL
                   AND ST_DWithin(
                       p.geolocation,
                       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                       25000
                   )`,
                [eightMinutesAgo, lng, lat]
            );

            // Get providers accepting jobs
            const { rows: acceptingProviders } = await pool.query(
                `SELECT COUNT(*) as count
                 FROM provider_presence pp
                 JOIN providers p ON p.user_id = pp.provider_id
                 WHERE pp.is_online = true 
                   AND pp.is_accepting_jobs = true
                   AND pp.last_heartbeat > $1
                   AND p.geolocation IS NOT NULL
                   AND ST_DWithin(
                       p.geolocation,
                       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                       25000
                   )`,
                [eightMinutesAgo, lng, lat]
            );

            // Get open emergency requests nearby
            const { rows: emergencyRequests } = await pool.query(
                `SELECT COUNT(*) as count
                 FROM emergency_requests
                 WHERE status = 'pending'
                   AND lat IS NOT NULL
                   AND lng IS NOT NULL
                   AND ST_DWithin(
                       ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
                       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                       25000
                   )`,
                [lng, lat]
            );

            // Get demand index and surge status
            let demandIndex = 50;
            let surgeActive = false;
            
            const { rows: zones } = await pool.query(
                `SELECT demand_index
                 FROM neighborhood_zones
                 WHERE ST_DWithin(
                     geolocation,
                     ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                     radius_meters
                 )
                 LIMIT 1`,
                [lng, lat]
            );

            if (zones.length > 0) {
                demandIndex = parseFloat(zones[0].demand_index);
                surgeActive = demandIndex > 70;
            }

            // Get top 3 available categories
            const { rows: topCategories } = await pool.query(
                `SELECT p.category_slug, COUNT(*) as count
                 FROM provider_presence pp
                 JOIN providers p ON p.user_id = pp.provider_id
                 WHERE pp.is_online = true 
                   AND pp.last_heartbeat > $1
                   AND p.geolocation IS NOT NULL
                   AND ST_DWithin(
                       p.geolocation,
                       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                       25000
                   )
                 GROUP BY p.category_slug
                 ORDER BY count DESC
                 LIMIT 3`,
                [eightMinutesAgo, lng, lat]
            );

            const stats = {
                providers_online_now: parseInt(onlineProviders[0].count),
                accepting_jobs_now: parseInt(acceptingProviders[0].count),
                open_emergency_requests: parseInt(emergencyRequests[0].count),
                demand_index: demandIndex,
                surge_active: surgeActive,
                top_available_categories: topCategories.map(c => c.category_slug),
                timestamp: new Date().toISOString()
            };

            res.write(`data: ${JSON.stringify(stats)}\n\n`);
        } catch (err) {
            console.error('SSE stats error:', err);
        }
    };

    // Send immediately
    await sendStats();

    // Send every 30 seconds
    const interval = setInterval(sendStats, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(interval);
    });
});

export default router;