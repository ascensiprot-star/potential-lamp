/**
 * Simon Recommender Agent
 * Geographic recommendations based on user location, local supply/demand, and user history
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { executeTool } from './tools.js';

/**
 * Generate personalized provider recommendations with geographic constraints
 */
export async function generateProviderRecommendations(userId, locationContext, agent = 'recommender') {
    try {
        if (!locationContext || !locationContext.lat || !locationContext.lng) {
            return await fallbackRecommendations(userId, null);
        }

        const { pool } = await import('../db.js');
        const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);
        const radiusMeters = (locationContext.radius_km || 25) * 1000;

        // Get user's booking history to avoid recommending services they already use
        const { rows: userHistory } = await pool.query(`
            SELECT DISTINCT p.category_slug
            FROM bookings b
            JOIN providers p ON p.user_id = b.provider_id
            WHERE b.customer_id = $1
            AND b.created_at > NOW() - INTERVAL '30 days'
            LIMIT 5
        `, [userId]);

        const usedCategories = userHistory.map(h => h.category_slug);

        // Get providers online within radius
        const { rows: nearbyProviders } = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                p.business_name,
                p.category_slug,
                p.description,
                p.service_radius_km,
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
                (SELECT AVG(r.rating) FROM reviews r WHERE r.provider_id = p.user_id::text) AS avg_rating
            FROM providers p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN provider_trust_scores pts ON pts.provider_id = p.user_id
            LEFT JOIN provider_presence pp ON pp.provider_id = p.user_id
            WHERE p.status = 'approved'
              AND p.geolocation IS NOT NULL
              AND ST_DWithin(
                  p.geolocation,
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                  $3
              )
              AND pp.is_online = true 
              AND pp.last_heartbeat > $4
            ORDER BY
                pp.is_accepting_jobs DESC,
                pts.score DESC NULLS LAST,
                distance_km ASC
            LIMIT 20
        `, [locationContext.lng, locationContext.lat, radiusMeters, eightMinutesAgo]);

        // Get categories with supply shortfalls
        const { rows: categorySupply } = await pool.query(`
            SELECT p.category_slug, COUNT(*) as available_count
            FROM provider_presence pp
            JOIN providers p ON p.user_id = pp.provider_id
            WHERE pp.is_online = true 
              AND pp.last_heartbeat > $1
              AND p.geolocation IS NOT NULL
              AND ST_DWithin(
                  p.geolocation,
                  ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                  $4
              )
            GROUP BY p.category_slug
            ORDER BY available_count ASC
        `, [eightMinutesAgo, locationContext.lng, locationContext.lat, radiusMeters]);

        // Detect current zone
        const { rows: zones } = await pool.query(`
            SELECT id, name, city, health_score, demand_index
            FROM neighborhood_zones
            WHERE ST_DWithin(
                geolocation,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                radius_meters
            )
            LIMIT 1
        `, [locationContext.lng, locationContext.lat]);

        const currentZone = zones.length > 0 ? zones[0] : null;

        const systemPrompt = `You are Simon's recommendation engine. Generate personalized provider recommendations based on:
1. User's current location (${locationContext.lat}, ${locationContext.lng})
2. Providers actually online and available within 25km radius
3. Categories with supply shortfalls (recommend these to help balance supply/demand)
4. User's booking history (avoid recommending services they already use frequently)
5. Zone health and demand index
6. Provider trust scores, distance, and online status

Every recommendation must be from providers who are:
- Actually online now (heartbeat within 8 minutes)
- Within the user's 25km radius
- Have high trust scores (>60 preferred)
- Accepting jobs

Return JSON:
{
    "recommendations": [
        {
            "provider_id": "provider UUID",
            "provider_name": "business name",
            "category": "service category",
            "distance_km": number,
            "trust_score": number,
            "estimated_response_time_minutes": number,
            "reason_for_recommendation": "why this provider is recommended",
            "supply_shortfall_opportunity": boolean,
            "match_score": 0-100
        }
    ],
    "categories_to_explore": [
        {
            "category": "category name",
            "reason": "why to explore this category",
            "available_providers": number
        }
    ],
    "insight": "overall recommendation strategy",
    "confidence": 0.0-1.0
}`;

        const userPrompt = `User ID: ${userId}
Location: ${locationContext.lat}, ${locationContext.lat}
Radius: ${locationContext.radius_km || 25}km
Current Zone: ${currentZone ? `${currentZone.name} (health: ${currentZone.health_score}, demand: ${currentZone.demand_index})` : 'Unknown'}
Nearby Online Providers: ${JSON.stringify(nearbyProviders.slice(0, 10))}
Categories with Supply Shortfalls: ${JSON.stringify(categorySupply)}
User's Recently Used Categories: ${JSON.stringify(usedCategories)}`;

        const aiResponse = await callAI('analyst', systemPrompt, userPrompt, {
            temperature: 0.4,
            maxTokens: 1200
        });

        if (!aiResponse) {
            return await fallbackRecommendations(userId, nearbyProviders);
        }

        if (!validateAIResponse(aiResponse, ['recommendations'])) {
            return await fallbackRecommendations(userId, nearbyProviders);
        }

        // Store recommendations in memory
        await executeTool('write_simon_memory', [
            `recommendations:${userId}:${locationContext.lat}:${locationContext.lng}`,
            aiResponse,
            1, // 1 hour TTL for recommendations
            calculateConfidence(aiResponse)
        ], agent);

        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent,
            location_context: locationContext,
            generated_at: new Date().toISOString()
        };

    } catch (error) {
        console.error('[Simon Recommender] Recommendation generation failed:', error);
        return await fallbackRecommendations(userId, null);
    }
}

/**
 * Fallback recommendation generation
 */
async function fallbackRecommendations(userId, nearbyProviders) {
    const recommendations = [];
    const categoriesToExplore = [];

    if (nearbyProviders && nearbyProviders.length > 0) {
        // Simple fallback: recommend top 3 online providers by trust score
        for (const provider of nearbyProviders.slice(0, 3)) {
            const responseTime = Math.round(provider.distance_km * 2); // ~2 min per km
            
            recommendations.push({
                provider_id: provider.user_id,
                provider_name: provider.business_name,
                category: provider.category_slug,
                distance_km: provider.distance_km,
                trust_score: provider.trust_score || 50,
                estimated_response_time_minutes: responseTime,
                reason_for_recommendation: `High trust score (${provider.trust_score || 50}) and close proximity (${provider.distance_km}km)`,
                supply_shortfall_opportunity: false,
                match_score: Math.max(0, 100 - provider.distance_km * 2)
            });
        }

        // Group by category
        const categoryMap = {};
        nearbyProviders.forEach(p => {
            if (!categoryMap[p.category_slug]) {
                categoryMap[p.category_slug] = 0;
            }
            categoryMap[p.category_slug]++;
        });

        for (const [category, count] of Object.entries(categoryMap).slice(0, 3)) {
            categoriesToExplore.push({
                category: category,
                reason: `${count} providers available nearby`,
                available_providers: count
            });
        }
    }

    return {
        recommendations: recommendations,
        categories_to_explore: categoriesToExplore,
        insight: 'Fallback recommendations based on proximity and trust score',
        confidence: 50,
        agent: 'recommender',
        generated_at: new Date().toISOString()
    };
}

/**
 * Get location-based service suggestions
 */
export async function getLocationBasedSuggestions(locationContext, agent = 'recommender') {
    try {
        if (!locationContext || !locationContext.lat || !locationContext.lng) {
            return {
                suggestions: [],
                reasoning: 'No location context provided',
                confidence: 0
            };
        }

        const { pool } = await import('../db.js');
        const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000);
        const radiusMeters = (locationContext.radius_km || 25) * 1000;

        // Get available services by category
        const { rows: categoryAvailability } = await pool.query(`
            SELECT p.category_slug, COUNT(*) as available_count,
                   AVG(pts.score) as avg_trust_score
            FROM provider_presence pp
            JOIN providers p ON p.user_id = pp.provider_id
            LEFT JOIN provider_trust_scores pts ON pts.provider_id = p.user_id
            WHERE pp.is_online = true 
              AND pp.is_accepting_jobs = true
              AND pp.last_heartbeat > $1
              AND p.geolocation IS NOT NULL
              AND ST_DWithin(
                  p.geolocation,
                  ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                  $4
              )
            GROUP BY p.category_slug
            HAVING COUNT(*) > 0
            ORDER BY available_count DESC, avg_trust_score DESC
        `, [eightMinutesAgo, locationContext.lng, locationContext.lat, radiusMeters]);

        const suggestions = categoryAvailability.map(cat => ({
            category: cat.category_slug,
            available_providers: parseInt(cat.available_count),
            avg_trust_score: parseFloat(cat.avg_trust_score) || 50,
            reason: `${cat.available_count} providers with average trust score of ${Math.round(cat.avg_trust_score || 50)}`
        }));

        return {
            suggestions: suggestions,
            reasoning: `Based on ${suggestions.length} service categories available within ${locationContext.radius_km || 25}km of current location`,
            confidence: 70,
            location_context: locationContext,
            generated_at: new Date().toISOString()
        };

    } catch (error) {
        console.error('[Simon Recommender] Location suggestions failed:', error);
        return {
            suggestions: [],
            reasoning: 'Failed to generate location-based suggestions',
            confidence: 0
        };
    }
}