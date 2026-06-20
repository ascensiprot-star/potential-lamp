-- Supabase Schema for Truvornex
-- This file contains all the tables needed to replace the base44 backend.
-- Run this in your Supabase SQL Editor.

-- 1. Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'customer', -- 'customer', 'provider', 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Bookings
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id),
  provider_id UUID REFERENCES public.profiles(id),
  service_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  date DATE,
  time_slot TEXT,
  price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. Chat Messages
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.profiles(id),
  customer_email TEXT,
  content TEXT NOT NULL,
  sender_type TEXT, -- 'customer' or 'provider'
  created_date TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Invoices
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 5. Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. Ride Shares
CREATE TABLE public.ride_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_email TEXT,
  driver_name TEXT,
  destination TEXT,
  status TEXT DEFAULT 'open',
  seats_total INTEGER DEFAULT 4,
  seats_taken INTEGER DEFAULT 0,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ride_shares ENABLE ROW LEVEL SECURITY;

-- 7. Local Events
CREATE TABLE public.local_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'published',
  tickets_sold INTEGER DEFAULT 0,
  bundle_services JSONB,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

-- 8. Event Tickets
CREATE TABLE public.event_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.local_events(id),
  attendee_email TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

-- 9. Community Posts
CREATE TABLE public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_email TEXT,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- 10. Reviews
CREATE TABLE public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.profiles(id),
  customer_id UUID REFERENCES public.profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 11. Provider Metrics
CREATE TABLE public.provider_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.profiles(id),
  period TEXT,
  total_earnings NUMERIC DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  average_rating NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.provider_metrics ENABLE ROW LEVEL SECURITY;

-- 12. Automation Rules
CREATE TABLE public.automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  conditions JSONB,
  actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Disable RLS constraints strictly for local development testing (Optional, but recommended for quick start)
-- If moving to production, define strict policies.
CREATE POLICY "Allow All Public" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.chat_messages FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.ride_shares FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.local_events FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.event_tickets FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.community_posts FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.reviews FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.provider_metrics FOR ALL USING (true);
CREATE POLICY "Allow All Public" ON public.automation_rules FOR ALL USING (true);
