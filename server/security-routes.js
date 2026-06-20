/**
 * Security API Endpoints
 * 
 * This router contains all security-related endpoints:
 * - MFA management (setup, verify, challenge, complete, backup codes)
 * - Transaction PIN management (setup, verify)
 * - Session management (list, destroy, destroy all)
 * - Email verification
 * - Password reset (forgot, reset)
 * - Device management
 * - Security monitoring dashboard
 */

import express from 'express';
import { z } from 'zod';
import { requireAuth } from './utils.js';
import {
    generateMFASecret,
    verifyTOTPCode,
    generateBackupCodes,
    setupTransactionPin,
    verifyTransactionPin,
    getUserSessions,
    destroyOtherSessions,
    verifyEmailToken,
    generatePasswordResetToken,
    resetPassword,
    getSecurityDashboard,
    checkAccountLimits,
    logSecurityEvent
} from './security.js';

// Validation middleware
function validate(schema, source = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                issues: result.error.issues.map(i => ({ 
                    field: i.path.join('.'), 
                    message: i.message 
                }))
            });
        }
        req[source] = result.data;
        next();
    };
}

// Validation schemas
const MFASetupSchema = z.object({
    email: z.string().email()
});

const MFAVerifySetupSchema = z.object({
    code: z.string().length(6, 'TOTP code must be 6 digits')
});

const MFAChallengeSchema = z.object({
    email: z.string().email()
});

const MFACompleteSchema = z.object({
    challenge_token: z.string().min(1),
    totp_code: z.string().length(6, 'TOTP code must be 6 digits')
});

const MFABackupSchema = z.object({
    backup_code: z.string().min(1)
});

const PinSetupSchema = z.object({
    pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
    current_password: z.string().min(1)
});

const PinVerifySchema = z.object({
    pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits')
});

const ForgotPasswordSchema = z.object({
    email: z.string().email()
});

const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    new_password: z.string().min(10)
});

const router = express.Router();

// ============================================================================
// MFA ENDPOINTS
// ============================================================================

/**
 * POST /api/security/mfa/setup
 * Generate TOTP secret and QR code for MFA setup
 */
router.post('/mfa/setup', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session.user;
        
        // Generate MFA secret
        const secret = await generateMFASecret(userId);
        
        // TODO: Encrypt secret with MFA_ENCRYPTION_KEY before storage
        // Store in user_mfa table (not yet active)
        
        // Generate QR code URI for authenticator apps
        const qrCodeUri = `otpauth://totp/Truvornex:${req.session.user.email}?secret=${secret}&issuer=Truvornex`;
        
        res.json({
            qr_code_uri: qrCodeUri,
            secret: secret // Only show this once for setup
        });
    } catch (err) {
        console.error('MFA setup error:', err);
        res.status(500).json({ error: 'Failed to setup MFA' });
    }
});

/**
 * POST /api/security/mfa/verify-setup
 * Verify first TOTP code and activate MFA
 */
router.post('/mfa/verify-setup', requireAuth, validate(MFAVerifySetupSchema), async (req, res) => {
    try {
        const { userId } = req.session.user;
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'TOTP code required' });
        }
        
        // TODO: Verify TOTP code using otplib
        // For now, skip verification
        const isValid = true;
        
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid TOTP code' });
        }
        
        // Generate backup codes
        const backupCodes = await generateBackupCodes(10);
        
        // TODO: Hash backup codes with argon2id and store in user_mfa table
        // TODO: Activate MFA in user_mfa table
        
        await logSecurityEvent(userId, 'mfa_enabled', {
            ip: req.ip,
            user_agent: req.headers['user-agent']
        });
        
        res.json({
            success: true,
            backup_codes: backupCodes, // Only show these once
            warning: 'Store these backup codes safely. They will not be shown again.'
        });
    } catch (err) {
        console.error('MFA verify setup error:', err);
        res.status(500).json({ error: 'Failed to verify MFA setup' });
    }
});

/**
 * POST /api/security/mfa/challenge
 * Generate MFA challenge after password login
 */
router.post('/mfa/challenge', validate(MFAChallengeSchema), async (req, res) => {
    try {
        const { email } = req.body;
        
        // TODO: Check if user has MFA enabled
        // TODO: Generate challenge token (JWT) and store in mfa_challenges table
        
        res.json({
            mfa_required: true,
            challenge_token: 'dummy_token' // TODO: Generate real JWT
        });
    } catch (err) {
        console.error('MFA challenge error:', err);
        res.status(500).json({ error: 'Failed to generate MFA challenge' });
    }
});

/**
 * POST /api/security/mfa/complete
 * Complete MFA challenge with TOTP code
 */
router.post('/mfa/complete', validate(MFACompleteSchema), async (req, res) => {
    try {
        const { challenge_token, totp_code } = req.body;
        
        // TODO: Validate challenge token
        // TODO: Verify TOTP code
        // TODO: Mark challenge as used
        // TODO: Create session
        
        res.json({ success: true });
    } catch (err) {
        console.error('MFA complete error:', err);
        res.status(500).json({ error: 'Failed to complete MFA challenge' });
    }
});

/**
 * POST /api/security/mfa/backup
 * Use backup code for MFA
 */
router.post('/mfa/backup', requireAuth, validate(MFABackupSchema), async (req, res) => {
    try {
        const { userId } = req.session.user;
        const { backup_code } = req.body;
        
        if (!backup_code) {
            return res.status(400).json({ error: 'Backup code required' });
        }
        
        // TODO: Verify backup code against hashed codes
        // TODO: Mark code as used
        // TODO: Complete MFA verification
        
        await logSecurityEvent(userId, 'mfa_backup_used', {
            ip: req.ip,
            user_agent: req.headers['user-agent']
        });
        
        res.json({
            success: true,
            warning: 'Backup code used. Consider regenerating your backup codes.'
        });
    } catch (err) {
        console.error('MFA backup error:', err);
        res.status(500).json({ error: 'Failed to use backup code' });
    }
});

// ============================================================================
// TRANSACTION PIN ENDPOINTS
// ============================================================================

/**
 * POST /api/security/pin/setup
 * Set up transaction PIN
 */
router.post('/pin/setup', requireAuth, validate(PinSetupSchema), async (req, res) => {
    try {
        const { userId } = req.session.user;
        const { pin, current_password } = req.body;
        
        if (!pin || !current_password) {
            return res.status(400).json({ error: 'PIN and current password required' });
        }
        
        await setupTransactionPin(userId, pin, current_password);
        
        await logSecurityEvent(userId, 'pin_setup', {
            ip: req.ip,
            user_agent: req.headers['user-agent']
        });
        
        res.json({ success: true });
    } catch (err) {
        if (err.message === 'Invalid current password') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'PIN must be 6 digits') {
            return res.status(400).json({ error: err.message });
        }
        console.error('PIN setup error:', err);
        res.status(500).json({ error: 'Failed to setup PIN' });
    }
});

/**
 * POST /api/security/pin/verify
 * Verify transaction PIN and get financial token
 */
router.post('/pin/verify', requireAuth, validate(PinVerifySchema), async (req, res) => {
    try {
        const { userId } = req.session.user;
        const { pin } = req.body;
        
        if (!pin) {
            return res.status(400).json({ error: 'PIN required' });
        }
        
        const financialToken = await verifyTransactionPin(userId, pin);
        
        res.json({
            success: true,
            financial_token: financialToken,
            expires_in: '3 minutes'
        });
    } catch (err) {
        if (err.message === 'Transaction PIN not set' || err.message === 'Invalid PIN') {
            return res.status(400).json({ error: err.message });
        }
        console.error('PIN verify error:', err);
        res.status(500).json({ error: 'Failed to verify PIN' });
    }
});

// ============================================================================
// SESSION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/security/sessions
 * Get all active sessions for the user
 */
router.get('/sessions', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session.user;
        const sessions = await getUserSessions(userId);
        res.json({ sessions });
    } catch (err) {
        console.error('Get sessions error:', err);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

/**
 * DELETE /api/security/sessions/:sessionId
 * Destroy a specific session
 */
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session.user;
        const { sessionId } = req.params;
        
        // TODO: Implement destroy specific session
        // For now, destroy other sessions
        await destroyOtherSessions(userId, req.sessionID);
        
        await logSecurityEvent(userId, 'session_destroyed', {
            ip: req.ip,
            user_agent: req.headers['user-agent'],
            target_session: sessionId
        });
        
        res.json({ success: true });
    } catch (err) {
        console.error('Destroy session error:', err);
        res.status(500).json({ error: 'Failed to destroy session' });
    }
});

/**
 * DELETE /api/security/sessions
 * Destroy all other sessions (log out everywhere)
 */
router.delete('/sessions', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session.user;
        const result = await destroyOtherSessions(userId, req.sessionID);
        
        await logSecurityEvent(userId, 'all_other_sessions_destroyed', {
            ip: req.ip,
            user_agent: req.headers['user-agent'],
            destroyed_count: result.destroyed
        });
        
        res.json({ 
            success: true,
            destroyed: result.destroyed
        });
    } catch (err) {
        console.error('Destroy all sessions error:', err);
        res.status(500).json({ error: 'Failed to destroy sessions' });
    }
});

// ============================================================================
// EMAIL VERIFICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/security/resend-verification
 * Resend email verification token
 */
router.post('/resend-verification', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session.user;
        
        // TODO: Generate new email verification token
        // TODO: Send verification email
        
        res.json({ success: true });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ error: 'Failed to resend verification' });
    }
});

/**
 * GET /api/security/verify-email/:token
 * Verify email with token
 */
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        await verifyEmailToken(token);
        
        res.json({ success: true });
    } catch (err) {
        if (err.message === 'Invalid token' || err.message === 'Token expired' || err.message === 'Token already used') {
            return res.status(400).json({ error: err.message });
        }
        console.error('Verify email error:', err);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// ============================================================================
// PASSWORD RESET ENDPOINTS
// ============================================================================

/**
 * POST /api/security/forgot-password
 * Initiate password reset flow
 */
router.post('/forgot-password', validate(ForgotPasswordSchema), async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }
        
        await generatePasswordResetToken(email);
        
        // Always return success to prevent email enumeration
        res.json({ 
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (err) {
        if (err.message === 'Too many password reset attempts') {
            return res.status(429).json({ error: err.message });
        }
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to initiate password reset' });
    }
});

/**
 * POST /api/security/reset-password
 * Reset password with token
 */
router.post('/reset-password', validate(ResetPasswordSchema), async (req, res) => {
    try {
        const { token, new_password } = req.body;
        
        if (!token || !new_password) {
            return res.status(400).json({ error: 'Token and new password required' });
        }
        
        await resetPassword(token, new_password);
        
        res.json({ 
            success: true,
            message: 'Password has been reset. Please log in with your new password.'
        });
    } catch (err) {
        if (err.message.includes('token') || err.message.includes('password')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// ============================================================================
// ACCOUNT LIMITS ENDPOINTS
// ============================================================================

/**
 * GET /api/security/account-limits
 * Get account transfer limits
 */
router.get('/account-limits', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session.user;
        const limits = await checkAccountLimits(userId);
        res.json(limits);
    } catch (err) {
        console.error('Get account limits error:', err);
        res.status(500).json({ error: 'Failed to get account limits' });
    }
});

// ============================================================================
// SECURITY MONITORING ENDPOINTS
// ============================================================================

/**
 * GET /api/security/dashboard
 * Get security monitoring dashboard (admin only)
 */
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        // Only admins can access security dashboard
        if (req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const dashboard = await getSecurityDashboard();
        res.json(dashboard);
    } catch (err) {
        console.error('Security dashboard error:', err);
        res.status(500).json({ error: 'Failed to get security dashboard' });
    }
});

export default router;