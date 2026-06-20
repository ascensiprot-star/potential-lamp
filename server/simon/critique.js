/**
 * Self-Critique Loop for Simon Intelligence System
 * Simon questions himself before acting on high-stakes decisions
 * This is what separates Simon from a generic AI wrapper
 */

import { callAI } from './router.js';
import { getAgentKnowledge } from './knowledge.js';

/**
 * Self-critique decision for high-stakes actions
 * For decisions above confidence threshold 85 where wrong answers have financial/safety consequences
 */
export async function selfCritiqueDecision(decision, context, tier = 'fast') {
  const start = Date.now();
  
  try {
    const critiquePrompt = `
${getAgentKnowledge('general')}

You are Simon's internal auditor. You are given a decision Simon is about to make.

Your job: Find flaws, missing context, wrong assumptions, or edge cases Simon missed.
Be adversarial. Challenge the decision. If the decision is sound, say so.

DECISION TO AUDIT:
${JSON.stringify(decision, null, 2)}

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON with this exact schema:
{
  "approved": boolean,
  "concerns": ["string"],
  "revised_confidence": number (0-100),
  "block_reason": "string|null",
  "suggestions": ["string"]
}

Be thorough. A wrong decision could have financial or safety consequences.
`;

    const critique = await callAI(
      tier,
      critiquePrompt,
      '',
      { temperature: 0.1, maxTokens: 300, responseFormat: { type: 'json_object' } }
    );

    if (!critique) {
      console.warn('[Simon Critique] Critique failed, proceeding with caution');
      return {
        ...decision,
        confidence: Math.min(decision.confidence || 70, 70), // Reduce confidence
        human_review_required: true,
        block_reason: 'Critique system unavailable',
        self_critiqued: false
      };
    }

    const duration = Date.now() - start;
    console.log(`[Simon Critique] Self-critique completed in ${duration}ms`);

    // Check if critique approved the decision
    if (!critique.approved || critique.revised_confidence < 70) {
      console.log('[Simon Critique] Decision blocked or confidence reduced:', critique);
      
      return {
        ...decision,
        confidence: critique.revised_confidence,
        human_review_required: true,
        block_reason: critique.block_reason || 'Internal audit found concerns',
        concerns: critique.concerns || [],
        suggestions: critique.suggestions || [],
        self_critiqued: true,
        critique_result: critique
      };
    }

    // Decision approved
    console.log('[Simon Critique] Decision approved by internal audit');
    
    return {
      ...decision,
      confidence: critique.revised_confidence,
      self_critiqued: true,
      critique_result: critique,
      concerns: critique.concerns || [],
      suggestions: critique.suggestions || []
    };

  } catch (error) {
    console.error('[Simon Critique] Self-critique failed:', error);
    
    // If critique fails, be conservative
    return {
      ...decision,
      confidence: Math.min(decision.confidence || 70, 65),
      human_review_required: true,
      block_reason: 'Critique system error',
      self_critiqued: false
    };
  }
}

/**
 * Determine if a decision requires self-critique
 */
export function requiresSelfCritique(decision, context) {
  // High confidence decisions with financial/safety implications
  const highStakesActions = [
    'freeze_wallet',
    'suspend_provider',
    'escalate_booking',
    'approve_large_payout',
    'emergency_dispatch',
    'flag_user'
  ];

  const isHighStakes = highStakesActions.includes(decision.action);
  const isHighConfidence = (decision.confidence || 0) >= 85;
  const hasFinancialImpact = context.amount && context.amount > 10000; // PKR 10,000

  return isHighStakes && (isHighConfidence || hasFinancialImpact);
}

/**
 * Auto-critique for medium-stakes decisions
 * Less thorough but still provides safety check
 */
async function autoCritique(decision, context, tier = 'fast') {
  const start = Date.now();
  
  try {
    const critiquePrompt = `
${getAgentKnowledge('general')}

Quick audit of this decision. Look for obvious issues.

DECISION:
${JSON.stringify(decision, null, 2)}

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON:
{
  "approved": boolean,
  "major_issues": ["string"],
  "confidence_adjustment": number (-20 to +10)
}

Keep it brief. Focus on major issues only.
`;

    const critique = await callAI(
      tier,
      critiquePrompt,
      '',
      { temperature: 0.0, maxTokens: 150, responseFormat: { type: 'json_object' } }
    );

    if (!critique) {
      return decision; // Proceed if critique fails
    }

    const duration = Date.now() - start;
    console.log(`[Simon Critique] Auto-critique completed in ${duration}ms`);

    if (!critique.approved) {
      return {
        ...decision,
        confidence: Math.max(0, (decision.confidence || 70) + (critique.confidence_adjustment || -10)),
        concerns: critique.major_issues || [],
        auto_critiqued: true
      };
    }

    return {
      ...decision,
      confidence: Math.max(0, (decision.confidence || 70) + (critique.confidence_adjustment || 0)),
      auto_critiqued: true
    };

  } catch (error) {
    console.error('[Simon Critique] Auto-critique failed:', error);
    return decision; // Proceed if critique fails
  }
}

/**
 * Full safety check: self-critique + ensemble + final validation
 */
export async function fullSafetyCheck(decision, context, ensembleResult = null, tier = 'fast') {
  console.log('[Simon Critique] Running full safety check...');
  
  let safeDecision = { ...decision };
  
  // Apply ensemble results if available
  if (ensembleResult) {
    if (ensembleResult.action === 'human_review') {
      safeDecision.human_review_required = true;
      safeDecision.ensemble_disagreement = true;
    }
  }
  
  // Run self-critique if required
  if (requiresSelfCritique(decision, context)) {
    safeDecision = await selfCritiqueDecision(safeDecision, context, tier);
  } else {
    // Run auto-critique for medium-stakes
    safeDecision = await autoCritique(safeDecision, context, tier);
  }
  
  // Final validation checks
  const validationErrors = validateDecision(safeDecision, context);
  
  if (validationErrors.length > 0) {
    console.warn('[Simon Critique] Validation errors:', validationErrors);
    return {
      ...safeDecision,
      human_review_required: true,
      block_reason: 'Validation failed',
      validation_errors: validationErrors
    };
  }
  
  console.log('[Simon Critique] Safety check passed');
  return safeDecision;
}

/**
 * Validate decision against business rules
 */
function validateDecision(decision, context) {
  const errors = [];
  
  // Check for required fields
  if (!decision.action) {
    errors.push('Missing action field');
  }
  
  // Check confidence bounds
  if (decision.confidence < 0 || decision.confidence > 100) {
    errors.push('Invalid confidence value');
  }
  
  // Business rule validations
  if (decision.action === 'freeze_wallet' && !context.user_id) {
    errors.push('Cannot freeze wallet without user_id');
  }
  
  if (decision.action === 'suspend_provider' && !context.provider_id) {
    errors.push('Cannot suspend provider without provider_id');
  }
  
  if (decision.action === 'approve_payout' && context.amount > 50000) {
    errors.push('Payouts above PKR 50,000 require manual approval');
  }
  
  // Safety checks
  if (decision.human_review_required && decision.confidence > 90) {
    errors.push('High confidence decisions should not require human review');
  }
  
  return errors;
}

/**
 * Decision quality score for monitoring
 */
export function scoreDecisionQuality(decision, critiqueResult) {
  let score = 100;
  
  // Penalize human review requirements
  if (decision.human_review_required) {
    score -= 20;
  }
  
  // Penalize low confidence
  if (decision.confidence < 70) {
    score -= 15;
  } else if (decision.confidence < 85) {
    score -= 5;
  }
  
  // Penalize concerns from critique
  if (critiqueResult && critiqueResult.concerns && critiqueResult.concerns.length > 0) {
    score -= critiqueResult.concerns.length * 5;
  }
  
  // Bonus for self-critique passing
  if (decision.self_critiqued && !decision.human_review_required) {
    score += 10;
  }
  
  return Math.max(0, score);
}

export default {
  selfCritiqueDecision,
  requiresSelfCritique,
  autoCritique,
  fullSafetyCheck,
  validateDecision,
  scoreDecisionQuality
};