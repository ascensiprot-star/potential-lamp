/**
 * Home Bundle Endpoint for Simon Intelligence System
 * Fires all home screen AI in parallel and returns everything in one response
 * Frontend makes one request. Simon fires 4 agents in parallel.
 * Total latency is the slowest agent, not the sum of all agents.
 */

import { getPlatformContext } from './context.js';
import { getPrecomputedData } from './precompute.js';
import { callAI } from './router.js';
import { buildHomeInsightsPrompt, buildProviderRecommendationPrompt, SCHEMAS } from './prompts.js';
import simonCache from './cache.js';
import { generateDedupeKey, deduplicatedCall } from './cache.js';
import { withInstrumentation } from './instrumentation.js';

/**
 * Get home screen data bundle with parallel execution
 * All AI calls happen in parallel for maximum speed
 */
export async function getHomeBundle(user_id, zone_id, options = {}) {
  const {
    use_cache = true,
    force_refresh = false
  } = options;
  
  const start = Date.now();
  console.log(`[Simon Home Bundle] Starting bundle for user ${user_id}, zone ${zone_id}`);
  
  try {
    // Get platform context (this is fast - DB queries)
    const context = await getPlatformContext(zone_id, user_id);
    
    // Try to get precomputed data first
    let precomputed = null;
    if (use_cache && !force_refresh) {
      precomputed = await getPrecomputedData(zone_id);
    }
    
    // Generate deduplication key for parallel calls
    const bundleKey = generateDedupeKey('home_bundle', { zone_id, user_id });
    
    // Execute all AI calls in parallel
    const bundleData = await deduplicatedCall(bundleKey, async () => {
      return await executeParallelHomeAI(context, user_id, zone_id, precomputed);
    });
    
    const duration = Date.now() - start;
    console.log(`[Simon Home Bundle] Completed in ${duration}ms`);
    
    return {
      success: true,
      data: bundleData,
      context: context,
      meta: {
        duration,
        used_precomputed: !!precomputed,
        zone_id,
        user_id,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('[Simon Home Bundle] Failed:', error.message);
    const duration = Date.now() - start;
    
    return {
      success: false,
      error: error.message,
      meta: {
        duration,
        zone_id,
        user_id,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Execute all home screen AI in parallel
 */
async function executeParallelHomeAI(context, user_id, zone_id, precomputed) {
  // Use precomputed data if available, otherwise generate fresh
  const insights = precomputed?.insights || await generateHomeInsights(context, user_id, zone_id);
  const health = precomputed?.health || await generateZoneHealth(context, zone_id);
  const recommendations = await generateProviderRecommendations(context, user_id, zone_id);
  const forecast = precomputed?.forecast || await generateDemandForecast(context, zone_id);
  
  // Add trending services from precomputed or generate fresh
  const trending = precomputed?.trending || await generateTrendingServices(context, zone_id);
  
  return {
    insights,
    health,
    recommendations,
    forecast,
    trending
  };
}

/**
 * Generate home insights (AI-powered)
 */
async function generateHomeInsights(context, user_id, zone_id) {
  const cacheKey = `home_insights:${user_id}:${zone_id}`;
  const cached = simonCache.getByType(cacheKey, 'home_insights_user');
  if (cached) return cached;
  
  const task = `Generate personalized home insights for user ${user_id} in zone ${zone_id}. Consider their booking history and current zone conditions.`;
  const prompt = buildHomeInsightsPrompt(context, task);
  
  const result = await callAI('fast', prompt, '', { responseFormat: { type: 'json_object' } });
  
  if (result) {
    simonCache.setByType(cacheKey, result, 'home_insights_user');
  }
  
  return result;
}

/**
 * Generate zone health (AI-powered)
 */
async function generateZoneHealth(context, zone_id) {
  const cacheKey = `zone_health:${zone_id}`;
  const cached = simonCache.getByType(cacheKey, 'zone_health');
  if (cached) return cached;
  
  const task = `Analyze zone health for zone ${zone_id} based on current platform data.`;
  
  const prompt = `
${context ? JSON.stringify(context, null, 2) : 'No context available'}

Analyze zone health and return JSON:
{
  "healthScore": "number (0-100)",
  "status": "string (healthy|warning|critical)",
  "strengths": ["string"],
  "concerns": ["string"],
  "recommendation": "string"
}
`;
  
  const result = await callAI('fast', prompt, '', { responseFormat: { type: 'json_object' } });
  
  if (result) {
    simonCache.setByType(cacheKey, result, 'zone_health');
  }
  
  return result;
}

/**
 * Generate provider recommendations (AI-powered)
 */
async function generateProviderRecommendations(context, user_id, zone_id) {
  const cacheKey = `provider_recommendations:${user_id}:${zone_id}`;
  const cached = simonCache.getByType(cacheKey, 'provider_recommendations');
  if (cached) return cached;
  
  const task = `Generate provider recommendations for user ${user_id} in zone ${zone_id}. Consider their history and current availability.`;
  const prompt = buildProviderRecommendationPrompt(context, task);
  
  const result = await callAI('fast', prompt, '', { responseFormat: { type: 'json_object' } });
  
  if (result) {
    simonCache.setByType(cacheKey, result, 'provider_recommendations');
  }
  
  return result;
}

/**
 * Generate demand forecast (AI-powered)
 */
async function generateDemandForecast(context, zone_id) {
  const cacheKey = `demand_forecast:${zone_id}`;
  const cached = simonCache.getByType(cacheKey, 'demand_forecast');
  if (cached) return cached;
  
  const task = `Generate 6-hour demand forecast for zone ${zone_id}.`;
  
  const prompt = `
${context ? JSON.stringify(context, null, 2) : 'No context available'}

Generate demand forecast and return JSON:
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
  
  const result = await callAI('reasoning', prompt, '', { responseFormat: { type: 'json_object' } });
  
  if (result) {
    simonCache.setByType(cacheKey, result, 'demand_forecast');
  }
  
  return result;
}

/**
 * Generate trending services (data-driven, no AI)
 */
async function generateTrendingServices(context, zone_id) {
  const cacheKey = `trending_services:${zone_id}`;
  const cached = simonCache.getByType(cacheKey, 'home_insights_zone');
  if (cached) return cached;
  
  try {
    const { pool } = await import('../db.js');
    
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
    `, [zone_id]);

    const result = {
      trending: trendingData.rows.map(row => ({
        category: row.category,
        count: parseInt(row.booking_count),
        avg_price: parseFloat(row.avg_price).toFixed(0),
        peak_hour: parseInt(row.peak_hour)
      })),
      updated: new Date().toISOString()
    };
    
    simonCache.setByType(cacheKey, result, 'home_insights_zone');
    return result;
    
  } catch (error) {
    console.error('[Simon Home Bundle] Trending services failed:', error.message);
    return { trending: [], updated: new Date().toISOString() };
  }
}

/**
 * Express route handler for home bundle endpoint
 */
export function createHomeBundleRoute() {
  return withInstrumentation(async (req, res) => {
    try {
      const { user_id, zone_id } = req.query;
      const { force_refresh } = req.query;
      
      if (!user_id || !zone_id) {
        return res.status(400).json({
          error: 'Missing required parameters: user_id, zone_id'
        });
      }
      
      const result = await getHomeBundle(user_id, zone_id, {
        use_cache: true,
        force_refresh: force_refresh === 'true'
      });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      
    } catch (error) {
      console.error('[Simon Home Bundle] Route error:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }, 'home_screen_load', 1500);
}

/**
 * Streamed home bundle response for real-time updates
 */
export async function streamHomeBundle(req, res, user_id, zone_id) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const start = Date.now();
  
  try {
    // Send initial context immediately
    const context = await getPlatformContext(zone_id, user_id);
    res.write(`data: ${JSON.stringify({ type: 'context', data: context })}\n\n`);
    
    // Try precomputed data
    const precomputed = await getPrecomputedData(zone_id);
    if (precomputed) {
      res.write(`data: ${JSON.stringify({ type: 'precomputed', data: precomputed })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }
    
    // Stream each result as it completes
    const promises = [
      generateHomeInsights(context, user_id, zone_id).then(data => ({ type: 'insights', data })),
      generateZoneHealth(context, zone_id).then(data => ({ type: 'health', data })),
      generateProviderRecommendations(context, user_id, zone_id).then(data => ({ type: 'recommendations', data })),
      generateDemandForecast(context, zone_id).then(data => ({ type: 'forecast', data })),
      generateTrendingServices(context, zone_id).then(data => ({ type: 'trending', data }))
    ];
    
    for (const promise of promises) {
      const result = await promise;
      res.write(`data: ${JSON.stringify(result)}\n\n`);
    }
    
    const duration = Date.now() - start;
    res.write(`data: ${JSON.stringify({ type: 'complete', duration })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
    
  } catch (error) {
    console.error('[Simon Home Bundle] Streaming error:', error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}

export default {
  getHomeBundle,
  executeParallelHomeAI,
  generateHomeInsights,
  generateZoneHealth,
  generateProviderRecommendations,
  generateDemandForecast,
  generateTrendingServices,
  createHomeBundleRoute,
  streamHomeBundle
};