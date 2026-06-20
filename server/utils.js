/**
 * Shared server utilities — imported by all route files.
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Unified 500 error handler.
 * - Always logs the real error server-side.
 * - In production: returns a generic message so DB schema / stack traces
 *   never reach the client.
 * - In development: includes err.message for easier debugging.
 */
export function serverError(res, err, context = '') {
    console.error(`[500]${context ? ' ' + context : ''}`, err);
    res.status(500).json({
        error: isProd ? 'An internal server error occurred' : (err.message || 'Unknown error'),
    });
}

/**
 * Express middleware — requires an active authenticated session.
 * Note: Session binding (IP and User-Agent) is handled in index.js requireAuth
 */
export function requireAuth(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

/**
 * Express middleware — requires an active session AND the admin role.
 * DEPRECATED: Use requireAdmin from security.js instead for enhanced security
 * This version is kept for compatibility with existing code
 * Always check server-side; never trust client-side role claims alone.
 */
export function requireAdmin(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
}

/**
 * Express middleware — requires a system-only request from Simon's internal service context.
 * This is the ONLY way to access financial mutation endpoints directly.
 * User sessions cannot pass this check - Simon must call these endpoints internally.
 */
export function requireSystem(req, res, next) {
    const systemToken = req.headers['x-system-token'];
    const expectedToken = process.env.SIMON_SYSTEM_TOKEN;
    
    if (!systemToken || !expectedToken || systemToken !== expectedToken) {
        return res.status(403).json({ error: 'Forbidden — system-only endpoint' });
    }
    
    next();
}
