/**
 * Simon Responder Agent
 * Emergency handling, provider dispatch, surge pricing, urgent response coordination
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { executeTool } from './tools.js';

/**
 * Handle emergency request dispatch
 */
export async function handleEmergencyRequest(emergencyRequest, agent = 'responder') {
    try {
        const { pool } = await import('../db.js');
        
        // Get nearby available providers
        const { rows: providers } = await pool.query(`
            SELECT u.id, u.full_name, u.phone, u.location_lat, u.location_lng,
                   ts.score as trust_score, ts.response_time_hours
            FROM users u
            JOIN provider_trust_scores ts ON ts.provider_id = u.id
            WHERE u.role = 'provider'
            AND u.last_seen_at > NOW() - INTERVAL '2 hours'
            AND ts.score >= 60
            ORDER BY ts.score DESC
            LIMIT 10
        `);
        
        // Get zone data for surge pricing
        const { rows: zoneData } = await pool.query(
            `SELECT * FROM neighborhood_zones WHERE id = $1`,
            [emergencyRequest.zone_id]
        );
        
        const systemPrompt = `You are Simon's emergency response agent. Dispatch providers for emergency request. Return JSON:
{
    "dispatch_action": "immediate_dispatch|surge_pricing|wait_for_capacity|escalate",
    "selected_providers": [
        {
            "provider_id": "provider UUID",
            "name": "provider name",
            "match_score": 0-100,
            "estimated_arrival_minutes": number,
            "reasoning": "why this provider"
        }
    ],
    "surge_pricing": {
        "apply": boolean,
        "multiplier": number,
        "reasoning": "why surge pricing"
    },
    "estimated_response_time_minutes": number,
    "success_probability": 0-100,
    "confidence": 0-0-1,
    "reasoning": "dispatch strategy"
}`;
        
        const userPrompt = `Emergency request: ${JSON.stringify(emergencyRequest)}\nAvailable providers: ${JSON.stringify(providers)}\nZone data: ${JSON.stringify(zoneData)}`;
        
        const aiResponse = await callAI('responder', systemPrompt, userPrompt, {
            temperature: 0.2,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            return await fallbackEmergencyDispatch(emergencyRequest, providers, zoneData);
        }
        
        if (!validateAIResponse(aiResponse, ['dispatch_action', 'selected_providers'])) {
            return await fallbackEmergencyDispatch(emergencyRequest, providers, zoneData);
        }
        
        const confidence = calculateConfidence(aiResponse);
        
        // Execute dispatch if confidence is high enough
        if (confidence >= 70 && aiResponse.dispatch_action === 'immediate_dispatch') {
            // Notify selected providers
            for (const provider of aiResponse.selected_providers.slice(0, 3)) {
                await executeTool('send_system_notification', [
                    provider.provider_id,
                    'Emergency Dispatch Request',
                    `Urgent service request in your area. Estimated arrival: ${provider.estimated_arrival_minutes} minutes. Please respond immediately.`,
                    'emergency'
                ], agent);
            }
            
            // Escalate the booking
            await executeTool('escalate_booking', [
                emergencyRequest.booking_id,
                `Emergency dispatch initiated for ${emergencyRequest.category}`,
                confidence
            ], agent);
        }
        
        return {
            ...aiResponse,
            confidence: confidence,
            agent: agent,
            emergency_request_id: emergencyRequest.id
        };
        
    } catch (error) {
        console.error('[Simon Responder] Emergency dispatch failed:', error);
        return await fallbackEmergencyDispatch(emergencyRequest, [], []);
    }
}

/**
 * Fallback emergency dispatch
 */
async function fallbackEmergencyDispatch(emergencyRequest, providers, zoneData) {
    const dispatchAction = providers.length > 0 ? 'immediate_dispatch' : 'escalate';
    
    const selectedProviders = providers.slice(0, 3).map((provider, index) => ({
        provider_id: provider.id,
        name: provider.full_name,
        match_score: Math.max(0, 100 - index * 15),
        estimated_arrival_minutes: 15 + index * 10,
        reasoning: 'Available provider with good trust score'
    }));
    
    const surgePricing = {
        apply: emergencyRequest.urgency === 'immediate' || emergencyRequest.urgency === 'critical',
        multiplier: emergencyRequest.urgency === 'critical' ? 2.0 : emergencyRequest.urgency === 'immediate' ? 1.5 : 1.0,
        reasoning: 'Emergency urgency requires surge pricing'
    };
    
    const estimatedResponseTime = selectedProviders.length > 0 ? selectedProviders[0].estimated_arrival_minutes : 30;
    
    return {
        dispatch_action: dispatchAction,
        selected_providers: selectedProviders,
        surge_pricing: surgePricing,
        estimated_response_time_minutes: estimatedResponseTime,
        success_probability: selectedProviders.length > 0 ? 70 : 30,
        confidence: 55,
        reasoning: 'Fallback dispatch using available providers',
        agent: 'responder',
        emergency_request_id: emergencyRequest.id
    };
}

/**
 * Calculate optimal surge pricing
 */
export async function calculateSurgePricing(zoneId, category, demand, supply, agent = 'responder') {
    try {
        const { pool } = await import('../db.js');
        
        // Get historical pricing data
        const { rows: historicalData } = await pool.query(`
            SELECT price, created_at FROM bookings
            WHERE zone_id = $1
            AND category = $2
            AND created_at > NOW() - INTERVAL '30 days'
            ORDER BY created_at DESC
        `, [zoneId, category]);
        
        // Get zone demand data
        const { rows: zoneDemand } = await pool.query(
            `SELECT * FROM neighborhood_zones WHERE id = $1`,
            [zoneId]
        );
        
        const systemPrompt = `You are Simon's surge pricing agent. Calculate optimal surge pricing. Return JSON:
{
    "base_price": number,
    "recommended_price": number,
    "surge_multiplier": number,
    "demand_pressure": "low|medium|high|extreme",
    "supply_tightness": "loose|balanced|tight|critical",
    "justification": "pricing reasoning",
    "competitor_pricing": {
        "min_price": number,
        "max_price": number,
        "avg_price": number
    },
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Current demand: ${demand}, Current supply: ${supply}\nHistorical data: ${JSON.stringify(historicalData.slice(0, 20))}\nZone data: ${JSON.stringify(zoneDemand)}`;
        
        const aiResponse = await callAI('responder', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 600
        });
        
        if (!aiResponse) {
            return await fallbackSurgePricing(demand, supply, historicalData);
        }
        
        if (!validateAIResponse(aiResponse, ['recommended_price', 'surge_multiplier'])) {
            return await fallbackSurgePricing(demand, supply, historicalData);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Responder] Surge pricing calculation failed:', error);
        return await fallbackSurgePricing(demand, supply, []);
    }
}

/**
 * Fallback surge pricing
 */
async function fallbackSurgePricing(demand, supply, historicalData) {
    const basePrice = historicalData.length > 0 
        ? historicalData.reduce((sum, h) => sum + parseFloat(h.price || 0), 0) / historicalData.length 
        : 1000;
    
    const supplyRatio = supply > 0 ? demand / supply : demand;
    let surgeMultiplier = 1.0;
    
    if (supplyRatio > 3) surgeMultiplier = 2.0;
    else if (supplyRatio > 2) surgeMultiplier = 1.5;
    else if (supplyRatio > 1.5) surgeMultiplier = 1.2;
    
    const demandPressure = supplyRatio > 2 ? 'high' : supplyRatio > 1.5 ? 'medium' : 'low';
    const supplyTightness = supply < 5 ? 'tight' : supply < 10 ? 'balanced' : 'loose';
    
    // Living wage floor
    const livingWageFloor = 800;
    const recommendedPrice = Math.max(livingWageFloor, basePrice * surgeMultiplier);
    
    return {
        base_price: basePrice,
        recommended_price: Math.round(recommendedPrice),
        surge_multiplier: surgeMultiplier,
        demand_pressure: demandPressure,
        supply_tightness: supplyTightness,
        justification: `Supply ratio: ${supplyRatio.toFixed(2)}, Living wage floor: ${livingWageFloor}`,
        competitor_pricing: {
            min_price: Math.round(basePrice * 0.8),
            max_price: Math.round(basePrice * 1.5),
            avg_price: Math.round(basePrice)
        },
        confidence: 55,
        agent: 'responder'
    };
}

/**
 * Optimize provider routing
 */
export async function optimizeProviderRouting(bookings, providers, agent = 'responder') {
    try {
        const systemPrompt = `You are Simon's routing optimization agent. Optimize provider assignment. Return JSON:
{
    "optimized_assignments": [
        {
            "booking_id": "booking UUID",
            "provider_id": "provider UUID",
            "match_score": 0-100,
            "estimated_arrival_minutes": number,
            "route_efficiency": "optimal|good|acceptable|poor",
            "reasoning": "assignment justification"
        }
    ],
    "unassigned_bookings": [
        {
            "booking_id": "booking UUID",
            "reason": "why unassigned",
            "suggested_action": "recommended action"
        }
    ],
    "overall_efficiency_score": 0-100,
    "confidence": 0.0-1.0
}`;
        
        const userPrompt = `Pending bookings: ${JSON.stringify(bookings)}\nAvailable providers: ${JSON.stringify(providers)}`;
        
        const aiResponse = await callAI('responder', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 1000
        });
        
        if (!aiResponse) {
            return await fallbackRoutingOptimization(bookings, providers);
        }
        
        if (!validateAIResponse(aiResponse, ['optimized_assignments'])) {
            return await fallbackRoutingOptimization(bookings, providers);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Responder] Routing optimization failed:', error);
        return await fallbackRoutingOptimization(bookings, providers);
    }
}

/**
 * Fallback routing optimization
 */
async function fallbackRoutingOptimization(bookings, providers) {
    const optimizedAssignments = [];
    const unassignedBookings = [];
    
    // Simple round-robin assignment based on provider availability
    const providerIds = providers.map(p => p.id);
    
    for (let i = 0; i < bookings.length; i++) {
        const booking = bookings[i];
        const providerIndex = i % providerIds.length;
        
        if (providerIds.length > 0) {
            optimizedAssignments.push({
                booking_id: booking.id,
                provider_id: providerIds[providerIndex],
                match_score: 70,
                estimated_arrival_minutes: 20,
                route_efficiency: 'acceptable',
                reasoning: 'Round-robin assignment to available provider'
            });
        } else {
            unassignedBookings.push({
                booking_id: booking.id,
                reason: 'No available providers',
                suggested_action: 'Wait for provider availability or expand search radius'
            });
        }
    }
    
    const efficiencyScore = providers.length > 0 ? 60 : 30;
    
    return {
        optimized_assignments: optimizedAssignments,
        unassigned_bookings: unassignedBookings,
        overall_efficiency_score: efficiencyScore,
        confidence: 50,
        agent: 'responder'
    };
}

/**
 * Coordinate multi-provider response
 */
export async function coordinateMultiProviderResponse(incident, agent = 'responder') {
    try {
        const { pool } = await import('../db.js');
        
        // Get all nearby providers
        const { rows: providers } = await pool.query(`
            SELECT u.id, u.full_name, u.phone, u.location_lat, u.location_lng,
                   ts.score as trust_score
            FROM users u
            JOIN provider_trust_scores ts ON ts.provider_id = u.id
            WHERE u.role = 'provider'
            AND u.last_seen_at > NOW() - INTERVAL '1 hour'
            AND ts.score >= 70
            ORDER BY ts.score DESC
            LIMIT 5
        `);
        
        const systemPrompt = `You are Simon's incident response coordinator. Coordinate multi-provider response. Return JSON:
{
    "response_strategy": "parallel|sequential|tiered",
    "primary_providers": [
        {
            "provider_id": "provider UUID",
            "role": "lead|support|specialist",
            "assigned_task": "specific responsibility",
            "priority": 1-5
        }
    ],
    "coordination_protocol": {
        "communication_channel": "channel type",
        "check_in_interval_minutes": number,
        "escalation_threshold_minutes": number
    },
    "estimated_resolution_time_minutes": number,
    "resource_allocation_score": 0-100,
    "confidence": 0.0-1.0,
    "reasoning": "coordination strategy"
}`;
        
        const userPrompt = `Incident details: ${JSON.stringify(incident)}\nAvailable providers: ${JSON.stringify(providers)}`;
        
        const aiResponse = await callAI('responder', systemPrompt, userPrompt, {
            temperature: 0.2,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            return await fallbackMultiProviderCoordination(incident, providers);
        }
        
        if (!validateAIResponse(aiResponse, ['response_strategy', 'primary_providers'])) {
            return await fallbackMultiProviderCoordination(incident, providers);
        }
        
        // Notify all assigned providers
        for (const provider of aiResponse.primary_providers) {
            await executeTool('send_system_notification', [
                provider.provider_id,
                'Incident Response Assignment',
                `You have been assigned to incident response. Role: ${provider.role}. Task: ${provider.assigned_task}. Priority: ${provider.priority}/5`,
                'emergency'
            ], agent);
        }
        
        return {
            ...aiResponse,
            confidence: calculateConfidence(aiResponse),
            agent: agent,
            incident_id: incident.id
        };
        
    } catch (error) {
        console.error('[Simon Responder] Multi-provider coordination failed:', error);
        return await fallbackMultiProviderCoordination(incident, []);
    }
}

/**
 * Fallback multi-provider coordination
 */
async function fallbackMultiProviderCoordination(incident, providers) {
    const primaryProviders = providers.slice(0, 3).map((provider, index) => ({
        provider_id: provider.id,
        role: index === 0 ? 'lead' : index === 1 ? 'support' : 'specialist',
        assigned_task: index === 0 ? 'Lead incident response' : index === 1 ? 'Provide support services' : 'Handle specialized requirements',
        priority: index + 1
    }));
    
    return {
        response_strategy: providers.length > 1 ? 'parallel' : 'sequential',
        primary_providers: primaryProviders,
        coordination_protocol: {
            communication_channel: 'platform_chat',
            check_in_interval_minutes: 15,
            escalation_threshold_minutes: 30
        },
        estimated_resolution_time_minutes: providers.length > 0 ? 45 : 60,
        resource_allocation_score: providers.length > 0 ? 60 : 30,
        confidence: 50,
        reasoning: 'Fallback coordination using available providers',
        agent: 'responder',
        incident_id: incident.id
    };
}

export default {
    handleEmergencyRequest,
    calculateSurgePricing,
    optimizeProviderRouting,
    coordinateMultiProviderResponse
};
