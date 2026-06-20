/**
 * Simon Analyst Agent
 * Platform intelligence, insights, anomaly reports, zone health, and demand forecasting
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { executeTool } from './tools.js';

/**
 * Generate comprehensive platform insights with location awareness
 */
export async function generatePlatformInsights(platformData, agent = 'analyst', locationContext = null) {
    try {
        const locationContextStr = locationContext 
            ? `Location Context: User is at coordinates (${locationContext.lat}, ${locationContext.lng}) in zone "${locationContext.zoneName || 'Unknown'}". All insights must be specific to this geographic area within 25km radius.`
            : 'Location Context: No specific location provided. Provide platform-wide insights.';
        
        const systemPrompt = `You are Simon's platform analyst. Analyze platform data and generate actionable insights. ${locationContextStr} Return JSON:
{
    "insights": [
        {
            "category": "demand|supply|financial|operational|growth",
            "title": "insight title",
            "description": "detailed description",
            "severity": "info|warning|critical",
            "confidence": 0.0-1.0,
            "actionable": true/false,
            "suggested_actions": ["action1", "action2"]
        }
    ],
    "anomalies": [
        {
            "type": "anomaly type",
            "description": "anomaly description",
            "severity": "low|medium|high",
            "affected_entities": ["entity1", "entity2"]
        }
    ],
    "confidence": 0.0-1.0,
    "reasoning": "overall analysis approach"
}`;
        
        const userPrompt = `Platform data: ${JSON.stringify(platformData)}`;
        
        const aiResponse = await callAI('analyst', systemPrompt, userPrompt, {
            temperature: 0.4,
            maxTokens: 1200
        });
        
        if (!aiResponse) {
            return await fallbackInsights(platformData);
        }
        
        if (!validateAIResponse(aiResponse, ['insights'])) {
            return await fallbackInsights(platformData);
        }
        
        const confidence = calculateConfidence(aiResponse);
        
        // Store high-severity anomalies
        if (aiResponse.anomalies) {
            for (const anomaly of aiResponse.anomalies.filter(a => a.severity === 'high')) {
                await executeTool('write_simon_memory', [
                    `anomaly:${anomaly.type}:${Date.now()}`,
                    anomaly,
                    24,
                    confidence
                ], agent);
            }
        }
        
        return {
            ...aiResponse,
            confidence: confidence,
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Analyst] Insight generation failed:', error);
        return await fallbackInsights(platformData);
    }
}

/**
 * Fallback insight generation
 */
async function fallbackInsights(platformData) {
    const insights = [];
    const anomalies = [];
    
    // User growth insight
    if (platformData.users && platformData.users.active > 0) {
        const activeRatio = (platformData.users.active / platformData.users.total) * 100;
        insights.push({
            category: 'growth',
            title: 'User Activity',
            description: `${activeRatio.toFixed(1)}% of users are active now`,
            severity: activeRatio > 20 ? 'info' : 'warning',
            confidence: 0.7,
            actionable: true,
            suggested_actions: activeRatio < 20 ? ['Send engagement notifications', 'Run promotions'] : []
        });
    }
    
    // Booking anomaly
    if (platformData.bookings) {
        const todayRatio = platformData.bookings.today / Math.max(1, platformData.bookings.total) * 100;
        if (todayRatio > 10) {
            anomalies.push({
                type: 'booking_surge',
                description: `Booking spike: ${platformData.bookings.today} bookings today`,
                severity: 'medium',
                affected_entities: ['platform']
            });
        }
    }
    
    // Zone health anomaly
    if (platformData.zones) {
        const unhealthyZones = platformData.zones.filter(z => z.health_score < 40);
        if (unhealthyZones.length > 0) {
            anomalies.push({
                type: 'zone_health',
                description: `${unhealthyZones.length} zones with critical health scores`,
                severity: 'high',
                affected_entities: unhealthyZones.map(z => z.name)
            });
        }
    }
    
    return {
        insights: insights,
        anomalies: anomalies,
        confidence: 55,
        reasoning: 'Fallback rule-based analysis',
        agent: 'analyst'
    };
}

/**
 * Analyze zone health with location context
 */
export async function analyzeZoneHealth(zoneData, agent = 'analyst', locationContext = null) {
    try {
        const locationContextStr = locationContext 
            ? `Location Context: User is at coordinates (${locationContext.lat}, ${locationContext.lng}) relative to this zone. Analysis should focus on conditions within 25km of user's location.`
            : 'Location Context: Analyzing zone as a whole without specific user location.';
        
        const systemPrompt = `You are Simon's zone analyst. Analyze zone health data and provide recommendations. ${locationContextStr} Return JSON:
{
    "health_score": 0-100,
    "health_level": "critical|poor|fair|good|excellent",
    "factors": [
        {
            "name": "factor name",
            "value": numeric value,
            "impact": "positive|negative|neutral",
            "description": "factor description"
        }
    ],
    "recommendations": [
        {
            "priority": "high|medium|low",
            "action": "recommended action",
            "expected_impact": "expected outcome"
        }
    ],
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Zone data: ${JSON.stringify(zoneData)}`;
        
        const aiResponse = await callAI('analyst', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            return await fallbackZoneHealthAnalysis(zoneData);
        }
        
        if (!validateAIResponse(aiResponse, ['health_score', 'health_level'])) {
            return await fallbackZoneHealthAnalysis(zoneData);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Analyst] Zone health analysis failed:', error);
        return await fallbackZoneHealthAnalysis(zoneData);
    }
}

/**
 * Fallback zone health analysis
 */
async function fallbackZoneHealthAnalysis(zoneData) {
    let healthScore = 50; // Base score
    
    const factors = [];
    
    // Provider availability factor
    if (zoneData.active_providers) {
        const providerImpact = zoneData.active_providers > 10 ? 15 : zoneData.active_providers > 5 ? 5 : -10;
        healthScore += providerImpact;
        factors.push({
            name: 'provider_availability',
            value: zoneData.active_providers,
            impact: providerImpact > 0 ? 'positive' : 'negative',
            description: `${zoneData.active_providers} active providers`
        });
    }
    
    // Booking volume factor
    if (zoneData.booking_count) {
        const bookingImpact = zoneData.booking_count > 20 ? 10 : zoneData.booking_count > 10 ? 5 : 0;
        healthScore += bookingImpact;
        factors.push({
            name: 'booking_volume',
            value: zoneData.booking_count,
            impact: bookingImpact > 0 ? 'positive' : 'neutral',
            description: `${zoneData.booking_count} recent bookings`
        });
    }
    
    // Dispute factor
    if (zoneData.dispute_count) {
        const disputeImpact = zoneData.dispute_count > 5 ? -20 : zoneData.dispute_count > 2 ? -10 : 0;
        healthScore += disputeImpact;
        factors.push({
            name: 'dispute_count',
            value: zoneData.dispute_count,
            impact: disputeImpact < 0 ? 'negative' : 'neutral',
            description: `${zoneData.dispute_count} open disputes`
        });
    }
    
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    let healthLevel = 'fair';
    if (healthScore >= 80) healthLevel = 'excellent';
    else if (healthScore >= 60) healthLevel = 'good';
    else if (healthScore >= 40) healthLevel = 'poor';
    else healthLevel = 'critical';
    
    const recommendations = [];
    if (healthScore < 50) {
        recommendations.push({
            priority: 'high',
            action: 'Increase provider recruitment',
            expected_impact: 'Improve service availability'
        });
    }
    if (zoneData.dispute_count > 3) {
        recommendations.push({
            priority: 'medium',
            action: 'Implement dispute resolution protocol',
            expected_impact: 'Reduce dispute resolution time'
        });
    }
    
    return {
        health_score: healthScore,
        health_level: healthLevel,
        factors: factors,
        recommendations: recommendations,
        confidence: 60,
        agent: 'analyst'
    };
}

/**
 * Generate demand forecast
 */
export async function generateDemandForecast(zoneData, historicalData, hoursAhead = 72, agent = 'analyst') {
    try {
        const systemPrompt = `You are Simon's demand forecaster. Generate demand forecast for next ${hoursAhead} hours. Return JSON:
{
    "forecast": [
        {
            "period": "6h|12h|24h|48h|72h",
            "predicted_demand": number,
            "confidence": 0.0-1.0,
            "trend": "increasing|stable|decreasing"
        }
    ],
    "supply_shortfall": {
        "expected": boolean,
        "categories": ["category1", "category2"],
        "severity": "low|medium|high"
    },
    "surge_opportunities": [
        {
            "time_window": "time description",
            "category": "service category",
            "potential_increase": "percentage",
            "reasoning": "why this is an opportunity"
        }
    ],
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Zone data: ${JSON.stringify(zoneData)}\nHistorical data: ${JSON.stringify(historicalData)}`;
        
        const aiResponse = await callAI('analyst', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 1000
        });
        
        if (!aiResponse) {
            return await fallbackDemandForecast(zoneData, historicalData, hoursAhead);
        }
        
        if (!validateAIResponse(aiResponse, ['forecast'])) {
            return await fallbackDemandForecast(zoneData, historicalData, hoursAhead);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Analyst] Demand forecast failed:', error);
        return await fallbackDemandForecast(zoneData, historicalData, hoursAhead);
    }
}

/**
 * Fallback demand forecast
 */
async function fallbackDemandForecast(zoneData, historicalData, hoursAhead) {
    const forecast = [];
    const periods = [6, 12, 24, 48, 72];
    
    // Simple linear extrapolation based on historical data
    const recentDemand = historicalData.slice(-3).reduce((sum, d) => sum + (d.demand || 0), 0) / 3;
    const growthRate = 1.05; // Assume 5% growth
    
    let currentDemand = recentDemand;
    
    for (const period of periods) {
        const predictedDemand = currentDemand * Math.pow(growthRate, period / 24);
        forecast.push({
            period: `${period}h`,
            predicted_demand: Math.round(predictedDemand),
            confidence: 0.6,
            trend: 'increasing'
        });
        currentDemand = predictedDemand;
    }
    
    // Check for supply shortfall
    const supplyShortfall = {
        expected: zoneData.active_providers < 5,
        categories: zoneData.active_providers < 3 ? ['cleaning', 'plumbing', 'hvac'] : [],
        severity: zoneData.active_providers < 3 ? 'high' : zoneData.active_providers < 5 ? 'medium' : 'low'
    };
    
    // Surge opportunities (weekend patterns)
    const surgeOpportunities = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    if (dayOfWeek >= 5) { // Friday-Sunday
        surgeOpportunities.push({
            time_window: 'Weekend morning',
            category: 'cleaning',
            potential_increase: '30%',
            reasoning: 'Weekend cleaning demand typically higher'
        });
    }
    
    return {
        forecast: forecast,
        supply_shortfall: supplyShortfall,
        surge_opportunities: surgeOpportunities,
        confidence: 55,
        agent: 'analyst'
    };
}

/**
 * Generate anomaly report
 */
export async function generateAnomalyReport(platformData, agent = 'analyst') {
    try {
        const systemPrompt = `You are Simon's anomaly detector. Identify platform anomalies. Return JSON:
{
    "anomalies": [
        {
            "type": "anomaly type",
            "severity": "low|medium|high|critical",
            "description": "anomaly description",
            "affected_entities": ["entity1", "entity2"],
            "detected_at": "timestamp",
            "confidence": 0.0-1.0,
            "suggested_action": "recommended action"
        }
    ],
    "overall_health": "healthy|degraded|critical",
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Platform data: ${JSON.stringify(platformData)}`;
        
        const aiResponse = await callAI('analyst', systemPrompt, userPrompt, {
            temperature: 0.2,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            return await fallbackAnomalyReport(platformData);
        }
        
        if (!validateAIResponse(aiResponse, ['anomalies', 'overall_health'])) {
            return await fallbackAnomalyReport(platformData);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Analyst] Anomaly report failed:', error);
        return await fallbackAnomalyReport(platformData);
    }
}

/**
 * Fallback anomaly report
 */
async function fallbackAnomalyReport(platformData) {
    const anomalies = [];
    
    // Booking anomaly
    if (platformData.bookings && platformData.bookings.today > 50) {
        anomalies.push({
            type: 'booking_surge',
            severity: 'medium',
            description: `High booking volume: ${platformData.bookings.today} today`,
            affected_entities: ['platform'],
            detected_at: new Date().toISOString(),
            confidence: 0.7,
            suggested_action: 'Monitor server load and provider availability'
        });
    }
    
    // Wallet anomaly
    if (platformData.wallets && platformData.wallets.frozen_wallets > 3) {
        anomalies.push({
            type: 'wallet_freeze_surge',
            severity: 'high',
            description: `Multiple wallet freezes: ${platformData.wallets.frozen_wallets}`,
            affected_entities: ['financial'],
            detected_at: new Date().toISOString(),
            confidence: 0.8,
            suggested_action: 'Investigate fraud patterns'
        });
    }
    
    // Zone anomaly
    if (platformData.zones) {
        const criticalZones = platformData.zones.filter(z => z.health_score < 30);
        if (criticalZones.length > 0) {
            anomalies.push({
                type: 'zone_health_critical',
                severity: 'critical',
                description: `${criticalZones.length} zones in critical state`,
                affected_entities: criticalZones.map(z => z.name),
                detected_at: new Date().toISOString(),
                confidence: 0.9,
                suggested_action: 'Immediate intervention required'
            });
        }
    }
    
    // Determine overall health
    let overallHealth = 'healthy';
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    const highAnomalies = anomalies.filter(a => a.severity === 'high');
    
    if (criticalAnomalies.length > 0) overallHealth = 'critical';
    else if (highAnomalies.length > 0) overallHealth = 'degraded';
    
    return {
        anomalies: anomalies,
        overall_health: overallHealth,
        confidence: 60,
        agent: 'analyst'
    };
}

export default {
    generatePlatformInsights,
    analyzeZoneHealth,
    generateDemandForecast,
    generateAnomalyReport
};
