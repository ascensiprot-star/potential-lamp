/*
# Update RLS policies for neighborhood tables to allow anonymous access

This migration updates RLS policies for skill_swaps, group_buys, group_buy_participants,
disputes, jury_assignments, time_credits_ledger, and emergency_requests to allow 
anonymous (anon key) access since the frontend uses Supabase anon key.

## Changes:
1. skill_swaps: Allow anon CRUD access
2. group_buys: Allow anon CRUD access
3. group_buy_participants: Allow anon CRUD access
4. disputes: Allow anon CRUD access
5. jury_assignments: Allow anon CRUD access
6. time_credits_ledger: Allow anon CRUD access
7. emergency_requests: Allow anon CRUD access
*/

-- skill_swaps
DROP POLICY IF EXISTS "skill_swaps_anon_select" ON skill_swaps;
DROP POLICY IF EXISTS "skill_swaps_select" ON skill_swaps;
CREATE POLICY "anon_select_skill_swaps" ON skill_swaps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_skill_swaps" ON skill_swaps FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_skill_swaps" ON skill_swaps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_skill_swaps" ON skill_swaps FOR DELETE TO anon, authenticated USING (true);

-- group_buys
CREATE POLICY "anon_select_group_buys" ON group_buys FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_group_buys" ON group_buys FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_group_buys" ON group_buys FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_group_buys" ON group_buys FOR DELETE TO anon, authenticated USING (true);

-- group_buy_participants
CREATE POLICY "anon_select_group_buy_participants" ON group_buy_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_group_buy_participants" ON group_buy_participants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_group_buy_participants" ON group_buy_participants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_group_buy_participants" ON group_buy_participants FOR DELETE TO anon, authenticated USING (true);

-- disputes
CREATE POLICY "anon_select_disputes" ON disputes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_disputes" ON disputes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_disputes" ON disputes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_disputes" ON disputes FOR DELETE TO anon, authenticated USING (true);

-- jury_assignments
CREATE POLICY "anon_select_jury_assignments" ON jury_assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_jury_assignments" ON jury_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_jury_assignments" ON jury_assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_jury_assignments" ON jury_assignments FOR DELETE TO anon, authenticated USING (true);

-- time_credits_ledger
CREATE POLICY "anon_select_time_credits_ledger" ON time_credits_ledger FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_time_credits_ledger" ON time_credits_ledger FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_time_credits_ledger" ON time_credits_ledger FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_time_credits_ledger" ON time_credits_ledger FOR DELETE TO anon, authenticated USING (true);

-- emergency_requests
CREATE POLICY "anon_select_emergency_requests" ON emergency_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_emergency_requests" ON emergency_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_emergency_requests" ON emergency_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_emergency_requests" ON emergency_requests FOR DELETE TO anon, authenticated USING (true);

-- neighborhood_zones
CREATE POLICY "anon_select_neighborhood_zones" ON neighborhood_zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_neighborhood_zones" ON neighborhood_zones FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_neighborhood_zones" ON neighborhood_zones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_neighborhood_zones" ON neighborhood_zones FOR DELETE TO anon, authenticated USING (true);

-- zone_members
CREATE POLICY "anon_select_zone_members" ON zone_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_zone_members" ON zone_members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_zone_members" ON zone_members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_zone_members" ON zone_members FOR DELETE TO anon, authenticated USING (true);