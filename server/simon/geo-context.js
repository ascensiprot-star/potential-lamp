/**
 * Dynamic Country Context System for Simon Intelligence System
 * Detects country from GPS coordinates and provides dynamic market knowledge
 * Simon serves any neighborhood anywhere - not hardcoded to any specific country
 */

/**
 * Country data with market-specific information
 * This can be extended with more countries as needed
 */
const COUNTRY_DATA = {
  US: {
    name: 'United States',
    currency_code: 'USD',
    currency_symbol: '$',
    living_wage_hourly: 15, // USD
    timezone: 'America/New_York', // Default, will be overridden by user's actual timezone
    peak_hours: [9, 10, 11, 16, 17, 18], // 9AM-11AM, 4PM-6PM
    weekend_pattern: 'saturday_higher',
    common_categories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'handyman', 'moving', 'landscaping'],
    payment_preferences: ['credit_card', 'digital_wallet', 'cash'],
    language: 'en',
    hemisphere: 'northern',
    seasons: {
      summer_months: [6, 7, 8], // June-August
      winter_months: [12, 1, 2], // December-February
      monsoon_months: [], // No monsoon in US
      ramadan_effect: false
    }
  },
  GB: {
    name: 'United Kingdom',
    currency_code: 'GBP',
    currency_symbol: '£',
    living_wage_hourly: 10, // GBP (National Living Wage)
    timezone: 'Europe/London',
    peak_hours: [9, 10, 11, 16, 17, 18],
    weekend_pattern: 'saturday_higher',
    common_categories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'handyman'],
    payment_preferences: ['credit_card', 'debit_card', 'bank_transfer'],
    language: 'en',
    hemisphere: 'northern',
    seasons: {
      summer_months: [6, 7, 8],
      winter_months: [12, 1, 2],
      monsoon_months: [],
      ramadan_effect: false
    }
  },
  PK: {
    name: 'Pakistan',
    currency_code: 'PKR',
    currency_symbol: '₨',
    living_wage_hourly: 800, // PKR
    timezone: 'Asia/Karachi',
    peak_hours: [9, 10, 11, 16, 17, 18],
    weekend_pattern: 'sunday_higher',
    common_categories: ['cleaning', 'ac_repair', 'plumbing', 'electrical', 'gardening', 'cooking', 'driver', 'tutor', 'laundry'],
    payment_preferences: ['cash', 'digital_wallet', 'bank_transfer'],
    language: 'ur',
    hemisphere: 'northern',
    seasons: {
      summer_months: [5, 6, 7, 8], // May-August (extreme heat)
      winter_months: [12, 1, 2],
      monsoon_months: [7, 8, 9], // July-September
      ramadan_effect: true
    }
  },
  IN: {
    name: 'India',
    currency_code: 'INR',
    currency_symbol: '₹',
    living_wage_hourly: 200, // INR (rough estimate)
    timezone: 'Asia/Kolkata',
    peak_hours: [9, 10, 11, 16, 17, 18],
    weekend_pattern: 'sunday_higher',
    common_categories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'cooking', 'driver', 'tutor'],
    payment_preferences: ['cash', 'upi', 'digital_wallet'],
    language: 'hi',
    hemisphere: 'northern',
    seasons: {
      summer_months: [4, 5, 6], // April-June
      winter_months: [12, 1, 2],
      monsoon_months: [6, 7, 8, 9], // June-September
      ramadan_effect: true
    }
  },
  NG: {
    name: 'Nigeria',
    currency_code: 'NGN',
    currency_symbol: '₦',
    living_wage_hourly: 1000, // NGN (rough estimate)
    timezone: 'Africa/Lagos',
    peak_hours: [8, 9, 10, 16, 17, 18],
    weekend_pattern: 'saturday_higher',
    common_categories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'driver', 'security'],
    payment_preferences: ['cash', 'bank_transfer', 'digital_wallet'],
    language: 'en',
    hemisphere: 'northern',
    seasons: {
      summer_months: [3, 4, 5], // March-May
      winter_months: [11, 12, 1], // November-January (harmattan)
      monsoon_months: [],
      ramadan_effect: true
    }
  },
  DE: {
    name: 'Germany',
    currency_code: 'EUR',
    currency_symbol: '€',
    living_wage_hourly: 12, // EUR (minimum wage)
    timezone: 'Europe/Berlin',
    peak_hours: [8, 9, 10, 15, 16, 17],
    weekend_pattern: 'saturday_higher',
    common_categories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'handyman'],
    payment_preferences: ['bank_transfer', 'credit_card', 'digital_wallet'],
    language: 'de',
    hemisphere: 'northern',
    seasons: {
      summer_months: [6, 7, 8],
      winter_months: [12, 1, 2],
      monsoon_months: [],
      ramadan_effect: false
    }
  },
  AU: {
    name: 'Australia',
    currency_code: 'AUD',
    currency_symbol: 'A$',
    living_wage_hourly: 20, // AUD
    timezone: 'Australia/Sydney',
    peak_hours: [9, 10, 11, 16, 17, 18],
    weekend_pattern: 'saturday_higher',
    common_categories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'handyman', 'landscaping'],
    payment_preferences: ['credit_card', 'digital_wallet', 'bank_transfer'],
    language: 'en',
    hemisphere: 'southern',
    seasons: {
      summer_months: [12, 1, 2], // December-February (southern hemisphere summer)
      winter_months: [6, 7, 8], // June-August (southern hemisphere winter)
      monsoon_months: [],
      ramadan_effect: false
    }
  },
  BR: {
    name: 'Brazil',
    currency_code: 'BRL',
    currency_symbol: 'R$',
    living_wage_hourly: 15, // BRL (rough estimate)
    timezone: 'America/Sao_Paulo',
    peak_hours: [9, 10, 11, 16, 17, 18],
    weekend_pattern: 'saturday_higher',
    common_categories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'handyman'],
    payment_preferences: ['cash', 'pix', 'credit_card', 'digital_wallet'],
    language: 'pt',
    hemisphere: 'southern',
    seasons: {
      summer_months: [12, 1, 2, 3], // December-March
      winter_months: [6, 7, 8], // June-August
      monsoon_months: [],
      ramadan_effect: false
    }
  }
};

/**
 * Detect country from GPS coordinates
 * In production, this would use a proper reverse geocoding API
 */
export function detectCountryFromCoordinates(lat, lng) {
  // Simple bounding box detection for major countries
  // In production, use Google Maps API, OpenStreetMap Nominatim, or similar
  
  // Pakistan
  if (lng >= 60 && lng <= 78 && lat >= 23 && lat <= 38) {
    return 'PK';
  }
  
  // India
  if (lng >= 68 && lng <= 97 && lat >= 6 && lat <= 36) {
    return 'IN';
  }
  
  // Nigeria
  if (lng >= 2 && lng <= 15 && lat >= 4 && lat <= 14) {
    return 'NG';
  }
  
  // United States (continental)
  if (lng >= -125 && lng <= -66 && lat >= 24 && lat <= 50) {
    return 'US';
  }
  
  // United Kingdom
  if (lng >= -8 && lng <= 2 && lat >= 49 && lat <= 61) {
    return 'GB';
  }
  
  // Germany
  if (lng >= 5 && lng <= 15 && lat >= 47 && lat <= 55) {
    return 'DE';
  }
  
  // Australia
  if (lng >= 112 && lng <= 154 && lat >= -44 && lat <= -10) {
    return 'AU';
  }
  
  // Brazil
  if (lng >= -74 && lng <= -34 && lat <= 5 && lat >= -34) {
    return 'BR';
  }
  
  // Default to US if no match found
  return 'US';
}

/**
 * Get country data for a country code
 */
export function getCountryData(countryCode) {
  return COUNTRY_DATA[countryCode] || COUNTRY_DATA.US; // Default to US
}

/**
 * Get hemisphere from latitude
 */
export function getHemisphere(lat) {
  return lat >= 0 ? 'northern' : 'southern';
}

/**
 * Get current season for a location
 */
export function getCurrentSeason(lat, month = new Date().getMonth() + 1) {
  const hemisphere = getHemisphere(lat);
  const countryData = getCountryData(detectCountryFromCoordinates(lat, 0));
  
  if (hemisphere === 'northern') {
    if (countryData.seasons.monsoon_months.includes(month)) {
      return 'monsoon';
    } else if (countryData.seasons.summer_months.includes(month)) {
      return 'summer';
    } else if (countryData.seasons.winter_months.includes(month)) {
      return 'winter';
    } else {
      return 'spring_fall';
    }
  } else {
    // Southern hemisphere - seasons are reversed
    if (countryData.seasons.monsoon_months.includes(month)) {
      return 'monsoon';
    } else if (countryData.seasons.summer_months.includes(month)) {
      return 'winter'; // Southern hemisphere winter during northern summer
    } else if (countryData.seasons.winter_months.includes(month)) {
      return 'summer'; // Southern hemisphere summer during northern winter
    } else {
      return 'spring_fall';
    }
  }
}

/**
 * Get market knowledge for a specific location
 */
export function getMarketKnowledge(lat, lng) {
  const countryCode = detectCountryFromCoordinates(lat, lng);
  const countryData = getCountryData(countryCode);
  const hemisphere = getHemisphere(lat);
  const currentSeason = getCurrentSeason(lat);
  
  return {
    country: countryCode,
    country_name: countryData.name,
    currency: {
      code: countryData.currency_code,
      symbol: countryData.currency_symbol,
      living_wage_hourly: countryData.living_wage_hourly
    },
    location: {
      latitude: lat,
      longitude: lng,
      hemisphere: hemisphere,
      timezone: countryData.timezone // Will be overridden by user's actual timezone
    },
    market_patterns: {
      peak_hours: countryData.peak_hours,
      weekend_pattern: countryData.weekend_pattern,
      common_categories: countryData.common_categories,
      payment_preferences: countryData.payment_preferences,
      primary_language: countryData.language
    },
    seasonal_context: {
      current_season: currentSeason,
      ramadan_active: countryData.seasons.ramadan_effect && isRamadanActive()
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if Ramadan is currently active (simplified)
 */
function isRamadanActive() {
  // In production, use proper Islamic calendar calculation
  // This is a simplified placeholder
  const currentMonth = new Date().getMonth() + 1;
  // Ramadan moves 11 days earlier each year, so this needs proper calculation
  return false; // Placeholder
}

/**
 * Format currency amount based on country
 */
export function formatCurrency(amount, countryCode) {
  const countryData = getCountryData(countryCode);
  return `${countryData.currency_symbol}${amount.toLocaleString()}`;
}

/**
 * Calculate minimum price for a service based on local living wage
 */
export function calculateMinimumServicePrice(hours, countryCode) {
  const countryData = getCountryData(countryCode);
  return countryData.living_wage_hourly * hours;
}

/**
 * Get dynamic market context for AI prompts
 */
export function getDynamicMarketContext(lat, lng, userId = null) {
  const marketKnowledge = getMarketKnowledge(lat, lng);
  
  let contextPrompt = `
MARKET CONTEXT — ${marketKnowledge.country_name}:

CURRENCY: ${marketKnowledge.currency.code} (${marketKnowledge.currency.symbol})
Living wage floor: ${formatCurrency(marketKnowledge.currency.living_wage_hourly, marketKnowledge.country)}/hour
Never recommend services below this local minimum wage.

LOCATION: ${marketKnowledge.hemisphere === 'northern' ? 'Northern' : 'Southern'} Hemisphere
Current season: ${marketKnowledge.seasonal_context.current_season}
Peak hours: ${marketKnowledge.market_patterns.peak_hours.map(h => `${h}:00`).join(', ')}
Weekend pattern: ${marketKnowledge.market_patterns.weekend_pattern}

COMMON SERVICE CATEGORIES: ${marketKnowledge.market_patterns.common_categories.join(', ')}

PAYMENT PREFERENCES: ${marketKnowledge.market_patterns.payment_preferences.join(', ')}
PRIMARY LANGUAGE: ${marketKnowledge.market_patterns.primary_language}

${marketKnowledge.seasonal_context.ramadan_active ? 'RAMADAN CONTEXT: Currently in Ramadan - expect demand pattern shifts.' : ''}
`;

  return contextPrompt;
}

export default {
  detectCountryFromCoordinates,
  getCountryData,
  getHemisphere,
  getCurrentSeason,
  getMarketKnowledge,
  formatCurrency,
  calculateMinimumServicePrice,
  getDynamicMarketContext
};