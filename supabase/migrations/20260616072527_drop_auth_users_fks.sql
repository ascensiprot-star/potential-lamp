/*
# Fix schema for Express auth compatibility

This migration fixes the schema so that tables work with Express session-based
auth instead of Supabase Auth.

## Changes:
1. Remove foreign key constraints to auth.users from all tables
2. Keep user_id/author_id columns as plain UUIDs (no FK)
*/

-- Drop foreign key constraints that reference auth.users
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_author_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE skill_swaps DROP CONSTRAINT IF EXISTS skill_swaps_offerer_id_fkey;
ALTER TABLE skill_swaps DROP CONSTRAINT IF EXISTS skill_swaps_matched_with_user_id_fkey;
ALTER TABLE group_buys DROP CONSTRAINT IF EXISTS group_buys_initiator_id_fkey;
ALTER TABLE group_buys DROP CONSTRAINT IF EXISTS group_buys_provider_id_fkey;
ALTER TABLE emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_customer_id_fkey;
ALTER TABLE emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_matched_provider_id_fkey;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_raised_by_fkey;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_against_id_fkey;
ALTER TABLE jury_assignments DROP CONSTRAINT IF EXISTS jury_assignments_juror_user_id_fkey;
ALTER TABLE time_credits_ledger DROP CONSTRAINT IF EXISTS time_credits_ledger_user_id_fkey;
ALTER TABLE zone_members DROP CONSTRAINT IF EXISTS zone_members_user_id_fkey;
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_author_id_fkey;
ALTER TABLE neighborhood_polls DROP CONSTRAINT IF EXISTS neighborhood_polls_created_by_fkey;