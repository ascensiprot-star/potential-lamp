/**
 * Simon Tool Registry
 * Platform tools that Simon can call during his reasoning loop
 * All tool calls are logged to simon_actions for audit trail
 */

import { pool } from '../db.js';
import { writeSimonAction, writeSimonMemory, readSimonMemory } from '../db.js';

/**
 * Query live platform statistics
 */
export async function query_platform_stats() {
    try {
        const [usersResult, providersResult, bookingsResult, disputesResult, walletsResult, zonesResult] = await Promise.all([
            pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE role='provider') as providers, COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '1 hour') as active FROM users`),
            pool.query(`SELECT COUNT(*) as total FROM users WHERE role='provider'`),
            pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today FROM bookings`),
            pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='open') as open FROM disputes`),
            pool.query(`SELECT COALESCE(SUM(balance), 0) as total_balance, COUNT(*) as total_wallets FROM wallets`),
            pool.query(`SELECT id, name, health_score FROM neighborhood_zones ORDER BY health_score DESC`)
        ]);

        return {
            users: usersResult.rows[0],
            providers: providersResult.rows[0].total,
            bookings: bookingsResult.rows[0],
            disputes: disputesResult.rows[0],
            wallets: walletsResult.rows[0],
            zones: zonesResult.rows
        };
    } catch (error) {
        console.error('[Simon Tool] query_platform_stats failed:', error);
        return null;
    }
}

/**
 * Get full user profile
 */
export async function get_user_profile(user_id) {
    try {
        const { rows } = await pool.query(
            `SELECT u.*, w.balance, w.is_frozen, ts.score as trust_score, ts.tier, z.name as zone_name
             FROM users u
             LEFT JOIN wallets w ON w.user_id = u.id
             LEFT JOIN provider_trust_scores ts ON ts.provider_id = u.id
             LEFT JOIN neighborhood_zones z ON z.id = u.zone_id
             WHERE u.id = $1`,
            [user_id]
        );
        
        if (rows.length === 0) return null;
        
        // Get booking history
        const { rows: bookings } = await pool.query(
            `SELECT status, price, created_at FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [user_id]
        );
        
        return {
            ...rows[0],
            recent_bookings: bookings
        };
    } catch (error) {
        console.error('[Simon Tool] get_user_profile failed:', error);
        return null;
    }
}

/**
 * Get provider metrics
 */
export async function get_provider_metrics(provider_id) {
    try {
        const { rows } = await pool.query(
            `SELECT 
                ts.score as trust_score,
                ts.tier,
                ts.completion_rate,
                ts.avg_rating,
                ts.total_completed,
                ts.dispute_free_streak,
                ts.response_time_hours,
                COALESCE(SUM(wt.amount), 0) as earnings_this_month
             FROM provider_trust_scores ts
             LEFT JOIN wallet_transactions wt ON wt.user_id = $1 
                 AND wt.type = 'credit' 
                 AND wt.created_at >= DATE_TRUNC('month', NOW())
             WHERE ts.provider_id = $1`,
            [provider_id]
        );
        
        if (rows.length === 0) return null;
        
        // Get recent bookings for cancellation rate
        const { rows: bookings } = await pool.query(
            `SELECT status, created_at FROM bookings WHERE provider_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [provider_id]
        );
        
        const totalBookings = bookings.length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
        
        return {
            ...rows[0],
            cancellation_rate: cancellationRate,
            total_recent_bookings: totalBookings
        };
    } catch (error) {
        console.error('[Simon Tool] get_provider_metrics failed:', error);
        return null;
    }
}

/**
 * Flag a transaction as suspicious
 */
export async function flag_transaction(transaction_id, reason, risk_score, agent = 'fraud') {
    try {
        const { rows } = await pool.query(
            `UPDATE wallet_transactions SET status = 'flagged' WHERE id = $1 RETURNING *`,
            [transaction_id]
        );
        
        await writeSimonAction({
            agent,
            actionType: 'transaction_flagged',
            toolCalled: 'flag_transaction',
            input: { transaction_id, reason, risk_score },
            output: { flagged: true },
            confidence: risk_score,
            reasoning: reason,
            status: 'completed'
        });
        
        return { success: true, transaction: rows[0] };
    } catch (error) {
        console.error('[Simon Tool] flag_transaction failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Freeze a wallet pending review
 */
export async function freeze_wallet(user_id, reason, confidence, agent = 'fraud') {
    try {
        if (confidence < 85) {
            return { success: false, error: 'Confidence below threshold for wallet freeze', requires_human_approval: true };
        }
        
        const { rows } = await pool.query(
            `UPDATE wallets SET is_frozen = true WHERE user_id = $1 RETURNING *`,
            [user_id]
        );
        
        // Log the action
        await writeSimonAction({
            agent,
            actionType: 'wallet_freeze',
            toolCalled: 'freeze_wallet',
            input: { user_id, reason },
            output: { frozen: true },
            confidence: confidence,
            reasoning: reason,
            status: 'pending_approval'
        });
        
        // Send notification to user
        await pool.query(
            `INSERT INTO notifications(user_id, type, title, body, sent_at) 
             VALUES ($1, 'warning', 'Wallet Frozen', $2, NOW())`,
            [user_id, `Your wallet has been frozen pending review. Reason: ${reason}`]
        );
        
        // Send notification to admins
        const { rows: admins } = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
        for (const admin of admins) {
            await pool.query(
                `INSERT INTO notifications(user_id, type, title, body, sent_at) 
                 VALUES ($1, 'admin_alert', 'Simon Wallet Freeze', $2, NOW())`,
                [admin.id, `Simon froze wallet ${user_id} with confidence ${confidence}%. Reason: ${reason}`]
            );
        }
        
        return { success: true, wallet: rows[0] };
    } catch (error) {
        console.error('[Simon Tool] freeze_wallet failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Escalate a booking to urgent queue
 */
export async function escalate_booking(booking_id, reason, agent = 'responder') {
    try {
        const { rows } = await pool.query(
            `UPDATE bookings SET status = 'urgent' WHERE id = $1 RETURNING *`,
            [booking_id]
        );
        
        // Get booking details for notifications
        const { rows: bookingDetails } = await pool.query(
            `SELECT customer_id, provider_id FROM bookings WHERE id = $1`,
            [booking_id]
        );
        
        if (bookingDetails.length > 0) {
            const booking = bookingDetails[0];
            
            // Notify customer
            await pool.query(
                `INSERT INTO notifications(user_id, type, title, body, sent_at) 
                 VALUES ($1, 'booking_urgent', 'Booking Escalated', $2, NOW())`,
                [booking.customer_id, `Your booking has been escalated to urgent. Reason: ${reason}`]
            );
            
            // Notify provider
            if (booking.provider_id) {
                await pool.query(
                    `INSERT INTO notifications(user_id, type, title, body, sent_at) 
                     VALUES ($1, 'booking_urgent', 'Booking Escalated', $2, NOW())`,
                    [booking.provider_id, `A booking has been escalated to urgent. Reason: ${reason}`]
                );
            }
            
            // Notify admins
            const { rows: admins } = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
            for (const admin of admins) {
                await pool.query(
                    `INSERT INTO notifications(user_id, type, title, body, sent_at) 
                     VALUES ($1, 'admin_alert', 'Booking Escalated', $2, NOW())`,
                    [admin.id, `Simon escalated booking ${booking_id}. Reason: ${reason}`]
                );
            }
        }
        
        await writeSimonAction({
            agent,
            actionType: 'booking_escalated',
            toolCalled: 'escalate_booking',
            input: { booking_id, reason },
            output: { escalated: true },
            confidence: 90,
            reasoning: reason,
            status: 'completed'
        });
        
        return { success: true, booking: rows[0] };
    } catch (error) {
        console.error('[Simon Tool] escalate_booking failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send system notification
 */
export async function send_system_notification(user_id, title, body, type = 'info', agent = 'core') {
    try {
        const { rows } = await pool.query(
            `INSERT INTO notifications(user_id, type, title, body, sent_at) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [user_id, type, title, body]
        );
        
        await writeSimonAction({
            agent,
            actionType: 'notification_sent',
            toolCalled: 'send_system_notification',
            input: { user_id, title, body, type },
            output: { sent: true },
            confidence: 95,
            reasoning: `System notification: ${title}`,
            status: 'completed'
        });
        
        return { success: true, notification: rows[0] };
    } catch (error) {
        console.error('[Simon Tool] send_system_notification failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Write to Simon's memory
 */
export async function write_simon_memory(key, value, ttl_hours = 24, confidence = 80, agent = 'memory') {
    try {
        const result = await writeSimonMemory(key, value, confidence, agent, ttl_hours);
        
        await writeSimonAction({
            agent,
            actionType: 'memory_written',
            toolCalled: 'write_simon_memory',
            input: { key, ttl_hours },
            output: { written: true },
            confidence: confidence,
            reasoning: `Stored memory key: ${key}`,
            status: 'completed'
        });
        
        return { success: true, memory: result };
    } catch (error) {
        console.error('[Simon Tool] write_simon_memory failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Read from Simon's memory
 */
export async function read_simon_memory(key, agent = 'memory') {
    try {
        const result = await readSimonMemory(key);
        
        await writeSimonAction({
            agent,
            actionType: 'memory_read',
            toolCalled: 'read_simon_memory',
            input: { key },
            output: { found: result !== null },
            confidence: 95,
            reasoning: `Read memory key: ${key}`,
            status: 'completed'
        });
        
        return { success: true, memory: result };
    } catch (error) {
        console.error('[Simon Tool] read_simon_memory failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve a payout
 */
export async function approve_payout(payout_id, risk_score, agent = 'fraud') {
    try {
        if (risk_score >= 20) {
            return { success: false, error: 'Risk score too high for auto-approval', requires_human_approval: true };
        }
        
        // This would typically call a payment processor
        // For now, we'll log the approval
        await writeSimonAction({
            agent,
            actionType: 'payout_approved',
            toolCalled: 'approve_payout',
            input: { payout_id, risk_score },
            output: { approved: true },
            confidence: 90,
            reasoning: `Auto-approved payout with risk score ${risk_score}`,
            status: 'completed'
        });
        
        return { success: true, payout_id };
    } catch (error) {
        console.error('[Simon Tool] approve_payout failed:', error);
        return { success: false, error: error.message };
    }
}

// Tool registry
export const TOOL_REGISTRY = {
    query_platform_stats: query_platform_stats,
    get_user_profile: get_user_profile,
    get_provider_metrics: get_provider_metrics,
    flag_transaction: flag_transaction,
    freeze_wallet: freeze_wallet,
    escalate_booking: escalate_booking,
    send_system_notification: send_system_notification,
    write_simon_memory: write_simon_memory,
    read_simon_memory: read_simon_memory,
    approve_payout: approve_payout
};

/**
 * Execute a tool by name
 */
export async function executeTool(toolName, args, agent = 'core') {
    const tool = TOOL_REGISTRY[toolName];
    if (!tool) {
        console.error(`[Simon Tool] Unknown tool: ${toolName}`);
        return { success: false, error: 'Unknown tool' };
    }
    
    return await tool(...args);
}

export default { TOOL_REGISTRY, executeTool };
