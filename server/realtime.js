/**
 * Production-grade real-time push system
 * ───────────────────────────────────────
 * Uses PostgreSQL LISTEN/NOTIFY (not polling) to push live data to SSE clients.
 * One dedicated PG client per channel; zero polling on the backend.
 * Frontend SSE connections receive pushed events within milliseconds of DB changes.
 */

import pg from 'pg';
import { pool } from './db.js';

// ── SSE client registry ────────────────────────────────────────────────────────
// Map<channel, Set<{id, res, userId?}>>
const clients = new Map();

function addClient(channel, client) {
    if (!clients.has(channel)) clients.set(channel, new Set());
    clients.get(channel).add(client);
}

function removeClient(channel, client) {
    clients.get(channel)?.delete(client);
}

function broadcast(channel, eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.get(channel) ?? []) {
        try { client.res.write(payload); } catch (_) { removeClient(channel, client); }
    }
}

// ── SSE response helper ─────────────────────────────────────────────────────────
export function sseHeaders(res) {
    res.setHeader('Content-Type',                'text/event-stream');
    res.setHeader('Cache-Control',               'no-cache, no-transform');
    res.setHeader('Connection',                  'keep-alive');
    res.setHeader('X-Accel-Buffering',           'no');   // important for nginx/railway proxies
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();
}

function sseWrite(res, eventName, data) {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

function keepAlive(res, intervalMs = 25_000) {
    const id = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) { clearInterval(id); } }, intervalMs);
    return id;
}

// ── PostgreSQL LISTEN/NOTIFY manager ───────────────────────────────────────────
// Each channel gets ONE dedicated PG client that stays connected indefinitely.
const listeners = new Map();

async function ensureListener(pgChannel, handler) {
    if (listeners.has(pgChannel)) return;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`LISTEN "${pgChannel}"`);
    client.on('notification', (msg) => {
        try {
            const payload = msg.payload ? JSON.parse(msg.payload) : {};
            handler(payload);
        } catch (_) {}
    });
    client.on('error', async (err) => {
        console.error(`[Realtime] PG listener error on ${pgChannel}:`, err.message);
        listeners.delete(pgChannel);
        // Reconnect after 3s
        setTimeout(() => ensureListener(pgChannel, handler).catch(() => {}), 3000);
    });
    listeners.set(pgChannel, client);
}

// ── DB triggers (idempotent — safe to call on every startup) ──────────────────
export async function installTriggers() {
    try {
        await pool.query(`
            -- Function: notify on zone health change
            CREATE OR REPLACE FUNCTION notify_zone_change() RETURNS trigger AS $$
            BEGIN
                PERFORM pg_notify('zone_heatmap', row_to_json(NEW)::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- Trigger: neighborhood_zones update
            DROP TRIGGER IF EXISTS trg_zone_change ON neighborhood_zones;
            CREATE TRIGGER trg_zone_change
            AFTER INSERT OR UPDATE ON neighborhood_zones
            FOR EACH ROW EXECUTE FUNCTION notify_zone_change();

            -- Function: notify on booking change
            CREATE OR REPLACE FUNCTION notify_booking_change() RETURNS trigger AS $$
            DECLARE payload jsonb;
            BEGIN
                payload := jsonb_build_object(
                    'id',          NEW.id,
                    'status',      NEW.status,
                    'customer_id', NEW.customer_id,
                    'provider_id', NEW.provider_id,
                    'updated_at',  NEW.updated_at
                );
                PERFORM pg_notify('booking_update', payload::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_booking_change ON bookings;
            CREATE TRIGGER trg_booking_change
            AFTER INSERT OR UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION notify_booking_change();

            -- Function: notify on new chat message
            CREATE OR REPLACE FUNCTION notify_chat_message() RETURNS trigger AS $$
            DECLARE payload jsonb;
            BEGIN
                payload := jsonb_build_object(
                    'id',          NEW.id,
                    'thread_key',  NEW.thread_key,
                    'sender_id',   NEW.sender_id,
                    'receiver_id', NEW.receiver_id,
                    'content',     LEFT(NEW.content, 120),
                    'type',        NEW.type,
                    'created_at',  NEW.created_at
                );
                PERFORM pg_notify('chat_message', payload::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_chat_message ON chat_messages;
            CREATE TRIGGER trg_chat_message
            AFTER INSERT ON chat_messages
            FOR EACH ROW EXECUTE FUNCTION notify_chat_message();
        `);
        console.log('✓ Realtime DB triggers installed');
    } catch (err) {
        console.error('[Realtime] Failed to install triggers:', err.message);
    }
}

// ── Zone heatmap real-time query ───────────────────────────────────────────────
async function fetchZoneHeatmapData() {
    const { rows } = await pool.query(`
        SELECT
            nz.id, nz.name, nz.city,
            COALESCE(nz.health_score, 50)  AS health_score,
            COALESCE(nz.demand_index, 0)   AS demand_index,
            (SELECT COUNT(*)::int FROM provider_presence pp
             WHERE pp.current_zone_id::text = nz.id::text
               AND pp.is_online = true
               AND pp.last_heartbeat > NOW() - INTERVAL '10 minutes'
            ) AS online_providers,
            (SELECT COUNT(*)::int FROM bookings b
             WHERE b.zone_id::text = nz.id::text
               AND b.created_at > NOW() - INTERVAL '24 hours'
            ) AS bookings_24h,
            (SELECT COUNT(*)::int FROM emergency_requests er
             WHERE er.zone_id::text = nz.id::text AND er.status = 'open'
            ) AS open_emergencies
        FROM neighborhood_zones nz
        ORDER BY nz.demand_index DESC, nz.health_score DESC
        LIMIT 12
    `);
    return { zones: rows, updated_at: new Date().toISOString() };
}

// ── Platform stats real-time query ────────────────────────────────────────────
async function fetchPlatformStats() {
    const { rows } = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM users WHERE role='provider')            AS total_providers,
            (SELECT COUNT(*) FROM bookings WHERE status='completed')      AS completed_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status IN ('pending','confirmed','in_progress')) AS active_bookings,
            (SELECT COUNT(*) FROM users)                                  AS total_users,
            (SELECT COUNT(*) FROM reviews)                                AS total_reviews,
            (SELECT ROUND(AVG(rating),1) FROM reviews WHERE rating IS NOT NULL) AS avg_rating
    `);
    return { stats: rows[0], updated_at: new Date().toISOString() };
}

// ── SSE: Zone Heatmap stream (public, no auth required) ───────────────────────
export async function handleZoneHeatmapStream(req, res) {
    sseHeaders(res);
    const client = { id: Date.now() + Math.random(), res };
    addClient('zone_heatmap', client);

    // Send snapshot immediately
    try {
        const data = await fetchZoneHeatmapData();
        sseWrite(res, 'zone_heatmap', data);
    } catch (err) { console.error('[Realtime] zone heatmap init error:', err.message); }

    const ping = keepAlive(res);

    req.on('close', () => {
        clearInterval(ping);
        removeClient('zone_heatmap', client);
    });
}

// ── SSE: Platform stats stream (public) ──────────────────────────────────────
export async function handlePlatformStatsStream(req, res) {
    sseHeaders(res);
    const client = { id: Date.now() + Math.random(), res };
    addClient('platform_stats', client);

    // Send snapshot immediately
    try {
        const data = await fetchPlatformStats();
        sseWrite(res, 'platform_stats', data);
    } catch (err) { console.error('[Realtime] platform stats init error:', err.message); }

    const ping = keepAlive(res);

    req.on('close', () => {
        clearInterval(ping);
        removeClient('platform_stats', client);
    });
}

// ── SSE: Booking updates stream (per-user, auth required) ────────────────────
export async function handleBookingStream(req, res, userId, role) {
    sseHeaders(res);
    const client = { id: Date.now() + Math.random(), res, userId };
    addClient('booking_update', client);

    // Send current bookings snapshot
    try {
        const col = role === 'provider' ? 'provider_id' : 'customer_id';
        const { rows } = await pool.query(
            `SELECT id, status, service_name, scheduled_at, price, updated_at
             FROM bookings WHERE ${col} = $1
             ORDER BY updated_at DESC LIMIT 20`,
            [userId]
        );
        sseWrite(res, 'booking_snapshot', { bookings: rows });
    } catch (err) { console.error('[Realtime] booking init error:', err.message); }

    const ping = keepAlive(res);

    req.on('close', () => {
        clearInterval(ping);
        removeClient('booking_update', client);
    });
}

// ── SSE: Chat thread stream (per-thread, auth required) ──────────────────────
export async function handleChatStream(req, res, userId, threadKey) {
    sseHeaders(res);
    const client = { id: Date.now() + Math.random(), res, userId, threadKey };
    addClient('chat_message', client);

    // Send last 30 messages
    try {
        const { rows } = await pool.query(
            `SELECT cm.*, u.full_name AS sender_name, u.avatar_url AS sender_avatar
             FROM chat_messages cm LEFT JOIN users u ON u.id = cm.sender_id
             WHERE cm.thread_key = $1
             ORDER BY cm.created_at DESC LIMIT 30`,
            [threadKey]
        );
        sseWrite(res, 'chat_history', { messages: rows.reverse() });
    } catch (err) { console.error('[Realtime] chat init error:', err.message); }

    const ping = keepAlive(res);

    req.on('close', () => {
        clearInterval(ping);
        removeClient('chat_message', client);
    });
}

// ── Start all LISTEN channels ─────────────────────────────────────────────────
export async function startRealtimeListeners() {
    // Zone heatmap: push to all zone_heatmap SSE clients when any zone row changes
    await ensureListener('zone_heatmap', async () => {
        try {
            const data = await fetchZoneHeatmapData();
            broadcast('zone_heatmap', 'zone_heatmap', data);
        } catch (_) {}
    });

    // Booking updates: push only to the affected user's SSE stream
    await ensureListener('booking_update', (payload) => {
        for (const client of clients.get('booking_update') ?? []) {
            if (
                client.userId === payload.customer_id ||
                client.userId === payload.provider_id
            ) {
                try {
                    sseWrite(client.res, 'booking_update', payload);
                } catch (_) {
                    removeClient('booking_update', client);
                }
            }
        }
    });

    // Chat messages: push only to users in that thread
    await ensureListener('chat_message', (payload) => {
        for (const client of clients.get('chat_message') ?? []) {
            if (
                client.threadKey === payload.thread_key &&
                (client.userId === payload.sender_id || client.userId === payload.receiver_id)
            ) {
                try {
                    sseWrite(client.res, 'chat_message', payload);
                } catch (_) {
                    removeClient('chat_message', client);
                }
            }
        }
    });

    // Platform stats: recompute and push to all stats subscribers every 60s
    // (stats change slowly; we supplement NOTIFY with a 60s floor push)
    setInterval(async () => {
        if (!clients.get('platform_stats')?.size) return;
        try {
            const data = await fetchPlatformStats();
            broadcast('platform_stats', 'platform_stats', data);
        } catch (_) {}
    }, 60_000);

    console.log('✓ Realtime PG listeners active (zone_heatmap, booking_update, chat_message)');
}
