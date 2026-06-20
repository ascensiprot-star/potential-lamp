/**
 * Simon Provider Agent
 * Provider scoring, reliability analysis, performance tracking, coaching tips
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { executeTool } from './tools.js';

/**
 * Score a provider on multiple dimensions with location awareness
 */
export async function scoreProvider(providerId, agent = 'provider', locationContext = null) {
    try {
        const providerMetrics = await executeTool('get_provider_metrics', [providerId], agent);
        
        if (!providerMetrics || !providerMetrics.success) {
            return await fallbackProviderScore(providerId, locationContext);
        }
        
        const locationContextStr = locationContext 
            ? `Location Context: User is at coordinates (${locationContext.lat}, ${locationContext.lng}). Provider scoring should consider geographic proximity and performance within the user's 25km radius. Include distance-based factors in the analysis.`
            : 'Location Context: No specific user location provided. Score based on overall performance.';
        
        const systemPrompt = `You are Simon's provider scoring agent. Analyze provider metrics and generate comprehensive score. ${locationContextStr} Return JSON:
{
    "overall_score": 0-100,
    "tier": "champion|trusted|verified|rising|new|at_risk",
    "dimensions": {
        "reliability": {"score": 0-100, "weight": 0.25, "factors": ["factor1", "factor2"]},
        "quality": {"score": 0-100, "weight": 0.25, "factors": ["factor1", "factor2"]},
        "responsiveness": {"score": 0-100, "weight": 0.2, "factors": ["factor1", "factor2"]},
        "professionalism": {"score": 0-100, "weight": 0.15, "factors": ["factor1", "factor2"]},
        "growth": {"score": 0-100, "weight": 0.15, "factors": ["factor1", "factor2"]}
    },
    "strengths": ["strength1", "strength2"],
    "improvement_areas": ["area1", "area2"],
    "coaching_tips": [
        {
            "category": "improvement category",
            "tip": "actionable advice",
            "priority": "high|medium|low",
            "expected_impact": "expected outcome"
        }
    ],
    "confidence": 0.0-1.0,
    "reasoning": "score breakdown"
}`;
        
        const locationInfo = locationContext 
            ? `\nUser Location: ${locationContext.lat}, ${locationContext.lng}\nDistance from user: ${locationContext.distance_km || 'Unknown'} km`
            : '';
        
        const userPrompt = `Provider metrics: ${JSON.stringify(providerMetrics)}${locationInfo}`;
        
        const aiResponse = await callAI('provider', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 1000
        });
        
        if (!aiResponse) {
            return await fallbackProviderScore(providerId);
        }
        
        if (!validateAIResponse(aiResponse, ['overall_score', 'tier'])) {
            return await fallbackProviderScore(providerId);
        }
        
        // Store score in memory
        await executeTool('write_simon_memory', [
            `provider_score:${providerId}`,
            aiResponse,
            24,
            calculateConfidence(aiResponse)
        ], agent);
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent,
            provider_id: providerId
        };
        
    } catch (error) {
        console.error('[Simon Provider] Provider scoring failed:', error);
        return await fallbackProviderScore(providerId);
    }
}

/**
 * Fallback provider scoring with location awareness
 */
async function fallbackProviderScore(providerId, locationContext = null) {
    try {
        const { pool } = await import('../db.js');
        
        const { rows } = await pool.query(
            `SELECT ts.* FROM provider_trust_scores ts WHERE ts.provider_id = $1`,
            [providerId]
        );
        
        if (rows.length === 0) {
            return {
                overall_score: 50,
                tier: 'new',
                dimensions: {
                    reliability: { score: 50, weight: 0.25, factors: ['new provider'] },
                    quality: { score: 50, weight: 0.25, factors: ['insufficient data'] },
                    responsiveness: { score: 50, weight: 0.2, factors: ['insufficient data'] },
                    professionalism: { score: 50, weight: 0.15, factors: ['insufficient data'] },
                    growth: { score: 50, weight: 0.15, factors: ['insufficient data'] }
                },
                strengths: [],
                improvement_areas: ['Build track record', 'Complete initial bookings'],
                coaching_tips: [],
                confidence: 40,
                reasoning: 'Fallback scoring due to insufficient data',
                agent: 'provider',
                provider_id: providerId
            };
        }
        
        const metrics = rows[0];
        const overallScore = metrics.score || 50;
        
        // Determine tier
        let tier = 'new';
        if (overallScore >= 90) tier = 'champion';
        else if (overallScore >= 75) tier = 'trusted';
        else if (overallScore >= 60) tier = 'verified';
        else if (overallScore >= 40) tier = 'rising';
        else if (overallScore < 30) tier = 'at_risk';
        
        return {
            overall_score: overallScore,
            tier: tier,
            dimensions: {
                reliability: {
                    score: metrics.completion_rate ? metrics.completion_rate * 100 : 50,
                    weight: 0.25,
                    factors: [`completion rate: ${metrics.completion_rate || 'N/A'}`]
                },
                quality: {
                    score: metrics.avg_rating ? metrics.avg_rating * 20 : 50,
                    weight: 0.25,
                    factors: [`average rating: ${metrics.avg_rating || 'N/A'}`]
                },
                responsiveness: {
                    score: metrics.response_time_hours ? Math.max(0, 100 - metrics.response_time_hours * 10) : 50,
                    weight: 0.2,
                    factors: [`response time: ${metrics.response_time_hours || 'N/A'} hours`]
                },
                professionalism: {
                    score: metrics.dispute_free_streak ? Math.min(100, metrics.dispute_free_streak * 10) : 50,
                    weight: 0.15,
                    factors: [`dispute-free streak: ${metrics.dispute_free_streak || 0}`]
                },
                growth: {
                    score: metrics.total_completed ? Math.min(100, metrics.total_completed * 2) : 50,
                    weight: 0.15,
                    factors: [`total completed: ${metrics.total_completed || 0}`]
                }
            },
            strengths: overallScore > 70 ? ['Strong track record', 'High completion rate'] : [],
            improvement_areas: overallScore < 60 ? ['Improve response time', 'Reduce cancellations'] : [],
            coaching_tips: overallScore < 60 ? [{
                category: 'responsiveness',
                tip: 'Aim to respond to booking requests within 2 hours',
                priority: 'high',
                expected_impact: 'Increase booking conversion by 25%'
            }] : [],
            confidence: 55,
            reasoning: 'Fallback scoring using existing metrics',
            agent: 'provider',
            provider_id: providerId
        };
        
    } catch (error) {
        console.error('[Simon Provider] Fallback scoring failed:', error);
        return {
            overall_score: 50,
            tier: 'new',
            confidence: 30,
            reasoning: 'Fallback scoring failed',
            agent: 'provider',
            provider_id: providerId
        };
    }
}

/**
 * Identify underperforming providers with location awareness
 */
export async function identifyUnderperformers(agent = 'provider', locationContext = null) {
    try {
        const { pool } = await import('../db.js');
        
        // Get all providers with recent performance data, optionally filtered by location
        let providerQuery = `
            SELECT 
                u.id, u.full_name, u.email,
                ts.score as current_score,
                ts.completion_rate,
                ts.avg_rating,
                ts.total_completed,
                ts.response_time_hours,
                p.lat,
                p.lng,
                p.geolocation
            FROM users u
            JOIN provider_trust_scores ts ON ts.provider_id = u.id
            LEFT JOIN providers p ON p.user_id = u.id
            WHERE u.role = 'provider'
            AND ts.last_computed_at > NOW() - INTERVAL '7 days'
        `;
        
        let queryParams = [];
        
        if (locationContext && locationContext.lat && locationContext.lng) {
            providerQuery += `
                AND p.geolocation IS NOT NULL
                AND ST_DWithin(
                    p.geolocation,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    $3
                )
            `;
            queryParams.push(locationContext.lng, locationContext.lat, (locationContext.radius_km || 25) * 1000);
        }
        
        providerQuery += ` ORDER BY ts.score ASC`;
        
        const { rows: providers } = await pool.query(providerQuery, queryParams);
        
        const locationContextStr = locationContext 
            ? `Location Context: Analyzing providers within ${locationContext.radius_km || 25}km of user at coordinates (${locationContext.lat}, ${locationContext.lng}). Focus on local performance issues.`
            : 'Location Context: Analyzing all providers platform-wide.';
        
        const systemPrompt = `You are Simon's provider performance analyst. Identify underperforming providers. ${locationContextStr} Return JSON:
{
    "underperformers": [
        {
            "provider_id": "provider UUID",
            "name": "provider name",
            "current_score": number,
            "score_decline": number,
            "risk_level": "low|medium|high",
            "primary_issues": ["issue1", "issue2"],
            "recommended_actions": ["action1", "action2"],
            "intervention_needed": boolean
        }
    ],
    "total_underperformers": number,
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Provider data: ${JSON.stringify(providers)}`;
        
        const aiResponse = await callAI('provider', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 1000
        });
        
        if (!aiResponse) {
            return await fallbackUnderperformerIdentification(providers);
        }
        
        if (!validateAIResponse(aiResponse, ['underperformers'])) {
            return await fallbackUnderperformerIdentification(providers);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Provider] Underperformer identification failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fallback underperformer identification
 */
async function fallbackUnderperformerIdentification(providers) {
    const underperformers = [];
    
    for (const provider of providers) {
        // Simple threshold-based identification
        let riskLevel = 'low';
        let primaryIssues = [];
        let interventionNeeded = false;
        
        if (provider.current_score < 40) {
            riskLevel = 'high';
            interventionNeeded = true;
            primaryIssues.push('Critical score below 40');
        } else if (provider.current_score < 60) {
            riskLevel = 'medium';
            primaryIssues.push('Score below 60');
        }
        
        if (provider.completion_rate < 0.7) {
            primaryIssues.push('Low completion rate');
            riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        }
        
        if (provider.avg_rating < 3.5) {
            primaryIssues.push('Low average rating');
            riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        }
        
        if (riskLevel !== 'low') {
            underperformers.push({
                provider_id: provider.id,
                name: provider.full_name,
                current_score: provider.current_score,
                score_decline: 0, // Would need historical data
                risk_level: riskLevel,
                primary_issues: primaryIssues,
                recommended_actions: riskLevel === 'high' ? ['Immediate intervention', 'Performance review'] : ['Coaching session', 'Monitoring'],
                intervention_needed: interventionNeeded
            });
        }
    }
    
    return {
        underperformers: underperformers,
        total_underperformers: underperformers.length,
        confidence: 55,
        agent: 'provider'
    };
}

/**
 * Generate provider coaching tips
 */
export async function generateCoachingTips(providerId, agent = 'provider') {
    try {
        const scoreResult = await scoreProvider(providerId, agent);
        
        const systemPrompt = `You are Simon's provider coach. Generate personalized coaching tips. Return JSON:
{
    "coaching_plan": [
        {
            "focus_area": "area to improve",
            "current_status": "current performance",
            "target_status": "goal to achieve",
            "action_steps": ["step1", "step2"],
            "timeline": "timeframe",
            "expected_outcome": "expected improvement",
            "priority": "high|medium|low"
        }
    ],
    "quick_wins": [
        {
            "action": "easy improvement",
            "expected_impact": "quick benefit",
            "time_to_implement": "duration"
        }
    ],
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Provider score result: ${JSON.stringify(scoreResult)}`;
        
        const aiResponse = await callAI('provider', systemPrompt, userPrompt, {
            temperature: 0.4,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            return await fallbackCoachingTips(scoreResult);
        }
        
        if (!validateAIResponse(aiResponse, ['coaching_plan'])) {
            return await fallbackCoachingTips(scoreResult);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent,
            provider_id: providerId
        };
        
    } catch (error) {
        console.error('[Simon Provider] Coaching tips generation failed:', error);
        return await fallbackCoachingTips({ overall_score: 50 });
    }
}

/**
 * Fallback coaching tips
 */
async function fallbackCoachingTips(scoreResult) {
    const coachingPlan = [];
    const quickWins = [];
    
    // Generate coaching plan based on score
    if (scoreResult.overall_score < 60) {
        coachingPlan.push({
            focus_area: 'Completion Rate',
            current_status: `${scoreResult.dimensions?.reliability?.score || 50}/100`,
            target_status: '85/100',
            action_steps: ['Accept bookings you can complete', 'Communicate early if issues arise'],
            timeline: '2-4 weeks',
            expected_outcome: 'Increase completion rate to 85%',
            priority: 'high'
        });
        
        quickWins.push({
            action: 'Update availability calendar',
            expected_impact: 'Reduce cancellations by 20%',
            time_to_implement: '15 minutes'
        });
    }
    
    if (scoreResult.dimensions?.responsiveness?.score < 70) {
        coachingPlan.push({
            focus_area: 'Response Time',
            current_status: `${scoreResult.dimensions.responsiveness.score}/100`,
            target_status: '80/100',
            action_steps: ['Enable push notifications', 'Check app every 2 hours'],
            timeline: '1-2 weeks',
            expected_outcome: 'Respond within 2 hours to 80% of requests',
            priority: 'high'
        });
        
        quickWins.push({
            action: 'Enable instant notifications',
            expected_impact: 'Improve response time by 50%',
            time_to_implement: '5 minutes'
        });
    }
    
    if (scoreResult.dimensions?.quality?.score < 70) {
        coachingPlan.push({
            focus_area: 'Service Quality',
            current_status: `${scoreResult.dimensions.quality.score}/100`,
            target_status: '85/100',
            action_steps: ['Ask for feedback after each job', 'Review common complaints'],
            timeline: '4-6 weeks',
            expected_outcome: 'Increase rating to 4.0+',
            priority: 'medium'
        });
    }
    
    return {
        coaching_plan: coachingPlan,
        quick_wins: quickWins,
        confidence: 50,
        agent: 'provider',
        provider_id: scoreResult.provider_id
    };
}

/**
 * Batch score all providers
 */
export async function batchScoreProviders(agent = 'provider') {
    try {
        const { pool } = await import('../db.js');
        
        const { rows: providers } = await pool.query(
            `SELECT id FROM users WHERE role = 'provider'`
        );
        
        const scores = [];
        let successCount = 0;
        let failureCount = 0;
        
        for (const provider of providers) {
            try {
                const score = await scoreProvider(provider.id, agent);
                scores.push(score);
                successCount++;
            } catch (error) {
                console.error(`[Simon Provider] Failed to score provider ${provider.id}:`, error);
                failureCount++;
            }
        }
        
        return {
            success: true,
            total_providers: providers.length,
            successful_scores: successCount,
            failed_scores: failureCount,
            scores: scores,
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Provider] Batch scoring failed:', error);
        return { success: false, error: error.message };
    }
}

export default {
    scoreProvider,
    identifyUnderperformers,
    generateCoachingTips,
    batchScoreProviders
};
