/**
 * Ensemble Decision System for Simon Intelligence System
 * For decisions involving money above PKR 10,000 or account actions like freezing/suspension
 * Simon queries two models and takes consensus. If they disagree, escalate to human.
 */

import { callAI } from './router.js';
import { getAgentKnowledge } from './knowledge.js';

/**
 * Ensemble decision using two models in parallel
 * For high-stakes financial and account actions
 */
async function ensembleDecide(context, task, outputSchema, systemPrompt = null) {
  const start = Date.now();
  
  const basePrompt = systemPrompt || `
${getAgentKnowledge('general')}

You are making a critical decision that involves financial consequences or account actions.
Be precise, careful, and conservative. When in doubt, recommend human review.
`;
  
  try {
    // Run two models in parallel
    const [decisionA, decisionB] = await Promise.all([
      callAI(
        'reasoning',
        basePrompt,
        `${task}\n\nContext: ${JSON.stringify(context, null, 2)}`,
        { temperature: 0.15, maxTokens: 400, responseFormat: { type: 'json_object' } }
      ),
      callAI(
        'fast',
        basePrompt,
        `${task}\n\nContext: ${JSON.stringify(context, null, 2)}`,
        { temperature: 0.1, maxTokens: 300, responseFormat: { type: 'json_object' } }
      )
    ]);

    if (!decisionA || !decisionB) {
      console.warn('[Simon Ensemble] One or both models failed');
      return {
        action: 'human_review',
        confidence: 50,
        reason: 'One or both models failed',
        decisions: { decisionA, decisionB },
        ensemble_failed: true
      };
    }

    // Compare decisions
    const agree = compareDecisions(decisionA, decisionB);
    const avgConfidence = ((decisionA.confidence || 50) + (decisionB.confidence || 50)) / 2;
    
    const duration = Date.now() - start;
    console.log(`[Simon Ensemble] Parallel decisions completed in ${duration}ms`);
    console.log(`[Simon Ensemble] Agreement: ${agree}, Avg Confidence: ${avgConfidence.toFixed(1)}`);

    // If models disagree or low confidence, escalate to human
    if (!agree || avgConfidence < 75) {
      console.log('[Simon Ensemble] Models disagreed or low confidence - escalating to human');
      
      return {
        action: 'human_review',
        confidence: avgConfidence,
        reason: !agree ? 'Models disagreed on action' : 'Low confidence from both models',
        decisions: {
          model_a: decisionA,
          model_b: decisionB
        },
        agreement: agree,
        ensemble: true,
        human_review_required: true
      };
    }

    // Models agree - use consensus decision
    console.log('[Simon Ensemble] Models agreed - proceeding with consensus');
    
    // Merge the two decisions, preferring the reasoning model's output
    const consensusDecision = mergeDecisions(decisionA, decisionB);
    
    return {
      ...consensusDecision,
      confidence: avgConfidence,
      ensemble: true,
      agreement: true,
      decisions: {
        model_a: decisionA,
        model_b: decisionB
      }
    };

  } catch (error) {
    console.error('[Simon Ensemble] Ensemble decision failed:', error);
    
    return {
      action: 'human_review',
      confidence: 30,
      reason: 'Ensemble system error',
      error: error.message,
      ensemble_failed: true
    };
  }
}

/**
 * Compare if two decisions agree on the critical action
 */
function compareDecisions(decisionA, decisionB) {
  // Primary comparison: action field
  if (decisionA.action && decisionB.action) {
    return decisionA.action === decisionB.action;
  }
  
  // Secondary comparison: similar fields
  const keysA = Object.keys(decisionA).filter(k => k !== 'confidence');
  const keysB = Object.keys(decisionB).filter(k => k !== 'confidence');
  
  if (keysA.length === 0 || keysB.length === 0) return false;
  
  // Check if majority of key fields match
  let matches = 0;
  for (const key of keysA) {
    if (decisionB[key] && decisionB[key] === decisionA[key]) {
      matches++;
    }
  }
  
  const matchRatio = matches / Math.max(keysA.length, keysB.length);
  return matchRatio >= 0.7; // 70% match threshold
}

/**
 * Merge two decisions into consensus
 */
function mergeDecisions(decisionA, decisionB) {
  const merged = { ...decisionA };
  
  // Use reasoning model (A) as primary, but include fields from B that A might miss
  for (const key of Object.keys(decisionB)) {
    if (!merged[key] && decisionB[key]) {
      merged[key] = decisionB[key];
    }
  }
  
  // Average numeric fields where both exist
  for (const key of Object.keys(decisionA)) {
    if (typeof decisionA[key] === 'number' && typeof decisionB[key] === 'number') {
      merged[key] = (decisionA[key] + decisionB[key]) / 2;
    }
  }
  
  // Combine array fields
  for (const key of Object.keys(decisionA)) {
    if (Array.isArray(decisionA[key]) && Array.isArray(decisionB[key])) {
      merged[key] = [...new Set([...decisionA[key], ...decisionB[key]])];
    }
  }
  
  return merged;
}

/**
 * Determine if a decision requires ensemble
 */
export function requiresEnsemble(context, task) {
  // Financial threshold: PKR 10,000
  if (context.amount && context.amount > 10000) {
    return true;
  }
  
  // Account actions
  const accountActions = [
    'freeze_wallet',
    'suspend_provider',
    'suspend_user',
    'close_account',
    'permanent_ban'
  ];
  
  if (context.action && accountActions.includes(context.action)) {
    return true;
  }
  
  // Large payouts
  if (context.payout_amount && context.payout_amount > 10000) {
    return true;
  }
  
  // Bulk actions
  if (context.is_bulk_action || context.batch_size > 1) {
    return true;
  }
  
  return false;
}

/**
 * Lightweight ensemble for medium-stakes decisions
 */
async function lightEnsemble(context, task, outputSchema) {
  const start = Date.now();
  
  try {
    // Use two fast models instead of reasoning + fast
    const [decisionA, decisionB] = await Promise.all([
      callAI(
        'fast',
        getAgentKnowledge('general'),
        `${task}\n\nContext: ${JSON.stringify(context, null, 2)}`,
        { temperature: 0.1, maxTokens: 300, responseFormat: { type: 'json_object' } }
      ),
      callAI(
        'fast',
        getAgentKnowledge('general'),
        `${task}\n\nContext: ${JSON.stringify(context, null, 2)}`,
        { temperature: 0.15, maxTokens: 300, responseFormat: { type: 'json_object' } }
      )
    ]);

    if (!decisionA || !decisionB) {
      return decisionA || decisionB || { action: 'monitor', confidence: 40 };
    }

    const agree = compareDecisions(decisionA, decisionB);
    const avgConfidence = ((decisionA.confidence || 50) + (decisionB.confidence || 50)) / 2;
    
    console.log(`[Simon Ensemble] Light ensemble completed in ${Date.now() - start}ms`);
    
    if (agree && avgConfidence >= 70) {
      return mergeDecisions(decisionA, decisionB);
    }
    
    // Return the higher confidence decision if they disagree
    return (decisionA.confidence || 50) > (decisionB.confidence || 50) ? decisionA : decisionB;

  } catch (error) {
    console.error('[Simon Ensemble] Light ensemble failed:', error);
    return { action: 'monitor', confidence: 40, error: error.message };
  }
}

/**
 * Triple ensemble for critical decisions
 * Uses three models for maximum consensus
 */
async function tripleEnsemble(context, task, outputSchema) {
  const start = Date.now();
  
  try {
    const [decisionA, decisionB, decisionC] = await Promise.all([
      callAI('reasoning', getAgentKnowledge('general'), `${task}\n\nContext: ${JSON.stringify(context, null, 2)}`, { temperature: 0.15, maxTokens: 400, responseFormat: { type: 'json_object' } }),
      callAI('fast', getAgentKnowledge('general'), `${task}\n\nContext: ${JSON.stringify(context, null, 2)}`, { temperature: 0.1, maxTokens: 300, responseFormat: { type: 'json_object' } }),
      callAI('fast', getAgentKnowledge('general'), `${task}\n\nContext: ${JSON.stringify(context, null, 2)}`, { temperature: 0.2, maxTokens: 300, responseFormat: { type: 'json_object' } })
    ]);

    const decisions = [decisionA, decisionB, decisionC].filter(d => d);
    
    if (decisions.length < 2) {
      return {
        action: 'human_review',
        confidence: 30,
        reason: 'Insufficient model responses for triple ensemble'
      };
    }

    // Find most common action
    const actionCounts = {};
    for (const decision of decisions) {
      const action = decision.action || 'unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    }
    
    const mostCommonAction = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const consensusDecisions = decisions.filter(d => d.action === mostCommonAction);
    
    if (consensusDecisions.length < 2) {
      return {
        action: 'human_review',
        confidence: 40,
        reason: 'No clear consensus in triple ensemble',
        action_counts: actionCounts
      };
    }

    // Merge consensus decisions
    const consensus = consensusDecisions.reduce((acc, d) => mergeDecisions(acc, d), {});
    const avgConfidence = consensusDecisions.reduce((sum, d) => sum + (d.confidence || 50), 0) / consensusDecisions.length;
    
    console.log(`[Simon Ensemble] Triple ensemble completed in ${Date.now() - start}ms`);
    
    return {
      ...consensus,
      confidence: avgConfidence,
      ensemble: 'triple',
      consensus_count: consensusDecisions.length,
      action_counts: actionCounts
    };

  } catch (error) {
    console.error('[Simon Ensemble] Triple ensemble failed:', error);
    return {
      action: 'human_review',
      confidence: 30,
      reason: 'Triple ensemble system error',
      error: error.message
    };
  }
}

/**
 * Auto-select appropriate ensemble method
 */
export async function smartEnsemble(context, task, outputSchema, systemPrompt = null) {
  // Critical: PKR 50,000+
  if (context.amount && context.amount > 50000) {
    return tripleEnsemble(context, task, outputSchema);
  }
  
  // High-stakes: PKR 10,000-50,000 or account actions
  if (requiresEnsemble(context, task)) {
    return ensembleDecide(context, task, outputSchema, systemPrompt);
  }
  
  // Medium-stakes: PKR 5,000-10,000
  if (context.amount && context.amount > 5000) {
    return lightEnsemble(context, task, outputSchema);
  }
  
  // No ensemble needed
  return null;
}

export default {
  ensembleDecide,
  requiresEnsemble,
  lightEnsemble,
  tripleEnsemble,
  smartEnsemble,
  compareDecisions,
  mergeDecisions
};