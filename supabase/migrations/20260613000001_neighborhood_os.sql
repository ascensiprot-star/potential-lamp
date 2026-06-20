-- ============================================================
-- Truvornex Neighborhood OS — Migration 001
-- Run via: supabase db push
-- All tables use RLS. Apply with a Supabase admin/service_role.
-- ============================================================

-- -------------------------------------------------------
-- Extensions
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- updated_at trigger helper
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------
-- neighborhood_zones
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS neighborhood_zones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  city            TEXT,
  country         TEXT DEFAULT 'PK',
  center_lat      DOUBLE PRECISION,
  center_lng      DOUBLE PRECISION,
  active_member_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zones_city ON neighborhood_zones(city);
ALTER TABLE neighborhood_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_public_read"  ON neighborhood_zones FOR SELECT USING (true);
CREATE POLICY "zones_admin_write"  ON neighborhood_zones FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- zone_members
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS zone_members (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_id   UUID NOT NULL REFERENCES neighborhood_zones(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','provider','admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, zone_id)
);
CREATE INDEX IF NOT EXISTS idx_zone_members_zone ON zone_members(zone_id);
ALTER TABLE zone_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zone_members_own_read"  ON zone_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "zone_members_own_write" ON zone_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "zone_members_admin"     ON zone_members FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- emergency_requests
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_id             UUID REFERENCES neighborhood_zones(id),
  category            TEXT NOT NULL,
  urgency             TEXT DEFAULT 'immediate' CHECK (urgency IN ('immediate','urgent','today')),
  description         TEXT NOT NULL,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','matched','in_progress','resolved','cancelled')),
  surge_multiplier    NUMERIC(4,2) DEFAULT 1.0,
  matched_provider_id UUID REFERENCES auth.users(id),
  matched_at          TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_customer ON emergency_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status   ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_zone     ON emergency_requests(zone_id);
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency_own_read"  ON emergency_requests FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "emergency_own_write" ON emergency_requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "emergency_own_update"ON emergency_requests FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "emergency_admin"     ON emergency_requests FOR ALL USING (auth.role() = 'service_role');
CREATE TRIGGER emergency_updated_at BEFORE UPDATE ON emergency_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- group_buys
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buys (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id              UUID REFERENCES neighborhood_zones(id),
  service_category     TEXT NOT NULL,
  description          TEXT,
  initiator_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_participants  INTEGER NOT NULL DEFAULT 5,
  current_participants INTEGER NOT NULL DEFAULT 0,
  discount_percent     NUMERIC(5,2) DEFAULT 10,
  status               TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open','locked','fulfilled','expired')),
  expires_at           TIMESTAMPTZ,
  provider_id          UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_group_buys_status ON group_buys(status);
CREATE INDEX IF NOT EXISTS idx_group_buys_zone   ON group_buys(zone_id);
ALTER TABLE group_buys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_buys_read"       ON group_buys FOR SELECT USING (true);
CREATE POLICY "group_buys_auth_write" ON group_buys FOR INSERT WITH CHECK (auth.uid() = initiator_id);
CREATE POLICY "group_buys_auth_update"ON group_buys FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "group_buys_admin"      ON group_buys FOR ALL USING (auth.role() = 'service_role');
CREATE TRIGGER group_buys_updated_at BEFORE UPDATE ON group_buys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- group_buy_participants
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_participants (
  group_buy_id UUID NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_buy_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gbp_user ON group_buy_participants(user_id);
ALTER TABLE group_buy_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gbp_read"       ON group_buy_participants FOR SELECT USING (true);
CREATE POLICY "gbp_auth_write" ON group_buy_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gbp_admin"      ON group_buy_participants FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- skill_swaps
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_swaps (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id               UUID REFERENCES neighborhood_zones(id),
  offerer_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offering              TEXT NOT NULL,
  seeking               TEXT NOT NULL,
  time_credits_offered  INTEGER DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','matched','completed','cancelled')),
  matched_with_user_id  UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skill_swaps_offerer ON skill_swaps(offerer_id);
CREATE INDEX IF NOT EXISTS idx_skill_swaps_status  ON skill_swaps(status);
ALTER TABLE skill_swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_swaps_read"        ON skill_swaps FOR SELECT USING (true);
CREATE POLICY "skill_swaps_auth_write"  ON skill_swaps FOR INSERT WITH CHECK (auth.uid() = offerer_id);
CREATE POLICY "skill_swaps_auth_update" ON skill_swaps FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "skill_swaps_admin"       ON skill_swaps FOR ALL USING (auth.role() = 'service_role');
CREATE TRIGGER skill_swaps_updated_at BEFORE UPDATE ON skill_swaps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- time_credits_ledger
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_credits_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount              INTEGER NOT NULL,   -- positive = earned, negative = spent
  reason              TEXT,
  related_entity_type TEXT,              -- 'skill_swap' | 'jury_vote' | 'grant' | 'booking'
  related_entity_id   UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tcl_user ON time_credits_ledger(user_id);
ALTER TABLE time_credits_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tcl_own_read"  ON time_credits_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tcl_auth_write"ON time_credits_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tcl_admin"     ON time_credits_ledger FOR ALL USING (auth.role() = 'service_role');

-- Materialized view for fast balance lookups
CREATE MATERIALIZED VIEW IF NOT EXISTS time_credits_balances AS
  SELECT user_id, COALESCE(SUM(amount), 0) AS balance
  FROM time_credits_ledger
  GROUP BY user_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tcb_user ON time_credits_balances(user_id);

-- -------------------------------------------------------
-- disputes
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS disputes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID,
  zone_id       UUID REFERENCES neighborhood_zones(id),
  raised_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  against_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category      TEXT DEFAULT 'service_dispute',
  description   TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','voting','resolved','dismissed')),
  resolution    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disputes_status    ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON disputes(raised_by);
CREATE INDEX IF NOT EXISTS idx_disputes_against   ON disputes(against_id);
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes_party_read"  ON disputes FOR SELECT
  USING (auth.uid() = raised_by OR auth.uid() = against_id OR status IN ('open','voting'));
CREATE POLICY "disputes_auth_write"  ON disputes FOR INSERT WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "disputes_admin"       ON disputes FOR ALL USING (auth.role() = 'service_role');
CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- jury_assignments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jury_assignments (
  dispute_id     UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  juror_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote           TEXT CHECK (vote IN ('for','against','abstain')),
  voted_at       TIMESTAMPTZ,
  reward_credits INTEGER DEFAULT 1,
  PRIMARY KEY (dispute_id, juror_user_id)
);
CREATE INDEX IF NOT EXISTS idx_jury_juror ON jury_assignments(juror_user_id);
ALTER TABLE jury_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jury_own_read"  ON jury_assignments FOR SELECT USING (auth.uid() = juror_user_id);
CREATE POLICY "jury_auth_write"ON jury_assignments FOR INSERT WITH CHECK (auth.uid() = juror_user_id);
CREATE POLICY "jury_admin"     ON jury_assignments FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- neighborhood_polls  (if not exists from prior migration)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS neighborhood_polls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question          TEXT NOT NULL,
  options           JSONB DEFAULT '[]',
  neighborhood      TEXT,
  zone_id           UUID REFERENCES neighborhood_zones(id),
  created_by_email  TEXT,
  created_by_name   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE neighborhood_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls_read"        ON neighborhood_polls FOR SELECT USING (true);
CREATE POLICY "polls_auth_write"  ON neighborhood_polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "polls_auth_update" ON neighborhood_polls FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "polls_admin"       ON neighborhood_polls FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- post_comments  (if not exists)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      TEXT NOT NULL,
  author_email TEXT,
  author_name  TEXT,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read"        ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_auth_write"  ON post_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_admin"       ON post_comments FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- event_tickets  (if not exists)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID,
  event_title  TEXT,
  buyer_email  TEXT,
  buyer_name   TEXT,
  quantity     INTEGER DEFAULT 1,
  unit_price   NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  status       TEXT DEFAULT 'active',
  ticket_code  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer ON event_tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON event_tickets(event_id);
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_own_read"  ON event_tickets FOR SELECT USING (
  auth.jwt() ->> 'email' = buyer_email OR auth.role() = 'service_role'
);
CREATE POLICY "tickets_auth_write"ON event_tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tickets_admin"     ON event_tickets FOR ALL USING (auth.role() = 'service_role');
