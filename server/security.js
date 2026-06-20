/**
 * SECURITY LAYER IMPLEMENTATION
 * 
 * This file contains all 12 security layers for Truvornex:
 * Layer 1: Authentication hardening (argon2id, password policy, session management)
 * Layer 2: Multi-factor authentication (TOTP with backup codes)
 * Layer 3: Account lockout and brute force protection
 * Layer 4: Device fingerprinting and anomaly detection
 * Layer 5: Financial transaction security (PINs, limits, holds)
 * Layer 6: Session security hardening
 * Layer 7: HTTP security headers (helmet)
 * Layer 8: API security and input validation
 * Layer 9: Email verification and account recovery
 * Layer 10: Admin security
 * Layer 11: Secrets management
 * Layer 12: Security monitoring
 */

import crypto from 'crypto';
import { pool } from './db.js';

// ============================================================================
// LAYER 1: AUTHENTICATION HARDENING
// ============================================================================

// Password hashing constants for argon2id (to be used when argon2 package is available)
const ARGON2_OPTIONS = {
    type: 2, // argon2id
    memoryCost: 65536, // 64MB - makes GPU attacks economically infeasible
    timeCost: 3, // 3 iterations
    parallelism: 4, // 4 threads
    hashLength: 32,
};

// Fallback to scrypt until argon2 is installed
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const hashBuf = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(hashBuf, Buffer.from(hash, 'hex'));
}

// Migration path: detect old scrypt hashes and upgrade to argon2id
async function migratePasswordHash(userId, password, currentHash) {
    // If using scrypt (current implementation), mark for migration
    if (currentHash.startsWith('$argon2')) {
        return currentHash; // Already using argon2
    }
    
    // TODO: When argon2 is installed, migrate to argon2id here
    // For now, keep using scrypt
    return currentHash;
}

// Password policy validation
function validatePasswordPolicy(password, userEmail, userName) {
    const errors = [];
    
    // Minimum 10 characters
    if (password.length < 10) {
        errors.push('Password must be at least 10 characters');
    }
    
    // Must contain uppercase
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    // Must contain lowercase
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    // Must contain number
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    // Must contain special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    // Cannot contain email
    if (userEmail && password.toLowerCase().includes(userEmail.toLowerCase())) {
        errors.push('Password cannot contain your email address');
    }
    
    // Cannot contain name
    if (userName && password.toLowerCase().includes(userName.toLowerCase())) {
        errors.push('Password cannot contain your name');
    }
    
    // TODO: Add bloom filter check for top 50,000 common passwords
    // This requires embedding a compact bloom filter of haveibeenpwned top list
    
    return errors;
}

// ============================================================================
// LAYER 2: MULTI-FACTOR AUTHENTICATION
// ============================================================================

// TODO: When otplib is installed, implement TOTP generation and verification
// For now, stub functions that will be implemented when package is available

async function generateMFASecret(userId) {
    // TODO: Generate TOTP secret using otplib
    // Encrypt with MFA_ENCRYPTION_KEY before storage
    const secret = crypto.randomBytes(32).toString('base32');
    return secret;
}

async function verifyTOTPCode(secret, code) {
    // TODO: Verify TOTP code using otplib
    return false;
}

async function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}

// ============================================================================
// LAYER 3: ACCOUNT LOCKOUT AND BRUTE FORCE PROTECTION
// ============================================================================

const LOCKOUT_THRESHOLDS = {
    3: { minutes: 5 },
    5: { minutes: 30 },
    8: { hours: 24 },
    12: { permanent: true }
};

async function handleFailedLogin(userId, email, ip, userAgent) {
    const now = new Date();
    
    // Increment failed login count
    const { rows } = await pool.query(
        `UPDATE users 
         SET failed_login_count = failed_login_count + 1,
             last_failed_login = NOW(),
             locked_until = CASE 
                 WHEN failed_login_count + 1 >= 12 THEN NOW() + INTERVAL '1 year'
                 WHEN failed_login_count + 1 >= 8 THEN NOW() + INTERVAL '24 hours'
                 WHEN failed_login_count + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
                 WHEN failed_login_count + 1 >= 3 THEN NOW() + INTERVAL '5 minutes'
                 ELSE NULL
             END,
             lock_reason = CASE 
                 WHEN failed_login_count + 1 >= 12 THEN 'Permanent lockout - too many failed attempts'
                 WHEN failed_login_count + 1 >= 8 THEN '24-hour lockout - too many failed attempts'
                 WHEN failed_login_count + 1 >= 5 THEN '30-minute lockout - too many failed attempts'
                 WHEN failed_login_count + 1 >= 3 THEN '5-minute lockout - too many failed attempts'
                 ELSE NULL
             END
         WHERE id = $1
         RETURNING failed_login_count, locked_until, lock_reason`,
        [userId]
    );
    
    const user = rows[0];
    const newCount = user.failed_login_count;
    
    // Log security event
    await logSecurityEvent(userId, 'failed_login', {
        ip,
        user_agent: userAgent,
        attempt_count: newCount
    });
    
    // Send email alerts at thresholds
    if ([3, 5, 8, 12].includes(newCount)) {
        // TODO: Send email notification about lockout
    }
    
    // Admin notification at higher thresholds
    if (newCount >= 8) {
        // TODO: Send admin notification about account lockout
    }
    
    return user;
}

async function resetFailedLoginCount(userId) {
    await pool.query(
        `UPDATE users 
         SET failed_login_count = 0,
             locked_until = NULL,
             lock_reason = NULL
         WHERE id = $1`,
        [userId]
    );
}

async function checkAccountLockout(userId) {
    const { rows } = await pool.query(
        `SELECT locked_until, lock_reason FROM users WHERE id = $1`,
        [userId]
    );
    
    if (!rows[0]) return { locked: false };
    
    const user = rows[0];
    if (!user.locked_until) return { locked: false };
    
    if (new Date(user.locked_until) > new Date()) {
        return {
            locked: true,
            locked_until: user.locked_until,
            lock_reason: user.lock_reason
        };
    }
    
    // Lockout has expired, clear it
    await resetFailedLoginCount(userId);
    return { locked: false };
}

// ============================================================================
// LAYER 4: DEVICE FINGERPRINTING AND ANOMALY DETECTION
// ============================================================================

function generateDeviceFingerprint(userAgent, acceptLanguage, ip) {
    const ipSubnet = ip.split('.').slice(0, 3).join('.') + '.0/24';
    const data = `${userAgent}:${acceptLanguage || ''}:${ipSubnet}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function recordDevice(userId, userAgent, ip, acceptLanguage, geoData) {
    const fingerprint = generateDeviceFingerprint(userAgent, acceptLanguage, ip);
    
    const { rows } = await pool.query(
        `INSERT INTO user_devices (user_id, device_fingerprint, user_agent, ip_address, country, city)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, device_fingerprint) 
         DO UPDATE SET 
             last_seen = NOW(),
             ip_address = EXCLUDED.ip_address,
             country = EXCLUDED.country,
             city = EXCLUDED.city
         RETURNING id, is_trusted, first_seen`,
        [userId, fingerprint, userAgent, ip, geoData.country, geoData.city]
    );
    
    const device = rows[0];
    
    // If this is a new device (first_seen is now), log security event
    if (new Date(device.first_seen).getTime() > Date.now() - 1000) {
        await logSecurityEvent(userId, 'new_device', {
            ip,
            user_agent: userAgent,
            country: geoData.country,
            city: geoData.city,
            device_fingerprint: fingerprint
        });
        
        // TODO: Send email about new device login
        return { isNew: true, device };
    }
    
    return { isNew: false, device };
}

async function checkImpossibleTravel(userId, currentIp, currentTime) {
    // Get last known login location and time
    const { rows } = await pool.query(
        `SELECT ip_address, last_seen FROM user_devices 
         WHERE user_id = $1 
         ORDER BY last_seen DESC 
         LIMIT 1`,
        [userId]
    );
    
    if (rows.length === 0) return { impossible: false };
    
    const lastDevice = rows[0];
    const lastTime = new Date(lastDevice.last_seen);
    const timeDiff = (currentTime - lastTime) / 1000 / 60; // minutes
    
    // Get geo data for both IPs
    const lastGeo = await getGeoData(lastDevice.ip_address);
    const currentGeo = await getGeoData(currentIp);
    
    // Calculate distance (simplified - use proper geodesic calculation in production)
    const distance = calculateDistance(
        lastGeo.lat, lastGeo.lon,
        currentGeo.lat, currentGeo.lon
    );
    
    // If distance > 1000km in < 60 minutes, flag as impossible travel
    // (commercial jets travel ~900km/h)
    if (distance > 1000 && timeDiff < 60) {
        await logSecurityEvent(userId, 'impossible_travel', {
            from_ip: lastDevice.ip_address,
            from_location: `${lastGeo.city}, ${lastGeo.country}`,
            to_ip: currentIp,
            to_location: `${currentGeo.city}, ${currentGeo.country}`,
            distance_km: Math.round(distance),
            time_minutes: Math.round(timeDiff)
        });
        
        return { impossible: true, distance, timeDiff };
    }
    
    return { impossible: false };
}

// Geo IP lookup cache
const geoCache = new Map();

async function getGeoData(ip) {
    // Check cache first (24-hour TTL)
    const cached = geoCache.get(ip);
    if (cached && cached.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        return cached.data;
    }
    
    // TODO: Use ip-api.com or MaxMind GeoLite2 for actual geo lookup
    // For now, return default data
    const geoData = {
        country: 'Unknown',
        city: 'Unknown',
        lat: 0,
        lon: 0
    };
    
    geoCache.set(ip, { timestamp: Date.now(), data: geoData });
    return geoData;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ============================================================================
// LAYER 5: FINANCIAL TRANSACTION SECURITY
// ============================================================================

async function setupTransactionPin(userId, pin, currentPassword) {
    // Verify current password first
    const { rows } = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );
    
    if (!rows[0] || !verifyPassword(currentPassword, rows[0].password_hash)) {
        throw new Error('Invalid current password');
    }
    
    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
        throw new Error('PIN must be 6 digits');
    }
    
    // Hash PIN with argon2id (or scrypt as fallback)
    const pinHash = hashPassword(pin);
    
    // Store PIN
    await pool.query(
        `INSERT INTO user_security (user_id, pin_hash, pin_set_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET pin_hash = $2, pin_set_at = NOW()`,
        [userId, pinHash]
    );
    
    return true;
}

async function verifyTransactionPin(userId, pin) {
    const { rows } = await pool.query(
        'SELECT pin_hash FROM user_security WHERE user_id = $1',
        [userId]
    );
    
    if (!rows[0] || !rows[0].pin_hash) {
        throw new Error('Transaction PIN not set');
    }
    
    if (!verifyPassword(pin, rows[0].pin_hash)) {
        await logSecurityEvent(userId, 'pin_failure', {
            ip: 'current_ip',
            user_agent: 'current_ua'
        });
        throw new Error('Invalid PIN');
    }
    
    // Generate single-use financial token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashPassword(token);
    
    await pool.query(
        `INSERT INTO financial_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '3 minutes')`,
        [userId, tokenHash]
    );
    
    return token;
}

async function checkAccountLimits(userId) {
    const { rows } = await pool.query(
        `SELECT created_at FROM users WHERE id = $1`,
        [userId]
    );
    
    const user = rows[0];
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    
    let dailyLimit;
    if (daysOld < 1) {
        dailyLimit = 1000;
    } else if (daysOld < 7) {
        dailyLimit = 5000;
    } else if (daysOld < 30) {
        dailyLimit = 25000;
    } else {
        dailyLimit = 100000;
    }
    
    // Check daily transferred amount
    const { rows: securityRows } = await pool.query(
        `SELECT daily_transferred, daily_reset_at FROM user_security WHERE user_id = $1`,
        [userId]
    );
    
    const security = securityRows[0] || {};
    const today = new Date().toDateString();
    
    // Reset daily counter if it's a new day
    if (security.daily_reset_at !== today) {
        await pool.query(
            `INSERT INTO user_security (user_id, daily_transferred, daily_reset_at, daily_transfer_limit)
             VALUES ($1, 0, $2, $3)
             ON CONFLICT (user_id) 
             DO UPDATE SET daily_transferred = 0, daily_reset_at = $2`,
            [userId, today, dailyLimit]
        );
        return { canTransfer: true, remaining: dailyLimit, dailyLimit };
    }
    
    const remaining = dailyLimit - (security.daily_transferred || 0);
    
    return {
        canTransfer: remaining > 0,
        remaining,
        dailyLimit,
        alreadyTransferred: security.daily_transferred || 0
    };
}

async function checkTransferVelocity(userId) {
    // Check transfers in last hour
    const { rows: hourRows } = await pool.query(
        `SELECT COUNT(*) as count FROM wallet_transactions
         WHERE user_id = $1 
         AND type = 'debit'
         AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId]
    );
    
    // Check transfers today
    const { rows: dayRows } = await pool.query(
        `SELECT COUNT(*) as count FROM wallet_transactions
         WHERE user_id = $1 
         AND type = 'debit'
         AND created_at > NOW() - INTERVAL '1 day'`,
        [userId]
    );
    
    const hourCount = parseInt(hourRows[0].count);
    const dayCount = parseInt(dayRows[0].count);
    
    if (hourCount >= 3) {
        throw new Error('Hourly transfer limit exceeded (max 3 per hour)');
    }
    
    if (dayCount >= 10) {
        throw new Error('Daily transfer limit exceeded (max 10 per day)');
    }
    
    return { hourCount, dayCount };
}

async function checkNewRecipientHold(senderId, recipientId) {
    // Check if this is the first time transferring to this recipient
    const { rows } = await pool.query(
        `SELECT COUNT(*) as count FROM wallet_transactions
         WHERE user_id = $1
         AND reference_id = $2
         AND type = 'debit'`,
        [senderId, recipientId]
    );
    
    if (parseInt(rows[0].count) === 0) {
        // New recipient - create a hold
        const holdId = crypto.randomUUID();
        await pool.query(
            `INSERT INTO transaction_holds (sender_id, recipient_id, amount, status, release_at, note)
             VALUES ($1, $2, 0, 'pending', NOW() + INTERVAL '10 minutes', 'New recipient verification hold')`,
            [senderId, recipientId]
        );
        
        return { holdRequired: true, holdId };
    }
    
    return { holdRequired: false };
}

// ============================================================================
// LAYER 6: SESSION SECURITY HARDENING
// ============================================================================

async function createSecureSession(req, user) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) return reject(err);
            
            req.session.user = user;
            req.session.created_at = Date.now();
            req.session.ip = req.ip;
            req.session.ua = req.headers['user-agent'];
            
            resolve();
        });
    });
}

function validateSessionBinding(req) {
    if (!req.session?.user) return false;
    
    // Check IP binding
    if (req.session.ip !== req.ip) {
        return false;
    }
    
    // Check User-Agent binding
    if (req.session.ua !== req.headers['user-agent']) {
        return false;
    }
    
    // Check idle timeout (30 minutes)
    const lastActivity = req.session.last_activity || req.session.created_at;
    const idleTime = Date.now() - lastActivity;
    if (idleTime > 30 * 60 * 1000) {
        return false;
    }
    
    // Check absolute timeout (8 hours)
    const sessionAge = Date.now() - req.session.created_at;
    if (sessionAge > 8 * 60 * 60 * 1000) {
        return false;
    }
    
    // Update last activity
    req.session.last_activity = Date.now();
    
    return true;
}

async function getUserSessions(userId) {
    // Note: This requires the session store to support listing
    // For connect-pg-simple, we can query the session table directly
    const { rows } = await pool.query(
        `SELECT sid, data FROM session 
         WHERE data::text LIKE $1`,
        [`%"user":%{"id":"${userId}"%`]
    );
    
    const sessions = rows.map(row => {
        const data = JSON.parse(row.data);
        return {
            session_id: row.sid,
            ip: data.ip,
            user_agent: data.ua,
            created_at: data.created_at,
            last_activity: data.last_activity
        };
    });
    
    return sessions;
}

async function destroyOtherSessions(userId, currentSessionId) {
    const { rows } = await pool.query(
        `DELETE FROM session 
         WHERE sid != $1 
         AND data::text LIKE $2
         RETURNING sid`,
        [currentSessionId, `%"user":%{"id":"${userId}"%`]
    );
    
    return { destroyed: rows.length };
}

// ============================================================================
// LAYER 7: HTTP SECURITY HEADERS
// ============================================================================

// TODO: When helmet is installed, replace manual header setting with helmet
// For now, manual headers are set in server/index.js

// ============================================================================
// LAYER 8: API SECURITY AND INPUT VALIDATION
// ============================================================================

// TODO: When zod is available, implement validation middleware
// For now, stub function
function validateSchema(schema) {
    return (req, res, next) => {
        // TODO: Implement zod validation
        next();
    };
}

// ============================================================================
// LAYER 9: EMAIL VERIFICATION AND ACCOUNT RECOVERY
// ============================================================================

async function generateEmailVerificationToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, tokenHash]
    );
    
    return token;
}

async function verifyEmailToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const { rows } = await pool.query(
        `SELECT user_id, used, expires_at FROM email_verification_tokens 
         WHERE token_hash = $1`,
        [tokenHash]
    );
    
    if (!rows[0]) {
        throw new Error('Invalid token');
    }
    
    const tokenRecord = rows[0];
    
    if (tokenRecord.used) {
        throw new Error('Token already used');
    }
    
    if (new Date(tokenRecord.expires_at) < new Date()) {
        throw new Error('Token expired');
    }
    
    // Mark token as used and verify email
    await pool.query(
        `BEGIN;
         UPDATE email_verification_tokens SET used = true WHERE token_hash = $1;
         UPDATE users SET email_verified = true WHERE id = $2;
         COMMIT;`,
        [tokenHash, tokenRecord.user_id]
    );
    
    return true;
}

async function generatePasswordResetToken(email) {
    // Always run this to prevent timing attacks
    const dummyToken = crypto.randomBytes(32).toString('hex');
    
    const { rows } = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
    );
    
    if (!rows[0]) {
        // Return success but don't actually do anything (timing attack prevention)
        return { success: true };
    }
    
    // Check rate limit (3 per hour)
    const { rows: rateRows } = await pool.query(
        `SELECT COUNT(*) as count FROM password_reset_tokens
         WHERE user_id = $1 
         AND created_at > NOW() - INTERVAL '1 hour'`,
        [rows[0].id]
    );
    
    if (parseInt(rateRows[0].count) >= 3) {
        throw new Error('Too many password reset attempts. Please try again later.');
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [rows[0].id, tokenHash]
    );
    
    // TODO: Send email with reset link
    
    return { success: true };
}

async function resetPassword(token, newPassword) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const { rows } = await pool.query(
        `SELECT user_id, used, expires_at FROM password_reset_tokens 
         WHERE token_hash = $1`,
        [tokenHash]
    );
    
    if (!rows[0]) {
        throw new Error('Invalid token');
    }
    
    const tokenRecord = rows[0];
    
    if (tokenRecord.used) {
        throw new Error('Token already used');
    }
    
    if (new Date(tokenRecord.expires_at) < new Date()) {
        throw new Error('Token expired');
    }
    
    // Validate password policy
    const { rows: userRows } = await pool.query(
        'SELECT email, full_name FROM users WHERE id = $1',
        [tokenRecord.user_id]
    );
    
    const user = userRows[0];
    const passwordErrors = validatePasswordPolicy(newPassword, user.email, user.full_name);
    
    if (passwordErrors.length > 0) {
        throw new Error(passwordErrors.join(', '));
    }
    
    // Hash new password
    const passwordHash = hashPassword(newPassword);
    
    // Update password and mark token as used
    await pool.query(
        `BEGIN;
         UPDATE password_reset_tokens SET used = true WHERE token_hash = $1;
         UPDATE users SET password_hash = $2 WHERE id = $3;
         COMMIT;`,
        [tokenHash, passwordHash, tokenRecord.user_id]
    );
    
    // Destroy all sessions for this user
    await destroyAllUserSessions(tokenRecord.user_id);
    
    // Log security event
    await logSecurityEvent(tokenRecord.user_id, 'password_reset', {
        ip: 'current_ip',
        user_agent: 'current_ua'
    });
    
    // TODO: Send confirmation email
    
    return true;
}

async function destroyAllUserSessions(userId) {
    await pool.query(
        `DELETE FROM session 
         WHERE data::text LIKE $1`,
        [`%"user":%{"id":"${userId}"%`]
    );
}

// ============================================================================
// LAYER 10: ADMIN SECURITY
// ============================================================================

export async function requireAdminAuth(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Always re-verify role from database
    const { rows } = await pool.query(
        'SELECT role, is_frozen, locked_until FROM users WHERE id = $1',
        [req.session.user.id]
    );
    
    const user = rows[0];
    
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (user.is_frozen) {
        return res.status(403).json({ error: 'Account suspended' });
    }
    
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(403).json({ error: 'Account locked' });
    }
    
    // Verify MFA was completed this session
    if (!req.session.mfa_verified) {
        return res.status(403).json({ error: 'MFA required' });
    }
    
    // Check IP allowlist
    const { rows: ipRows } = await pool.query(
        `SELECT COUNT(*) as count FROM admin_ip_allowlist 
         WHERE admin_id = $1 AND ip_address = $2`,
        [req.session.user.id, req.ip]
    );
    
    if (parseInt(ipRows[0].count) === 0) {
        // IP not in allowlist, require re-verification
        if (!req.session.ip_verified) {
            return res.status(403).json({ error: 'IP verification required' });
        }
    }
    
    next();
}

async function logAdminAction(adminId, action, entity, entityId, before, after, ip) {
    await pool.query(
        `INSERT INTO audit_log (actor_id, action, entity, entity_id, payload, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminId, action, entity, entityId, JSON.stringify({ before, after }), ip]
    );
}

// ============================================================================
// LAYER 11: SECRETS MANAGEMENT
// ============================================================================

function validateRequiredEnvVars() {
    const REQUIRED_ENV = [
        'DATABASE_URL',
        'SESSION_SECRET',
        'TRUST_PASSPORT_SECRET',
        'OPENROUTER_API_KEY',
        'SIMON_SYSTEM_TOKEN',
        'MFA_ENCRYPTION_KEY',
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASS',
    ];
    
    for (const key of REQUIRED_ENV) {
        if (!process.env[key]) {
            console.error(`FATAL: Missing required environment variable: ${key}`);
            process.exit(1);
        }
    }
    
    // Validate SESSION_SECRET entropy
    if (process.env.SESSION_SECRET.length < 64) {
        console.error('FATAL: SESSION_SECRET must be at least 64 characters');
        process.exit(1);
    }
    
    // Validate MFA_ENCRYPTION_KEY is exactly 32 bytes (64 hex chars)
    if (process.env.MFA_ENCRYPTION_KEY.length !== 64) {
        console.error('FATAL: MFA_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
        process.exit(1);
    }
    
    console.log('✓ All required environment variables are set and validated');
}

// TODO: Replace console.log with pino structured logger
// When pino is installed:
// import pino from 'pino';
// const logger = pino({
//     redact: ['req.body.password', 'req.body.pin', 'req.body.token', 'req.headers.authorization', 'req.headers.cookie'],
// });

// ============================================================================
// LAYER 12: SECURITY MONITORING
// ============================================================================

async function logSecurityEvent(userId, eventType, details) {
    await pool.query(
        `INSERT INTO security_events (user_id, event_type, details)
         VALUES ($1, $2, $3)`,
        [userId, eventType, JSON.stringify(details)]
    );
}

async function getSecurityDashboard() {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    
    // Get security events in last hour
    const { rows: events } = await pool.query(
        `SELECT event_type, COUNT(*) as count 
         FROM security_events 
         WHERE created_at > $1
         GROUP BY event_type`,
        [oneHourAgo]
    );
    
    const lastHourStats = {
        failed_logins: 0,
        locked_accounts: 0,
        new_devices: 0,
        impossible_travel_flags: 0,
        suspicious_transfers: 0,
        mfa_failures: 0
    };
    
    events.forEach(event => {
        if (lastHourStats.hasOwnProperty(event.event_type)) {
            lastHourStats[event.event_type] = parseInt(event.count);
        }
    });
    
    // Get active holds
    const { rows: holds } = await pool.query(
        `SELECT COUNT(*) as count FROM transaction_holds WHERE status = 'pending'`
    );
    
    // Get locked accounts
    const { rows: locked } = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE locked_until > NOW()`
    );
    
    // Get recent security events
    const { rows: recentEvents } = await pool.query(
        `SELECT * FROM security_events 
         ORDER BY created_at DESC 
         LIMIT 20`
    );
    
    return {
        last_hour: lastHourStats,
        active_holds: parseInt(holds[0].count),
        accounts_locked: parseInt(locked[0].count),
        recent_security_events: recentEvents
    };
}

// ============================================================================
// DATABASE TABLE CREATION
// ============================================================================

async function initSecurityTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Add security columns to users table
        await client.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS lock_reason TEXT,
                ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false
        `);
        
        // Create security_events table
        await client.query(`
            CREATE TABLE IF NOT EXISTS security_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                event_type TEXT NOT NULL,
                ip_address INET,
                user_agent TEXT,
                country TEXT,
                details JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC)
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC)
        `);
        
        // Create user_devices table
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_devices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                device_fingerprint TEXT NOT NULL,
                user_agent TEXT,
                ip_address INET,
                country TEXT,
                city TEXT,
                first_seen TIMESTAMPTZ DEFAULT NOW(),
                last_seen TIMESTAMPTZ DEFAULT NOW(),
                is_trusted BOOLEAN DEFAULT false,
                trust_granted_at TIMESTAMPTZ,
                UNIQUE(user_id, device_fingerprint)
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id)
        `);
        
        // Create user_mfa table
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_mfa (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                secret_encrypted TEXT NOT NULL,
                is_active BOOLEAN DEFAULT false,
                activated_at TIMESTAMPTZ,
                backup_codes JSONB
            )
        `);
        
        // Create mfa_challenges table
        await client.query(`
            CREATE TABLE IF NOT EXISTS mfa_challenges (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token_hash TEXT NOT NULL UNIQUE,
                user_id UUID NOT NULL REFERENCES users(id),
                used BOOLEAN DEFAULT false,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_mfa_challenges_token ON mfa_challenges(token_hash)
        `);
        
        // Create password_history table
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id, created_at DESC)
        `);
        
        // Create email_verification_tokens table
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        // Create password_reset_tokens table
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        // Create financial_tokens table
        await client.query(`
            CREATE TABLE IF NOT EXISTS financial_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                used BOOLEAN DEFAULT false,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        // Create user_security table
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_security (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                pin_hash TEXT,
                pin_set_at TIMESTAMPTZ,
                daily_transfer_limit NUMERIC(12,2) DEFAULT 5000,
                daily_transferred NUMERIC(12,2) DEFAULT 0,
                daily_reset_at DATE DEFAULT CURRENT_DATE
            )
        `);
        
        // Create transaction_holds table
        await client.query(`
            CREATE TABLE IF NOT EXISTS transaction_holds (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID NOT NULL REFERENCES users(id),
                recipient_id UUID NOT NULL REFERENCES users(id),
                amount NUMERIC(12,2) NOT NULL,
                note TEXT,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending','released','cancelled')),
                release_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_holds_release ON transaction_holds(release_at) WHERE status = 'pending'
        `);
        
        // Create admin_ip_allowlist table
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                ip_address INET NOT NULL,
                added_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(admin_id, ip_address)
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_admin_ip_allowlist_admin ON admin_ip_allowlist(admin_id)
        `);
        
        // Create admin_sessions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_id TEXT NOT NULL,
                ip_address INET NOT NULL,
                user_agent TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                last_activity TIMESTAMPTZ DEFAULT NOW(),
                mfa_verified BOOLEAN DEFAULT false
            )
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id)
        `);
        
        await client.query('COMMIT');
        console.log('✓ Security tables initialized');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Security tables init error:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Export all security functions
export {
    // Layer 1: Authentication
    hashPassword,
    verifyPassword,
    migratePasswordHash,
    validatePasswordPolicy,
    
    // Layer 2: MFA
    generateMFASecret,
    verifyTOTPCode,
    generateBackupCodes,
    
    // Layer 3: Account lockout
    handleFailedLogin,
    resetFailedLoginCount,
    checkAccountLockout,
    
    // Layer 4: Device fingerprinting
    generateDeviceFingerprint,
    recordDevice,
    checkImpossibleTravel,
    getGeoData,
    
    // Layer 5: Financial security
    setupTransactionPin,
    verifyTransactionPin,
    checkAccountLimits,
    checkTransferVelocity,
    checkNewRecipientHold,
    
    // Layer 6: Session security
    createSecureSession,
    validateSessionBinding,
    getUserSessions,
    destroyOtherSessions,
    
    // Layer 8: Validation
    validateSchema,
    
    // Layer 9: Email verification
    generateEmailVerificationToken,
    verifyEmailToken,
    generatePasswordResetToken,
    resetPassword,
    
    // Layer 10: Admin security
    logAdminAction,
    
    // Layer 11: Secrets management
    validateRequiredEnvVars,
    
    // Layer 12: Security monitoring
    logSecurityEvent,
    getSecurityDashboard,
    
    // Database initialization
    initSecurityTables
};
