/*
# Update RLS policies for event_tickets to allow anonymous access

This migration updates RLS policies to allow anonymous (anon key) users to 
create and read event tickets since the frontend uses Supabase anon key.

## Changes:
1. Clean up duplicate policies
2. Allow anon + authenticated to insert tickets
3. Allow anon + authenticated to select tickets
4. Allow anon + authenticated to update tickets
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "anon_select_event_tickets" ON event_tickets;
DROP POLICY IF EXISTS "authenticated_insert_event_tickets" ON event_tickets;
DROP POLICY IF EXISTS "buyer_update_event_tickets" ON event_tickets;
DROP POLICY IF EXISTS "tickets_admin" ON event_tickets;
DROP POLICY IF EXISTS "tickets_auth_write" ON event_tickets;
DROP POLICY IF EXISTS "tickets_own_read" ON event_tickets;

-- Allow anon + authenticated to select tickets
CREATE POLICY "anon_select_tickets" ON event_tickets FOR SELECT
    TO anon, authenticated USING (true);

-- Allow anon + authenticated to insert tickets
CREATE POLICY "anon_insert_tickets" ON event_tickets FOR INSERT
    TO anon, authenticated WITH CHECK (true);

-- Allow anon + authenticated to update tickets
CREATE POLICY "anon_update_tickets" ON event_tickets FOR UPDATE
    TO anon, authenticated USING (true) WITH CHECK (true);