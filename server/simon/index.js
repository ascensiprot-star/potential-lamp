/**
 * Simon Multi-Agent System - Main Entry Point
 * Exports all specialized agents and coordination functions
 */

// Core orchestrator
export * from './core.js';

// Specialized agents
export * as analyst from './analyst.js';
export * as fraud from './fraud.js';
export * as demand from './demand.js';
export * as provider from './provider.js';
export * as customer from './customer.js';
export * as responder from './responder.js';
export * as recommender from './recommender.js';

// Memory system
export * as memory from './memory.js';

// Tool registry
export * as tools from './tools.js';

// Multi-model router
export * as router from './router.js';

// Monitoring system
export * as monitor from './monitor.js';

// Default export
import { simonReasoningLoop, routeTask, getSimonStatus, quickDecision } from './core.js';
export default {
    simonReasoningLoop,
    routeTask,
    getSimonStatus,
    quickDecision
};
