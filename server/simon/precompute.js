/**
 * Background Precomputation System for Simon Intelligence System
 * The fastest API call is the one that already happened.
 * Simon thinks before you ask - precomputes data for every active zone.
 */

import { pool } from '../db.js';
import simonCache from './cache.js';
import { getPlatformContext } from './context.js';
import { callAI } from './router.js';
import { getAgentKnowledge } from './knowledge.js';

/**
 * Precompute home insights for a zone
 */
async function precomputeHomeInsights(zone) {
  try {
    const prompt = `
${getAgentKnowledge('analyst')}

Generate zone-level home insights for ${zone.name}, ${zone.city}.

Context: This is a shared zone-level insight, not personalized to a specific user.

Return JSON:
{
  "insight": "string - key insight about this zone right now",
  "topServices": ["string - top 3 trending services"],
  "demandLevel": "string (high|moderate|low)",
  "bestBookingTimes": ["string - recommended time slots"],
  "priceTrends": "string - price trend description"
}
`;

    const result = await callAI(
      'fast',
      prompt,
      '',
      { temperature: 0.2, maxTokens: 300, responseFormat: { type: 'json_object' } }
    );

    if (result) {
      simonCache.setByType(
        `home_insights:${zone.id}`,
        result,
        'home_insights_zone'
      );
      console.log(`[Simon Precompute] Home insights precomputed for zone ${zone.id}`);
    }

    return result;

  } catch (error) {
    console.error(`[Simon Precompute] Home insights failed for zone ${zone.id}:`, error.message);
    return null;
  }
}

/**
 * Precompute zone health for a zone
 */
async function precomputeZoneHealth(zone) {
  try {
    const context = await getPlatformContext(zone.id);
    
    const prompt = `
${getAgentKnowledge('analyst')}

Analyze zone health based on current platform data.

ZONE DATA:
${JSON.stringify(context.zone, null, 2)}
SUPPLY DATA:
${JSON.stringify(context.supply, null, 2)}

Return JSON:
{
  "healthScore": "number (0-100)",
  "status": "string (healthy|warning|critical)",
  "strengths": ["string"],
  "concerns": ["string"],
  "recommendation": "string"
}
`;

    const result = await callAI(
      'fast',
      prompt,
      '',
      { temperature: 0.1, maxTokens: 250, responseFormat: { type: 'json_object' } }
    );

    if (result) {
      simonCache.setByType(
        `zone_health:${zone.id}`,
        result,
        'zone_health'
      );
      console.log(`[Simon Precompute] Zone health precomputed for zone ${zone.id}`);
    }

    return result;

  } catch (error) {
    console.error(`[Simon Precompute] Zone health failed for zone ${zone.id}:`, error.message);
    return null;
  }
}

/**
 * Precompute demand forecast for a zone
 */
async function precomputeDemandForecast(zone) {
  try {
    const prompt = `
${getAgentKnowledge('demand')}

Generate 6-hour demand forecast for ${zone.name}, ${zone.city}.

Current time: ${new Date().toISOString()}
Consider seasonal patterns, time of day, and day of week.

Return JSON:
{
  "forecast": [
    {
      "hour": "number (0-23)",
      "expectedDemand": "string (very_high|high|moderate|low)",
      "recommendedProviders": "number",
      "priceSuggestion": "string"
    }
  ],
  "overallTrend": "string (increasing|stable|decreasing)",
  "peakHours": ["number"]
}
`;

    const result = await callAI(
      'reasoning',
      prompt,
      '',
      { temperature: 0.15, maxTokens: 400, responseFormat: { type: 'json_object' } }
    );

    if (result) {
      simonCache.setByType(
        `demand_forecast:${zone.id}`,
        result,
        'demand_forecast'
      );
      console.log(`[Simon Precompute] Demand forecast precomputed for zone ${zone.id}`);
    }

    return result;

  } catch (error) {
    console.error(`[Simon Precompute] Demand forecast failed for zone ${zone.id}:`, error.message);
    return null;
  }
}

/**
 * Precompute trending services for a zone
 */
async function precomputeTrendingServices(zone) {
  try {
    const trendingData = await pool.query(`
      SELECT 
        category,
        COUNT(*) as booking_count,
        AVG(total_amount) as avg_price,
        EXTRACT(HOUR FROM created_at) as peak_hour
      FROM bookings
      WHERE zone_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
        AND status != 'cancelled'
      GROUP BY category, EXTRACT(HOUR FROM created_at)
      ORDER BY booking_count DESC
      LIMIT 10
    `, [zone.id]);

    const result = {
      trending: trendingData.rows.map(row => ({
        category: row.category,
        count: parseInt(row.booking_count),
        avg_price: parseFloat(row.avg_price).toFixed(0),
        peak_hour: parseInt(row.peak_hour)
      })),
      updated: new Date().toISOString()
    };

    simonCache.setByType(
      `trending_services:${zone.id}`,
      result,
      'home_insights_zone'
    );
    
    console.log(`[Simon Precompute] Trending services precomputed for zone ${zone.id}`);
    return result;

  } catch (error) {
    console.error(`[Simon Precompute] Trending services failed for zone ${zone.id}:`, error.message);
    return null;
  }
}

/**
 * Precompute top providers for a zone
 */
async function precomputeTopProviders(zone) {
  try {
    const topProviders = await pool.query(`
      SELECT 
        p.user_id,
        u.name,
        p.category,
        p.rating,
        p.total_jobs,
        pp.is_online,
        pp.last_heartbeat
      FROM providers p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN provider_presence pp ON pp.provider_id = p.user_id
      WHERE p.current_zone_id = $1
        AND p.rating >= 4.0
        AND p.total_jobs >= 10
      ORDER BY p.rating DESC, p.total_jobs DESC
      LIMIT 5
    `, [zone.id]);

    const result = {
      top_providers: topProviders.rows.map(row => ({
        user_id: row.user_id,
        name: row.name,
        category: row.category,
        rating: parseFloat(row.rating).toFixed(1),
        total_jobs: parseInt(row.total_jobs),
        is_online: row.is_online,
        last_heartbeat: row.last_heartbeat
      })),
      updated: new Date().toISOString()
    };

    simonCache.setByType(
      `top_providers:${zone.id}`,
      result,
      'provider_recommendations'
    );
    
    console.log(`[Simon Precompute] Top providers precomputed for zone ${zone.id}`);
    return result;

  } catch (error) {
    console.error(`[Simon Precompute] Top providers failed for zone ${zone.id}:`, error.message);
    return null;
  }
}

/**
 * Precompute all data for a single zone
 */
async function precomputeForZone(zone) {
  const startTime = Date.now();
  console.log(`[Simon Precompute] Starting precomputation for zone ${zone.id} (${zone.name})`);

  try {
    const [insights, health, forecast, trending, providers] = await Promise.all([
      precomputeHomeInsights(zone),
      precomputeZoneHealth(zone),
      precomputeDemandForecast(zone),
      precomputeTrendingServices(zone),
      precomputeTopProviders(zone)
    ]);

    // Store combined precomputed data
    const combinedData = {
      zone_id: zone.id,
      zone_name: zone.name,
      city: zone.city,
      insights,
      health,
      forecast,
      trending,
      providers,
      precomputed_at: new Date().toISOString()
    };

    simonCache.set(
      `precomputed:${zone.id}`,
      combinedData,
      12 * 60 * 1000 // 12 minutes TTL
    );

    const duration = Date.now() - startTime;
    console.log(`[Simon Precompute] Completed for zone ${zone.id} in ${duration}ms`);

    return combinedData;

  } catch (error) {
    console.error(`[Simon Precompute] Failed for zone ${zone.id}:`, error.message);
    return null;
  }
}

/**
 * Precompute for all active zones
 */
async function precomputeForAllZones() {
  const startTime = Date.now();
  console.log('[Simon Precompute] Starting precomputation for all active zones');

  try {
    const zones = await pool.query(`
      SELECT id, name, city, center_lat, center_lng 
      FROM neighborhood_zones 
      WHERE status = 'active'
    `);

    console.log(`[Simon Precompute] Found ${zones.rows.length} active zones`);

    // Process all zones in parallel
    const results = await Promise.allSettled(
      zones.rows.map(zone => precomputeForZone(zone))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const duration = Date.now() - startTime;
    console.log(`[Simon Precompute] All zones completed: ${successful} success, ${failed} failed in ${duration}ms`);

    // Update cache stats
    const stats = simonCache.getStats();
    console.log('[Simon Precompute] Cache stats:', stats);

    return {
      total_zones: zones.rows.length,
      successful,
      failed,
      duration,
      cache_stats: stats
    };

  } catch (error) {
    console.error('[Simon Precompute] All zones precomputation failed:', error.message);
    return null;
  }
}

/**
 * Get precomputed data for a zone (returns cached if available)
 */
async function getPrecomputedData(zone_id) {
  // Try cache first
  const cached = simonCache.get(`precomputed:${zone_id}`, 12 * 60 * 1000);
  if (cached) {
    console.log(`[Simon Precompute] Returning cached data for zone ${zone_id}`);
    return cached;
  }

  // Cache miss - trigger immediate precompute for this zone
  console.log(`[Simon Precompute] Cache miss for zone ${zone_id}, triggering immediate precompute`);
  
  try {
    const zone = await pool.query(`
      SELECT id, name, city, center_lat, center_lng 
      FROM neighborhood_zones 
      WHERE id = $1 AND status = 'active'
    `, [zone_id]);

    if (zone.rows.length === 0) {
      console.warn(`[Simon Precompute] Zone ${zone_id} not found or inactive`);
      return null;
    }

    return await precomputeForZone(zone.rows[0]);

  } catch (error) {
    console.error(`[Simon Precompute] Immediate precompute failed for zone ${zone_id}:`, error.message);
    return null;
  }
}

/**
 * Start background precomputation scheduler
 */
let precomputeInterval = null;

export function startPrecomputeScheduler(intervalMinutes = 10) {
  if (precomputeInterval) {
    console.log('[Simon Precompute] Scheduler already running');
    return;
  }

  console.log(`[Simon Precompute] Starting scheduler with ${intervalMinutes} minute interval`);

  // Run immediately on startup
  precomputeForAllZones();

  // Schedule recurring runs
  precomputeInterval = setInterval(() => {
    precomputeForAllZones();
  }, intervalMinutes * 60 * 1000);

  console.log('[Simon Precompute] Scheduler started successfully');
}

/**
 * Stop background precomputation scheduler
 */
export function stopPrecomputeScheduler() {
  if (precomputeInterval) {
    clearInterval(precomputeInterval);
    precomputeInterval = null;
    console.log('[Simon Precompute] Scheduler stopped');
  }
}

/**
 * Get precompute status
 */
export function getPrecomputeStatus() {
  const stats = simonCache.getStats();
  return {
    scheduler_running: !!precomputeInterval,
    cache_stats: stats
  };
}

export default {
  precomputeForAllZones,
  precomputeForZone,
  getPrecomputedData,
  startPrecomputeScheduler,
  stopPrecomputeScheduler,
  getPrecomputeStatus
};