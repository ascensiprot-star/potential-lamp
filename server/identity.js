/**
 * Economic Identity Protocol v1 (TIP-v1)
 * Truvornex / Xylvanthrex Labs
 *
 * Produces machine-readable, cryptographically signed credentials for providers.
 * Use case: banks, employers, governments, and platforms verify a provider's
 * real economic history with a single API call.
 */
import crypto from 'crypto';
import { pool } from './db.js';

const ISSUER = 'truvornex.xylvanthrex.io';
const PROTOCOL = 'tip-v1';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90-day credential validity
const SECRET = process.env.TRUST_PASSPORT_SECRET;
if (!SECRET) {
    console.error('FATAL: TRUST_PASSPORT_SECRET is not set. Refusing to start.');
    process.exit(1);
}

function hmac(payload) {
    return crypto.createHmac('sha256', SECRET).update(JSON.stringify(payload)).digest('hex');
}

/* ── Compute income from wallet_transactions ────────────────────────────── */
async function computeIncome(userId) {
    const { rows } = await pool.query(`
        SELECT
            COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::NUMERIC  AS p30,
            COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days'), 0)::NUMERIC  AS p90,
            COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '365 days'), 0)::NUMERIC AS p365,
            COUNT(*)            FILTER (WHERE created_at >= NOW() - INTERVAL '365 days')                AS txn_365
        FROM wallet_transactions
        WHERE user_id = $1 AND type = 'credit' AND status = 'completed'
    `, [userId]);

    const r = rows[0];
    const p365 = parseFloat(r.p365) || 0;
    return {
        currency: 'PKR',
        period_30d:  parseFloat(r.p30)  || 0,
        period_90d:  parseFloat(r.p90)  || 0,
        period_365d: p365,
        avg_monthly_365d: Math.round(p365 / 12),
        transaction_count_365d: parseInt(r.txn_365) || 0,
    };
}

/* ── Pull skill verifications ───────────────────────────────────────────── */
async function getSkills(userId) {
    const { rows } = await pool.query(`
        SELECT category, verified_count, last_active_at, first_verified_at
        FROM skill_verifications
        WHERE provider_id = $1
        ORDER BY verified_count DESC
    `, [userId]);
    return rows.map(r => ({
        category: r.category,
        verified_jobs: r.verified_count,
        last_active: r.last_active_at ? r.last_active_at.toISOString().split('T')[0] : null,
        first_verified: r.first_verified_at ? r.first_verified_at.toISOString().split('T')[0] : null,
    }));
}

/* ── Pull or compute trust ──────────────────────────────────────────────── */
async function getTrust(userId) {
    const { rows } = await pool.query(`
        SELECT score, tier, completion_rate, avg_rating, total_completed,
               dispute_free_streak, vouches_count, last_computed_at
        FROM provider_trust_scores
        WHERE provider_id = $1
    `, [userId]);
    if (rows.length === 0) return { score: 0, tier: 'new', completion_rate: 0, avg_rating: 0, vouches: 0 };
    const r = rows[0];
    return {
        score:            parseFloat(r.score) || 0,
        tier:             r.tier,
        completion_rate:  parseFloat(r.completion_rate) || 0,
        avg_rating:       parseFloat(r.avg_rating) || 0,
        total_completed:  r.total_completed || 0,
        dispute_free_streak: r.dispute_free_streak || 0,
        vouches:          r.vouches_count || 0,
        last_computed:    r.last_computed_at?.toISOString() || null,
    };
}

/* ── Pull dispute resolution record ────────────────────────────────────── */
async function getDisputeRecord(userId) {
    try {
        const { rows } = await pool.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_favorably
            FROM disputes
            WHERE provider_id = $1::TEXT
        `, [userId]);
        return { total: parseInt(rows[0].total) || 0, resolved_favorably: parseInt(rows[0].resolved_favorably) || 0 };
    } catch { return { total: 0, resolved_favorably: 0 }; }
}

/* ── Build and sign full TIP-v1 credential ──────────────────────────────── */
export async function buildCredential(userId) {
    const { rows: userRows } = await pool.query(
        `SELECT id, full_name, city, country, created_at, avatar_url, role FROM users WHERE id = $1`,
        [userId]
    );
    if (userRows.length === 0) return null;
    const user = userRows[0];

    if (user.role !== 'provider') return null;

    const [income, skills, trust, disputes] = await Promise.all([
        computeIncome(userId),
        getSkills(userId),
        getTrust(userId),
        getDisputeRecord(userId),
    ]);

    const now = new Date();
    const validUntil = new Date(now.getTime() + TTL_MS);

    const payload = {
        protocol: PROTOCOL,
        issuer: ISSUER,
        version: '1.0',
        subject: {
            id:           user.id,
            name:         user.full_name || 'Provider',
            city:         user.city || 'Pakistan',
            country:      user.country || 'PK',
            has_avatar:   !!user.avatar_url,
            member_since: user.created_at?.toISOString() || null,
        },
        skills,
        income,
        trust,
        dispute_record: disputes,
        issued_at:   now.toISOString(),
        valid_until: validUntil.toISOString(),
    };

    const credential_hash = hmac(payload);
    return { ...payload, credential_hash };
}

/* ── Lightweight verify (hash check only) ──────────────────────────────── */
export function verifyCredential(credential) {
    if (!credential || credential.protocol !== PROTOCOL) return { valid: false, reason: 'invalid_protocol' };
    if (new Date(credential.valid_until) < new Date()) return { valid: false, reason: 'expired' };
    const { credential_hash, ...payload } = credential;
    const expected = hmac(payload);
    if (!crypto.timingSafeEqual(Buffer.from(credential_hash, 'hex'), Buffer.from(expected, 'hex'))) {
        return { valid: false, reason: 'hash_mismatch' };
    }
    return { valid: true, subject_id: credential.subject.id, tier: credential.trust.tier };
}

/* ── Update skill verification count (called on job completion) ─────────── */
export async function recordSkillActivity(providerId, category) {
    try {
        await pool.query(`
            INSERT INTO skill_verifications(provider_id, category, verified_count, last_active_at)
            VALUES ($1, $2, 1, NOW())
            ON CONFLICT (provider_id, category) DO UPDATE
                SET verified_count = skill_verifications.verified_count + 1,
                    last_active_at = NOW(),
                    updated_at = NOW()
        `, [providerId, category]);
    } catch (_) {}
}

/* ── Refresh income snapshots ───────────────────────────────────────────── */
export async function refreshIncomeSnapshots(userId) {
    const periods = ['30d', '90d', '365d'];
    const intervalMap = { '30d': '30 days', '90d': '90 days', '365d': '365 days' };
    for (const period of periods) {
        try {
            const { rows } = await pool.query(`
                SELECT COALESCE(SUM(amount), 0)::NUMERIC AS total, COUNT(*)::INT AS cnt
                FROM wallet_transactions
                WHERE user_id = $1 AND type = 'credit' AND status = 'completed'
                  AND created_at >= NOW() - INTERVAL '${intervalMap[period]}'
            `, [userId]);
            await pool.query(`
                INSERT INTO income_snapshots(user_id, period, amount_pkr, transaction_count)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, period) DO UPDATE
                    SET amount_pkr = EXCLUDED.amount_pkr,
                        transaction_count = EXCLUDED.transaction_count,
                        computed_at = NOW()
            `, [userId, period, rows[0].total, rows[0].cnt]);
        } catch (_) {}
    }
}
