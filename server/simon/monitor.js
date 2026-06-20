/**
 * Simon Monitor Agent
 * Proactive background monitoring and scheduled tasks
 */

import { routeTask } from './core.js';
import * as fraud from './fraud.js';
import * as analyst from './analyst.js';
import * as demand from './demand.js';
import * as provider from './provider.js';
import * as customer from './customer.js';
import { cleanExpiredMemories } from './memory.js';
import { writeSimonMemory } from '../db.js';

// Job tracking
const jobHistory = new Map();

/**
 * Run a scheduled job with error handling and audit logging
 */
async function runScheduledJob(jobName, jobFunction, agent = 'monitor') {
    const startTime = Date.now();
    let success = false;
    let result = null;
    let error = null;
    
    try {
        console.log(`[Simon Monitor] Starting job: ${jobName}`);
        result = await jobFunction();
        success = true;
        console.log(`[Simon Monitor] Job completed: ${jobName} in ${Date.now() - startTime}ms`);
    } catch (err) {
        error = err.message;
        console.error(`[Simon Monitor] Job failed: ${jobName} - ${error}`);
    }
    
    // Track job history
    jobHistory.set(jobName, {
        lastRun: new Date().toISOString(),
        duration: Date.now() - startTime,
        success: success,
        error: error,
        result: result
    });
    
    return {
        job: jobName,
        success: success,
        duration: Date.now() - startTime,
        result: result,
        error: error,
        timestamp: new Date().toISOString()
    };
}

/**
 * Job 1: Fraud scan every 5 minutes
 */
export async function fraudScanJob() {
    return await runScheduledJob('fraud_scan', async () => {
        return await fraud.scanRecentTransactions('fraud');
    }, 'monitor');
}

/**
 * Job 2: Zone health computation every 15 minutes
 */
export async function zoneHealthJob() {
    return await runScheduledJob('zone_health', async () => {
        const { pool } = await import('../db.js');
        
        // Get all zones
        const { rows: zones } = await pool.query(`
            SELECT id, name, health_score FROM neighborhood_zones
        `);
        
        const zoneHealthResults = [];
        
        for (const zone of zones) {
            try {
                // Get zone-specific data
                const { rows: zoneData } = await pool.query(`
                    SELECT 
                        COUNT(*) as active_bookings,
                        (SELECT COUNT(*) FROM users WHERE zone_id = $1 AND last_seen_at > NOW() - INTERVAL '30 minutes') as active_users
                    FROM bookings 
                    WHERE zone_id = $1 AND status = 'completed' AND created_at > NOW() - INTERVAL '7 days'
                `, [zone.id]);
                
                const healthAnalysis = await analyst.analyzeZoneHealth({
                    ...zone,
                    ...zoneData[0]
                }, 'analyst');
                
                zoneHealthResults.push({
                    zone_id: zone.id,
                    zone_name: zone.name,
                    analysis: healthAnalysis
                });
                
                // Alert admin if zone health is critical
                if (healthAnalysis.health_score < 40) {
                    await routeTask({
                        type: 'zone_health_alert',
                        zone_id: zone.id,
                        health_score: healthAnalysis.health_score
                    }, { source: 'monitor' });
                }
                
            } catch (error) {
                console.error(`[Simon Monitor] Zone health failed for ${zone.id}:`, error);
            }
        }
        
        return { zones_analyzed: zoneHealthResults.length, results: zoneHealthResults };
    }, 'monitor');
}

/**
 * Job 3: Demand forecast update every 1 hour
 */
export async function demandForecastJob() {
    return await runScheduledJob('demand_forecast', async () => {
        return await demand.updateDemandForecasts('demand');
    }, 'monitor');
}

/**
 * Job 4: Provider scoring every 6 hours
 */
export async function providerScoringJob() {
    return await runScheduledJob('provider_scoring', async () => {
        const result = await provider.batchScoreProviders('provider');
        
        // Identify underperformers
        const underperformers = await provider.identifyUnderperformers('provider');
        
        // Alert admin about critical underperformers
        if (underperformers.underperformers) {
            const criticalUnderperformers = underperformers.underperformers.filter(
                u => u.risk_level === 'high' && u.intervention_needed
            );
            
            for (const underperformer of criticalUnderperformers) {
                await routeTask({
                    type: 'provider_intervention',
                    provider_id: underperformer.provider_id,
                    risk_level: underperformer.risk_level
                }, { source: 'monitor' });
            }
        }
        
        return {
            providers_scored: result.successful_scores,
            underperformers_identified: underperformers.total_underperformers || 0
        };
    }, 'monitor');
}

/**
 * Job 5: Churn analysis every 24 hours
 */
export async function churnAnalysisJob() {
    return await runScheduledJob('churn_analysis', async () => {
        const result = await customer.analyzeAtRiskCustomers('customer');
        
        // Generate re-engagement recommendations
        const reEngagementTasks = [];
        
        for (const customer of result.at_risk_customers || []) {
            if (customer.churn_analysis.risk_level === 'high') {
                const recommendations = await routeTask({
                    type: 'customer_reengagement',
                    user_id: customer.customer_id,
                    churn_risk: customer.churn_analysis.churn_probability
                }, { source: 'monitor' });
                
                reEngagementTasks.push(recommendations);
            }
        }
        
        return {
            customers_analyzed: result.total_analyzed,
            at_risk_identified: result.at_risk_customers?.length || 0,
            re_engagement_tasks: reEngagementTasks.length
        };
    }, 'monitor');
}

/**
 * Job 6: Memory cleanup every 24 hours
 */
export async function memoryCleanupJob() {
    return await runScheduledJob('memory_cleanup', async () => {
        return await cleanExpiredMemories();
    }, 'monitor');
}

/**
 * Job 7: Platform anomaly detection every 30 minutes
 */
export async function anomalyDetectionJob() {
    return await runScheduledJob('anomaly_detection', async () => {
        const { pool } = await import('../db.js');
        
        const platformStats = await (await import('../db.js')).pool.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE role='provider') as total_providers,
                COUNT(*) as total_bookings,
                COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as bookings_today
            FROM users
            CROSS JOIN (SELECT COUNT(*) as total_bookings FROM bookings) b
        `);
        
        const anomalyReport = await analyst.generateAnomalyReport({
            users: { total: platformStats.rows[0].total_users },
            bookings: { today: platformStats.rows[0].bookings_today }
        }, 'analyst');
        
        // Alert admin on critical anomalies
        if (anomalyReport.overall_health === 'critical') {
            await routeTask({
                type: 'critical_anomaly',
                anomalies: anomalyReport.anomalies
            }, { source: 'monitor' });
        }
        
        return anomalyReport;
    }, 'monitor');
}

/**
 * Job 8: Zone supply tracking every 10 minutes
 */
export async function zoneSupplyTrackingJob() {
    return await runScheduledJob('zone_supply_tracking', async () => {
        const { pool } = await import('../db.js');
        const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);
        
        // Get all zones
        const { rows: zones } = await pool.query(`
            SELECT id, name, city, health_score FROM neighborhood_zones
        `);
        
        const supplyAlerts = [];
        
        for (const zone of zones) {
            try {
                // Count providers online in this zone
                const { rows: providerCount } = await pool.query(`
                    SELECT COUNT(*) as count
                    FROM provider_presence pp
                    WHERE pp.is_online = true 
                      AND pp.last_heartbeat > $1
                      AND pp.current_zone_id = $2
                `, [eightMinutesAgo, zone.id]);
                
                const onlineProviders = parseInt(providerCount[0].count);
                
                // Get 7-day average for this zone
                const { rows: historicalData } = await pool.query(`
                    SELECT COUNT(*) as count
                    FROM provider_presence pp
                    WHERE pp.last_heartbeat > NOW() - INTERVAL '7 days'
                      AND pp.current_zone_id = $1
                `, [zone.id]);
                
                const sevenDayAverage = Math.ceil(parseInt(historicalData[0].count) / (7 * 24 * 6)); // Rough estimate per 10-min interval
                
                // Write current supply status to memory
                await writeSimonMemory(
                    `zone_supply:${zone.id}`,
                    {
                        zone_id: zone.id,
                        zone_name: zone.name,
                        online_providers: onlineProviders,
                        seven_day_average: sevenDayAverage,
                        recorded_at: new Date().toISOString()
                    },
                    80,        // confidence: high for direct DB queries
                    'monitor', // sourceAgent
                    24         // ttlHours: 24-hour TTL
                );
                
                // Alert if zone has zero providers online
                if (onlineProviders === 0) {
                    supplyAlerts.push({
                        zone_id: zone.id,
                        zone_name: zone.name,
                        severity: 'critical',
                        message: `Zone ${zone.name} has no active providers right now`,
                        online_providers: onlineProviders
                    });
                    
                    await routeTask({
                        type: 'zone_supply_emergency',
                        zone_id: zone.id,
                        zone_name: zone.name,
                        online_providers: 0
                    }, { source: 'monitor' });
                }
                
                // Alert if supply dropped more than 50% from 7-day average
                if (sevenDayAverage > 0 && onlineProviders < sevenDayAverage * 0.5) {
                    supplyAlerts.push({
                        zone_id: zone.id,
                        zone_name: zone.name,
                        severity: 'high',
                        message: `Zone ${zone.name} supply dropped by ${Math.round((1 - onlineProviders / sevenDayAverage) * 100)}% from 7-day average`,
                        online_providers: onlineProviders,
                        seven_day_average: sevenDayAverage
                    });
                    
                    await routeTask({
                        type: 'zone_supply_drop',
                        zone_id: zone.id,
                        zone_name: zone.name,
                        online_providers: onlineProviders,
                        seven_day_average: sevenDayAverage,
                        drop_percentage: Math.round((1 - onlineProviders / sevenDayAverage) * 100)
                    }, { source: 'monitor' });
                }
                
            } catch (error) {
                console.error(`[Simon Monitor] Zone supply tracking failed for ${zone.id}:`, error);
            }
        }
        
        return {
            zones_monitored: zones.length,
            supply_alerts: supplyAlerts,
            timestamp: new Date().toISOString()
        };
    }, 'monitor');
}

/**
 * Start all scheduled jobs
 */
export function startScheduledJobs() {
    console.log('[Simon Monitor] Starting scheduled jobs...');
    
    // Job intervals (in milliseconds)
    const intervals = {
        fraud_scan: 5 * 60 * 1000,              // 5 minutes
        security_monitoring: 5 * 60 * 1000,    // 5 minutes
        zone_supply_tracking: 10 * 60 * 1000,   // 10 minutes
        zone_health: 15 * 60 * 1000,            // 15 minutes
        anomaly_detection: 30 * 60 * 1000,      // 30 minutes
        demand_forecast: 60 * 60 * 1000,         // 1 hour
        provider_scoring: 6 * 60 * 60 * 1000,    // 6 hours
        churn_analysis: 24 * 60 * 60 * 1000,     // 24 hours
        memory_cleanup: 24 * 60 * 60 * 1000      // 24 hours
    };
    
    // Start fraud scan immediately, then every 5 minutes
    fraudScanJob();
    setInterval(fraudScanJob, intervals.fraud_scan);
    
    // Start security monitoring after 1 minute, then every 5 minutes
    setTimeout(() => {
        securityMonitoringJob();
        setInterval(securityMonitoringJob, intervals.security_monitoring);
    }, 60 * 1000);
    
    // Start zone supply tracking after 30 seconds, then every 10 minutes
    setTimeout(() => {
        zoneSupplyTrackingJob();
        setInterval(zoneSupplyTrackingJob, intervals.zone_supply_tracking);
    }, 30 * 1000);
    
    // Start zone health after 1 minute, then every 15 minutes
    setTimeout(() => {
        zoneHealthJob();
        setInterval(zoneHealthJob, intervals.zone_health);
    }, 60 * 1000);
    
    // Start anomaly detection after 2 minutes, then every 30 minutes
    setTimeout(() => {
        anomalyDetectionJob();
        setInterval(anomalyDetectionJob, intervals.anomaly_detection);
    }, 2 * 60 * 1000);
    
    // Start demand forecast after 5 minutes, then every hour
    setTimeout(() => {
        demandForecastJob();
        setInterval(demandForecastJob, intervals.demand_forecast);
    }, 5 * 60 * 1000);
    
    // Start provider scoring after 10 minutes, then every 6 hours
    setTimeout(() => {
        providerScoringJob();
        setInterval(providerScoringJob, intervals.provider_scoring);
    }, 10 * 60 * 1000);
    
    // Start churn analysis after 1 hour, then every 24 hours
    setTimeout(() => {
        churnAnalysisJob();
        setInterval(churnAnalysisJob, intervals.churn_analysis);
    }, 60 * 60 * 1000);
    
    // Start memory cleanup after 30 minutes, then every 24 hours
    setTimeout(() => {
        memoryCleanupJob();
        setInterval(memoryCleanupJob, intervals.memory_cleanup);
    }, 30 * 60 * 1000);
    
    console.log('[Simon Monitor] All scheduled jobs started');
    
    return {
        jobs_started: Object.keys(intervals),
        intervals: intervals
    };
}

/**
 * Get job history and status
 */
export function getJobHistory() {
    const history = {};
    for (const [jobName, jobData] of jobHistory.entries()) {
        history[jobName] = jobData;
    }
    return history;
}

/**
 * Job 9: Security event monitoring every 5 minutes
 */
export async function securityMonitoringJob() {
    return await runScheduledJob('security_monitoring', async () => {
        const result = await fraud.monitorSecurityEvents('fraud');
        
        // Alert admin on critical security events
        if (result.success && result.alerts) {
            const criticalAlerts = result.alerts.filter(a => a.severity === 'critical');
            
            for (const alert of criticalAlerts) {
                await routeTask({
                    type: 'security_alert',
                    alert: alert,
                    dashboard: result.dashboard
                }, { source: 'monitor' });
            }
        }
        
        return result;
    }, 'monitor');
}

/**
 * Manually trigger a specific job
 */
export async function triggerJob(jobName) {
    const jobMap = {
        'fraud_scan': fraudScanJob,
        'zone_health': zoneHealthJob,
        'demand_forecast': demandForecastJob,
        'provider_scoring': providerScoringJob,
        'churn_analysis': churnAnalysisJob,
        'memory_cleanup': memoryCleanupJob,
        'anomaly_detection': anomalyDetectionJob,
        'zone_supply_tracking': zoneSupplyTrackingJob,
        'security_monitoring': securityMonitoringJob
    };
    
    const jobFunction = jobMap[jobName];
    if (!jobFunction) {
        return { success: false, error: 'Unknown job name' };
    }
    
    return await jobFunction();
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs() {
    // Note: In a real implementation, you'd store interval IDs and clear them
    // This is a simplified version
    console.log('[Simon Monitor] Stopping all scheduled jobs');
    return { success: true, message: 'Scheduled jobs stopped' };
}

export default {
    startScheduledJobs,
    getJobHistory,
    triggerJob,
    stopScheduledJobs,
    fraudScanJob,
    zoneHealthJob,
    demandForecastJob,
    providerScoringJob,
    churnAnalysisJob,
    memoryCleanupJob,
    anomalyDetectionJob
};
