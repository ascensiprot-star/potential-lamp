/**
 * Platform Context Injection for Simon Intelligence System
 * Every Simon call gets live platform data - no blind AI calls
 * Simon knows everything about the platform right now, not guesses
 */

export async function getPlatformContext(zone_id, user_id = null) {
  const { pool } = await import('../db.js');
  
  try {
    const [zoneStats, userHistory, providerCounts, recentBookings] = await Promise.all([
      // Zone-level statistics
      pool.query(`
        SELECT 
          COUNT(DISTINCT pp.provider_id) FILTER (WHERE pp.last_heartbeat > NOW() - INTERVAL '8 minutes') AS providers_online,
          COUNT(DISTINCT pp.provider_id) FILTER (WHERE pp.is_online = true) AS total_providers,
          COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active') AS active_bookings,
          COUNT(DISTINCT b.id) FILTER (WHERE b.created_at > NOW() - INTERVAL '24 hours') AS bookings_24h,
          AVG(ts.score) AS avg_trust_score,
          nz.name AS zone_name,
          nz.city AS zone_city
        FROM neighborhood_zones nz
        LEFT JOIN provider_presence pp ON pp.current_zone_id = nz.id
        LEFT JOIN bookings b ON b.zone_id = nz.id
        LEFT JOIN trust_scores ts ON ts.zone_id = nz.id
        WHERE nz.id = $1
      `, [zone_id]),

      // User booking history (if user_id provided)
      user_id ? pool.query(`
        SELECT 
          category,
          COUNT(*) as count,
          AVG(rating) as avg_rating,
          MAX(created_at) as last_booking
        FROM bookings 
        WHERE customer_id = $1 AND status = 'completed'
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 5
      `, [user_id]) : Promise.resolve({ rows: [] }),

      // Provider availability by category
      pool.query(`
        SELECT 
          p.category,
          COUNT(DISTINCT pp.provider_id) as available,
          AVG(p.hourly_rate) as avg_hourly_rate
        FROM providers p
        JOIN provider_presence pp ON pp.provider_id = p.user_id
        WHERE pp.is_online = true 
          AND pp.last_heartbeat > NOW() - INTERVAL '8 minutes'
          AND pp.current_zone_id = $1
        GROUP BY p.category
      `, [zone_id]),

      // Recent booking patterns for demand analysis
      pool.query(`
        SELECT 
          category,
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM bookings
        WHERE zone_id = $1 
          AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY category, EXTRACT(HOUR FROM created_at)
        ORDER BY count DESC
        LIMIT 20
      `, [zone_id])
    ]);

    return {
      zone: {
        id: zone_id,
        name: zoneStats.rows[0]?.zone_name || 'Unknown',
        city: zoneStats.rows[0]?.zone_city || 'Unknown',
        providers_online: parseInt(zoneStats.rows[0]?.providers_online || 0),
        total_providers: parseInt(zoneStats.rows[0]?.total_providers || 0),
        active_bookings: parseInt(zoneStats.rows[0]?.active_bookings || 0),
        bookings_24h: parseInt(zoneStats.rows[0]?.bookings_24h || 0),
        avg_trust_score: parseFloat(zoneStats.rows[0]?.avg_trust_score || 0).toFixed(1),
      },
      user: user_id ? {
        id: user_id,
        top_categories: userHistory.rows.map(r => ({
          category: r.category,
          count: parseInt(r.count),
          avg_rating: parseFloat(r.avg_rating).toFixed(1),
          last_booking: r.last_booking
        })),
        total_bookings: userHistory.rows.reduce((sum, r) => sum + parseInt(r.count), 0)
      } : null,
      supply: {
        by_category: Object.fromEntries(
          providerCounts.rows.map(r => [
            r.category, 
            { 
              available: parseInt(r.available),
              avg_hourly_rate: parseFloat(r.avg_hourly_rate).toFixed(0)
            }
          ])
        ),
        total_available: providerCounts.rows.reduce((sum, r) => sum + parseInt(r.available), 0)
      },
      demand_patterns: recentBookings.rows.map(r => ({
        category: r.category,
        hour: parseInt(r.hour),
        count: parseInt(r.count)
      })),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Simon Context] Failed to get platform context:', error);
    return {
      zone: { id: zone_id, name: 'Unknown', city: 'Unknown', providers_online: 0, total_providers: 0, active_bookings: 0, bookings_24h: 0, avg_trust_score: 0 },
      user: null,
      supply: { by_category: {}, total_available: 0 },
      demand_patterns: [],
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Get user-specific context for personalization
 */
async function getUserContext(user_id) {
  const { pool } = await import('../db.js');
  
  try {
    const [userProfile, walletBalance, recentBookings] = await Promise.all([
      pool.query(`
        SELECT id, name, phone, created_at, preferred_language
        FROM users WHERE id = $1
      `, [user_id]),
      
      pool.query(`
        SELECT balance, currency
        FROM wallets WHERE user_id = $1
      `, [user_id]),
      
      pool.query(`
        SELECT id, category, status, created_at, total_amount
        FROM bookings 
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [user_id])
    ]);

    return {
      profile: userProfile.rows[0] || null,
      wallet: {
        balance: parseFloat(walletBalance.rows[0]?.balance || 0),
        currency: walletBalance.rows[0]?.currency || 'PKR'
      },
      recent_bookings: recentBookings.rows,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Simon Context] Failed to get user context:', error);
    return {
      profile: null,
      wallet: { balance: 0, currency: 'PKR' },
      recent_bookings: [],
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Get provider-specific context for scoring and recommendations
 */
async function getProviderContext(provider_id) {
  const { pool } = await import('../db.js');
  
  try {
    const [providerProfile, providerStats, recentReviews] = await Promise.all([
      pool.query(`
        SELECT p.user_id, p.category, p.hourly_rate, p.service_radius_km,
               p.rating, p.total_jobs, p.created_at,
               u.name, u.phone
        FROM providers p
        JOIN users u ON u.id = p.user_id
        WHERE p.user_id = $1
      `, [provider_id]),
      
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_jobs,
          AVG(rating) as avg_rating,
          COUNT(*) as total_jobs
        FROM bookings
        WHERE provider_id = $1
          AND created_at > NOW() - INTERVAL '30 days'
      `, [provider_id]),
      
      pool.query(`
        SELECT rating, comment, created_at
        FROM reviews
        WHERE provider_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [provider_id])
    ]);

    return {
      profile: providerProfile.rows[0] || null,
      stats: {
        completed_30d: parseInt(providerStats.rows[0]?.completed_jobs || 0),
        cancelled_30d: parseInt(providerStats.rows[0]?.cancelled_jobs || 0),
        avg_rating_30d: parseFloat(providerStats.rows[0]?.avg_rating || 0).toFixed(1),
        total_30d: parseInt(providerStats.rows[0]?.total_jobs || 0)
      },
      recent_reviews: recentReviews.rows,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Simon Context] Failed to get provider context:', error);
    return {
      profile: null,
      stats: { completed_30d: 0, cancelled_30d: 0, avg_rating_30d: 0, total_30d: 0 },
      recent_reviews: [],
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Combine multiple context sources for comprehensive platform awareness
 */
async function getFullContext(zone_id, user_id = null, provider_id = null) {
  const [platformContext, userContext, providerContext] = await Promise.all([
    getPlatformContext(zone_id, user_id),
    user_id ? getUserContext(user_id) : Promise.resolve(null),
    provider_id ? getProviderContext(provider_id) : Promise.resolve(null)
  ]);

  return {
    platform: platformContext,
    user: userContext,
    provider: providerContext,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format context for prompt injection
 */
export function formatContextForPrompt(context) {
  if (!context) return '';
  
  let formatted = '\n=== CURRENT PLATFORM CONTEXT ===\n';
  
  if (context.platform) {
    formatted += `ZONE: ${context.platform.zone.name}, ${context.platform.zone.city}\n`;
    formatted += `Providers Online: ${context.platform.zone.providers_online}/${context.platform.zone.total_providers}\n`;
    formatted += `Active Bookings: ${context.platform.zone.active_bookings}\n`;
    formatted += `Bookings (24h): ${context.platform.zone.bookings_24h}\n`;
    formatted += `Avg Trust Score: ${context.platform.zone.avg_trust_score}\n`;
    
    if (context.platform.supply && Object.keys(context.platform.supply.by_category).length > 0) {
      formatted += '\nAVAILABLE BY CATEGORY:\n';
      for (const [category, data] of Object.entries(context.platform.supply.by_category)) {
        formatted += `  ${category}: ${data.available} available (avg PKR ${data.avg_hourly_rate}/hr)\n`;
      }
    }
  }
  
  if (context.user) {
    formatted += `\nUSER CONTEXT:\n`;
    formatted += `Name: ${context.user.profile?.name || 'Unknown'}\n`;
    formatted += `Wallet Balance: PKR ${context.user.wallet?.balance || 0}\n`;
    if (context.user.top_categories && context.user.top_categories.length > 0) {
      formatted += `Top Categories: ${context.user.top_categories.map(c => c.category).join(', ')}\n`;
    }
  }
  
  if (context.provider) {
    formatted += `\nPROVIDER CONTEXT:\n`;
    formatted += `Name: ${context.provider.profile?.name || 'Unknown'}\n`;
    formatted += `Category: ${context.provider.profile?.category || 'Unknown'}\n`;
    formatted += `Rating: ${context.provider.profile?.rating || 0}\n`;
    formatted += `Completed (30d): ${context.provider.stats.completed_30d}\n`;
    formatted += `Cancelled (30d): ${context.provider.stats.cancelled_30d}\n`;
  }
  
  formatted += `Context Updated: ${context.timestamp || new Date().toISOString()}\n`;
  formatted += '=== END CONTEXT ===\n';
  
  return formatted;
}

export default {
  getPlatformContext,
  getUserContext,
  getProviderContext,
  getFullContext,
  formatContextForPrompt
};