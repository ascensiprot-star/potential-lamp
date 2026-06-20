/*
# Create storage bucket for community posts images

This migration creates the storage bucket needed for community post image uploads.

## Changes:
1. Creates `community-posts` bucket (public, no file size limit specified)
2. Creates storage policies to allow public uploads and reads
*/

-- Insert the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'community-posts',
    'community-posts',
    true,
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for public access
-- Allow anyone to upload images
CREATE POLICY "Anyone can upload community images" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'community-posts');

-- Allow anyone to read images
CREATE POLICY "Anyone can view community images" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'community-posts');

-- Allow anyone to update their uploads
CREATE POLICY "Anyone can update community images" ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (bucket_id = 'community-posts')
    WITH CHECK (bucket_id = 'community-posts');

-- Allow anyone to delete their uploads
CREATE POLICY "Anyone can delete community images" ON storage.objects
    FOR DELETE TO anon, authenticated
    USING (bucket_id = 'community-posts');