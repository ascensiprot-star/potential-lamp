/**
 * Simon Customer Agent
 * Customer behavioral patterns, lifetime value, churn signals, personalization
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { executeTool } from './tools.js';

/**
 * Analyze customer behavior and patterns
 */
export async function analyzeCustomerBehavior(userId, agent = 'customer') {
    try {
        const userProfile = await executeTool('get_user_profile', [userId], agent);
        
        if (!userProfile || !userProfile.success) {
            return await fallbackCustomerAnalysis(userId);
        }
        
        const systemPrompt = `You are Simon's customer intelligence agent. Analyze customer behavior and patterns. Return JSON:
{
    "behavioral_patterns": [
        {
            "pattern": "pattern name",
            "description": "pattern description",
            "frequency": "rare|occasional|frequent",
            "business_impact": "positive|neutral|negative"
        }
    ],
    "lifetime_value": {
        "current_value": number,
        "projected_value": number,
        "value_tier": "low|medium|high|premium",
        "growth_potential": "low|medium|high"
    },
    "engagement_level": "low|medium|high",
    "churn_risk": {
        "score": 0-100,
        "level": "low|medium|high",
        "signals": ["signal1", "signal2"]
    },
    "personalization_signals": [
        {
            "category": "service category",
            "preference": "preference description",
            "confidence": 0.0-1.0
        }
    ],
    "confidence": 0.0-1.0,
    "reasoning": "analysis approach"
}`;
        
        const userPrompt = `Customer profile: ${JSON.stringify(userProfile)}`;
        
        const aiResponse = await callAI('customer', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 1000
        });
        
        if (!aiResponse) {
            return await fallbackCustomerAnalysis(userId);
        }
        
        if (!validateAIResponse(aiResponse, ['lifetime_value', 'engagement_level', 'churn_risk'])) {
            return await fallbackCustomerAnalysis(userId);
        }
        
        // Store analysis in memory
        await executeTool('write_simon_memory', [
            `customer_analysis:${userId}`,
            aiResponse,
            72,
            calculateConfidence(aiResponse)
        ], agent);
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent,
            user_id: userId
        };
        
    } catch (error) {
        console.error('[Simon Customer] Customer analysis failed:', error);
        return await fallbackCustomerAnalysis(userId);
    }
}

/**
 * Fallback customer analysis
 */
async function fallbackCustomerAnalysis(userId) {
    try {
        const { pool } = await import('../db.js');
        
        const { rows: user } = await pool.query(
            `SELECT * FROM users WHERE id = $1`,
            [userId]
        );
        
        const { rows: bookings } = await pool.query(
            `SELECT * FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [userId]
        );
        
        const { rows: wallet } = await pool.query(
            `SELECT * FROM wallets WHERE user_id = $1`,
            [userId]
        );
        
        if (user.length === 0) {
            return {
                success: false,
                error: 'User not found',
                agent: 'customer'
            };
        }
        
        // Calculate basic metrics
        const totalBookings = bookings.length;
        const completedBookings = bookings.filter(b => b.status === 'completed').length;
        const totalSpent = bookings.reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0);
        const avgBookingValue = totalBookings > 0 ? totalSpent / totalBookings : 0;
        
        // Calculate engagement level
        let engagementLevel = 'low';
        const lastBooking = bookings[0]?.created_at;
        if (lastBooking) {
            const daysSinceLastBooking = (Date.now() - new Date(lastBooking).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLastBooking < 7 && totalBookings > 3) engagementLevel = 'high';
            else if (daysSinceLastBooking < 30 && totalBookings > 1) engagementLevel = 'medium';
        }
        
        // Calculate churn risk
        let churnScore = 0;
        const churnSignals = [];
        
        if (totalBookings === 0) {
            churnScore = 80;
            churnSignals.push('No bookings made');
        } else if (totalBookings === 1) {
            churnScore = 50;
            churnSignals.push('Only one booking');
        }
        
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        if (cancelledBookings / totalBookings > 0.5) {
            churnScore += 30;
            churnSignals.push('High cancellation rate');
        }
        
        let churnLevel = 'low';
        if (churnScore >= 70) churnLevel = 'high';
        else if (churnScore >= 40) churnLevel = 'medium';
        
        // Lifetime value estimation
        const lifetimeValue = {
            current_value: totalSpent,
            projected_value: totalSpent * (totalBookings > 0 ? 2 : 1), // Simple projection
            value_tier: totalSpent > 10000 ? 'premium' : totalSpent > 5000 ? 'high' : totalSpent > 2000 ? 'medium' : 'low',
            growth_potential: engagementLevel === 'high' ? 'high' : engagementLevel === 'medium' ? 'medium' : 'low'
        };
        
        return {
            behavioral_patterns: [],
            lifetime_value: lifetimeValue,
            engagement_level: engagementLevel,
            churn_risk: {
                score: Math.min(100, churnScore),
                level: churnLevel,
                signals: churnSignals
            },
            personalization_signals: [],
            confidence: 50,
            reasoning: 'Fallback analysis using basic metrics',
            agent: 'customer',
            user_id: userId
        };
        
    } catch (error) {
        console.error('[Simon Customer] Fallback analysis failed:', error);
        return {
            success: false,
            error: error.message,
            agent: 'customer'
        };
    }
}

/**
 * Generate personalized recommendations
 */
export async function generatePersonalizedRecommendations(userId, agent = 'customer') {
    try {
        const customerAnalysis = await analyzeCustomerBehavior(userId, agent);
        
        const systemPrompt = `You are Simon's personalization agent. Generate tailored recommendations. Return JSON:
{
    "recommendations": [
        {
            "type": "service|pricing|engagement|retention",
            "title": "recommendation title",
            "description": "detailed description",
            "priority": "high|medium|low",
            "expected_benefit": "expected outcome",
            "confidence": 0.0-1.0
        }
    ],
    "personalized_offers": [
        {
            "offer_type": "discount|bundle|upgrade",
            "description": "offer description",
            "value": "offer value",
            "expires": "timeframe"
        }
    ],
    "communication_style": "formal|casual|friendly",
    "preferred_contact_time": "morning|afternoon|evening",
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Customer analysis: ${JSON.stringify(customerAnalysis)}`;
        
        const aiResponse = await callAI('customer', systemPrompt, userPrompt, {
            temperature: 0.4,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            return await fallbackRecommendations(customerAnalysis);
        }
        
        if (!validateAIResponse(aiResponse, ['recommendations'])) {
            return await fallbackRecommendations(customerAnalysis);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent,
            user_id: userId
        };
        
    } catch (error) {
        console.error('[Simon Customer] Recommendation generation failed:', error);
        return await fallbackRecommendations({ engagement_level: 'medium' });
    }
}

/**
 * Fallback recommendations
 */
async function fallbackRecommendations(customerAnalysis) {
    const recommendations = [];
    const personalizedOffers = [];
    
    // Generate recommendations based on engagement level
    if (customerAnalysis.engagement_level === 'low') {
        recommendations.push({
            type: 'engagement',
            title: 'Welcome Back Offer',
            description: 'Special discount to encourage re-engagement',
            priority: 'high',
            expected_benefit: 'Increase booking rate by 25%',
            confidence: 0.6
        });
        
        personalizedOffers.push({
            offer_type: 'discount',
            description: '20% off your next booking',
            value: '20%',
            expires: '7 days'
        });
    } else if (customerAnalysis.engagement_level === 'medium') {
        recommendations.push({
            type: 'service',
            title: 'Bundle Suggestion',
            description: 'Combine services for better value',
            priority: 'medium',
            expected_benefit: 'Increase order value by 15%',
            confidence: 0.55
        });
    } else {
        recommendations.push({
            type: 'retention',
            title: 'Loyalty Reward',
            description: 'Exclusive benefits for loyal customers',
            priority: 'medium',
            expected_benefit: 'Increase retention by 20%',
            confidence: 0.6
        });
        
        personalizedOffers.push({
            offer_type: 'upgrade',
            description: 'Priority scheduling and exclusive provider access',
            value: 'Premium benefits',
            expires: '30 days'
        });
    }
    
    return {
        recommendations: recommendations,
        personalized_offers: personalizedOffers,
        communication_style: 'friendly',
        preferred_contact_time: 'afternoon',
        confidence: 50,
        agent: 'customer',
        user_id: customerAnalysis.user_id
    };
}

/**
 * Analyze churn risk
 */
export async function analyzeChurnRisk(userId, agent = 'customer') {
    try {
        const customerAnalysis = await analyzeCustomerBehavior(userId, agent);
        
        const systemPrompt = `You are Simon's churn prediction agent. Analyze churn risk factors. Return JSON:
{
    "churn_probability": 0-100,
    "risk_level": "low|medium|high|critical",
    "risk_factors": [
        {
            "factor": "risk factor name",
            "impact": "low|medium|high",
            "description": "factor description",
            "weight": 0.0-1.0
        }
    ],
    "intervention_strategies": [
        {
            "strategy": "intervention approach",
            "priority": "high|medium|low",
            "expected_reduction": "expected risk reduction",
            "timeline": "implementation timeframe"
        }
    ],
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Customer analysis: ${JSON.stringify(customerAnalysis)}`;
        
        const aiResponse = await callAI('customer', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 600
        });
        
        if (!aiResponse) {
            return await fallbackChurnAnalysis(customerAnalysis);
        }
        
        if (!validateAIResponse(aiResponse, ['churn_probability', 'risk_level'])) {
            return await fallbackChurnAnalysis(customerAnalysis);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent,
            user_id: userId
        };
        
    } catch (error) {
        console.error('[Simon Customer] Churn analysis failed:', error);
        return await fallbackChurnAnalysis({ churn_risk: { score: 50 } });
    }
}

/**
 * Fallback churn analysis
 */
async function fallbackChurnAnalysis(customerAnalysis) {
    const churnProbability = customerAnalysis.churn_risk?.score || 50;
    
    let riskLevel = 'medium';
    if (churnProbability >= 70) riskLevel = 'high';
    else if (churnProbability >= 40) riskLevel = 'medium';
    else if (churnProbability >= 20) riskLevel = 'low';
    
    const riskFactors = [];
    if (customerAnalysis.engagement_level === 'low') {
        riskFactors.push({
            factor: 'low_engagement',
            impact: 'high',
            description: 'Low engagement with platform',
            weight: 0.4
        });
    }
    
    const interventionStrategies = [];
    if (riskLevel !== 'low') {
        interventionStrategies.push({
            strategy: 'Personalized outreach',
            priority: 'high',
            expected_reduction: '30%',
            timeline: '1-2 weeks'
        });
        
        interventionStrategies.push({
            strategy: 'Targeted offers',
            priority: 'medium',
            expected_reduction: '20%',
            timeline: '2-4 weeks'
        });
    }
    
    return {
        churn_probability: churnProbability,
        risk_level: riskLevel,
        risk_factors: riskFactors,
        intervention_strategies: interventionStrategies,
        confidence: 55,
        agent: 'customer',
        user_id: customerAnalysis.user_id
    };
}

/**
 * Batch analyze customers at risk
 */
export async function analyzeAtRiskCustomers(agent = 'customer') {
    try {
        const { pool } = await import('../db.js');
        
        // Get customers who haven't booked in 30 days
        const { rows: customers } = await pool.query(`
            SELECT u.id, u.email, u.full_name, u.last_seen_at,
                   COUNT(DISTINCT b.id) as total_bookings,
                   MAX(b.created_at) as last_booking
            FROM users u
            LEFT JOIN bookings b ON b.customer_id = u.id
            WHERE u.role = 'customer'
            AND (u.last_seen_at < NOW() - INTERVAL '30 days' OR u.last_seen_at IS NULL)
            GROUP BY u.id, u.email, u.full_name, u.last_seen_at
            HAVING COUNT(b.id) > 0 OR u.last_seen_at < NOW() - INTERVAL '30 days'
            LIMIT 50
        `);
        
        const atRiskCustomers = [];
        
        for (const customer of customers) {
            const churnAnalysis = await analyzeChurnRisk(customer.id, agent);
            atRiskCustomers.push({
                customer_id: customer.id,
                customer: customer,
                churn_analysis: churnAnalysis
            });
        }
        
        return {
            success: true,
            total_analyzed: customers.length,
            at_risk_customers: atRiskCustomers.filter(c => c.churn_analysis.risk_level === 'high'),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Customer] At-risk analysis failed:', error);
        return { success: false, error: error.message };
    }
}

export default {
    analyzeCustomerBehavior,
    generatePersonalizedRecommendations,
    analyzeChurnRisk,
    analyzeAtRiskCustomers
};
