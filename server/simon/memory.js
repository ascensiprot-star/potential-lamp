/**
 * Simon Memory Agent
 * Handles persistent pattern learning and knowledge retention
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';
import { writeSimonMemory, readSimonMemory } from '../db.js';

/**
 * Extract patterns from platform data and store in memory
 */
export async function extractAndStorePatterns(platformData, agent = 'memory') {
    try {
        const systemPrompt = `You are Simon's memory agent. Extract key patterns from platform data and return JSON:
{
    "patterns": [
        {
            "key": "pattern identifier (e.g., 'zone_fraud:dha_phase_5')",
            "value": {
                "description": "pattern description",
                "metrics": {},
                "confidence": 0.0-1.0,
                "expires_hours": 24-168
            }
        }
    ],
    "reasoning": "why these patterns matter"
}`;
        
        const userPrompt = `Platform data: ${JSON.stringify(platformData)}`;
        
        const aiResponse = await callAI('memory', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 800
        });
        
        if (!aiResponse) {
            // Fallback: extract basic patterns
            return await extractBasicPatterns(platformData);
        }
        
        if (!validateAIResponse(aiResponse, ['patterns'])) {
            return await extractBasicPatterns(platformData);
        }
        
        // Store patterns in memory
        const storedPatterns = [];
        for (const pattern of aiResponse.patterns || []) {
            const result = await writeSimonMemory(
                pattern.key,
                pattern.value,
                (pattern.value.confidence || 0.8) * 100,
                agent,
                pattern.value.expires_hours || 24
            );
            if (result) {
                storedPatterns.push(pattern.key);
            }
        }
        
        return {
            success: true,
            patterns_stored: storedPatterns,
            confidence: calculateConfidence(aiResponse),
            reasoning: aiResponse.reasoning
        };
        
    } catch (error) {
        console.error('[Simon Memory] Pattern extraction failed:', error);
        return await extractBasicPatterns(platformData);
    }
}

/**
 * Fallback: Extract basic patterns without AI
 */
async function extractBasicPatterns(platformData) {
    const patterns = [];
    
    try {
        // Zone-level patterns
        if (platformData.zones) {
            for (const zone of platformData.zones) {
                if (zone.health_score < 50) {
                    patterns.push({
                        key: `zone_health:low:${zone.id}`,
                        value: {
                            description: `Low health zone: ${zone.name}`,
                            health_score: zone.health_score,
                            confidence: 0.7,
                            expires_hours: 6
                        }
                    });
                }
            }
        }
        
        // Fraud patterns
        if (platformData.wallets && platformData.wallets.frozen_wallets > 0) {
            patterns.push({
                key: 'fraud_indicator:wallet_freezes',
                value: {
                    description: `${platformData.wallets.frozen_wallets} frozen wallets detected`,
                    count: platformData.wallets.frozen_wallets,
                    confidence: 0.8,
                    expires_hours: 12
                }
            });
        }
        
        // Store patterns
        for (const pattern of patterns) {
            await writeSimonMemory(
                pattern.key,
                pattern.value,
                pattern.value.confidence * 100,
                'memory',
                pattern.value.expires_hours
            );
        }
        
        return {
            success: true,
            patterns_stored: patterns.map(p => p.key),
            confidence: 60,
            reasoning: 'Fallback pattern extraction without AI'
        };
        
    } catch (error) {
        console.error('[Simon Memory] Basic pattern extraction failed:', error);
        return { success: false, patterns_stored: [], confidence: 40 };
    }
}

/**
 * Recall relevant patterns for a decision
 */
export async function recallRelevantPatterns(context, agent = 'memory') {
    try {
        const systemPrompt = `You are Simon's memory recall agent. Given a decision context, identify which memory keys would be relevant. Return JSON:
{
    "relevant_keys": ["key1", "key2", "key3"],
    "reasoning": "why these keys are relevant"
}`;
        
        const userPrompt = `Decision context: ${JSON.stringify(context)}`;
        
        const aiResponse = await callAI('memory', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 300
        });
        
        if (!aiResponse || !validateAIResponse(aiResponse, ['relevant_keys'])) {
            // Fallback: return basic relevant keys
            return await recallBasicPatterns(context);
        }
        
        // Retrieve the relevant memories
        const memories = {};
        for (const key of aiResponse.relevant_keys || []) {
            const memory = await readSimonMemory(key);
            if (memory) {
                memories[key] = memory;
            }
        }
        
        return {
            success: true,
            memories: memories,
            confidence: calculateConfidence(aiResponse),
            reasoning: aiResponse.reasoning
        };
        
    } catch (error) {
        console.error('[Simon Memory] Pattern recall failed:', error);
        return await recallBasicPatterns(context);
    }
}

/**
 * Fallback: Recall basic patterns
 */
async function recallBasicPatterns(context) {
    const memories = {};
    
    try {
        // Context-based key generation
        if (context.zone_id) {
            const zoneHealthKey = `zone_health:low:${context.zone_id}`;
            const memory = await readSimonMemory(zoneHealthKey);
            if (memory) memories[zoneHealthKey] = memory;
        }
        
        if (context.user_id) {
            const userRiskKey = `user_risk:${context.user_id}`;
            const memory = await readSimonMemory(userRiskKey);
            if (memory) memories[userRiskKey] = memory;
        }
        
        // General patterns
        const generalPatterns = ['fraud_indicator:wallet_freezes', 'demand_pattern:weekend_surge'];
        for (const key of generalPatterns) {
            const memory = await readSimonMemory(key);
            if (memory) memories[key] = memory;
        }
        
        return {
            success: true,
            memories: memories,
            confidence: 60,
            reasoning: 'Fallback pattern recall'
        };
        
    } catch (error) {
        console.error('[Simon Memory] Basic pattern recall failed:', error);
        return { success: false, memories: {}, confidence: 40 };
    }
}

/**
 * Learn from a decision outcome
 */
export async function learnFromDecision(decision, outcome, agent = 'memory') {
    try {
        const systemPrompt = `You are Simon's learning agent. Given a decision and its outcome, extract lessons for future decisions. Return JSON:
{
    "lessons": [
        {
            "key": "lesson identifier",
            "value": {
                "description": "what was learned",
                "confidence": 0.0-1.0,
                "expires_hours": 168
            }
        }
    ],
    "reasoning": "why this lesson matters"
}`;
        
        const userPrompt = `Decision: ${JSON.stringify(decision)}\nOutcome: ${JSON.stringify(outcome)}`;
        
        const aiResponse = await callAI('memory', systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 500
        });
        
        if (!aiResponse || !validateAIResponse(aiResponse, ['lessons'])) {
            // Fallback: store basic lesson
            return await storeBasicLesson(decision, outcome);
        }
        
        // Store lessons
        const storedLessons = [];
        for (const lesson of aiResponse.lessons || []) {
            const result = await writeSimonMemory(
                lesson.key,
                lesson.value,
                (lesson.value.confidence || 0.7) * 100,
                agent,
                lesson.value.expires_hours || 168
            );
            if (result) {
                storedLessons.push(lesson.key);
            }
        }
        
        return {
            success: true,
            lessons_stored: storedLessons,
            confidence: calculateConfidence(aiResponse),
            reasoning: aiResponse.reasoning
        };
        
    } catch (error) {
        console.error('[Simon Memory] Learning failed:', error);
        return await storeBasicLesson(decision, outcome);
    }
}

/**
 * Fallback: Store basic lesson
 */
async function storeBasicLesson(decision, outcome) {
    try {
        const lessonKey = `lesson:${decision.action_type}:${outcome.success ? 'success' : 'failure'}`;
        const lessonValue = {
            description: `${decision.action_type} ${outcome.success ? 'succeeded' : 'failed'}`,
            confidence: 0.6,
            expires_hours: 168
        };
        
        await writeSimonMemory(lessonKey, lessonValue, 60, 'memory', 168);
        
        return {
            success: true,
            lessons_stored: [lessonKey],
            confidence: 50,
            reasoning: 'Fallback lesson storage'
        };
        
    } catch (error) {
        console.error('[Simon Memory] Basic lesson storage failed:', error);
        return { success: false, lessons_stored: [], confidence: 40 };
    }
}

/**
 * Clean expired memories
 */
export async function cleanExpiredMemories() {
    try {
        const { pool } = await import('../db.js');
        await pool.query(`DELETE FROM simon_memory WHERE expires_at IS NOT NULL AND expires_at < NOW()`);
        
        return { success: true, cleaned: true };
    } catch (error) {
        console.error('[Simon Memory] Cleanup failed:', error);
        return { success: false, error: error.message };
    }
}

export default {
    extractAndStorePatterns,
    recallRelevantPatterns,
    learnFromDecision,
    cleanExpiredMemories
};
