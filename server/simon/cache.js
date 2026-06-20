/**
 * Semantic Cache Layer for Simon Intelligence System
 * Provides intelligent caching with normalization, TTL management, and request deduplication
 * Stops making the same API call twice for semantically similar queries
 */

import crypto from 'crypto';

// Cache TTL configurations by data type
const CACHE_TTLS = {
  home_insights_user: 8 * 60 * 1000,      // 8 minutes - personalized
  home_insights_zone: 15 * 60 * 1000,    // 15 minutes - shared by zone
  zone_health: 3 * 60 * 1000,             // 3 minutes - live data
  demand_forecast: 45 * 60 * 1000,        // 45 minutes - slow-moving
  provider_recommendations: 10 * 60 * 1000, // 10 minutes
  voice_search_parse: 24 * 60 * 60 * 1000,   // 24 hours - same transcript = same parse
  booking_analysis: 20 * 60 * 1000,        // 20 minutes per service+date+zone
};

class SemanticCache {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Normalize input to catch semantically similar queries
   */
  normalize(input) {
    return JSON.stringify(input)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  /**
   * Generate cache key from input
   */
  generateKey(input) {
    const normalized = this.normalize(input);
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Get value from cache
   */
  get(input, ttlMs = 300000) {
    const key = this.generateKey(input);
    const entry = this.store.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      this.stats.evictions++;
      return null;
    }
    
    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(input, value, ttlMs = 300000) {
    const key = this.generateKey(input);
    this.store.set(key, {
      value,
      expires: Date.now() + ttlMs,
      hits: 0,
      created: Date.now()
    });
    this.stats.sets++;
  }

  /**
   * Get cached value by specific data type TTL
   */
  getByType(input, dataType) {
    const ttl = CACHE_TTLS[dataType] || 300000;
    return this.get(input, ttl);
  }

  /**
   * Set cached value by specific data type TTL
   */
  setByType(input, value, dataType) {
    const ttl = CACHE_TTLS[dataType] || 300000;
    this.set(input, value, ttl);
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    this.stats.evictions += cleaned;
    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      size: this.store.size,
      hit_rate: `${hitRate}%`
    };
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.store.size;
    this.store.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
    return size;
  }
}

// In-flight promise deduplication
const inFlight = new Map();

/**
 * Deduplicated call - reuse in-flight promises for identical requests
 */
async function deduplicatedCall(key, fn) {
  if (inFlight.has(key)) {
    console.log(`[Simon Cache] Reusing in-flight promise for key: ${key}`);
    return inFlight.get(key);
  }
  
  const promise = fn().finally(() => {
    inFlight.delete(key);
  });
  
  inFlight.set(key, promise);
  return promise;
}

/**
 * Generate deduplication key from parameters
 */
function generateDedupeKey(functionName, params) {
  const normalized = JSON.stringify({
    fn: functionName,
    params: params
  }).toLowerCase().replace(/\s+/g, '');
  return crypto.createHash('md5').update(normalized).digest('hex');
}

// Create singleton cache instance
const simonCache = new SemanticCache();

// Schedule periodic cleanup
setInterval(() => {
  const cleaned = simonCache.cleanup();
  if (cleaned > 0) {
    console.log(`[Simon Cache] Cleaned up ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

export default simonCache;
export { SemanticCache, deduplicatedCall, generateDedupeKey, CACHE_TTLS };