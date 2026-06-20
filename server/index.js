import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { serverError } from './utils.js';
import { requireAdminAuth } from './security.js';
import * as simon from './simon.js';
import { startScheduledJobs as startSimonMonitor } from './simon/monitor.js';
import { initNewTables, initExtendedTables, initNeighborhoodTables, initLocationIntelligence, writeAuditLog, createNotification, writeSimonAction } from './db.js';
import financialRouter from './financial.js';
import notificationsRouter, { broadcastNotification } from './notifications-routes.js';
import { buildCredential, verifyCredential, recordSkillActivity, refreshIncomeSnapshots } from './identity.js';
import zoneRouter from './zone-economy.js';
import careBridgeRouter from './care-bridge.js';
import chatRouter from './chat.js';
import committeeRouter from './committee.js';
import marketplaceRouter from './marketplace.js';
import neighborhoodExtRouter from './neighborhood-ext.js';
import walletRouter from './wallet.js';
import locationRouter from './location.js';
import securityRouter from './security-routes.js';
import {
    hashPassword,
    verifyPassword,
    validatePasswordPolicy,
    handleFailedLogin,
    resetFailedLoginCount,
    checkAccountLockout,
    createSecureSession,
    validateSessionBinding,
    recordDevice,
    checkImpossibleTravel,
    getGeoData,
    generateEmailVerificationToken,
    generatePasswordResetToken,
    resetPassword,
    logSecurityEvent,
    validateRequiredEnvVars,
    initSecurityTables
} from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
const PORT = 5000;
const isProd = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PgSession = connectPgSimple(session);

app.use(compression());

// Per-route size limits for security
app.use('/api/auth', express.json({ limit: '10kb' }));
app.use('/api/simon', express.json({ limit: '50kb' }));
app.use('/api/security', express.json({ limit: '10kb' }));
app.use('/api', express.json({ limit: '100kb' }));

app.use((req, res, next) => {
    // TODO: Replace with helmet middleware when package is available
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(self), payment=(), usb=()');
    if (isProd) {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }
    next();
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
const simonLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth', authLimiter);
app.use('/api/simon', simonLimiter);
app.use('/api', apiLimiter);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}

app.use(session({
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // HTTPS only, always
        httpOnly: true, // no JS access
        sameSite: 'strict', // no cross-site requests
        maxAge: 8 * 60 * 60 * 1000, // 8 hours absolute max
    },
}));

function checkRequiredEnvVars() {
    validateRequiredEnvVars();
}

async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'admin')),
                avatar_url TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                last_seen_at TIMESTAMPTZ
            )
        `);
        // Idempotent column additions for tables that may already exist without new columns
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`).catch(() => {});
        await initNewTables();
        await initExtendedTables();
        await initNeighborhoodTables(); // neighborhood_zones schema + seed lives in db.js
        await initLocationIntelligence(); // PostGIS and location-aware features
        await initSecurityTables(); // Security layer tables
        console.log('Database ready');
    } catch (err) {
        console.error('DB init error:', err.message);
    }
}

// Update last_seen on every authenticated request (Part 4 middleware)
app.use((req, res, next) => {
    if (req.session?.user?.id) {
        pool.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [req.session.user.id]).catch(() => {});
    }
    next();
});

function requireAuth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Validate session binding (IP and User-Agent)
    if (!validateSessionBinding(req)) {
        req.session.destroy();
        return res.status(401).json({ error: 'Session invalid' });
    }
    
    next();
}

app.get('/api/auth/user', (req, res) => {
    if (req.session?.user) return res.json({ user: req.session.user });
    return res.json({ user: null });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    try {
        // Use explicit columns instead of SELECT * for security
        const { rows } = await pool.query(
            'SELECT id, email, password_hash, full_name, role, avatar_url, failed_login_count, locked_until, lock_reason, is_frozen, email_verified FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        const user = rows[0];
        
        // Check account lockout status
        if (user) {
            const lockoutStatus = await checkAccountLockout(user.id);
            if (lockoutStatus.locked) {
                // Log the failed attempt even if account is locked
                await handleFailedLogin(user.id, email, req.ip, req.headers['user-agent']);
                return res.status(403).json({ 
                    error: 'Account locked',
                    locked_until: lockoutStatus.locked_until,
                    lock_reason: lockoutStatus.lock_reason
                });
            }
            
            if (user.is_frozen) {
                return res.status(403).json({ error: 'Account suspended' });
            }
        }
        
        // Verify password (timing-safe)
        const passwordValid = user && verifyPassword(password, user.password_hash);
        
        if (!passwordValid) {
            // Handle failed login for user if exists, or use dummy user for timing attack prevention
            if (user) {
                await handleFailedLogin(user.id, email, req.ip, req.headers['user-agent']);
            } else {
                // Run dummy password verification to prevent timing attacks
                const dummyHash = hashPassword('dummy');
                verifyPassword('dummy', dummyHash);
            }
            
            // Always return the same error message regardless of whether user exists
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Reset failed login count on successful login
        await resetFailedLoginCount(user.id);
        
        // Check for email verification
        if (!user.email_verified) {
            // Allow login but warn user
            // Note: Financial actions will still require email verification
        }
        
        // Record device for fingerprinting
        const geoData = await getGeoData(req.ip);
        await recordDevice(user.id, req.headers['user-agent'], req.ip, req.headers['accept-language'], geoData);
        
        // Check for impossible travel
        const travelCheck = await checkImpossibleTravel(user.id, req.ip, new Date());
        if (travelCheck.impossible) {
            await logSecurityEvent(user.id, 'impossible_travel_flag', {
                ip: req.ip,
                user_agent: req.headers['user-agent'],
                distance_km: travelCheck.distance,
                time_minutes: travelCheck.timeDiff
            });
            // Block login from suspicious location
            return res.status(403).json({ 
                error: 'Suspicious login detected. Please verify your identity through email.',
                requires_verification: true
            });
        }
        
        // Create secure session with fixation prevention
        const sessionUser = { 
            id: user.id, 
            email: user.email, 
            full_name: user.full_name, 
            role: user.role, 
            avatar_url: user.avatar_url,
            email_verified: user.email_verified
        };
        
        await createSecureSession(req, sessionUser);
        
        // Log successful login
        await logSecurityEvent(user.id, 'successful_login', {
            ip: req.ip,
            user_agent: req.headers['user-agent']
        });
        
        res.json({ user: sessionUser });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    // Validate password policy server-side
    const passwordErrors = validatePasswordPolicy(password, email, fullName);
    if (passwordErrors.length > 0) {
        return res.status(400).json({ error: passwordErrors.join(', ') });
    }
    
    try {
        const hash = hashPassword(password);
        const { rows } = await pool.query(
            'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, role, avatar_url',
            [email.toLowerCase(), hash, fullName || null]
        );
        const user = rows[0];
        
        // Auto-create wallet for new user
        await pool.query(
            `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, 'PKR') ON CONFLICT (user_id, currency) DO NOTHING`,
            [user.id]
        );
        
        // Auto-create trust score if role is provider
        if (user.role === 'provider') {
            await pool.query(
                `INSERT INTO provider_trust_scores (provider_id, score, tier) VALUES ($1, 0, 'new') ON CONFLICT (provider_id) DO NOTHING`,
                [user.id]
            );
        }
        
        // Generate email verification token
        const verificationToken = await generateEmailVerificationToken(user.id);
        
        // TODO: Send verification email with token
        // For now, return the token in development mode
        if (!isProd) {
            console.log(`Email verification token for ${email}: ${verificationToken}`);
        }
        
        res.json({ 
            user: { ...user, email_verified: false },
            requires_verification: true,
            verification_token: isProd ? undefined : verificationToken
        });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' });
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.put('/api/auth/profile', requireAuth, async (req, res) => {
    const { full_name, phone, city, avatar_url } = req.body;
    try {
        const { rows } = await pool.query(
            `UPDATE users SET full_name=$1, phone=$2, city=$3, avatar_url=$4, updated_at=NOW()
             WHERE id=$5 RETURNING id, email, full_name, phone, city, avatar_url, role`,
            [full_name, phone, city, avatar_url, req.session.user.id]
        );
        req.session.user = { ...req.session.user, ...rows[0] };
        res.json({ user: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.post('/api/ai/chat', async (req, res) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'AI service not configured. Please add OPENROUTER_API_KEY to secrets.' });
    }
    const { messages, systemPrompt, temperature = 0.7, maxTokens = 2000 } = req.body;
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://truvornex.com', 'X-Title': 'Truvornex' },
            body: JSON.stringify({
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                messages: [
                    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                    ...messages,
                ],
                stream: false,
                temperature,
                max_tokens: maxTokens,
            }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: err.error?.message || `AI API error ${response.status}` });
        }
        const data = await response.json();
        res.json({ content: data.choices?.[0]?.message?.content || '' });
    } catch (err) {
        console.error('AI proxy error:', err);
        res.status(500).json({ error: 'Failed to reach AI service' });
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/financial', requireAuth, financialRouter);
app.use('/api/notifications', requireAuth, notificationsRouter);
app.use('/api/zones', zoneRouter);
app.use('/api/chat', requireAuth, chatRouter);
app.use('/api/wallet', requireAuth, walletRouter);
app.use('/api/security', requireAuth, securityRouter);
app.use('/api/committees', requireAuth, committeeRouter);
app.use('/api/marketplace', requireAuth, marketplaceRouter);
app.use('/api/neighborhood', requireAuth, neighborhoodExtRouter);
app.use('/api/location', requireAuth, locationRouter);
app.get('/api/care-bridge/meta/rates', (req, res) => {
    res.json({
        base_currency: 'PKR',
        rates: { EUR: 310, USD: 278, GBP: 355, AED: 75, CAD: 205, AUD: 182 },
        note: 'Reference rates. Actual rates locked at order placement.',
        updated_at: new Date().toISOString(),
    });
});
app.use('/api/care-bridge', requireAuth, careBridgeRouter);

/* ── Economic Identity Protocol (TIP-v1) ────────────────────────────────── */

app.get('/api/identity/me', requireAuth, async (req, res) => {
    try {
        const credential = await buildCredential(req.session.user.id);
        if (!credential) return res.status(404).json({ error: 'Identity not found or user is not a provider' });
        res.json({ credential });
    } catch (err) { serverError(res, err); }
});

app.get('/api/identity/me/verify', requireAuth, async (req, res) => {
    try {
        const credential = await buildCredential(req.session.user.id);
        if (!credential) return res.status(404).json({ error: 'Not found' });
        res.json(verifyCredential(credential));
    } catch (err) { serverError(res, err); }
});

app.get('/api/identity/:userId', async (req, res) => {
    try {
        const credential = await buildCredential(req.params.userId);
        if (!credential) return res.status(404).json({ error: 'Provider identity not found' });
        const { credential_hash, ...publicFields } = credential;
        res.json({ credential: { ...publicFields, verification_endpoint: `/api/identity/${req.params.userId}/verify` } });
    } catch (err) { serverError(res, err); }
});

app.get('/api/identity/:userId/verify', async (req, res) => {
    try {
        const credential = await buildCredential(req.params.userId);
        if (!credential) return res.status(404).json({ valid: false, reason: 'not_found' });
        res.json(verifyCredential(credential));
    } catch (err) { serverError(res, err); }
});

app.post('/api/identity/skill-activity', requireAuth, async (req, res) => {
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: 'category required' });
    try {
        await recordSkillActivity(req.session.user.id, category);
        await refreshIncomeSnapshots(req.session.user.id);
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

/* ── Neighborhood / Community API routes ─────────────────────── */

app.get('/api/emergency-requests', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM emergency_requests WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10',
            [req.session.user.id]
        );
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/emergency-requests', requireAuth, async (req, res) => {
    const { category, urgency, description, lat, lng, zone_id } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO emergency_requests (customer_id, zone_id, category, urgency, description, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [req.session.user.id, zone_id || null, category, urgency || 'immediate', description, lat || null, lng || null]
        );
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.patch('/api/emergency-requests/:id', requireAuth, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query(
            'UPDATE emergency_requests SET status=$1, updated_at=NOW() WHERE id=$2 AND customer_id=$3',
            [status, req.params.id, req.session.user.id]
        );
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

app.get('/api/group-buys', async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM group_buys WHERE status IN ('open','locked') ORDER BY created_at DESC LIMIT 30"
        );
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.get('/api/group-buy-participants/my', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT group_buy_id FROM group_buy_participants WHERE user_id = $1',
            [req.session.user.id]
        );
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/group-buys', requireAuth, async (req, res) => {
    const { zone_id, service_category, description, target_participants, discount_percent, expires_at } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO group_buys (zone_id, service_category, description, initiator_id, target_participants, discount_percent, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [zone_id || null, service_category, description || null, req.session.user.id, target_participants || 5, discount_percent || 10, expires_at || null]
        );
        await pool.query('INSERT INTO group_buy_participants (group_buy_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rows[0].id, req.session.user.id]);
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.post('/api/group-buys/:id/join', requireAuth, async (req, res) => {
    try {
        await pool.query('INSERT INTO group_buy_participants (group_buy_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.session.user.id]);
        const { rows } = await pool.query('SELECT current_participants FROM group_buys WHERE id=$1', [req.params.id]);
        const newCount = (rows[0]?.current_participants || 0) + 1;
        await pool.query('UPDATE group_buys SET current_participants=$1, updated_at=NOW() WHERE id=$2', [newCount, req.params.id]);
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

/* ═══════════════════════════════════════
   SERVICE BUNDLES
═══════════════════════════════════════ */
app.get('/api/bundles', async (req, res) => {
    const { status } = req.query;
    try {
        const conditions = [];
        const params = [];
        let pi = 1;
        if (status && status !== 'all') { conditions.push(`status = $${pi++}`); params.push(status); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await pool.query(
            `SELECT sb.*, u.full_name AS organizer_name, u.email AS organizer_email
             FROM service_bundles sb JOIN users u ON u.id = sb.organizer_id
             ${where} ORDER BY sb.created_at DESC LIMIT 50`,
            params
        );
        res.json({ bundles: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/bundles', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const { title, description, category_slug, service_name, zone_name, address_hint, max_participants, discount_percentage, base_price, scheduled_date, deadline_date } = req.body;
    if (!title || !category_slug) return res.status(400).json({ error: 'title and category_slug required' });
    try {
        const { rows: userRow } = await pool.query(`SELECT full_name, email FROM users WHERE id = $1`, [userId]);
        const discountedPrice = base_price ? parseFloat(base_price) * (1 - parseInt(discount_percentage) / 100) : null;
        const { rows } = await pool.query(
            `INSERT INTO service_bundles (organizer_id, title, description, category_slug, service_name, zone_name, address_hint, max_participants, discount_percentage, base_price, discounted_price, scheduled_date, deadline_date, organizer_email, participant_emails)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,ARRAY[$14])
             RETURNING *`,
            [userId, title, description || null, category_slug, service_name || category_slug, zone_name || null, address_hint || null, parseInt(max_participants) || 5, parseInt(discount_percentage) || 20, base_price ? parseFloat(base_price) : null, discountedPrice, scheduled_date || null, deadline_date || null, userRow[0]?.email]
        );
        await pool.query(`INSERT INTO bundle_participants (bundle_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [rows[0].id, userId]);
        res.json({ bundle: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.post('/api/bundles/:id/join', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows: bundle } = await pool.query(`SELECT * FROM service_bundles WHERE id = $1 AND status = 'forming'`, [req.params.id]);
        if (!bundle[0]) return res.status(404).json({ error: 'Bundle not available' });
        if (bundle[0].current_participants >= bundle[0].max_participants) return res.status(400).json({ error: 'Bundle is full' });
        await pool.query(`INSERT INTO bundle_participants (bundle_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, userId]);
        const { rows: userRow } = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        await pool.query(
            `UPDATE service_bundles SET current_participants = current_participants + 1, participant_emails = array_append(participant_emails, $2), updated_at = NOW() WHERE id = $1`,
            [req.params.id, userRow[0]?.email]
        );
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

app.get('/api/skill-swaps', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM skill_swaps WHERE status='open' ORDER BY created_at DESC LIMIT 30");
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.get('/api/skill-swaps/my', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM skill_swaps WHERE offerer_id=$1 ORDER BY created_at DESC LIMIT 20', [req.session.user.id]);
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.get('/api/time-credits/balance', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT COALESCE(SUM(amount),0) AS balance FROM time_credits_ledger WHERE user_id=$1', [req.session.user.id]);
        res.json({ balance: parseInt(rows[0]?.balance || 0) });
    } catch (err) { serverError(res, err); }
});

app.post('/api/skill-swaps', requireAuth, async (req, res) => {
    const { zone_id, offering, seeking, time_credits_offered } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO skill_swaps (zone_id, offerer_id, offering, seeking, time_credits_offered) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [zone_id || null, req.session.user.id, offering, seeking, time_credits_offered || 1]
        );
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.patch('/api/skill-swaps/:id/match', requireAuth, async (req, res) => {
    try {
        await pool.query(
            "UPDATE skill_swaps SET status='matched', matched_with_user_id=$1, updated_at=NOW() WHERE id=$2",
            [req.session.user.id, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

app.get('/api/disputes', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM disputes WHERE raised_by=$1 OR against_id=$1 OR status IN ('open','voting') ORDER BY created_at DESC",
            [req.session.user.id]
        );
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.get('/api/jury-assignments/my', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT dispute_id, vote FROM jury_assignments WHERE juror_user_id=$1', [req.session.user.id]);
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/jury-assignments', requireAuth, async (req, res) => {
    const { dispute_id, vote } = req.body;
    try {
        await pool.query(
            'INSERT INTO jury_assignments (dispute_id, juror_user_id, vote, voted_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (dispute_id, juror_user_id) DO UPDATE SET vote=$3, voted_at=NOW()',
            [dispute_id, req.session.user.id, vote]
        );
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

app.get('/api/events', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM events ORDER BY date ASC LIMIT 60");
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/events', requireAuth, async (req, res) => {
    const { title, description, category, venue_name, venue_type, address, date, start_time, end_time, organizer_name, ticket_price, is_free, total_tickets, bundle_services, cover_image_url } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO events (title, description, category, venue_name, venue_type, address, date, start_time, end_time, organizer_name, organizer_id, ticket_price, is_free, total_tickets, bundle_services, cover_image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *',
            [title, description || null, category || 'other', venue_name || null, venue_type || null, address || null, date || null, start_time || null, end_time || null, organizer_name || null, req.session.user.id, ticket_price || 0, is_free !== false, total_tickets || 100, JSON.stringify(bundle_services || []), cover_image_url || null]
        );
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.get('/api/event-tickets/my', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM event_tickets WHERE buyer_email=$1 ORDER BY created_at DESC", [req.session.user.email]);
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/event-tickets', requireAuth, async (req, res) => {
    const { event_id, event_title, quantity, unit_price } = req.body;
    const total = (quantity || 1) * (unit_price || 0);
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    try {
        const { rows } = await pool.query(
            'INSERT INTO event_tickets (event_id, event_title, buyer_email, buyer_name, quantity, unit_price, total_amount, ticket_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
            [event_id, event_title || null, req.session.user.email, req.session.user.full_name || null, quantity || 1, unit_price || 0, total, code]
        );
        await pool.query('UPDATE events SET tickets_sold = COALESCE(tickets_sold,0) + $1 WHERE id=$2', [quantity || 1, event_id]);
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.get('/api/community-posts', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM community_posts ORDER BY created_date DESC LIMIT 50");
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/community-posts', requireAuth, async (req, res) => {
    const { type, title, body, image_url } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO community_posts (type, title, body, author_name, author_email, author_id, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [type || 'post', title || null, body, req.session.user.full_name || req.session.user.email, req.session.user.email, req.session.user.id, image_url || null]
        );
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.patch('/api/community-posts/:id/vote', requireAuth, async (req, res) => {
    const { delta } = req.body;
    try {
        await pool.query('UPDATE community_posts SET upvotes = GREATEST(0, COALESCE(upvotes,0) + $1) WHERE id=$2', [delta || 1, req.params.id]);
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

app.get('/api/post-comments/:postId', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM post_comments WHERE post_id=$1 ORDER BY created_at ASC', [req.params.postId]);
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/post-comments', requireAuth, async (req, res) => {
    const { post_id, body } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO post_comments (post_id, author_email, author_name, body) VALUES ($1,$2,$3,$4) RETURNING *',
            [post_id, req.session.user.email, req.session.user.full_name || req.session.user.email, body]
        );
        await pool.query('UPDATE community_posts SET reply_count = COALESCE(reply_count,0) + 1 WHERE id=$1', [post_id]);
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.get('/api/neighborhood-polls', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM neighborhood_polls ORDER BY created_at DESC LIMIT 20");
        res.json({ data: rows });
    } catch (err) { serverError(res, err); }
});

app.post('/api/neighborhood-polls', requireAuth, async (req, res) => {
    const { question, neighborhood, options } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });
    try {
        const { rows } = await pool.query(
            'INSERT INTO neighborhood_polls (question, neighborhood, options, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
            [question, neighborhood || null, JSON.stringify(options || []), req.session.user.id]
        );
        res.json({ data: rows[0] });
    } catch (err) { serverError(res, err); }
});

app.patch('/api/neighborhood-polls/:id/vote', requireAuth, async (req, res) => {
    const { options } = req.body;
    try {
        await pool.query('UPDATE neighborhood_polls SET options=$1 WHERE id=$2', [JSON.stringify(options), req.params.id]);
        res.json({ success: true });
    } catch (err) { serverError(res, err); }
});

/* ── Trust Passport (public, no auth) ────────────────────────────────────── */

app.get('/api/trust-passport/:providerId', async (req, res) => {
    const { providerId } = req.params;
    try {
        const { rows: users } = await pool.query(
            'SELECT id, full_name, avatar_url, city, country FROM users WHERE id = $1',
            [providerId]
        );
        if (!users[0]) return res.status(404).json({ error: 'Provider not found' });
        const user = users[0];

        const { rows: trust } = await pool.query(
            'SELECT * FROM provider_trust_scores WHERE provider_id = $1',
            [providerId]
        );
        const score = trust[0];

        const { rows: vouches } = await pool.query(
            'SELECT COUNT(*) AS count FROM provider_vouches WHERE provider_id = $1',
            [providerId]
        );

        const badges = [];
        if (score?.tier === 'champion') badges.push('🏆 Champion Provider');
        if (score?.tier === 'trusted' || score?.tier === 'champion') badges.push('✅ Community Trusted');
        if ((score?.total_completed || 0) >= 50) badges.push('⭐ 50+ Jobs');
        if ((score?.total_completed || 0) >= 10) badges.push('🎯 Experienced');
        if ((score?.avg_rating || 0) >= 4.8) badges.push('💎 Top Rated');
        if (parseInt(vouches[0]?.count || 0) >= 3) badges.push('👥 Vouched');

        const credentialData = {
            provider_id: providerId,
            provider_name: user.full_name || 'Provider',
            avatar_url: user.avatar_url,
            city: user.city,
            country: user.country || 'PK',
            score: parseFloat(score?.score || 0),
            tier: score?.tier || 'new',
            completion_rate: parseFloat(score?.completion_rate || 0),
            avg_rating: score?.avg_rating ? parseFloat(score.avg_rating) : null,
            total_completed: score?.total_completed || 0,
            dispute_free_streak: score?.dispute_free_streak || 0,
            vouches_count: parseInt(vouches[0]?.count || 0),
            last_computed_at: score?.last_computed_at || null,
            badges,
        };

        const trustSecret = process.env.TRUST_PASSPORT_SECRET || (isProd ? (() => { throw new Error('TRUST_PASSPORT_SECRET not set'); })() : 'dev-insecure-placeholder-do-not-use-in-prod');
        const verificationHash = crypto
            .createHmac('sha256', trustSecret)
            .update(JSON.stringify(credentialData))
            .digest('hex');

        res.json({ ...credentialData, verification_hash: verificationHash });
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Admin Lab Data ─────────────────────────────────────────────────────────── */

app.get('/api/admin/lab-data', requireAdminAuth, async (req, res) => {
    try {
        const [statsR, trustR, zonesR, bnplR, loyaltyR] = await Promise.all([
            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM users) AS total_users,
                    (SELECT COUNT(*) FROM users WHERE role='provider') AS total_providers,
                    (SELECT COUNT(*) FROM bookings) AS total_bookings,
                    (SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURRENT_DATE) AS bookings_today
            `),
            pool.query(`SELECT tier, COUNT(*) AS count FROM provider_trust_scores GROUP BY tier ORDER BY count DESC`),
            pool.query(`SELECT id, name, health_score, demand_index, updated_at FROM neighborhood_zones ORDER BY health_score DESC LIMIT 20`).catch(() => ({ rows: [] })),
            pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE status='active') AS active_count,
                    SUM(total_amount - (paid_installments * installment_amount)) FILTER (WHERE status='active') AS total_exposure,
                    COUNT(*) FILTER (WHERE status='active' AND next_due_date < CURRENT_DATE) AS overdue_count,
                    COUNT(*) FILTER (WHERE status='defaulted') AS defaulted_count
                FROM bnpl_agreements
            `).catch(() => ({ rows: [{}] })),
            pool.query(`
                SELECT
                    SUM(coins) FILTER (WHERE coins > 0) AS total_coins_issued,
                    SUM(coins) FILTER (WHERE coins < 0) AS total_coins_redeemed,
                    SUM(coins) AS outstanding_balance,
                    COUNT(DISTINCT user_id) AS users_with_coins
                FROM loyalty_ledger
            `).catch(() => ({ rows: [{}] })),
        ]);

        res.json({
            platform_stats: statsR.rows[0],
            trust_distribution: trustR.rows,
            zones: zonesR.rows,
            bnpl_risk: bnplR.rows[0] || {},
            loyalty_economy: loyaltyR.rows[0] || {},
        });
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Realtime polling endpoints ─────────────────────────────────────────────── */

const REALTIME_ALLOWED_TABLES = new Set(['bookings', 'notifications', 'emergency_requests', 'group_buy_participants', 'chat_messages']);

app.get('/api/realtime/platform-stats', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM bookings) AS bookings,
                (SELECT COUNT(*) FROM users WHERE role='provider') AS providers,
                (SELECT COUNT(*) FROM bookings WHERE status='pending') AS pending_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed','in_progress')) AS active_bookings
        `);
        const { rows: activity } = await pool.query(
            `SELECT id, status, created_at FROM bookings ORDER BY created_at DESC LIMIT 5`
        ).catch(() => ({ rows: [] }));
        res.json({ stats: { ...rows[0], recentActivity: activity } });
    } catch (err) {
        serverError(res, err);
    }
});

app.get('/api/realtime/list/:table', requireAuth, async (req, res) => {
    const { table } = req.params;
    if (!REALTIME_ALLOWED_TABLES.has(table)) return res.status(400).json({ error: 'Table not allowed' });
    const userId = req.session.user.id;
    try {
        let q, params;
        if (table === 'notifications') {
            q = `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`;
            params = [userId];
        } else if (table === 'bookings') {
            const col = req.session.user.role === 'provider' ? 'provider_id' : 'customer_id';
            q = `SELECT * FROM bookings WHERE ${col}=$1 ORDER BY created_at DESC LIMIT 30`;
            params = [userId];
        } else if (table === 'chat_messages') {
            q = `SELECT * FROM chat_messages WHERE sender_id=$1 OR receiver_id=$1 ORDER BY created_at DESC LIMIT 50`;
            params = [userId];
        } else {
            q = `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 30`;
            params = [];
        }
        const { rows } = await pool.query(q, params);
        res.json({ rows });
    } catch (err) {
        serverError(res, err);
    }
});

app.get('/api/realtime/single/:table/:id', requireAuth, async (req, res) => {
    const { table, id } = req.params;
    if (!REALTIME_ALLOWED_TABLES.has(table)) return res.status(400).json({ error: 'Table not allowed' });
    try {
        let query;
        switch (table) {
            case 'bookings':
                query = 'SELECT * FROM bookings WHERE id=$1 LIMIT 1';
                break;
            case 'notifications':
                query = 'SELECT * FROM notifications WHERE id=$1 LIMIT 1';
                break;
            case 'emergency_requests':
                query = 'SELECT * FROM emergency_requests WHERE id=$1 LIMIT 1';
                break;
            case 'group_buy_participants':
                query = 'SELECT * FROM group_buy_participants WHERE id=$1 LIMIT 1';
                break;
            case 'chat_messages':
                query = 'SELECT * FROM chat_messages WHERE id=$1 LIMIT 1';
                break;
            default:
                return res.status(400).json({ error: 'Table not allowed' });
        }
        const { rows } = await pool.query(query, [id]);
        res.json({ row: rows[0] || null });
    } catch (err) {
        serverError(res, err);
    }
});

app.get('/api/realtime/poll', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const role = req.session.user.role;
    try {
        const bookingCol = role === 'provider' ? 'provider_id' : 'customer_id';
        const [notifs, bookings, messages] = await Promise.all([
            pool.query(
                `SELECT id, type, message, read, created_at FROM notifications WHERE user_id=$1 AND read=false ORDER BY created_at DESC LIMIT 10`,
                [userId]
            ),
            pool.query(
                `SELECT id, status, updated_at FROM bookings WHERE ${bookingCol}=$1 AND updated_at >= NOW() - INTERVAL '5 minutes' ORDER BY updated_at DESC LIMIT 5`,
                [userId]
            ),
            pool.query(
                `SELECT id, content, sender_id, created_at FROM chat_messages WHERE receiver_id=$1 AND created_at >= NOW() - INTERVAL '5 minutes' ORDER BY created_at DESC LIMIT 10`,
                [userId]
            ),
        ]);
        res.json({
            unread_notifications: notifs.rows,
            recent_booking_updates: bookings.rows,
            recent_messages: messages.rows,
            polled_at: new Date().toISOString(),
        });
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Vouches ────────────────────────────────────────────────────────────────── */

app.get('/api/vouches/:providerId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT pv.*, u.full_name AS voucher_name, u.avatar_url AS voucher_avatar
             FROM provider_vouches pv
             LEFT JOIN users u ON u.id = pv.voucher_id
             WHERE pv.provider_id = $1 ORDER BY pv.created_at DESC`,
            [req.params.providerId]
        );
        res.json({ vouches: rows });
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/vouches', requireAuth, async (req, res) => {
    const { provider_id, message, zone_id } = req.body;
    if (!provider_id) return res.status(400).json({ error: 'provider_id required' });
    if (provider_id === req.session.user.id) return res.status(400).json({ error: 'Cannot vouch for yourself' });
    try {
        const { rows } = await pool.query(
            `INSERT INTO provider_vouches(provider_id, voucher_id, zone_id, message) VALUES ($1,$2,$3,$4)
             ON CONFLICT (provider_id, voucher_id) DO UPDATE SET message=$4
             RETURNING *`,
            [provider_id, req.session.user.id, zone_id || null, message || null]
        );
        await pool.query(`UPDATE provider_trust_scores SET vouches_count = (SELECT COUNT(*) FROM provider_vouches WHERE provider_id=$1) WHERE provider_id=$1`, [provider_id]);
        await writeAuditLog({ actorId: req.session.user.id, action: 'vouch.create', entity: 'provider_vouches', entityId: rows[0].id, ipAddress: req.ip });
        res.json({ vouch: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Full-text Search ───────────────────────────────────────────────────────── */

app.get('/api/search', async (req, res) => {
    const { q, category, lat, lng, radius_km: radiusKm, limit: lim } = req.query;
    if (!q && !category) return res.status(400).json({ error: 'Query or category required' });
    const limitN = Math.min(parseInt(lim) || 20, 50);
    const radiusMeters = (parseInt(radiusKm) || 25) * 1000; // default 25km
    try {
        let rows = [];
        const searchQuery = q ? q.trim() : null;
        const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);

        let providersQuery;
        let queryParams;

        if (lat && lng) {
            // Location-aware search with distance calculation
            providersQuery = `
                SELECT 
                    p.*,
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
                    (SELECT AVG(r.rating) FROM reviews r WHERE r.provider_id = p.user_id::text) AS avg_rating,
                    CASE WHEN $3::text IS NOT NULL AND (
                        p.business_name ILIKE '%' || $3 || '%' OR
                        p.description ILIKE '%' || $3 || '%' OR
                        p.category_slug ILIKE '%' || $3 || '%'
                    ) THEN 1 ELSE 0 END AS text_match
                FROM providers p
                LEFT JOIN users u ON u.id = p.user_id
                LEFT JOIN provider_trust_scores pts ON pts.provider_id = p.user_id
                LEFT JOIN provider_presence pp ON pp.provider_id = p.user_id
                WHERE p.status = 'approved'
                  AND p.geolocation IS NOT NULL
                  AND ST_DWithin(
                      p.geolocation,
                      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                      $4
                  )
                  AND ($3::text IS NULL OR p.business_name ILIKE '%' || $3 || '%' OR p.description ILIKE '%' || $3 || '%' OR p.category_slug ILIKE '%' || $3 || '%')
                  AND ($5::text IS NULL OR p.category_slug = $5)
                ORDER BY
                    CASE WHEN pp.is_online = true AND pp.last_heartbeat > $6 THEN 0 ELSE 1 END,
                    pts.score DESC NULLS LAST,
                    distance_km ASC
                LIMIT $7
            `;
            queryParams = [lng, lat, searchQuery, radiusMeters, category || null, eightMinutesAgo, limitN];
        } else {
            // Fallback to non-geo search if no location provided
            providersQuery = `
                SELECT 
                    p.*,
                    u.full_name,
                    u.avatar_url,
                    pts.score AS trust_score,
                    pts.tier,
                    pp.is_online,
                    pp.is_accepting_jobs,
                    pp.last_heartbeat,
                    NULL AS distance_km,
                    (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.user_id::text) AS review_count,
                    (SELECT AVG(r.rating) FROM reviews r WHERE r.provider_id = p.user_id::text) AS avg_rating,
                    CASE WHEN $1::text IS NOT NULL AND (
                        p.business_name ILIKE '%' || $1 || '%' OR
                        p.description ILIKE '%' || $1 || '%' OR
                        p.category_slug ILIKE '%' || $1 || '%'
                    ) THEN 1 ELSE 0 END AS text_match
                FROM providers p
                LEFT JOIN users u ON u.id = p.user_id
                LEFT JOIN provider_trust_scores pts ON pts.provider_id = p.user_id
                LEFT JOIN provider_presence pp ON pp.provider_id = p.user_id
                WHERE p.status = 'approved'
                  AND ($1::text IS NULL OR p.business_name ILIKE '%' || $1 || '%' OR p.description ILIKE '%' || $1 || '%' OR p.category_slug ILIKE '%' || $1 || '%')
                  AND ($2::text IS NULL OR p.category_slug = $2)
                ORDER BY
                    CASE WHEN pp.is_online = true AND pp.last_heartbeat > $3 THEN 0 ELSE 1 END,
                    pts.score DESC NULLS LAST,
                    text_match DESC
                LIMIT $4
            `;
            queryParams = [searchQuery, category || null, eightMinutesAgo, limitN];
        }

        const providersQ = await pool.query(providersQuery, queryParams).catch(() => ({ rows: [] }));
        rows = providersQ.rows;

        const servicesQ = await pool.query(
            `SELECT s.*, p.business_name AS provider_name, p.category_slug,
                    pts.score AS trust_score, pts.tier
             FROM services s
             LEFT JOIN providers p ON p.id = s.provider_id
             LEFT JOIN provider_trust_scores pts ON pts.provider_id::text = p.user_id::text
             WHERE s.is_active = true
               AND ($1::text IS NULL OR s.title ILIKE '%' || $1 || '%' OR s.description ILIKE '%' || $1 || '%')
               AND ($2::text IS NULL OR p.category_slug = $2)
             ORDER BY pts.score DESC NULLS LAST
             LIMIT $3`,
            [searchQuery, category || null, limitN]
        ).catch(() => ({ rows: [] }));

        res.json({ 
            providers: rows, 
            services: servicesQ.rows, 
            query: q, 
            category: category || null,
            location: lat && lng ? { lat, lng, radius_km: radiusMeters / 1000 } : null
        });
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Audit Log (admin only) ─────────────────────────────────────────────────── */

app.get('/api/audit-log', requireAdminAuth, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    try {
        const { rows } = await pool.query(
            `SELECT al.*, u.email AS actor_email FROM audit_log al
             LEFT JOIN users u ON u.id = al.actor_id
             ORDER BY al.created_at DESC LIMIT $1`,
            [limit]
        );
        res.json({ entries: rows });
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Simon Intelligence API ─────────────────────────────────────────────────── */

app.get('/api/simon/home-insights', async (req, res) => {
    try {
        const userId = req.session?.user?.id;
        const area = req.query.area || 'your area';
        const insights = await simon.getHomeInsights({ area, user_id: userId });
        res.json({ insights });
    } catch (err) {
        res.json({ insights: [] });
    }
});

app.post('/api/simon/booking-analysis', async (req, res) => {
    try {
        const result = await simon.analyzeBooking(req.body || {});
        res.json(result);
    } catch (err) {
        res.json({ demandLevel: 'moderate', priceFairness: 'fair', timingScore: 7, timingSuggestion: 'A solid time slot for this service.', savingsTip: null });
    }
});

app.get('/api/simon/zone-health', async (req, res) => {
    try {
        let dbStats = null;
        try {
            const { rows } = await pool.query(`
                SELECT
                    (SELECT COUNT(*)::int FROM bookings WHERE status IN ('confirmed','in_progress')) AS active_bookings,
                    (SELECT COUNT(*)::int FROM users WHERE role = 'provider') AS total_providers
            `);
            dbStats = rows[0];
        } catch (_) {}
        const result = simon.getZoneHealth({ zone_id: req.query.zone_id, area: req.query.area || 'your area', dbStats });
        res.json(result);
    } catch (err) {
        res.json({ health: 'active', score: 75, activeProviders: 40, area: 'your area', trendingServices: ['Cleaning', 'Plumbing'], peakHours: false, alert: null });
    }
});

app.post('/api/simon/voice-search', async (req, res) => {
    try {
        const result = await simon.parseVoiceSearch(req.body || {});
        res.json(result);
    } catch (err) {
        res.json({ query: '', category: null, intent: 'search', urgency: 'flexible' });
    }
});

app.post('/api/simon/zone-forecast', async (req, res) => {
    try {
        const result = await simon.getZoneForecast(req.body || {});
        res.json(result);
    } catch (err) {
        res.json({ forecast: [], top_opportunity: null, living_wage_floor_pkr: 800 });
    }
});

app.get('/api/simon/recommendations', async (req, res) => {
    try {
        const userId = req.session?.user?.id || 'anonymous';
        const result = await simon.generateRecommendations(userId);
        res.json(result);
    } catch (err) {
        res.json({ services: [], bundle_suggestion: null, optimal_booking_time: null });
    }
});

/* ── Simon Admin Oversight (Admin Only) ─────────────────────────────────────────── */

app.get('/api/admin/simon/actions', requireAdminAuth, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const status = req.query.status;
    try {
        let query = `
            SELECT sa.*, u.email as reviewer_email 
            FROM simon_actions sa 
            LEFT JOIN users u ON u.id = sa.human_reviewer_id
        `;
        const params = [];
        
        if (status) {
            query += ' WHERE sa.status = $1';
            params.push(status);
        }
        
        query += ' ORDER BY sa.created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);
        
        const { rows } = await pool.query(query, params);
        res.json({ actions: rows });
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/admin/simon/actions/:id/approve', requireAdminAuth, async (req, res) => {
    try {
        const actionId = req.params.id;
        const { execute } = req.body; // Whether to execute immediately after approval
        
        // Get the action details
        const { rows } = await pool.query('SELECT * FROM simon_actions WHERE id = $1', [actionId]);
        if (!rows[0]) return res.status(404).json({ error: 'Action not found' });
        
        const action = rows[0];
        
        // Update status to approved
        await pool.query(
            `UPDATE simon_actions SET status = 'approved', human_reviewer_id = $1, reviewed_at = NOW() WHERE id = $2`,
            [req.session.user.id, actionId]
        );
        
        // If execution requested, perform the action
        if (execute && action.action_type === 'wallet_freeze') {
            await pool.query('UPDATE wallets SET is_frozen = true WHERE user_id = $1', [action.target_id]);
            await pool.query(`UPDATE simon_actions SET status = 'executed', executed_at = NOW() WHERE id = $1`, [actionId]);
            
            // Notify the user
            await createNotification({
                userId: action.target_id,
                type: 'warning',
                title: 'Wallet Frozen',
                body: 'Your wallet has been frozen due to suspicious activity. Please contact support.',
                data: { action_id: actionId }
            });
        } else if (execute && action.action_type === 'wallet_unfreeze') {
            await pool.query('UPDATE wallets SET is_frozen = false WHERE user_id = $1', [action.target_id]);
            await pool.query(`UPDATE simon_actions SET status = 'executed', executed_at = NOW() WHERE id = $1`, [actionId]);
            
            // Notify the user
            await createNotification({
                userId: action.target_id,
                type: 'info',
                title: 'Wallet Unfrozen',
                body: 'Your wallet has been unfrozen. You can now use it normally.',
                data: { action_id: actionId }
            });
        }
        
        await writeAuditLog({
            actorId: req.session.user.id,
            action: 'simon.action.approve',
            entity: 'simon_actions',
            entityId: actionId,
            payload: { action_type: action.action_type, target_id: action.target_id },
            ipAddress: req.ip
        });
        
        res.json({ success: true, message: 'Action approved' + (execute ? ' and executed' : '') });
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/admin/simon/actions/:id/reject', requireAdminAuth, async (req, res) => {
    try {
        const actionId = req.params.id;
        const { reason } = req.body;
        
        await pool.query(
            `UPDATE simon_actions SET status = 'rejected', human_reviewer_id = $1, reviewed_at = NOW() WHERE id = $2`,
            [req.session.user.id, actionId]
        );
        
        await writeAuditLog({
            actorId: req.session.user.id,
            action: 'simon.action.reject',
            entity: 'simon_actions',
            entityId: actionId,
            payload: { reason },
            ipAddress: req.ip
        });
        
        res.json({ success: true, message: 'Action rejected' });
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/admin/simon/actions/:id/reverse', requireAdminAuth, async (req, res) => {
    try {
        const actionId = req.params.id;
        const { reason } = req.body;
        
        // Get the action details
        const { rows } = await pool.query('SELECT * FROM simon_actions WHERE id = $1', [actionId]);
        if (!rows[0]) return res.status(404).json({ error: 'Action not found' });
        
        const action = rows[0];
        
        // Reverse the action if possible
        if (action.action_type === 'wallet_freeze') {
            await pool.query('UPDATE wallets SET is_frozen = false WHERE user_id = $1', [action.target_id]);
            
            await createNotification({
                userId: action.target_id,
                type: 'info',
                title: 'Wallet Freeze Reversed',
                body: 'The wallet freeze has been reversed by admin review.',
                data: { action_id: actionId }
            });
        }
        
        await pool.query(
            `UPDATE simon_actions SET status = 'reversed', human_reviewer_id = $1, reviewed_at = NOW() WHERE id = $2`,
            [req.session.user.id, actionId]
        );
        
        await writeAuditLog({
            actorId: req.session.user.id,
            action: 'simon.action.reverse',
            entity: 'simon_actions',
            entityId: actionId,
            payload: { reason },
            ipAddress: req.ip
        });
        
        res.json({ success: true, message: 'Action reversed' });
    } catch (err) {
        serverError(res, err);
    }
});

app.get('/api/admin/simon/snapshot', requireAdminAuth, async (req, res) => {
    try {
        const snapshot = await simon.getSystemSnapshot();
        res.json(snapshot);
    } catch (err) {
        serverError(res, err);
    }
});

app.get('/api/admin/simon/anomalies', requireAdminAuth, async (req, res) => {
    try {
        const anomalies = await simon.detectAnomalies();
        res.json({ anomalies });
    } catch (err) {
        serverError(res, err);
    }
});

app.get('/api/admin/simon/stats', requireAdminAuth, async (req, res) => {
    try {
        const stats = simon.getModelUsageStats();
        
        // Get additional stats from database
        const { rows } = await pool.query(`
            SELECT 
                COUNT(*) as total_actions,
                COUNT(*) FILTER (WHERE status = 'pending_approval') as pending,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE status = 'executed') as executed,
                AVG(confidence_score) as avg_confidence
            FROM simon_actions
        `);
        
        res.json({
            model_usage: stats,
            actions: rows[0] || {}
        });
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/admin/simon/trigger-action', requireAdminAuth, async (req, res) => {
    try {
        const { action_type, target_type, target_id, action_data, reasoning } = req.body;
        
        if (!action_type || !target_type) {
            return res.status(400).json({ error: 'action_type and target_type are required' });
        }
        
        const result = await simon.proposeAutonomousAction(
            action_type,
            target_type,
            target_id,
            action_data,
            reasoning || 'Manually triggered by admin'
        );
        
        res.json(result);
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Simon Multi-Agent Dashboard ─────────────────────────────────────────────────── */

app.get('/api/simon/dashboard', requireAdminAuth, async (req, res) => {
    try {
        const status = await simon.getCompleteSystemStatus();
        res.json(status);
    } catch (err) {
        serverError(res, err);
    }
});

app.get('/api/simon/multi-agent-status', requireAdminAuth, async (req, res) => {
    try {
        const status = await simon.getMultiAgentStatus();
        res.json(status);
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/simon/approve/:action_id', requireAdminAuth, async (req, res) => {
    try {
        const actionId = req.params.id;
        const { execute } = req.body;
        
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/admin/simon/actions/${actionId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ execute })
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        serverError(res, err);
    }
});

app.post('/api/simon/reject/:action_id', requireAdminAuth, async (req, res) => {
    try {
        const actionId = req.params.id;
        const { reason } = req.body;
        
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/admin/simon/actions/${actionId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        serverError(res, err);
    }
});

/* ── Simon Admin Chat (Streaming) ─────────────────────────────────────────────── */

app.get('/api/simon/chat', requireAdminAuth, async (req, res) => {
    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const message = req.query.message || '';
    const conversationId = req.query.conversation_id || Date.now().toString();

    try {
        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', conversation_id: conversationId })}\n\n`);

        // Get Simon's current context
        const systemStatus = await simon.getCompleteSystemStatus();
        
        res.write(`data: ${JSON.stringify({ 
            type: 'context', 
            status: systemStatus,
            timestamp: new Date().toISOString()
        })}\n\n`);

        // Process the message with Simon
        const chatResponse = await processSimonChat(message, systemStatus, conversationId);
        
        // Stream Simon's response
        res.write(`data: ${JSON.stringify({ 
            type: 'response', 
            message: chatResponse.message,
            actions_taken: chatResponse.actions_taken,
            confidence: chatResponse.confidence,
            timestamp: new Date().toISOString()
        })}\n\n`);

        // Send completion message
        res.write(`data: ${JSON.stringify({ type: 'completed', conversation_id: conversationId })}\n\n`);

    } catch (error) {
        console.error('[Simon Chat] Error:', error);
        res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'Chat processing failed',
            timestamp: new Date().toISOString()
        })}\n\n`);
    }

    res.on('close', () => {
        console.log('[Simon Chat] Connection closed');
    });
});

async function processSimonChat(message, systemStatus, conversationId) {
    try {
        const systemPrompt = `You are Simon, the AI intelligence core of Truvornex. You are having a conversation with a human admin. You have full platform context and can run tools during the conversation.

Current platform status: ${JSON.stringify(systemStatus)}

Return JSON:
{
    "message": "your response to the admin",
    "actions_taken": [
        {
            "action": "action performed",
            "result": "action result"
        }
    ],
    "confidence": 0.0-1.0,
    "reasoning": "how you arrived at this response"
}`;

        const aiResponse = await callOpenRouter(systemPrompt, message);
        
        if (!aiResponse) {
            return {
                message: "I'm having difficulty processing your request right now. The AI system appears to be unavailable. Please try again or check the system status.",
                actions_taken: [],
                confidence: 0.3,
                reasoning: 'AI system unavailable'
            };
        }

        // Log the chat interaction
        await writeSimonAction({
            actorId: req.session?.user?.id,
            action: 'simon_chat',
            entity: 'conversation',
            entityId: conversationId,
            payload: { message, response: aiResponse.message },
            ipAddress: req.ip
        });

        return aiResponse;

    } catch (error) {
        console.error('[Simon Chat] Processing error:', error);
        return {
            message: "I encountered an error processing your message. The technical team has been notified.",
            actions_taken: [],
            confidence: 0.2,
            reasoning: 'Processing error occurred'
        };
    }
}

async function callOpenRouter(systemPrompt, userPrompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://truvornex.com',
                'X-Title': 'Truvornex'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-sonnet',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return JSON.parse(data.choices?.[0]?.message?.content || 'null');
    } catch (error) {
        console.error('[Simon Chat] OpenRouter error:', error);
        return null;
    }
}

// ── INTELLIGENCE ROUTES (Part 4) ──────────────────────────────────────────────

app.get('/api/intelligence/zones', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM zone_intelligence ORDER BY health_score DESC');
        res.json({ zones: rows });
    } catch (err) { serverError(res, err); }
});

app.get('/api/intelligence/platform', requireAdminAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM platform_stats');
        res.json(rows[0]);
    } catch (err) { serverError(res, err); }
});

app.get('/api/intelligence/provider/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM provider_intelligence WHERE provider_id = $1', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Provider not found' });
        res.json(rows[0]);
    } catch (err) { serverError(res, err); }
});

app.get('/api/intelligence/trending', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM trending_services_by_zone WHERE ($1::text IS NULL OR zone_id::text = $1) AND rank <= 3 ORDER BY zone_id, rank',
            [req.query.zone_id || null]
        );
        res.json({ trending: rows });
    } catch (err) { serverError(res, err); }
});

app.get('/api/intelligence/financial', requireAdminAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM financial_health');
        res.json(rows[0]);
    } catch (err) { serverError(res, err); }
});

app.get('/api/intelligence/bnpl-eligibility', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM compute_bnpl_eligibility($1)', [req.session.user.id]);
        res.json(rows[0]);
    } catch (err) { serverError(res, err); }
});

// ── NODE.JS SCHEDULED JOBS (pg_cron replacement) ──────────────────────────────

function startScheduledJobs() {
    // Start Simon's multi-agent monitoring system
    startSimonMonitor();
    // Zone health recompute every 15 minutes
    setInterval(async () => {
        try {
            await pool.query(`
                UPDATE neighborhood_zones SET
                    health_score = LEAST(100, GREATEST(0,
                        50
                        + (SELECT COUNT(*) FROM users WHERE zone_id::TEXT = neighborhood_zones.id
                           AND last_seen_at > NOW() - INTERVAL '30 minutes') * 2
                        + (SELECT COUNT(*) FROM bookings WHERE zone_id::TEXT = neighborhood_zones.id
                           AND status = 'completed' AND created_at > NOW() - INTERVAL '7 days') / 5
                        - (SELECT COUNT(*) FROM disputes WHERE zone_id::TEXT = neighborhood_zones.id AND status = 'open') * 5
                        - (SELECT COUNT(*) FROM emergency_requests WHERE zone_id::TEXT = neighborhood_zones.id AND status = 'open') * 3
                    )),
                    demand_index = LEAST(100, (
                        SELECT COUNT(*) * 5 FROM bookings
                        WHERE zone_id::TEXT = neighborhood_zones.id AND created_at > NOW() - INTERVAL '24 hours'
                    )),
                    updated_at = NOW()
            `);
        } catch (e) { console.warn('Zone health recompute failed:', e.message); }
    }, 15 * 60 * 1000);

    // Provider idle detection every hour
    setInterval(async () => {
        try {
            await pool.query(`
                UPDATE providers SET is_available = FALSE
                WHERE user_id IN (
                    SELECT id FROM users WHERE role = 'provider'
                    AND last_seen_at < NOW() - INTERVAL '2 hours'
                ) AND is_available = TRUE
            `);
        } catch (e) { console.warn('Provider idle detection failed:', e.message); }
    }, 60 * 60 * 1000);

    // Simon anomaly detection every 10 minutes
    setInterval(async () => {
        try {
            const anomalies = await simon.detectAnomalies();
            if (anomalies.length > 0) {
                console.log(`Simon detected ${anomalies.length} anomalies`);
            }
        } catch (e) { console.warn('Simon anomaly detection failed:', e.message); }
    }, 10 * 60 * 1000);

    // Idle slots cleanup every hour (offset 30 min)
    setTimeout(() => {
        setInterval(async () => {
            try {
                await pool.query(`UPDATE idle_slots SET status = 'expired' WHERE status = 'open' AND ends_at < NOW()`);
            } catch (e) { console.warn('Idle slots cleanup failed:', e.message); }
        }, 60 * 60 * 1000);
    }, 30 * 60 * 1000);

    // Transaction hold release every minute
    setInterval(async () => {
        try {
            const { rows } = await pool.query(`
                UPDATE transaction_holds 
                SET status = 'released' 
                WHERE status = 'pending' AND release_at <= NOW()
                RETURNING id
            `);
            if (rows.length > 0) {
                console.log(`Released ${rows.length} transaction holds`);
            }
        } catch (e) { console.warn('Transaction hold release failed:', e.message); }
    }, 60 * 1000);

    // ── Daily jobs at midnight ────────────────────────────────────────────────
    const msUntil = (h, m = 0) => {
        const now = new Date();
        const target = new Date(now);
        target.setHours(h, m, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);
        return target.getTime() - now.getTime();
    };

    setTimeout(function runDailyJobs() {
        const today = new Date();

        // Income snapshots refresh (daily midnight)
        pool.query(`
            INSERT INTO income_snapshots (user_id, period, amount_pkr, transaction_count, computed_at)
            SELECT provider_id, '30d', COALESCE(SUM(price_pkr), 0), COUNT(*), NOW()
            FROM bookings WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days'
            GROUP BY provider_id
            ON CONFLICT (user_id, period) DO UPDATE SET
                amount_pkr = EXCLUDED.amount_pkr,
                transaction_count = EXCLUDED.transaction_count,
                computed_at = NOW()
        `).catch(e => console.warn('Income snapshots refresh failed:', e.message));

        // BNPL overdue — notify once per day, deduplicated (daily 9am equivalent)
        pool.query(`
            INSERT INTO notifications (user_id, type, title, body)
            SELECT ba.user_id, 'bnpl_overdue', 'BNPL Payment Overdue',
                'Your installment of PKR ' || ba.installment_amount || ' was due on ' || ba.next_due_date || '. Please pay to avoid default.'
            FROM bnpl_agreements ba
            WHERE ba.status = 'active' AND ba.next_due_date < CURRENT_DATE
              AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.user_id = ba.user_id AND n.type = 'bnpl_overdue'
                  AND n.created_at > NOW() - INTERVAL '20 hours'
              )
        `).catch(e => console.warn('BNPL overdue check failed:', e.message));

        // Weekly trust score full recompute — every Sunday (pg_cron: '0 3 * * 0')
        if (today.getDay() === 0) {
            pool.query(`
                SELECT recompute_trust_score(id) FROM users WHERE role = 'provider'
            `).catch(e => console.warn('Weekly trust recompute failed:', e.message));
        }

        // Monthly committee defaulter notifications — 1st of month (pg_cron: '0 10 1 * *')
        if (today.getDate() === 1) {
            pool.query(`
                INSERT INTO notifications (user_id, type, title, body)
                SELECT cm.user_id, 'committee_missed', 'Committee Contribution Due',
                    'Your committee contribution is due. Missing payments affect your trust score.'
                FROM committee_members cm
                JOIN committees c ON c.id = cm.committee_id
                WHERE c.status = 'active' AND cm.contributed_rounds < c.current_round
                  AND NOT EXISTS (
                    SELECT 1 FROM notifications n
                    WHERE n.user_id = cm.user_id AND n.type = 'committee_missed'
                      AND n.created_at > NOW() - INTERVAL '20 days'
                  )
            `).catch(e => console.warn('Committee defaulter check failed:', e.message));
        }

        setTimeout(runDailyJobs, 24 * 60 * 60 * 1000);
    }, msUntil(0, 0)); // midnight

    console.log('Scheduled intelligence jobs started (7 jobs active)');
}

// ── Global error handler — catches any error thrown via next(err) or unhandled
// promise rejections that reach Express. Never leaks internals in production.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('[UNHANDLED]', err);
    if (res.headersSent) return;
    res.status(err.status || 500).json({
        error: isProd ? 'An internal server error occurred' : (err.message || 'Unknown error'),
    });
});

if (isProd) {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get(/{*path}/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    checkRequiredEnvVars();
    initDb().then(() => {
        startScheduledJobs();
        app.listen(PORT, '0.0.0.0', () => console.log(`Truvornex running on port ${PORT}`));
    });
} else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    checkRequiredEnvVars();
    initDb().then(() => {
        startScheduledJobs();
        app.listen(PORT, '0.0.0.0', () => console.log(`Truvornex dev server running on port ${PORT}`));
    });
}
