/**
 * Prompt Architecture Factory for Simon Intelligence System
 * Every Simon prompt must follow the exact 5-layer structure for maximum output quality
 * LAYER 1 — IDENTITY: Who Simon is + dynamic market knowledge based on location
 * LAYER 2 — ROLE: What specific agent is running right now
 * LAYER 3 — CONTEXT: Live platform data for this user/zone right now
 * LAYER 4 — EXAMPLES: 2 concrete input→output examples (with dynamic placeholders)
 * LAYER 5 — TASK: The specific thing to do right now + exact JSON schema
 */

import { getAgentKnowledge } from './knowledge.js';
import { formatContextForPrompt } from './context.js';
import { getLanguageInstructions } from './language.js';
import { getDynamicMarketContext, formatCurrency, calculateMinimumServicePrice } from './geo-context.js';

/**
 * Build a complete Simon prompt following the 5-layer architecture
 */
export function buildPrompt(role, context, examples, task, schema, options = {}) {
  const {
    agentType = 'general',
    includeLanguage = true,
    includeContext = true,
    includeMarketContext = true,
    customIdentity = null,
    userLocation = null // { lat, lng, currency_code, timezone }
  } = options;
  
  let prompt = '';
  
  // LAYER 1 — IDENTITY + DYNAMIC MARKET CONTEXT
  prompt += customIdentity || getAgentKnowledge(agentType);
  
  // Add dynamic market context if location provided
  if (includeMarketContext && userLocation && userLocation.lat && userLocation.lng) {
    prompt += '\n\n';
    prompt += getDynamicMarketContext(userLocation.lat, userLocation.lng, userLocation.user_id);
  }
  
  prompt += '\n\n';
  
  // LAYER 2 — ROLE
  prompt += `=== CURRENT ROLE ===\n`;
  prompt += `You are acting as: ${role}\n`;
  prompt += `Focus your reasoning and output specifically to this role.\n`;
  prompt += '=== END ROLE ===\n\n';
  
  // LAYER 3 — CONTEXT
  if (includeContext && context) {
    prompt += formatContextForPrompt(context);
    prompt += '\n';
  }
  
  // LAYER 4 — EXAMPLES (with dynamic currency formatting)
  if (examples) {
    let dynamicExamples = examples;
    
    // Replace currency placeholders if user location provided
    if (userLocation && userLocation.currency_code) {
      dynamicExamples = replaceCurrencyPlaceholders(examples, userLocation.currency_code);
    }
    
    prompt += `=== EXAMPLES ===\n`;
    prompt += `Study these examples carefully. Match the format, tone, and specificity.\n`;
    prompt += dynamicExamples;
    prompt += '=== END EXAMPLES ===\n\n';
  }
  
  // LAYER 5 — TASK
  prompt += `=== TASK ===\n`;
  prompt += task;
  prompt += '\n\n';
  
  if (schema) {
    prompt += `OUTPUT SCHEMA:\n`;
    prompt += `You must output valid JSON following this exact schema:\n`;
    prompt += JSON.stringify(schema, null, 2);
    prompt += '\n';
    prompt += `Only output the JSON. No markdown formatting. No explanation.\n`;
  }
  
  prompt += '=== END TASK ===\n';
  
  // Add language instructions if needed
  if (includeLanguage) {
    prompt += '\n';
    prompt += getLanguageInstructions();
  }
  
  return prompt;
}

/**
 * Replace currency placeholders in examples with actual currency
 */
function replaceCurrencyPlaceholders(examples, currencyCode) {
  // Replace PKR references with the actual currency
  const currencySymbol = getCurrencySymbol(currencyCode);
  
  return examples
    .replace(/PKR/g, currencyCode)
    .replace(/₨/g, currencySymbol)
    .replace(/\$1000/g, `${currencySymbol}1000`)
    .replace(/\$1500/g, `${currencySymbol}1500`)
    .replace(/\$5000/g, `${currencySymbol}5000`);
}

/**
 * Get currency symbol from currency code
 */
function getCurrencySymbol(currencyCode) {
  const symbols = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    PKR: '₨',
    INR: '₹',
    NGN: '₦',
    AUD: 'A$',
    BRL: 'R$',
    CAD: 'C$',
    JPY: '¥'
  };
  return symbols[currencyCode] || currencyCode;
}

/**
 * Few-shot examples for common Simon functions
 */
export const EXAMPLES = {
  booking_analysis: `
Example 1:
Input: Service=Cleaning, Date=Friday, Time=10:00, Price=PKR1500, Area=Latifabad, Weekend=false
Output: {"demandLevel":"high","priceFairness":"fair","timingScore":9,"timingSuggestion":"Friday mornings are peak for cleaning — this slot has 96% provider on-time rate.","savingsTip":"Book a bundle with Handyman this week and save PKR 400."}

Example 2:  
Input: Service=Plumbing, Date=Sunday, Time=14:00, Price=PKR5000, Area=Gulshan, Weekend=true
Output: {"demandLevel":"surge","priceFairness":"above_market","timingScore":5,"timingSuggestion":"Sunday afternoon surge — providers charge 20% premium. Monday morning would save you PKR 800.","savingsTip":"Same provider available Monday 9AM at standard rate."}
`,

  fraud_detection: `
Example 1:
Input: Transaction=PKR15000, NewUser=true, DifferentIP=true, OddHour=true
Output: {"riskLevel":"high","action":"freeze_wallet","reason":"New user with large transaction from unusual IP at odd hours","confidence":92}

Example 2:
Input: Transaction=PKR800, EstablishedUser=true, SameIP=true, NormalHour=true
Output: {"riskLevel":"low","action":"approve","reason":"Normal transaction pattern for established user","confidence":85}
`,

  provider_scoring: `
Example 1:
Input: Provider=ID123, CompletionRate=94%, AvgRating=4.7, ResponseTime=8min, Zone=Gulshan
Output: {"overallScore":88,"tier":"gold","strengths":["high completion","excellent rating","fast response"],"weaknesses":["limited availability"],"recommendation":"Increase service radius to capture more demand"}

Example 2:
Input: Provider=ID456, CompletionRate=72%, AvgRating=3.9, ResponseTime=25min, Zone=Latifabad
Output: {"overallScore":65,"tier":"silver","strengths":["consistent availability"],"weaknesses":["low completion","slow response","rating below average"],"recommendation":"Focus on punctuality and completion rate to improve score"}
`,

  demand_forecast: `
Example 1:
Input: Zone=Latifabad, Day=Saturday, Hour=10, Season=Summer
Output: {"expectedDemand":"very_high","recommendedProviders":12,"priceSuggestion":"surge_15","reasoning":"Saturday morning in summer is peak demand for cleaning and AC services"}

Example 2:
Input: Zone=Gulshan, Day=Tuesday, Hour=14, Season=Winter
Output: {"expectedDemand":"moderate","recommendedProviders":6,"priceSuggestion":"standard","reasoning":"Tuesday afternoon in winter has steady demand for heating and electrical services"}
`,

  home_insights: `
Example 1:
Input: User=ID789, Zone=Latifabad, Time=Morning, History=cleaning,plumbing
Output: {"insight":"Cleaning demand is high this morning — book now for best availability","recommendations":["Book cleaning before 11AM","Plumbing rates are lower this afternoon"],"trendingServices":["AC repair","Electrical"],"savingsOpportunity":"Bundle cleaning with gardening for 20% discount"}

Example 2:
Input: User=ID101, Zone=Gulshan, Time=Evening, History=cooking
Output: {"insight":"Evening cooking demand is moderate — good availability until 8PM","recommendations":["Book cooking slot for dinner prep","Consider meal prep service"],"trendingServices":["Home cooking","Driver"],"savingsOpportunity":"Weekly cooking subscription saves PKR 1500"}
`,

  voice_search_parse: `
Example 1:
Input: "mujhe safai ka kaam chahiye subah"
Output: {"service":"cleaning","urgency":"normal","time":"morning","language":"roman-urdu","confidence":95}

Example 2:
Input: "emergency plumbing needed now"
Output: {"service":"plumbing","urgency":"urgent","time":"immediate","language":"english","confidence":98}
`,

  provider_recommendation: `
Example 1:
Input: Service=Cleaning, Zone=Latifabad, Budget=PKR1200, Time=Morning
Output: {"providerId":"prov_123","name":"Ahmed Khan","rating":4.8,"price":PKR1000,"availability":"before_11AM","matchReason":"Highest rated in your zone, fits budget, available at preferred time","estimatedResponse":12}

Example 2:
Input: Service=Electrical, Zone=Gulshan, Budget=PKR2000, Time=Afternoon
Output: {"providerId":"prov_456","name":"Bilal Electronics","rating":4.5,"price":PKR1800,"availability":"2_4PM","matchReason":"Specializes in electrical work, good rating, reasonable price","estimatedResponse":18}
`
};

/**
 * JSON schemas for common outputs
 */
export const SCHEMAS = {
  booking_analysis: {
    demandLevel: "string (high|moderate|low|surge)",
    priceFairness: "string (fair|below_market|above_market)",
    timingScore: "number (1-10)",
    timingSuggestion: "string",
    savingsTip: "string"
  },

  fraud_detection: {
    riskLevel: "string (high|medium|low)",
    action: "string (freeze_wallet|flag_for_review|approve|require_verification)",
    reason: "string",
    confidence: "number (0-100)"
  },

  provider_scoring: {
    overallScore: "number (0-100)",
    tier: "string (gold|silver|bronze)",
    strengths: "array of strings",
    weaknesses: "array of strings",
    recommendation: "string"
  },

  demand_forecast: {
    expectedDemand: "string (very_high|high|moderate|low)",
    recommendedProviders: "number",
    priceSuggestion: "string (surge_10|surge_15|surge_20|standard)",
    reasoning: "string"
  },

  home_insights: {
    insight: "string",
    recommendations: "array of strings",
    trendingServices: "array of strings",
    savingsOpportunity: "string"
  },

  voice_search_parse: {
    service: "string",
    urgency: "string (urgent|high|normal|low)",
    time: "string",
    language: "string (english|urdu|roman-urdu)",
    confidence: "number (0-100)"
  },

  provider_recommendation: {
    providerId: "string",
    name: "string",
    rating: "number",
    price: "string",
    availability: "string",
    matchReason: "string",
    estimatedResponse: "number (minutes)"
  }
};

/**
 * Quick prompt builders for common tasks
 */
export function buildBookingAnalysisPrompt(context, task) {
  return buildPrompt(
    'Booking Analysis Agent',
    context,
    EXAMPLES.booking_analysis,
    task,
    SCHEMAS.booking_analysis,
    { agentType: 'customer' }
  );
}

export function buildFraudDetectionPrompt(context, task) {
  return buildPrompt(
    'Fraud Detection Agent',
    context,
    EXAMPLES.fraud_detection,
    task,
    SCHEMAS.fraud_detection,
    { agentType: 'fraud' }
  );
}

export function buildProviderScoringPrompt(context, task) {
  return buildPrompt(
    'Provider Scoring Agent',
    context,
    EXAMPLES.provider_scoring,
    task,
    SCHEMAS.provider_scoring,
    { agentType: 'provider' }
  );
}

export function buildDemandForecastPrompt(context, task) {
  return buildPrompt(
    'Demand Forecast Agent',
    context,
    EXAMPLES.demand_forecast,
    task,
    SCHEMAS.demand_forecast,
    { agentType: 'demand' }
  );
}

export function buildHomeInsightsPrompt(context, task) {
  return buildPrompt(
    'Home Insights Agent',
    context,
    EXAMPLES.home_insights,
    task,
    SCHEMAS.home_insights,
    { agentType: 'analyst' }
  );
}

export function buildVoiceSearchPrompt(context, task) {
  return buildPrompt(
    'Voice Search Parser',
    context,
    EXAMPLES.voice_search_parse,
    task,
    SCHEMAS.voice_search_parse,
    { agentType: 'general', includeContext: false }
  );
}

export function buildProviderRecommendationPrompt(context, task) {
  return buildPrompt(
    'Provider Recommendation Agent',
    context,
    EXAMPLES.provider_recommendation,
    task,
    SCHEMAS.provider_recommendation,
    { agentType: 'provider' }
  );
}

export default {
  buildPrompt,
  EXAMPLES,
  SCHEMAS,
  buildBookingAnalysisPrompt,
  buildFraudDetectionPrompt,
  buildProviderScoringPrompt,
  buildDemandForecastPrompt,
  buildHomeInsightsPrompt,
  buildVoiceSearchPrompt,
  buildProviderRecommendationPrompt
};