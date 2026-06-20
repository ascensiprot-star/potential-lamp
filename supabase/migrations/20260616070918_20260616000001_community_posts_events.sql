/*
# Create community_posts and events tables

## Purpose
Enable the neighborhood community features: posting to the community feed and creating local events.
These tables support the Community and Events pages where users can share posts, announcements,
create polls, and organize local gatherings.

## New Tables

### community_posts
- `id` (uuid, primary key) - Unique identifier for each post
- `type` (text) - Post type: 'post', 'announcement', 'event', 'poll', 'alert', 'job', etc.
- `title` (text, nullable) - Optional title for the post
- `body` (text) - Main content of the post
- `author_name` (text, nullable) - Display name of the author
- `author_email` (text) - Email of the author for identification
- `author_id` (uuid, nullable) - Reference to auth.users.id if logged in
- `neighborhood` (text, nullable) - Location/neighborhood tag
- `image_url` (text, nullable) - Optional image attachment
- `upvotes` (integer, default 0) - Like count
- `reply_count` (integer, default 0) - Number of comments
- `is_resolved` (boolean, default false) - For question/issue posts
- `job_type` (text, nullable) - For job posts: full_time, part_time, etc.
- `job_salary` (text, nullable) - Salary info for job posts
- `skill_offer` (text, nullable) - For skill exchange posts
- `skill_want` (text, nullable) - What skill they want in exchange
- `contact_email` (text, nullable) - Contact info
- `created_date` (timestamptz, default now()) - When post was created
- `updated_at` (timestamptz, default now()) - Last modification time

### events
- `id` (uuid, primary key) - Unique identifier for each event
- `title` (text) - Event name
- `description` (text, nullable) - Event description
- `category` (text, default 'community') - Event type: concert, workshop, meetup, etc.
- `venue_name` (text, nullable) - Where the event is held
- `venue_type` (text, nullable) - hall, rooftop, outdoor, online, etc.
- `address` (text, nullable) - Physical address
- `date` (date, nullable) - Event date
- `start_time` (text, nullable) - Start time
- `end_time` (text, nullable) - End time
- `organizer_name` (text, nullable) - Name of organizer
- `organizer_id` (uuid, nullable) - Reference to auth.users.id
- `ticket_price` (numeric, default 0) - Price per ticket
- `is_free` (boolean, default true) - Whether event is free
- `total_tickets` (integer, default 100) - Total available tickets
- `tickets_sold` (integer, default 0) - Number of tickets sold
- `bundle_services` (jsonb, default '[]') - List of bundled services
- `cover_image_url` (text, nullable) - Event cover image
- `status` (text, default 'published') - draft, published, cancelled, completed
- `created_at` (timestamptz, default now()) - When event was created

## Security
- RLS enabled on both tables
- Policies allow authenticated and anon users to read all posts/events (public content)
- Policies allow authenticated users to insert their own posts/events
- Policies allow authors to update/delete their own content
*/

-- Create community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL DEFAULT 'post',
    title text,
    body text NOT NULL,
    author_name text,
    author_email text NOT NULL,
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    neighborhood text,
    image_url text,
    upvotes integer DEFAULT 0,
    reply_count integer DEFAULT 0,
    is_resolved boolean DEFAULT false,
    job_type text,
    job_salary text,
    skill_offer text,
    skill_want text,
    contact_email text,
    created_date timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category text DEFAULT 'community',
    venue_name text,
    venue_type text,
    address text,
    date date,
    start_time text,
    end_time text,
    organizer_name text,
    organizer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ticket_price numeric DEFAULT 0,
    is_free boolean DEFAULT true,
    total_tickets integer DEFAULT 100,
    tickets_sold integer DEFAULT 0,
    bundle_services jsonb DEFAULT '[]'::jsonb,
    cover_image_url text,
    status text DEFAULT 'published',
    created_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_community_posts_date ON community_posts(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(type);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date ASC);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policies for community_posts (public read, authenticated write)
DROP POLICY IF EXISTS "anon_select_community_posts" ON community_posts;
CREATE POLICY "anon_select_community_posts" ON community_posts FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_community_posts" ON community_posts;
CREATE POLICY "authenticated_insert_community_posts" ON community_posts FOR INSERT
    TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "author_update_community_posts" ON community_posts;
CREATE POLICY "author_update_community_posts" ON community_posts FOR UPDATE
    TO authenticated USING (author_id = auth.uid() OR author_email = auth.jwt() ->> 'email')
    WITH CHECK (author_id = auth.uid() OR author_email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "author_delete_community_posts" ON community_posts;
CREATE POLICY "author_delete_community_posts" ON community_posts FOR DELETE
    TO authenticated USING (author_id = auth.uid() OR author_email = auth.jwt() ->> 'email');

-- Policies for events (public read, authenticated write)
DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_events" ON events;
CREATE POLICY "authenticated_insert_events" ON events FOR INSERT
    TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "organizer_update_events" ON events;
CREATE POLICY "organizer_update_events" ON events FOR UPDATE
    TO authenticated USING (organizer_id = auth.uid())
    WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "organizer_delete_events" ON events;
CREATE POLICY "organizer_delete_events" ON events FOR DELETE
    TO authenticated USING (organizer_id = auth.uid());

-- Fix post_comments to use uuid for post_id
ALTER TABLE post_comments ALTER COLUMN post_id TYPE uuid USING post_id::uuid;

-- Add foreign key constraint to post_comments
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- Add author_id to post_comments for better tracking
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Policies for post_comments
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_post_comments" ON post_comments;
CREATE POLICY "anon_select_post_comments" ON post_comments FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_post_comments" ON post_comments;
CREATE POLICY "authenticated_insert_post_comments" ON post_comments FOR INSERT
    TO authenticated WITH CHECK (true);

-- Policies for neighborhood_polls (allow authenticated insert)
DROP POLICY IF EXISTS "anon_select_neighborhood_polls" ON neighborhood_polls;
CREATE POLICY "anon_select_neighborhood_polls" ON neighborhood_polls FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_neighborhood_polls" ON neighborhood_polls;
CREATE POLICY "authenticated_insert_neighborhood_polls" ON neighborhood_polls FOR INSERT
    TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_neighborhood_polls" ON neighborhood_polls;
CREATE POLICY "authenticated_update_neighborhood_polls" ON neighborhood_polls FOR UPDATE
    TO authenticated USING (true) WITH CHECK (true);

-- Policies for event_tickets
DROP POLICY IF EXISTS "anon_select_event_tickets" ON event_tickets;
CREATE POLICY "anon_select_event_tickets" ON event_tickets FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_event_tickets" ON event_tickets;
CREATE POLICY "authenticated_insert_event_tickets" ON event_tickets FOR INSERT
    TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "buyer_update_event_tickets" ON event_tickets;
CREATE POLICY "buyer_update_event_tickets" ON event_tickets FOR UPDATE
    TO authenticated USING (buyer_email = auth.jwt() ->> 'email');

-- Add created_by to neighborhood_polls for tracking
ALTER TABLE neighborhood_polls ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
