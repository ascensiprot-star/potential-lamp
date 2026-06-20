/**
 * 4-Tier Model Router for Simon Intelligence System
 * Routes AI calls to appropriate models based on task complexity and latency requirements
 * TIER 1 — INSTANT (under 300ms): Classification, parsing, routing, intent detection
 * TIER 2 — FAST (under 1.5s): Recommendations, insights, zone health, provider scoring
 * TIER 3 — REASONING (under 4s): Forecasting, fraud analysis, complex decisions
 * TIER 4 — DEEP REASONING (under 8s): Orchestration, autonomous decisions, multi-step plans
 */

const MODEL_TIERS = {
  instant:   'meta-llama/llama-3.1-8b-instruct:free',
  fast:      'google/gemma-2-9b-it:free',
  reasoning: 'mistralai/mistral-7b-instruct:free',
  deep:      'qwen/qwen-2.5-72b-instruct:free',
};

const MAX_TOKENS = {
  instant: 150,
  fast: 400,
  reasoning: 800,
  deep: 1500
};

const TEMPERATURES = {
  instant: 0.1,
  fast: 0.2,
  reasoning: 0.15,
  deep: 0.2
};

// Performance targets for instrumentation
const PERFORMANCE_TARGETS = {
  voice_search_parse: 300,
  home_screen_load: 1500,
  booking_analysis: 1200,
  zone_health: 800,
  provider_recommendations: 1000,
  fraud_screening: 400,
  demand_forecast: 3000,
  emergency_dispatch: 500,
  autonomous_decision: 6000
};

/**
 * Call AI with tier-based routing
 * @param {string} tier - The model tier (instant/fast/reasoning/deep)
 * @param {string} systemPrompt - System prompt for the AI
 * @param {string} userPrompt - User prompt for the AI
 * @param {object} options - Additional options (temperature, maxTokens, etc.)
 * @returns {Promise<object|null>} - AI response or null if model fails
 */
export async function callAI(tier, systemPrompt, userPrompt, options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn('[Simon AI] OPENROUTER_API_KEY not configured');
        return null;
    }

    const model = MODEL_TIERS[tier] || MODEL_TIERS.fast;
    const maxTokens = options.maxTokens || MAX_TOKENS[tier];
    const temperature = options.temperature || TEMPERATURES[tier];

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://truvornex.com',
                'X-Title': 'Truvornex-Simon'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: temperature,
                max_tokens: maxTokens,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            console.warn(`[Simon AI] Tier ${tier} model ${model} failed with status ${response.status}`);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            console.warn(`[Simon AI] Tier ${tier} model ${model} returned no content`);
            return null;
        }

        // Parse JSON response
        try {
            const parsed = JSON.parse(content);
            console.log(`[Simon AI] Tier ${tier} -> ${model} success`);
            return parsed;
        } catch (parseError) {
            console.warn(`[Simon AI] Tier ${tier} model ${model} returned invalid JSON`);
            return null;
        }
    } catch (error) {
        console.warn(`[Simon AI] Tier ${tier} model ${model} error:`, error.message);
        return null;
    }
}

/**
 * Calculate confidence score based on AI response quality
 * @param {object} aiResponse - The AI response
 * @param {boolean} usedFallback - Whether fallback was used
 * @returns {number} - Confidence score 0-100
 */
export function calculateConfidence(aiResponse, usedFallback = false) {
    if (!aiResponse) return 40; // No AI response - low confidence
    
    let confidence = 85; // Base confidence for successful AI response
    
    // Check for internal consistency indicators
    if (aiResponse.confidence) {
        confidence = Math.min(confidence, aiResponse.confidence * 100);
    }
    
    // Check for uncertainty indicators
    if (aiResponse.uncertainty || aiResponse.unsure) {
        confidence -= 20;
    }
    
    // Check for completeness
    if (Object.keys(aiResponse).length < 3) {
        confidence -= 15;
    }
    
    // Apply fallback penalty
    if (usedFallback) {
        confidence -= 15;
    }
    
    return Math.max(0, Math.min(100, confidence));
}

/**
 * Validate AI response structure against expected schema
 * @param {object} response - AI response to validate
 * @param {array} requiredFields - Required field names
 * @returns {boolean} - Whether response is valid
 */
export function validateAIResponse(response, requiredFields = []) {
    if (!response || typeof response !== 'object') return false;
    
    for (const field of requiredFields) {
        if (!(field in response)) {
            console.warn(`[Simon AI] Missing required field: ${field}`);
            return false;
        }
    }
    
    return true;
}

export default { callAI, calculateConfidence, validateAIResponse };
export { MODEL_TIERS, MAX_TOKENS, TEMPERATURES, PERFORMANCE_TARGETS };
