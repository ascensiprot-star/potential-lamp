/**
 * Simon Demand Agent
 * 72-hour demand and supply forecasting, supply shortfalls, surge opportunities, living wage floors
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { executeTool } from './tools.js';

/**
 * Generate comprehensive demand forecast by zone and category with location awareness
 */
export async function generateDemandForecastByZone(zoneId, categories, hoursAhead = 72, agent = 'demand', locationContext = null) {
    try {
        const { pool } = await import('../db.js');
        
        // Get historical data
        const { rows: historicalData } = await pool.query(`
            SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                category,
                COUNT(*) as demand,
                COUNT(DISTINCT provider_id) as supply
            FROM bookings
            WHERE zone_id = $1
            AND created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE_TRUNC('hour', created_at), category
            ORDER BY hour DESC
        `, [zoneId]);
        
        // Get current zone data
        const { rows: zoneData } = await pool.query(
            `SELECT * FROM neighborhood_zones WHERE id = $1`,
            [zoneId]
        );
        
        const locationContextStr = locationContext 
            ? `Location Context: User is at coordinates (${locationContext.lat}, ${locationContext.lng}) in this zone. Forecast should focus on conditions within 25km of user's location.`
            : 'Location Context: Analyzing zone as a whole without specific user location.';
        
        const systemPrompt = `You are Simon's demand forecaster. Generate 72-hour demand forecast for specific zone and categories. ${locationContextStr} Return JSON:
{
    "zone_id": "zone identifier",
    "forecasts": [
        {
            "category": "service category",
            "period": "6h|12h|24h|48h|72h",
            "predicted_demand": number,
            "predicted_supply": number,
            "supply_shortfall": number,
            "confidence": 0.0-1.0,
            "trend": "increasing|stable|decreasing"
        }
    ],
    "overall_supply_shortfall": {
        "expected": boolean,
        "severity": "low|medium|high",
        "affected_periods": ["6h", "12h", "24h", "48h", "72h"]
    },
    "surge_opportunities": [
        {
            "period": "time window",
            "category": "service category",
            "demand_increase": "percentage",
            "recommended_pricing_adjustment": "percentage",
            "reasoning": "why surge is expected"
        }
    ],
    "living_wage_compliance": {
        "compliant": boolean,
        "risk_categories": ["category1", "category2"],
        "recommended_minimum_rates": {
            "category1": "rate",
            "category2": "rate"
        }
    },
    "confidence": 0.0-1.0
}`;
        
        const locationInfo = locationContext 
            ? `\nUser Location: ${locationContext.lat}, ${locationContext.lng}\nUser Zone: ${locationContext.zoneName || 'Unknown'}`
            : '';
        
        const userPrompt = `Zone ID: ${zoneId}${locationInfo}\nCategories: ${categories.join(', ')}\nHistorical data: ${JSON.stringify(historicalData)}\nZone data: ${JSON.stringify(zoneData)}`;
        
        const aiResponse = await callAI('demand', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 1500
        });
        
        if (!aiResponse) {
            return await fallbackDemandForecast(zoneId, categories, historicalData, hoursAhead);
        }
        
        if (!validateAIResponse(aiResponse, ['forecasts'])) {
            return await fallbackDemandForecast(zoneId, categories, historicalData, hoursAhead);
        }
        
        // Store forecast in memory
        await executeTool('write_simon_memory', [
            `demand_forecast:${zoneId}:${Date.now()}`,
            aiResponse,
            hoursAhead / 24, // TTL based on forecast horizon
            calculateConfidence(aiResponse)
        ], agent);
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Demand] Forecast generation failed:', error);
        return await fallbackDemandForecast(zoneId, categories, [], hoursAhead);
    }
}

/**
 * Fallback demand forecast
 */
async function fallbackDemandForecast(zoneId, categories, historicalData, hoursAhead) {
    const forecasts = [];
    const periods = [6, 12, 24, 48, 72];
    
    // Simple time-series extrapolation
    const categoryForecasts = {};
    
    for (const category of categories) {
        const recentDemand = historicalData
            .filter(d => d.category === category)
            .slice(-3)
            .reduce((sum, d) => sum + (d.demand || 0), 0) / 3;
        
        const recentSupply = historicalData
            .filter(d => d.category === category)
            .slice(-3)
            .reduce((sum, d) => sum + (d.supply || 0), 0) / 3;
        
        categoryForecasts[category] = {
            base_demand: recentDemand || 5,
            base_supply: recentSupply || 3
        };
    }
    
    for (const period of periods) {
        for (const category of categories) {
            const catData = categoryForecasts[category];
            const growthFactor = Math.pow(1.05, period / 24); // 5% growth per day
            
            const predictedDemand = Math.round(catData.base_demand * growthFactor);
            const predictedSupply = Math.round(catData.base_supply * growthFactor * 0.9); // Supply grows slower
            const supplyShortfall = Math.max(0, predictedDemand - predictedSupply);
            
            forecasts.push({
                category: category,
                period: `${period}h`,
                predicted_demand: predictedDemand,
                predicted_supply: predictedSupply,
                supply_shortfall: supplyShortfall,
                confidence: 0.55,
                trend: 'increasing'
            });
        }
    }
    
    // Overall supply shortfall analysis
    const totalShortfall = forecasts.reduce((sum, f) => sum + f.supply_shortfall, 0);
    const overallSupplyShortfall = {
        expected: totalShortfall > 20,
        severity: totalShortfall > 50 ? 'high' : totalShortfall > 20 ? 'medium' : 'low',
        affected_periods: periods.filter(p => forecasts.some(f => f.period === p && f.supply_shortfall > 5))
    };
    
    // Surge opportunities (weekend patterns)
    const surgeOpportunities = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    
    if (dayOfWeek >= 5 || (dayOfWeek === 0 && hour < 14)) {
        surgeOpportunities.push({
            period: 'Weekend morning',
            category: 'cleaning',
            demand_increase: '30%',
            recommended_pricing_adjustment: '+15%',
            reasoning: 'Weekend cleaning demand typically higher'
        });
    }
    
    // Living wage compliance (PKR 800/hour minimum)
    const livingWageCompliance = {
        compliant: true,
        risk_categories: [],
        recommended_minimum_rates: {}
    };
    
    for (const category of categories) {
        livingWageCompliance.recommended_minimum_rates[category] = 800; // PKR per hour
    }
    
    return {
        zone_id: zoneId,
        forecasts: forecasts,
        overall_supply_shortfall: overallSupplyShortfall,
        surge_opportunities: surgeOpportunities,
        living_wage_compliance: livingWageCompliance,
        confidence: 50,
        agent: 'demand'
    };
}

/**
 * Generate platform-wide demand forecast
 */
export async function generatePlatformDemandForecast(hoursAhead = 72, agent = 'demand') {
    try {
        const { pool } = await import('../db.js');
        
        // Get all zones
        const { rows: zones } = await pool.query(`SELECT id, name FROM neighborhood_zones WHERE health_score > 30`);
        
        // Get all categories
        const { rows: categories } = await pool.query(`
            SELECT DISTINCT category FROM services 
            WHERE category IS NOT NULL 
            ORDER BY category
            LIMIT 10
        `);
        
        const categoryList = categories.map(c => c.category);
        
        // Generate forecast for each zone
        const zoneForecasts = [];
        for (const zone of zones) {
            const forecast = await generateDemandForecastByZone(zone.id, categoryList, hoursAhead, agent);
            zoneForecasts.push({
                zone_id: zone.id,
                zone_name: zone.name,
                forecast: forecast
            });
        }
        
        // Aggregate platform-wide insights
        const totalShortfall = zoneForecasts.reduce((sum, zf) => {
            return sum + zf.forecast.overall_supply_shortfall.expected ? 1 : 0;
        }, 0);
        
        return {
            platform_shortfall_severity: totalShortfall > zones.length * 0.5 ? 'high' : totalShortfall > zones.length * 0.25 ? 'medium' : 'low',
            zone_forecasts: zoneForecasts,
            zones_with_shortfall: totalShortfall,
            total_zones_analyzed: zones.length,
            confidence: 0.65,
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Demand] Platform forecast failed:', error);
        return {
            success: false,
            error: error.message,
            agent: 'demand'
        };
    }
}

/**
 * Update demand forecasts table
 */
export async function updateDemandForecasts(agent = 'demand') {
    try {
        const { pool } = await import('../db.js');
        
        // Generate platform forecast
        const platformForecast = await generatePlatformDemandForecast(72, agent);
        
        // Store in database (create table if not exists)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS demand_forecasts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                zone_id UUID,
                category TEXT,
                period TEXT,
                predicted_demand NUMERIC,
                predicted_supply NUMERIC,
                supply_shortfall NUMERIC,
                confidence NUMERIC,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '6 hours'
            )
        `);
        
        // Store forecasts for each zone
        for (const zoneForecast of platformForecast.zone_forecasts || []) {
            for (const forecast of zoneForecast.forecast.forecasts || []) {
                await pool.query(`
                    INSERT INTO demand_forecasts(zone_id, category, period, predicted_demand, predicted_supply, supply_shortfall, confidence, expires_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '6 hours')
                    ON CONFLICT DO NOTHING
                `, [
                    zoneForecast.zone_id,
                    forecast.category,
                    forecast.period,
                    forecast.predicted_demand,
                    forecast.predicted_supply,
                    forecast.supply_shortfall,
                    forecast.confidence
                ]);
            }
        }
        
        return {
            success: true,
            zones_updated: platformForecast.zone_forecasts?.length || 0,
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Demand] Forecast update failed:', error);
        return {
            success: false,
            error: error.message,
            agent: 'demand'
        };
    }
}

/**
 * Analyze living wage compliance
 */
export async function analyzeLivingWageCompliance(categoryPricing, agent = 'demand') {
    try {
        const LIVING_WAGE_FLOOR = 800; // PKR per hour
        
        const systemPrompt = `You are Simon's living wage compliance analyst. Analyze pricing compliance with living wage floor of ${LIVING_WAGE_FLOOR} PKR/hour. Return JSON:
{
    "compliance_score": 0-100,
    "compliance_level": "compliant|mostly_compliant|non_compliant",
    "risk_categories": [
        {
            "category": "service category",
            "current_rate": number,
            "living_wage_gap": number,
            "severity": "low|medium|high"
        }
    ],
    "recommendations": [
        {
            "action": "recommended action",
            "priority": "high|medium|low",
            "expected_impact": "expected outcome"
        }
    ],
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Category pricing: ${JSON.stringify(categoryPricing)}\nLiving wage floor: ${LIVING_WAGE_FLOOR} PKR/hour`;
        
        const aiResponse = await callAI('demand', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 600
        });
        
        if (!aiResponse) {
            return await fallbackLivingWageAnalysis(categoryPricing, LIVING_WAGE_FLOOR);
        }
        
        if (!validateAIResponse(aiResponse, ['compliance_score', 'compliance_level'])) {
            return await fallbackLivingWageAnalysis(categoryPricing, LIVING_WAGE_FLOOR);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Demand] Living wage analysis failed:', error);
        return await fallbackLivingWageAnalysis(categoryPricing, 800);
    }
}

/**
 * Fallback living wage analysis
 */
async function fallbackLivingWageAnalysis(categoryPricing, livingWageFloor = 800) {
    const riskCategories = [];
    let totalCategories = 0;
    let compliantCategories = 0;
    
    for (const [category, rate] of Object.entries(categoryPricing)) {
        totalCategories++;
        const gap = livingWageFloor - rate;
        
        if (gap > 0) {
            riskCategories.push({
                category: category,
                current_rate: rate,
                living_wage_gap: gap,
                severity: gap > 200 ? 'high' : gap > 100 ? 'medium' : 'low'
            });
        } else {
            compliantCategories++;
        }
    }
    
    const complianceScore = totalCategories > 0 ? (compliantCategories / totalCategories) * 100 : 50;
    
    let complianceLevel = 'non_compliant';
    if (complianceScore >= 90) complianceLevel = 'compliant';
    else if (complianceScore >= 70) complianceLevel = 'mostly_compliant';
    
    const recommendations = [];
    if (riskCategories.length > 0) {
        recommendations.push({
            action: 'Increase rates for non-compliant categories',
            priority: 'high',
            expected_impact: 'Ensure living wage compliance'
        });
    }
    
    return {
        compliance_score: complianceScore,
        compliance_level: complianceLevel,
        risk_categories: riskCategories,
        recommendations: recommendations,
        confidence: 60,
        agent: 'demand'
    };
}

/**
 * Identify surge opportunities
 */
export async function identifySurgeOpportunities(historicalData, zoneData, agent = 'demand') {
    try {
        const systemPrompt = `You are Simon's surge opportunity analyst. Identify optimal pricing and supply opportunities. Return JSON:
{
    "opportunities": [
        {
            "time_window": "time description",
            "category": "service category",
            "zone_id": "zone identifier",
            "expected_demand_increase": "percentage",
            "current_pricing": "current rate",
            "recommended_pricing": "recommended rate",
            "expected_revenue_increase": "percentage",
            "confidence": 0.0-1.0,
            "reasoning": "why this is an opportunity"
        }
    ],
    "total_opportunities": number,
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Historical data: ${JSON.stringify(historicalData)}\nZone data: ${JSON.stringify(zoneData)}`;
        
        const aiResponse = await callAI('demand', systemPrompt, userPrompt, {
            temperature: 0.4,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            return await fallbackSurgeOpportunities(historicalData, zoneData);
        }
        
        if (!validateAIResponse(aiResponse, ['opportunities'])) {
            return await fallbackSurgeOpportunities(historicalData, zoneData);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Demand] Surge opportunity identification failed:', error);
        return await fallbackSurgeOpportunities(historicalData, zoneData);
    }
}

/**
 * Fallback surge opportunity identification
 */
async function fallbackSurgeOpportunities(historicalData, zoneData) {
    const opportunities = [];
    
    // Weekend opportunity
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    if (dayOfWeek >= 5) {
        opportunities.push({
            time_window: 'Weekend morning (8AM-12PM)',
            category: 'cleaning',
            zone_id: zoneData.id || 'all',
            expected_demand_increase: '30%',
            current_pricing: '1000 PKR/hour',
            recommended_pricing: '1150 PKR/hour',
            expected_revenue_increase: '45%',
            confidence: 0.7,
            reasoning: 'Weekend cleaning demand historically higher'
        });
    }
    
    // Evening opportunity
    const hour = now.getHours();
    if (hour >= 17 && hour <= 21) {
        opportunities.push({
            time_window: 'Evening peak (5PM-9PM)',
            category: 'plumbing',
            zone_id: zoneData.id || 'all',
            expected_demand_increase: '20%',
            current_pricing: '1500 PKR/hour',
            recommended_pricing: '1700 PKR/hour',
            expected_revenue_increase: '25%',
            confidence: 0.65,
            reasoning: 'Evening plumbing emergencies historically higher'
        });
    }
    
    return {
        opportunities: opportunities,
        total_opportunities: opportunities.length,
        confidence: 55,
        agent: 'demand'
    };
}

export default {
    generateDemandForecastByZone,
    generatePlatformDemandForecast,
    updateDemandForecasts,
    analyzeLivingWageCompliance,
    identifySurgeOpportunities
};
