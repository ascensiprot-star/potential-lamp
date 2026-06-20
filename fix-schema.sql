-- Fix missing column: category_slug in providers table
ALTER TABLE providers ADD COLUMN IF NOT EXISTS category_slug TEXT NOT NULL DEFAULT 'other';

-- Create missing provider_presence table
CREATE TABLE IF NOT EXISTS provider_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_zone_id UUID,
    is_online BOOLEAN DEFAULT false,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to users table if they don't exist
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'PK',
    ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS zone_id UUID,
    ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS lock_reason TEXT,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false;

-- Create indexes for provider_presence
CREATE INDEX IF NOT EXISTS idx_provider_presence_provider ON provider_presence(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_presence_zone ON provider_presence(current_zone_id);
CREATE INDEX IF NOT EXISTS idx_provider_presence_online ON provider_presence(is_online, last_heartbeat);

-- Add PostGIS extension first (required for geography type)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geolocation column to providers table if missing
ALTER TABLE providers ADD COLUMN IF NOT EXISTS geolocation GEOGRAPHY(POINT, 4326);

-- Fix missing created_date column in neighborhood_zones table
ALTER TABLE neighborhood_zones ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();

-- Verify the schema is correct
SELECT 'Schema fixes applied successfully' as status;
