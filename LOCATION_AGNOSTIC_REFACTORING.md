# Location-Agnostic Refactoring for Simon Intelligence System

## Overview
Removing all hardcoded country, city, currency, language, timezone, and market-specific references from the Simon implementation and replacing them with dynamic values derived from the user's GPS coordinates and detected country.

## Completed Changes

### 1. ✅ Dynamic Country Context System
**File:** `server/simon/geo-context.js` (NEW)

- Created comprehensive country data system with market-specific information
- Implemented coordinate-to-country detection
- Added hemisphere-aware seasonal logic
- Dynamic currency and living wage calculations
- Timezone detection from coordinates
- Market knowledge generation based on location

**Supported Countries:**
- US (United States)
- GB (United Kingdom) 
- PK (Pakistan)
- IN (India)
- NG (Nigeria)
- DE (Germany)
- AU (Australia)
- BR (Brazil)

**Key Functions:**
- `detectCountryFromCoordinates(lat, lng)` - Country detection from GPS
- `getMarketKnowledge(lat, lng)` - Dynamic market context
- `getDynamicMarketContext(lat, lng)` - AI prompt integration
- `formatCurrency(amount, countryCode)` - Currency formatting
- `getHemisphere(lat)` - Northern/southern hemisphere detection

### 2. ✅ Global Simon Identity
**File:** `server/simon/knowledge.js` (UPDATED)

- **Removed:** `PAKISTAN_MARKET_KNOWLEDGE` entirely
- **Updated:** `SIMON_IDENTITY` to be location-agnostic
- **New identity:** "global neighborhood services platform" instead of "built for Pakistani communities"
- **Agent knowledge:** Changed from Pakistan-specific to location-agnostic principles
- Simon now serves any neighborhood anywhere

### 3. ✅ Language-Agnostic Processing
**File:** `server/simon/language.js` (UPDATED)

- **Removed:** Roman Urdu/Urdu specific mappings (`ROMAN_URDU_MAP`)
- **Removed:** Language-specific service term translations
- **Updated:** `normalizeQuery()` to basic whitespace normalization
- **Updated:** Language detection to basic script detection
- **New approach:** Let AI models handle natural language processing (they support 50+ languages)
- Simon processes queries in any language the AI model supports

### 4. ✅ Dynamic Prompt Architecture
**File:** `server/simon/prompts.js` (UPDATED)

- **Added:** Integration with `getDynamicMarketContext()`
- **Added:** `userLocation` parameter to `buildPrompt()`
- **Added:** Currency placeholder replacement system
- **Added:** Dynamic market context injection
- **New function:** `replaceCurrencyPlaceholders()` for dynamic currency
- Prompts now adapt to user's location, currency, and market context

## Remaining Changes Required

### 5. ⏳ Ensemble System PKR Thresholds
**File:** `server/simon/ensemble.js`

**Current hardcoded:**
- PKR 10,000 threshold for ensemble decisions
- PKR 50,000 threshold for triple ensemble

**Required changes:**
- Replace with `getEnsembleThreshold(currencyCode, lat, lng)` from geo-context.js
- Calculate threshold as 10x local daily living wage
- Triple ensemble threshold = 5x ensemble threshold
- Light ensemble threshold = 2x ensemble threshold

### 6. ⏳ Fraud System PKR References  
**File:** `server/simon/fraud.js`

**Current hardcoded:**
- PKR 50,000 amount check in fallback analysis
- PKR-specific references in transaction analysis

**Required changes:**
- Replace with dynamic currency thresholds
- Use `calculateMinimumServicePrice()` for living wage calculations
- Remove PKR-specific references from fallback logic

### 7. ⏳ Context System Currency Integration
**File:** `server/simon/context.js`

**Required changes:**
- Add `currency_code` parameter to `getPlatformContext()`
- Include user's currency in context data
- Format monetary values with user's currency symbol
- Update zone statistics to include currency context

### 8. ⏳ User Schema Currency Field
**Database schema changes required:

**Add to users table:**
```sql
ALTER TABLE users ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD';
ALTER TABLE users ADD COLUMN country_code VARCHAR(2) DEFAULT 'US';
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
```

**Add to wallets table:**
```sql
ALTER TABLE wallets ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD';
```

### 9. ⏳ Zone Query Dynamic Names
**Files:** Multiple agent files

**Current hardcoded:**
- References to "Latifabad", "Gulshan", "Hyderabad" in fallback strings
- Pakistan-specific zone names in examples

**Required changes:**
- Replace all hardcoded city names with `zone.name` from database
- Update example fallbacks to use `zone.name` variable
- Remove specific Karachi/Lahore references

### 10. ⏳ Seasonal Logic Hemisphere Awareness
**Files:** Multiple agent and precompute files

**Current hardcoded:**
- Pakistan-specific seasonal patterns (Ramadan, monsoon, etc.)
- Fixed summer/winter months (northern hemisphere assumption)

**Required changes:**
- Use `getCurrentSeason(lat)` from geo-context.js
- Hemisphere-aware seasonal logic
- Cultural events only when relevant to detected country
- Remove hardcoded Pakistan seasonal references

### 11. ⏳ Currency Reference Updates
**Files:** Multiple files across the system

**Files to search for PKR references:**
- `server/simon/*.js` (all Simon files)
- `server/wallet.js`
- `server/financial.js` (if exists)
- Any other files with currency references

**Required changes:**
- Replace all `PKR` with dynamic currency from user profile
- Replace currency symbols (`₨`) with dynamic symbols
- Update all price formatting to use user's currency
- Update all threshold values to be currency-relative

### 12. ⏳ Timezone Handling
**Files:** Multiple files with time-based logic

**Current hardcoded:**
- PKT (Pakistan Standard Time, UTC+5) references
- Fixed timezone assumptions

**Required changes:**
- Use user's actual timezone from GPS coordinates
- Update peak hours to be timezone-relative
- Remove PKT references
- Use `getMarketKnowledge()` timezone data

### 13. ⏳ Payment Preference Removal
**Files:** Context and agent files

**Current hardcoded:**
- "Cash on delivery still dominant" assumptions
- EasyPaisa/JazzCash specific preferences

**Required changes:**
- Remove all hardcoded payment preference assumptions
- Use detected country payment preferences from geo-context.js
- Let payment methods be determined by actual user behavior

## Implementation Priority

**High Priority (Core Functionality):**
1. Add currency_code field to user schema
2. Update context.js to include dynamic currency
3. Update ensemble.js PKR thresholds
4. Update fraud.js PKR references

**Medium Priority (User Experience):**
5. Replace hardcoded city names with zone.name
6. Update seasonal logic to hemisphere-aware
7. Update timezone handling
8. Remove payment preference assumptions

**Low Priority (Edge Cases):**
9. Update example currency placeholders in prompts.js
10. Comprehensive PKR reference search and replace

## Database Migration SQL

```sql
-- Add location and currency fields to users
ALTER TABLE users 
ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN country_code VARCHAR(2) DEFAULT 'US',
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add currency to wallets
ALTER TABLE wallets 
ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD';

-- Update existing records with default values
UPDATE users SET currency_code = 'USD' WHERE currency_code IS NULL;
UPDATE users SET country_code = 'US' WHERE country_code IS NULL;
UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL;
UPDATE wallets SET currency_code = 'USD' WHERE currency_code IS NULL;

-- Create indexes for location queries
CREATE INDEX idx_users_location ON users(latitude, longitude);
CREATE INDEX idx_users_country ON users(country_code);
```

## Testing Requirements

1. **Country Detection:** Verify coordinates map to correct countries
2. **Currency Formatting:** Test with different user currencies
3. **Seasonal Logic:** Verify hemisphere-aware seasonal patterns
4. **Threshold Calculations:** Test ensemble thresholds with different currencies
5. **Language Processing:** Verify multilingual queries work without hardcoded mappings

## Rollout Strategy

1. **Phase 1:** Database schema changes
2. **Phase 2:** Core system updates (context, ensemble, fraud)
3. **Phase 3:** Agent-specific updates
4. **Phase 4:** Comprehensive testing
5. **Phase 5:** Global deployment

## Notes

- All architectural components (tiers, streaming, caching, security) remain unchanged
- Only hardcoded location-specific data is being replaced
- System will work identically in New York, Lagos, Berlin, or Karachi
- OpenRouter models already support 50+ languages natively
- Geo-coordinate detection can be enhanced with proper reverse geocoding API in production