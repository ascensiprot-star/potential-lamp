/**
 * Simon Fraud Agent - Updated with New Architecture
 * Real-time fraud and risk detection with fast screening using tiered models
 * Uses instant tier for fast screening, reasoning tier for complex analysis
 * Includes platform context injection, few-shot examples, and instrumentation
 */

import { callAI } from './router.js';
import { executeTool } from './tools.js';
import { getSecurityDashboard } from '../security.js';
import { getPlatformContext } from './context.js';
import { buildFraudDetectionPrompt, EXAMPLES, SCHEMAS } from './prompts.js';
import { thinkThenDecide, requiresChainOfThought } from './reasoning.js';
import { selfCritiqueDecision, requiresSelfCritique, fullSafetyCheck } from './critique.js';
import { requiresEnsemble, smartEnsemble } from './ensemble.js';
import { withInstrumentation } from './instrumentation.js';
import simonCache from './cache.js';

/**
 * Analyze a transaction for fraud signals - Updated with new architecture
 */
export const analyzeTransaction = withInstrumentation(async function(transaction, agent = 'fraud') {
    try {
        // Get platform context for fraud analysis
        const context = transaction.zone_id 
            ? await getPlatformContext(transaction.zone_id, transaction.user_id)
            : null;

        // Check if this transaction amount requires ensemble decision
        const needsEnsemble = requiresEnsemble({
            amount: transaction.amount,
            action: 'fraud_analysis'
        });

        let analysis;
        
        if (needsEnsemble) {
            // High-value transaction - use ensemble decision
            const task = `Analyze this high-value transaction for fraud risk: ${JSON.stringify(transaction)}`;
            const ensembleResult = await smartEnsemble(
                { ...context, transaction },
                task,
                SCHEMAS.fraud_detection
            );
            
            if (ensembleResult && ensembleResult.action !== 'human_review') {
                analysis = ensembleResult;
            } else {
                analysis = await performBasicFraudAnalysis(transaction, context);
            }
        } else {
            // Standard analysis
            analysis = await performBasicFraudAnalysis(transaction, context);
        }

        // Apply safety check for high-stakes decisions
        if (analysis.confidence >= 85 && (analysis.recommendation === 'freeze' || analysis.recommendation === 'flag')) {
            analysis = await fullSafetyCheck(analysis, { ...context, transaction });
        }

        // Take automatic action based on risk level and confidence
        if (analysis.confidence >= 70 && !analysis.human_review_required) {
            if (analysis.risk_level === 'critical' && analysis.recommendation === 'freeze') {
                await executeTool('freeze_wallet', [
                    transaction.user_id,
                    `Critical fraud risk detected: ${analysis.reasoning}`,
                    analysis.confidence
                ], agent);
            } else if (analysis.risk_level === 'high' && analysis.recommendation === 'flag') {
                await executeTool('flag_transaction', [
                    transaction.id,
                    analysis.reasoning,
                    analysis.risk_score
                ], agent);
            }
        }
        
        return analysis;
        
    } catch (error) {
        console.error('[Simon Fraud] Transaction analysis failed:', error);
        return await fallbackTransactionAnalysis(transaction);
    }
}, 'fraud_screening', 400);

/**
 * Perform basic fraud analysis using new prompt architecture
 */
async function performBasicFraudAnalysis(transaction, context) {
    const task = `Analyze this transaction for fraud risk: ${JSON.stringify(transaction)}`;
    const prompt = buildFraudDetectionPrompt(context, task);
    
    // Use instant tier for fast fraud screening
    const aiResponse = await callAI('instant', prompt, '', {
        temperature: 0.1,
        maxTokens: 300
    });
    
    if (!aiResponse) {
        return await fallbackTransactionAnalysis(transaction);
    }
    
    // Validate response structure
    if (!aiResponse.risk_score || !aiResponse.risk_level || !aiResponse.recommendation) {
        return await fallbackTransactionAnalysis(transaction);
    }
    
    return {
        ...aiResponse,
        confidence: aiResponse.confidence || 75,
        agent: 'fraud',
        architecture: 'new'
    };
}

/**
 * Fallback transaction analysis
 */
async function fallbackTransactionAnalysis(transaction) {
    const signals = [];
    let riskScore = 0;
    
    // Velocity check
    if (transaction.velocity_count > 3) {
        signals.push({
            type: 'velocity',
            description: `High transaction velocity: ${transaction.velocity_count} in 10 minutes`,
            severity: 'high'
        });
        riskScore += 30;
    }
    
    // Amount check
    if (transaction.amount > 50000) {
        signals.push({
            type: 'amount',
            description: `Large amount: ${transaction.amount} PKR`,
            severity: 'medium'
        });
        riskScore += 20;
    }
    
    // New account check
    if (transaction.account_age_hours < 24) {
        signals.push({
            type: 'new_account',
            description: `New account: ${transaction.account_age_hours} hours old`,
            severity: 'high'
        });
        riskScore += 25;
    }
    
    // Determine risk level
    let riskLevel = 'low';
    let recommendation = 'approve';
    
    if (riskScore >= 70) {
        riskLevel = 'critical';
        recommendation = 'freeze';
    } else if (riskScore >= 50) {
        riskLevel = 'high';
        recommendation = 'flag';
    } else if (riskScore >= 30) {
        riskLevel = 'medium';
        recommendation = 'investigate';
    }
    
    return {
        risk_score: Math.min(100, riskScore),
        risk_level: riskLevel,
        signals: signals,
        recommendation: recommendation,
        confidence: 55,
        reasoning: 'Fallback rule-based analysis',
        agent: 'fraud'
    };
}

/**
 * Scan recent transactions for fraud patterns - Updated with new architecture
 */
export const scanRecentTransactions = withInstrumentation(async function(agent = 'fraud') {
    try {
        const { pool } = await import('../db.js');
        const { rows } = await pool.query(`
            SELECT wt.*, u.created_at as account_created, 
                   COUNT(*) FILTER (WHERE wt.created_at > NOW() - INTERVAL '10 minutes') OVER (PARTITION BY wt.user_id) as velocity_count
            FROM wallet_transactions wt
            JOIN users u ON u.id = wt.user_id
            WHERE wt.created_at > NOW() - INTERVAL '1 hour'
            AND wt.status = 'completed'
            ORDER BY wt.created_at DESC
        `);
        
        const flaggedTransactions = [];
        
        // Process transactions in parallel for speed
        const analysisPromises = rows.map(async (transaction) => {
            transaction.account_age_hours = (Date.now() - new Date(transaction.account_created).getTime()) / (1000 * 60 * 60);
            return await analyzeTransaction(transaction, agent);
        });
        
        const analyses = await Promise.all(analysisPromises);
        
        for (let i = 0; i < rows.length; i++) {
            const analysis = analyses[i];
            if (analysis.risk_level === 'high' || analysis.risk_level === 'critical') {
                flaggedTransactions.push({
                    transaction: rows[i],
                    analysis: analysis
                });
            }
        }
        
        return {
            success: true,
            scanned: rows.length,
            flagged: flaggedTransactions.length,
            flags: flaggedTransactions,
            architecture: 'new'
        };
        
    } catch (error) {
        console.error('[Simon Fraud] Transaction scan failed:', error);
        return { success: false, error: error.message };
    }
}, 'fraud_batch_scan', 2000);

/**
 * Analyze booking patterns for fraud - Updated with new architecture
 */
export const analyzeBookingPattern = withInstrumentation(async function(bookings, agent = 'fraud') {
    try {
        // Use chain-of-thought for complex pattern analysis
        const context = {
            booking_count: bookings.length,
            time_range: bookings.length > 0 ? {
                start: bookings[bookings.length - 1].created_at,
                end: bookings[0].created_at
            } : null
        };

        const task = `Analyze these ${bookings.length} bookings for fraud patterns: ${JSON.stringify(bookings)}`;
        
        // Use reasoning tier for complex pattern analysis
        if (requiresChainOfThought('booking_pattern_analysis')) {
            const result = await thinkThenDecide(
                context,
                task,
                SCHEMAS.fraud_detection,
                'reasoning'
            );
            
            if (result.decision) {
                return {
                    ...result.decision,
                    confidence: result.confidence,
                    agent: agent,
                    architecture: 'new',
                    used_chain_of_thought: true
                };
            }
        }
        
        // Standard analysis with prompt architecture
        const prompt = buildFraudDetectionPrompt(context, task);
        const aiResponse = await callAI('reasoning', prompt, '', {
            temperature: 0.15,
            maxTokens: 400
        });
        
        if (!aiResponse) {
            return await fallbackBookingPatternAnalysis(bookings);
        }
        
        if (!aiResponse.risk_score || !aiResponse.risk_level) {
            return await fallbackBookingPatternAnalysis(bookings);
        }
        
        return {
            ...aiResponse,
            confidence: aiResponse.confidence || 70,
            agent: agent,
            architecture: 'new'
        };
        
    } catch (error) {
        console.error('[Simon Fraud] Booking pattern analysis failed:', error);
        return await fallbackBookingPatternAnalysis(bookings);
    }
}, 'booking_pattern_analysis', 1500);

/**
 * Fallback booking pattern analysis
 */
async function fallbackBookingPatternAnalysis(bookings) {
    const signals = [];
    let riskScore = 0;
    
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
    const cancellationRate = bookings.length > 0 ? cancelledBookings.length / bookings.length : 0;
    
    if (cancellationRate > 0.5) {
        signals.push({
            type: 'cancellation_pattern',
            description: `High cancellation rate: ${(cancellationRate * 100).toFixed(0)}%`
        });
        riskScore += 30;
    }
    
    // Timing pattern (all bookings at same time)
    if (bookings.length > 3) {
        const times = bookings.map(b => new Date(b.created_at).getHours());
        const uniqueTimes = new Set(times).size;
        if (uniqueTimes === 1) {
            signals.push({
                type: 'suspicious_timing',
                description: 'All bookings at same hour'
            });
            riskScore += 20;
        }
    }
    
    let riskLevel = 'low';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    
    return {
        risk_score: Math.min(100, riskScore),
        risk_level: riskLevel,
        signals: signals,
        confidence: 50,
        recommendation: riskLevel === 'high' ? 'investigate' : 'monitor',
        agent: 'fraud'
    };
}

/**
 * Analyze user behavior for fraud signals
 */
export async function analyzeUserBehavior(userId, agent = 'fraud') {
    try {
        const { pool } = await import('../db.js');
        
        // Get user's transaction and booking history
        const { rows: transactions } = await pool.query(
            `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [userId]
        );
        
        const { rows: bookings } = await pool.query(
            `SELECT * FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [userId]
        );
        
        const systemPrompt = `You are Simon's fraud detection agent. Analyze user behavior for fraud signals. Return JSON:
{
    "risk_score": 0-100,
    "risk_level": "low|medium|high",
    "behavioral_signals": [
        {
            "type": "spike_pattern|geographic_anomaly|device_anomaly",
            "description": "signal description"
        }
    ],
    "confidence": 0.0-1.0,
    "recommendation": "monitor|investigate|flag"
}`;
        
        const userPrompt = `Transactions: ${JSON.stringify(transactions)}\nBookings: ${JSON.stringify(bookings)}`;
        
        const aiResponse = await callAI('fraud', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 500
        });
        
        if (!aiResponse) {
            return await fallbackUserBehaviorAnalysis(transactions, bookings);
        }
        
        if (!validateAIResponse(aiResponse, ['risk_score', 'risk_level'])) {
            return await fallbackUserBehaviorAnalysis(transactions, bookings);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Fraud] User behavior analysis failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fallback user behavior analysis
 */
async function fallbackUserBehaviorAnalysis(transactions, bookings) {
    const signals = [];
    let riskScore = 0;
    
    // Transaction velocity
    if (transactions.length > 10) {
        signals.push({
            type: 'spike_pattern',
            description: 'High transaction volume'
        });
        riskScore += 15;
    }
    
    // Geographic anomaly (would need location data)
    // This is a placeholder for actual geo-analysis
    
    let riskLevel = 'low';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    
    return {
        risk_score: Math.min(100, riskScore),
        risk_level: riskLevel,
        behavioral_signals: signals,
        confidence: 45,
        recommendation: 'monitor',
        agent: 'fraud'
    };
}

/**
 * Monitor security events for fraud patterns
 * This function watches security_events table and alerts on suspicious patterns
 */
export async function monitorSecurityEvents(agent = 'fraud') {
    try {
        const dashboard = await getSecurityDashboard();
        
        const alerts = [];
        
        // Check for failed login spikes
        if (dashboard.last_hour.failed_logins > 20) {
            alerts.push({
                type: 'failed_login_spike',
                severity: 'high',
                count: dashboard.last_hour.failed_logins,
                message: `Unusual spike in failed logins: ${dashboard.last_hour.failed_logins} in last hour`
            });
        }
        
        // Check for account lockout spike
        if (dashboard.last_hour.locked_accounts > 5) {
            alerts.push({
                type: 'lockout_spike',
                severity: 'critical',
                count: dashboard.last_hour.locked_accounts,
                message: `Unusual spike in account lockouts: ${dashboard.last_hour.locked_accounts} in last hour`
            });
        }
        
        // Check for impossible travel flags
        if (dashboard.last_hour.impossible_travel_flags > 0) {
            alerts.push({
                type: 'impossible_travel',
                severity: 'critical',
                count: dashboard.last_hour.impossible_travel_flags,
                message: `Impossible travel detected: ${dashboard.last_hour.impossible_travel_flags} instances`
            });
        }
        
        // Check for new device spikes
        if (dashboard.last_hour.new_devices > 15) {
            alerts.push({
                type: 'new_device_spike',
                severity: 'medium',
                count: dashboard.last_hour.new_devices,
                message: `Unusual spike in new device logins: ${dashboard.last_hour.new_devices} in last hour`
            });
        }
        
        // Check for MFA failures
        if (dashboard.last_hour.mfa_failures > 10) {
            alerts.push({
                type: 'mfa_failure_spike',
                severity: 'high',
                count: dashboard.last_hour.mfa_failures,
                message: `Unusual spike in MFA failures: ${dashboard.last_hour.mfa_failures} in last hour`
            });
        }
        
        // Check for suspicious transfers
        if (dashboard.last_hour.suspicious_transfers > 0) {
            alerts.push({
                type: 'suspicious_transfers',
                severity: 'critical',
                count: dashboard.last_hour.suspicious_transfers,
                message: `Suspicious transfers detected: ${dashboard.last_hour.suspicious_transfers} in last hour`
            });
        }
        
        // Check for multiple accounts locked from same IP subnet
        if (dashboard.last_hour.locked_accounts > 2) {
            const { pool } = await import('../db.js');
            const { rows } = await pool.query(`
                SELECT COUNT(DISTINCT user_id) as locked_users,
                       SUBSTRING(ip_address::text, 1, strrpos(ip_address::text, '.') + 2) || '0/24' as subnet
                FROM security_events
                WHERE event_type = 'lockout'
                AND created_at > NOW() - INTERVAL '1 hour'
                GROUP BY subnet
                HAVING COUNT(DISTINCT user_id) >= 3
            `);
            
            if (rows.length > 0) {
                alerts.push({
                    type: 'distributed_lockout_attack',
                    severity: 'critical',
                    subnets: rows.map(r => r.subnet),
                    message: `Possible distributed lockout attack from ${rows.length} IP subnets`
                });
            }
        }
        
        return {
            success: true,
            alerts: alerts,
            dashboard: dashboard
        };
        
    } catch (error) {
        console.error('[Simon Fraud] Security event monitoring failed:', error);
        return { success: false, error: error.message };
    }
}

export default {
    analyzeTransaction,
    scanRecentTransactions,
    analyzeBookingPattern,
    analyzeUserBehavior,
    monitorSecurityEvents
};
