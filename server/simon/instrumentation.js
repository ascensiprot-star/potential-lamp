/**
 * Performance Instrumentation for Simon Intelligence System
 * Instrument every Simon call with timing to enforce hard performance targets
 * If any endpoint misses its target, log warnings and investigate
 */

import { PERFORMANCE_TARGETS } from './router.js';

// Performance metrics storage
const performanceMetrics = new Map();

/**
 * Instrument a function call with performance tracking
 */
export function instrument(functionName, targetMs = null) {
  return async function(...args) {
    const start = Date.now();
    const target = targetMs || PERFORMANCE_TARGETS[functionName] || 1000;
    
    try {
      const result = await this.apply(this, args);
      const duration = Date.now() - start;
      
      // Record metrics
      recordMetric(functionName, duration, target, true);
      
      // Check against target
      if (duration > target) {
        console.warn(`[Simon Performance] ${functionName} exceeded target: ${duration}ms > ${target}ms`);
      } else {
        console.log(`[Simon Performance] ${functionName} within target: ${duration}ms <= ${target}ms`);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      recordMetric(functionName, duration, target, false);
      console.error(`[Simon Performance] ${functionName} failed after ${duration}ms:`, error.message);
      throw error;
    }
  };
}

/**
 * Record performance metric
 */
function recordMetric(functionName, duration, target, success) {
  if (!performanceMetrics.has(functionName)) {
    performanceMetrics.set(functionName, {
      calls: 0,
      successes: 0,
      failures: 0,
      total_duration: 0,
      target_exceeds: 0,
      avg_duration: 0,
      target_ms: target
    });
  }
  
  const metrics = performanceMetrics.get(functionName);
  metrics.calls++;
  metrics.total_duration += duration;
  metrics.avg_duration = metrics.total_duration / metrics.calls;
  
  if (success) {
    metrics.successes++;
  } else {
    metrics.failures++;
  }
  
  if (duration > target) {
    metrics.target_exceeds++;
  }
}

/**
 * Get performance metrics for a function or all functions
 */
export function getPerformanceMetrics(functionName = null) {
  if (functionName) {
    return performanceMetrics.get(functionName) || null;
  }
  
  // Return all metrics as an object
  const allMetrics = {};
  for (const [name, metrics] of performanceMetrics.entries()) {
    allMetrics[name] = {
      ...metrics,
      success_rate: metrics.calls > 0 ? ((metrics.successes / metrics.calls) * 100).toFixed(1) : 0,
      target_exceed_rate: metrics.calls > 0 ? ((metrics.target_exceeds / metrics.calls) * 100).toFixed(1) : 0
    };
  }
  
  return allMetrics;
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(functionName = null) {
  if (functionName) {
    performanceMetrics.delete(functionName);
  } else {
    performanceMetrics.clear();
  }
}

/**
 * Get performance summary report
 */
export function getPerformanceReport() {
  const metrics = getPerformanceMetrics();
  const report = {
    total_functions: Object.keys(metrics).length,
    total_calls: 0,
    total_successes: 0,
    total_failures: 0,
    total_target_exceeds: 0,
    functions: []
  };
  
  for (const [name, data] of Object.entries(metrics)) {
    report.total_calls += data.calls;
    report.total_successes += data.successes;
    report.total_failures += data.failures;
    report.total_target_exceeds += data.target_exceeds;
    
    report.functions.push({
      name,
      ...data,
      success_rate: data.calls > 0 ? ((data.successes / data.calls) * 100).toFixed(1) : 0,
      target_exceed_rate: data.calls > 0 ? ((data.target_exceeds / data.calls) * 100).toFixed(1) : 0,
      performance_status: data.target_exceed_rate > 10 ? 'poor' : data.target_exceed_rate > 5 ? 'warning' : 'good'
    });
  }
  
  // Sort by target exceed rate
  report.functions.sort((a, b) => b.target_exceed_rate - a.target_exceed_rate);
  
  return report;
}

/**
 * Log performance warnings for functions that consistently miss targets
 */
export function checkPerformanceHealth() {
  const metrics = getPerformanceMetrics();
  const warnings = [];
  
  for (const [name, data] of Object.entries(metrics)) {
    if (data.calls < 10) continue; // Skip functions with insufficient data
    
    const exceedRate = data.target_exceeds / data.calls;
    const successRate = data.successes / data.calls;
    
    if (exceedRate > 0.2) { // More than 20% target exceed rate
      warnings.push({
        function: name,
        issue: 'consistently_slow',
        exceed_rate: (exceedRate * 100).toFixed(1) + '%',
        avg_duration: data.avg_duration.toFixed(0) + 'ms',
        target: data.target_ms + 'ms'
      });
    }
    
    if (successRate < 0.9) { // Less than 90% success rate
      warnings.push({
        function: name,
        issue: 'high_failure_rate',
        success_rate: (successRate * 100).toFixed(1) + '%',
        failure_rate: ((1 - successRate) * 100).toFixed(1) + '%'
      });
    }
  }
  
  if (warnings.length > 0) {
    console.warn('[Simon Performance] Performance health check found issues:', warnings);
  }
  
  return warnings;
}

/**
 * Wrap an async function with instrumentation
 */
export function withInstrumentation(fn, functionName, targetMs = null) {
  return async function(...args) {
    const start = Date.now();
    const target = targetMs || PERFORMANCE_TARGETS[functionName] || 1000;
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      
      recordMetric(functionName, duration, target, true);
      
      if (duration > target) {
        console.warn(`[Simon Performance] ${functionName} exceeded target: ${duration}ms > ${target}ms`);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      recordMetric(functionName, duration, target, false);
      console.error(`[Simon Performance] ${functionName} failed after ${duration}ms:`, error.message);
      throw error;
    }
  };
}

/**
 * Create a performance-optimized async function
 * Combines caching, deduplication, and instrumentation
 */
export function createOptimizedFunction(fn, options = {}) {
  const {
    functionName,
    targetMs,
    cacheKey,
    cacheTtl,
    useDeduplication = false
  } = options;
  
  const instrumentedFn = withInstrumentation(fn, functionName, targetMs);
  
  if (useDeduplication) {
    const dedupMap = new Map();
    
    return async function(...args) {
      const key = cacheKey ? cacheKey(...args) : JSON.stringify(args);
      
      if (dedupMap.has(key)) {
        console.log(`[Simon Performance] Reusing in-flight call for ${functionName}`);
        return dedupMap.get(key);
      }
      
      const promise = instrumentedFn(...args).finally(() => {
        dedupMap.delete(key);
      });
      
      dedupMap.set(key, promise);
      return promise;
    };
  }
  
  return instrumentedFn;
}

/**
 * Start periodic performance health checks
 */
let healthCheckInterval = null;

export function startPerformanceMonitoring(intervalMinutes = 5) {
  if (healthCheckInterval) {
    console.log('[Simon Performance] Monitoring already running');
    return;
  }
  
  console.log(`[Simon Performance] Starting monitoring with ${intervalMinutes} minute interval`);
  
  // Run immediately
  checkPerformanceHealth();
  
  // Schedule recurring checks
  healthCheckInterval = setInterval(() => {
    const report = getPerformanceReport();
    console.log('[Simon Performance] Periodic report:', {
      total_functions: report.total_functions,
      total_calls: report.total_calls,
      success_rate: report.total_calls > 0 ? ((report.total_successes / report.total_calls) * 100).toFixed(1) + '%' : '0%',
      target_exceed_rate: report.total_calls > 0 ? ((report.total_target_exceeds / report.total_calls) * 100).toFixed(1) + '%' : '0%'
    });
    
    checkPerformanceHealth();
  }, intervalMinutes * 60 * 1000);
  
  console.log('[Simon Performance] Monitoring started successfully');
}

/**
 * Stop performance monitoring
 */
export function stopPerformanceMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('[Simon Performance] Monitoring stopped');
  }
}

export default {
  instrument,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  getPerformanceReport,
  checkPerformanceHealth,
  withInstrumentation,
  createOptimizedFunction,
  startPerformanceMonitoring,
  stopPerformanceMonitoring
};