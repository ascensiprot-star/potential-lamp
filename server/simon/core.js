/**
 * Simon Core Orchestrator
 * Routes tasks to specialized agents, merges outputs, makes platform decisions
 * Implements Simon's reasoning loop: Observe → Remember → Reason → Decide → Act → Learn → Audit
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { executeTool } from './tools.js';
import { recallRelevantPatterns, learnFromDecision } from './memory.js';

// Import all specialized agents
import * as analyst from './analyst.js';
import * as fraud from './fraud.js';
import * as demand from './demand.js';
import * as provider from './provider.js';
import * as customer from './customer.js';
import * as responder from './responder.js';

/**
 * Simon's main reasoning loop
 */
export async function simonReasoningLoop(task, context = {}, agent = 'core') {
    try {
        // Step 1: Observe - collect relevant platform data
        const observation = await observePlatform(task, context);
        
        // Step 2: Remember - query Simon's memory for relevant patterns
        const memory = await recallRelevantPatterns({
            task: task,
            context: context,
            observation: observation
        });
        
        // Step 3: Reason - send full context to reasoning model
        const reasoning = await reasonAboutTask(task, context, observation, memory);
        
        // Step 4: Decide - parse structured decision
        const decision = parseDecision(reasoning, task);
        
        // Step 5: Act - execute tools if confidence meets threshold
        const actionResult = await executeDecision(decision, agent);
        
        // Step 6: Learn - write observations to memory
        const learning = await learnFromDecision(decision, actionResult, agent);
        
        // Step 7: Audit - write full decision record
        const auditRecord = await auditDecision(decision, actionResult, learning, agent);
        
        return {
            success: true,
            task: task,
            decision: decision,
            action_result: actionResult,
            learning: learning,
            audit_record: auditRecord,
            observation: observation,
            memory: memory,
            agent: agent
        };
        
    } catch (error) {
        console.error('[Simon Core] Reasoning loop failed:', error);
        return await fallbackDecision(task, context, agent);
    }
}

/**
 * Step 1: Observe platform data
 */
async function observePlatform(task, context) {
    try {
        const platformStats = await executeTool('query_platform_stats', [], 'core');
        
        let specificData = {};
        
        // Get task-specific data
        if (task.type === 'fraud_analysis' && context.transaction_id) {
            const { pool } = await import('../db.js');
            const { rows } = await pool.query(
                `SELECT * FROM wallet_transactions WHERE id = $1`,
                [context.transaction_id]
            );
            specificData.transaction = rows[0];
        }
        
        if (task.type === 'provider_scoring' && context.provider_id) {
            specificData.provider = await executeTool('get_provider_metrics', [context.provider_id], 'core');
        }
        
        if (task.type === 'customer_analysis' && context.user_id) {
            specificData.customer = await executeTool('get_user_profile', [context.user_id], 'core');
        }
        
        return {
            platform_stats: platformStats,
            specific_data: specificData,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('[Simon Core] Observation failed:', error);
        return { platform_stats: null, specific_data: {}, timestamp: new Date().toISOString() };
    }
}

/**
 * Step 3: Reason about the task using AI
 */
async function reasonAboutTask(task, context, observation, memory) {
    try {
        const systemPrompt = `You are Simon Core, the orchestrator of Truvornex's multi-agent AI system. You coordinate specialized agents and make platform decisions. 

Your reasoning process:
1. Analyze the task and context
2. Review relevant memory patterns
3. Determine which specialized agent(s) to consult
4. Synthesize agent outputs into a coherent decision
5. Assess confidence and risk

Return JSON:
{
    "agent_consulted": "primary agent name",
    "secondary_agents": ["agent1", "agent2"],
    "analysis": "detailed analysis of the situation",
    "decision": {
        "action": "action to take",
        "confidence": 0.0-1.0,
        "human_approval_required": boolean,
        "tools_to_call": [
            {
                "tool": "tool name",
                "parameters": {},
                "reasoning": "why this tool"
            }
        ],
        "reasoning": "decision reasoning",
        "risk_assessment": {
            "level": "low|medium|high",
            "factors": ["factor1", "factor2"]
        }
    },
    "memory_update": {
        "key": "memory key",
        "value": "value to store",
        "confidence": 0.0-1.0
    },
    "overall_confidence": 0.0-1.0
}`;
        
        const userPrompt = `Task: ${JSON.stringify(task)}\nContext: ${JSON.stringify(context)}\nObservation: ${JSON.stringify(observation)}\nMemory: ${JSON.stringify(memory)}`;
        
        const aiResponse = await callAI('core', systemPrompt, userPrompt, {
            temperature: 0.4,
            maxTokens: 1500
        });
        
        if (!aiResponse) {
            return await fallbackReasoning(task, observation);
        }
        
        if (!validateAIResponse(aiResponse, ['decision'])) {
            return await fallbackReasoning(task, observation);
        }
        
        return aiResponse;
        
    } catch (error) {
        console.error('[Simon Core] Reasoning failed:', error);
        return await fallbackReasoning(task, observation);
    }
}

/**
 * Fallback reasoning
 */
async function fallbackReasoning(task, observation) {
    let action = 'monitor';
    let confidence = 0.5;
    let humanApprovalRequired = false;
    let toolsToCall = [];
    
    // Simple rule-based decision
    switch (task.type) {
        case 'fraud_analysis':
            action = 'flag_for_review';
            confidence = 0.6;
            toolsToCall = [{
                tool: 'flag_transaction',
                parameters: { transaction_id: task.transaction_id, reason: 'Fraud suspected', risk_score: 60 },
                reasoning: 'High risk transaction detected'
            }];
            break;
            
        case 'provider_scoring':
            action = 'update_provider_metrics';
            confidence = 0.7;
            toolsToCall = [{
                tool: 'write_simon_memory',
                parameters: { key: `provider_score:${task.provider_id}`, value: { score: 75 }, ttl_hours: 24 },
                reasoning: 'Store provider score'
            }];
            break;
            
        case 'customer_analysis':
            action = 'generate_recommendations';
            confidence = 0.6;
            break;
            
        case 'emergency_response':
            action = 'dispatch_providers';
            confidence = 0.8;
            humanApprovalRequired = true;
            break;
            
        default:
            action = 'monitor';
            confidence = 0.4;
    }
    
    return {
        agent_consulted: 'core',
        secondary_agents: [],
        analysis: 'Fallback rule-based analysis',
        decision: {
            action: action,
            confidence: confidence,
            human_approval_required: humanApprovalRequired,
            tools_to_call: toolsToCall,
            reasoning: 'Fallback decision due to AI unavailability',
            risk_assessment: {
                level: confidence < 0.6 ? 'medium' : 'low',
                factors: ['AI unavailable', 'Using fallback logic']
            }
        },
        memory_update: null,
        overall_confidence: confidence * 0.8
    };
}

/**
 * Step 4: Parse AI decision
 */
function parseDecision(reasoning, task) {
    try {
        const decision = reasoning.decision;
        
        return {
            action: decision.action,
            confidence: decision.confidence,
            human_approval_required: decision.human_approval_required,
            tools_to_call: decision.tools_to_call || [],
            reasoning: decision.reasoning,
            risk_assessment: decision.risk_assessment,
            agent_consulted: reasoning.agent_consulted,
            overall_confidence: reasoning.overall_confidence
        };
        
    } catch (error) {
        console.error('[Simon Core] Decision parsing failed:', error);
        return {
            action: 'monitor',
            confidence: 0.3,
            human_approval_required: false,
            tools_to_call: [],
            reasoning: 'Failed to parse decision',
            risk_assessment: { level: 'high', factors: ['decision parsing failed'] },
            agent_consulted: 'core',
            overall_confidence: 0.3
        };
    }
}

/**
 * Step 5: Execute decision
 */
async function executeDecision(decision, agent) {
    const confidenceThreshold = 0.8; // 80% confidence required for autonomous action
    
    if (decision.overall_confidence < confidenceThreshold) {
        return {
            executed: false,
            reason: 'Confidence below threshold',
            confidence_required: confidenceThreshold,
            confidence_actual: decision.overall_confidence,
            status: 'pending_review'
        };
    }
    
    if (decision.human_approval_required) {
        return {
            executed: false,
            reason: 'Human approval required',
            status: 'pending_approval'
        };
    }
    
    // Execute tools
    const toolResults = [];
    for (const toolCall of decision.tools_to_call) {
        try {
            const result = await executeTool(toolCall.tool, Object.values(toolCall.parameters), agent);
            toolResults.push({
                tool: toolCall.tool,
                success: true,
                result: result
            });
        } catch (error) {
            toolResults.push({
                tool: toolCall.tool,
                success: false,
                error: error.message
            });
        }
    }
    
    return {
        executed: true,
        action: decision.action,
        tool_results: toolResults,
        status: 'completed'
    };
}

/**
 * Step 7: Audit decision
 */
async function auditDecision(decision, actionResult, learning, agent) {
    try {
        const { writeSimonAction } = await import('../db.js');
        
        const auditRecord = await writeSimonAction({
            agent: agent,
            actionType: decision.action,
            toolCalled: decision.tools_to_call.length > 0 ? decision.tools_to_call[0].tool : null,
            input: { decision: decision },
            output: { action_result: actionResult },
            confidence: decision.overall_confidence * 100,
            reasoning: decision.reasoning,
            status: actionResult.executed ? 'completed' : 'pending_approval',
            source: 'request'
        });
        
        return auditRecord;
        
    } catch (error) {
        console.error('[Simon Core] Audit failed:', error);
        return null;
    }
}

/**
 * Fallback decision when reasoning fails
 */
async function fallbackDecision(task, context, agent) {
    return {
        success: false,
        task: task,
        decision: {
            action: 'monitor',
            confidence: 0.3,
            human_approval_required: true,
            tools_to_call: [],
            reasoning: 'Complete reasoning loop failure - human intervention required',
            risk_assessment: { level: 'high', factors: ['reasoning failure'] },
            overall_confidence: 0.3
        },
        action_result: { executed: false, reason: 'reasoning failed' },
        learning: null,
        audit_record: null,
        agent: agent
    };
}

/**
 * Route task to appropriate specialized agent
 */
export async function routeTask(task, context = {}) {
    try {
        switch (task.type) {
            case 'platform_insights':
                return await analyst.generatePlatformInsights(context.platformData, 'analyst');
                
            case 'fraud_analysis':
                return await fraud.analyzeTransaction(context.transaction, 'fraud');
                
            case 'demand_forecast':
                return await demand.generateDemandForecastByZone(context.zoneId, context.categories, context.hoursAhead, 'demand');
                
            case 'provider_scoring':
                return await provider.scoreProvider(context.providerId, 'provider');
                
            case 'customer_analysis':
                return await customer.analyzeCustomerBehavior(context.userId, 'customer');
                
            case 'emergency_response':
                return await responder.handleEmergencyRequest(context.emergencyRequest, 'responder');
                
            case 'zone_health':
                return await analyst.analyzeZoneHealth(context.zoneData, 'analyst');
                
            case 'anomaly_detection':
                return await analyst.generateAnomalyReport(context.platformData, 'analyst');
                
            default:
                // Use core orchestrator for unknown tasks
                return await simonReasoningLoop(task, context, 'core');
        }
        
    } catch (error) {
        console.error('[Simon Core] Task routing failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Simon's system status
 */
export async function getSimonStatus() {
    try {
        const { pool } = await import('../db.js');
        
        // Get recent actions
        const { rows: recentActions } = await pool.query(`
            SELECT agent, action_type, status, confidence, created_at
            FROM simon_actions
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
            LIMIT 20
        `);
        
        // Get pending approvals
        const { rows: pendingApprovals } = await pool.query(`
            SELECT COUNT(*) as count FROM simon_actions WHERE status = 'pending_approval'
        `);
        
        // Get agent health (basic check)
        const agentHealth = {
            analyst: 'healthy',
            fraud: 'healthy',
            demand: 'healthy',
            provider: 'healthy',
            customer: 'healthy',
            responder: 'healthy',
            core: 'healthy',
            memory: 'healthy'
        };
        
        // Calculate stats
        const stats = {
            decisions_made: recentActions.length,
            autonomous_actions: recentActions.filter(a => a.status === 'completed').length,
            human_approvals_pending: parseInt(pendingApprovals[0].count),
            avg_confidence: recentActions.length > 0 
                ? recentActions.reduce((sum, a) => sum + parseFloat(a.confidence), 0) / recentActions.length 
                : 0
        };
        
        return {
            status: 'active',
            agents: agentHealth,
            last_24h: stats,
            active_flags: recentActions.filter(a => a.action_type === 'flag_transaction'),
            pending_approvals: pendingApprovals[0].count > 0,
            recent_actions: recentActions.slice(0, 10)
        };
        
    } catch (error) {
        console.error('[Simon Core] Status check failed:', error);
        return {
            status: 'degraded',
            error: error.message
        };
    }
}

/**
 * Quick decision for simple tasks
 */
export async function quickDecision(taskType, context) {
    const task = { type: taskType, timestamp: Date.now() };
    return await simonReasoningLoop(task, context, 'core');
}

export default {
    simonReasoningLoop,
    routeTask,
    getSimonStatus,
    quickDecision
};
