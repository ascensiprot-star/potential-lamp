/**
 * Chain-of-Thought Reasoning for Simon Intelligence System
 * Simon thinks before he speaks — complex tasks require step-by-step reasoning
 * For Tier 3 (reasoning) and Tier 4 (deep) tasks only
 */

import { callAI } from './router.js';
import { getAgentKnowledge } from './knowledge.js';

/**
 * Chain-of-thought reasoning: think, then decide
 * For complex tasks that require careful step-by-step analysis
 */
export async function thinkThenDecide(context, task, outputSchema, tier = 'reasoning') {
  const start = Date.now();
  
  try {
    // Step 1: Thinking pass — free-form reasoning, no JSON
    const thinkingPrompt = `
${getAgentKnowledge('general')}

CURRENT TASK: ${task}

CONTEXT: ${JSON.stringify(context, null, 2)}

Think carefully through this problem step by step. Consider:
- What data do you have and what is missing
- What are the risks and edge cases
- What would a wrong decision look like
- What signals point to the right decision
- What are the alternatives and their trade-offs

Think out loud. Be thorough. Do not output JSON yet. Just think.
`;

    const thinking = await callAI(
      tier,
      thinkingPrompt,
      '',
      { temperature: 0.3, maxTokens: 600 }
    );

    if (!thinking) {
      throw new Error('Thinking pass failed');
    }

    console.log(`[Simon Reasoning] Thinking pass completed in ${Date.now() - start}ms`);

    // Step 2: Decision pass — uses the thinking as additional context
    const decisionPrompt = `
${getAgentKnowledge('general')}

YOUR REASONING: ${thinking}

Based on your reasoning above, now output a precise JSON decision.

OUTPUT SCHEMA:
${JSON.stringify(outputSchema, null, 2)}

Only output valid JSON. No explanation. No markdown. No text outside the JSON.
`;

    const decision = await callAI(
      tier,
      decisionPrompt,
      '',
      { temperature: 0.15, maxTokens: 400, responseFormat: { type: 'json_object' } }
    );

    if (!decision) {
      throw new Error('Decision pass failed');
    }

    const totalDuration = Date.now() - start;
    console.log(`[Simon Reasoning] Chain-of-thought completed in ${totalDuration}ms`);

    return {
      thinking,
      decision,
      confidence: scoreConfidence(thinking, decision),
      reasoning_time: totalDuration
    };

  } catch (error) {
    console.error('[Simon Reasoning] Chain-of-thought failed:', error);
    
    // Fallback to direct decision if chain-of-thought fails
    return {
      thinking: null,
      decision: null,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Score confidence based on quality of thinking and decision
 */
function scoreConfidence(thinking, decision) {
  let confidence = 70; // Base confidence

  // Check thinking quality
  if (thinking && thinking.length > 100) {
    confidence += 10; // Substantial thinking
  }
  
  if (thinking && (thinking.includes('risk') || thinking.includes('consider') || thinking.includes('alternative'))) {
    confidence += 5; // Showed consideration of risks/alternatives
  }

  // Check decision quality
  if (decision && Object.keys(decision).length >= 3) {
    confidence += 5; // Structured decision
  }
  
  if (decision && decision.confidence) {
    confidence = Math.min(confidence, decision.confidence);
  }

  return Math.min(100, confidence);
}

/**
 * Rapid reasoning for urgent decisions (emergency dispatch, etc.)
 * Single-pass with structured thinking
 */
async function rapidReasoning(context, task, outputSchema, tier = 'reasoning') {
  const start = Date.now();
  
  try {
    const prompt = `
${getAgentKnowledge('general')}

CURRENT TASK: ${task}

CONTEXT: ${JSON.stringify(context, null, 2)}

Think through this quickly and output a decision.

THINKING PROCESS (brief):
1. What is the immediate priority?
2. What are the key factors?
3. What is the best action?

OUTPUT SCHEMA:
${JSON.stringify(outputSchema, null, 2)}

Output valid JSON only.
`;

    const result = await callAI(
      tier,
      prompt,
      '',
      { temperature: 0.1, maxTokens: 300, responseFormat: { type: 'json_object' } }
    );

    const duration = Date.now() - start;
    console.log(`[Simon Reasoning] Rapid reasoning completed in ${duration}ms`);

    return {
      thinking: null, // No explicit thinking output for speed
      decision: result,
      confidence: result?.confidence || 75,
      reasoning_time: duration
    };

  } catch (error) {
    console.error('[Simon Reasoning] Rapid reasoning failed:', error);
    return {
      thinking: null,
      decision: null,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Multi-step reasoning for complex scenarios
 * Break down complex problems into sequential steps
 */
async function multiStepReasoning(steps, tier = 'reasoning') {
  const start = Date.now();
  const results = [];
  let accumulatedContext = {};

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`[Simon Reasoning] Executing step ${i + 1}/${steps.length}: ${step.name}`);

      const stepPrompt = `
${getAgentKnowledge('general')}

STEP ${i + 1}: ${step.name}
CONTEXT: ${JSON.stringify({ ...accumulatedContext, ...step.context }, null, 2)}
TASK: ${step.task}

${step.schema ? `OUTPUT SCHEMA: ${JSON.stringify(step.schema, null, 2)}` : ''}
`;

      const result = await callAI(
        tier,
        stepPrompt,
        '',
        { temperature: 0.15, maxTokens: step.maxTokens || 400, responseFormat: step.schema ? { type: 'json_object' } : undefined }
      );

      results.push({
        step: step.name,
        result,
        success: !!result
      });

      if (result && step.outputKey) {
        accumulatedContext[step.outputKey] = result;
      }

      if (!result) {
        console.warn(`[Simon Reasoning] Step ${i + 1} failed, stopping sequence`);
        break;
      }
    }

    const totalDuration = Date.now() - start;
    console.log(`[Simon Reasoning] Multi-step reasoning completed in ${totalDuration}ms`);

    return {
      steps: results,
      final_context: accumulatedContext,
      success: results.every(r => r.success),
      reasoning_time: totalDuration
    };

  } catch (error) {
    console.error('[Simon Reasoning] Multi-step reasoning failed:', error);
    return {
      steps: results,
      error: error.message,
      success: false
    };
  }
}

/**
 * Determine if a task requires chain-of-thought reasoning
 */
export function requiresChainOfThought(taskType) {
  const complexTasks = [
    'fraud_analysis',
    'wallet_freeze_decision',
    'provider_suspension',
    'dispute_resolution',
    'escalation_decision',
    'complex_scoring',
    'autonomous_action'
  ];

  return complexTasks.includes(taskType);
}

/**
 * Determine if a task requires multi-step reasoning
 */
export function requiresMultiStep(taskType) {
  const multiStepTasks = [
    'platform_anomaly_analysis',
    'emergency_response_coordination',
    'complex_orchestration',
    'multi_agent_coordination'
  ];

  return multiStepTasks.includes(taskType);
}

/**
 * Determine appropriate reasoning tier for task
 */
export function getReasoningTier(taskType, urgency = 'normal') {
  if (urgency === 'emergency') {
    return 'reasoning'; // Fast but thorough for emergencies
  }

  const deepTasks = [
    'platform_anomaly_analysis',
    'emergency_response_coordination',
    'complex_orchestration'
  ];

  if (deepTasks.includes(taskType)) {
    return 'deep';
  }

  return 'reasoning';
}

export default {
  thinkThenDecide,
  rapidReasoning,
  multiStepReasoning,
  requiresChainOfThought,
  requiresMultiStep,
  getReasoningTier
};