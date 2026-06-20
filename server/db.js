import pg from 'pg';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function initNewTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS phone TEXT,
                ADD COLUMN IF NOT EXISTS city TEXT,
                ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'PK',
                ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS zone_id UUID
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS wallets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
                currency TEXT NOT NULL DEFAULT 'PKR',
                is_frozen BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, currency)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                wallet_id UUID NOT NULL REFERENCES wallets(id),
                user_id UUID NOT NULL REFERENCES users(id),
                type TEXT NOT NULL CHECK (type IN ('credit','debit','hold','release','fee','refund','payout')),
                amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
                balance_before NUMERIC(12,2) NOT NULL,
                balance_after NUMERIC(12,2) NOT NULL,
                reference_type TEXT,
                reference_id UUID,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON wallet_transactions(user_id, created_at DESC)
        `);

        await client.query(`
            CREATE OR REPLACE FUNCTION wallet_mutate(
                p_user_id UUID,
                p_type TEXT,
                p_amount NUMERIC,
                p_ref_type TEXT DEFAULT NULL,
                p_ref_id UUID DEFAULT NULL,
                p_description TEXT DEFAULT NULL
            ) RETURNS wallet_transactions AS $$
            DECLARE
                v_wallet wallets;
                v_new_balance NUMERIC;
                v_txn wallet_transactions;
            BEGIN
                SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
                END IF;
                IF v_wallet.is_frozen THEN
                    RAISE EXCEPTION 'Wallet is frozen';
                END IF;
                IF p_type IN ('debit','hold','fee') THEN
                    IF v_wallet.balance < p_amount THEN
                        RAISE EXCEPTION 'Insufficient balance';
                    END IF;
                    v_new_balance := v_wallet.balance - p_amount;
                ELSE
                    v_new_balance := v_wallet.balance + p_amount;
                END IF;
                UPDATE wallets SET balance = v_new_balance, updated_at = NOW() WHERE id = v_wallet.id;
                INSERT INTO wallet_transactions(wallet_id, user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
                VALUES (v_wallet.id, p_user_id, p_type, p_amount, v_wallet.balance, v_new_balance, p_ref_type, p_ref_id, p_description)
                RETURNING * INTO v_txn;
                RETURN v_txn;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS bnpl_agreements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                booking_id UUID,
                total_amount NUMERIC(12,2) NOT NULL,
                installments INT NOT NULL DEFAULT 3,
                installment_amount NUMERIC(12,2) NOT NULL,
                paid_installments INT NOT NULL DEFAULT 0,
                next_due_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','defaulted','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS provider_trust_scores (
                provider_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                score NUMERIC(5,2) NOT NULL DEFAULT 0,
                tier TEXT NOT NULL DEFAULT 'new' CHECK (tier IN ('champion','trusted','verified','rising','new')),
                completion_rate NUMERIC(5,2),
                avg_rating NUMERIC(3,2),
                total_completed INT DEFAULT 0,
                dispute_free_streak INT DEFAULT 0,
                response_time_hours NUMERIC(6,2),
                vouches_count INT DEFAULT 0,
                last_computed_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS providers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                business_name TEXT NOT NULL,
                description TEXT,
                category_slug TEXT NOT NULL DEFAULT 'other',
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
                lat DOUBLE PRECISION,
                lng DOUBLE PRECISION,
                service_radius_km INTEGER DEFAULT 10 CHECK (service_radius_km BETWEEN 1 AND 50),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_user ON providers(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category_slug)`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS loyalty_ledger (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                coins BIGINT NOT NULL,
                reason TEXT NOT NULL,
                reference_type TEXT,
                reference_id UUID,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user ON loyalty_ledger(user_id, created_at DESC)
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                actor_id UUID REFERENCES users(id),
                action TEXT NOT NULL,
                entity TEXT NOT NULL,
                entity_id UUID,
                payload JSONB,
                ip_address TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at DESC)
        `);

        // Simon actions audit table - for tracking autonomous decisions (multi-agent version)
        await client.query(`
            CREATE TABLE IF NOT EXISTS simon_actions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                agent TEXT NOT NULL,
                action_type TEXT NOT NULL,
                tool_called TEXT,
                input JSONB,
                output JSONB,
                confidence NUMERIC(4,2),
                reasoning TEXT,
                status TEXT DEFAULT 'completed' CHECK (status IN ('completed','pending_approval','approved','rejected','failed')),
                approved_by UUID REFERENCES users(id),
                approved_at TIMESTAMPTZ,
                source TEXT DEFAULT 'request' CHECK (source IN ('request','monitor','schedule')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_simon_actions_agent ON simon_actions(agent, created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_simon_actions_status ON simon_actions(status)`);
        
        // Simon memory table - for persistent pattern learning
        await client.query(`
            CREATE TABLE IF NOT EXISTS simon_memory (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT NOT NULL UNIQUE,
                value JSONB NOT NULL,
                confidence NUMERIC(4,2),
                source_agent TEXT,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_simon_memory_key ON simon_memory(key)`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                data JSONB,
                read BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS provider_vouches (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                provider_id UUID NOT NULL REFERENCES users(id),
                voucher_id UUID NOT NULL REFERENCES users(id),
                zone_id UUID,
                message TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(provider_id, voucher_id)
            )
        `);

        await client.query('COMMIT');

        await pool.query(`
            CREATE OR REPLACE FUNCTION recompute_trust_score(p_provider_id UUID) RETURNS VOID AS $$
            DECLARE
                v_completed INT := 0;
                v_total INT := 0;
                v_avg_rating NUMERIC := 0;
                v_vouches INT := 0;
                v_score NUMERIC;
                v_tier TEXT;
                v_completion_rate NUMERIC := 0;
                v_has_avatar BOOLEAN := FALSE;
            BEGIN
                SELECT
                    COUNT(*) FILTER (WHERE status = 'completed'),
                    COUNT(*)
                INTO v_completed, v_total
                FROM bookings WHERE provider_id = p_provider_id::TEXT;

                IF v_total > 0 THEN
                    v_completion_rate := v_completed::NUMERIC / v_total::NUMERIC;
                END IF;

                SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
                FROM reviews WHERE provider_id = p_provider_id::TEXT;

                SELECT COUNT(*) INTO v_vouches
                FROM provider_vouches WHERE provider_id = p_provider_id;

                SELECT avatar_url IS NOT NULL INTO v_has_avatar
                FROM users WHERE id = p_provider_id;

                v_score := LEAST(100,
                    (v_completion_rate * 40) +
                    ((v_avg_rating / 5.0) * 25) +
                    (LEAST(v_completed, 100) / 100.0 * 15) +
                    (CASE WHEN v_has_avatar THEN 10 ELSE 0 END) +
                    (LEAST(v_vouches, 5) * 2)
                );

                v_tier := CASE
                    WHEN v_score >= 90 THEN 'champion'
                    WHEN v_score >= 78 THEN 'trusted'
                    WHEN v_score >= 62 THEN 'verified'
                    WHEN v_score >= 45 THEN 'rising'
                    ELSE 'new'
                END;

                INSERT INTO provider_trust_scores(provider_id, score, tier, completion_rate, avg_rating, total_completed)
                VALUES (p_provider_id, v_score, v_tier, v_completion_rate, v_avg_rating, v_completed)
                ON CONFLICT (provider_id) DO UPDATE SET
                    score = EXCLUDED.score,
                    tier = EXCLUDED.tier,
                    completion_rate = EXCLUDED.completion_rate,
                    avg_rating = EXCLUDED.avg_rating,
                    total_completed = EXCLUDED.total_completed,
                    last_computed_at = NOW();
            END;
            $$ LANGUAGE plpgsql;
        `);

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function writeAuditLog({ actorId, action, entity, entityId, payload, ipAddress }) {
    try {
        await pool.query(
            `INSERT INTO audit_log(actor_id, action, entity, entity_id, payload, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [actorId || null, action, entity, entityId || null, payload ? JSON.stringify(payload) : null, ipAddress || null]
        );
    } catch (_) {}
}

export async function createNotification({ userId, type, title, body, data }) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO notifications(user_id, type, title, body, data, sent_at)
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
            [userId, type, title, body, data ? JSON.stringify(data) : null]
        );
        return rows[0];
    } catch (_) { return null; }
}

export async function ensureWallet(userId) {
    await pool.query(
        `INSERT INTO wallets(user_id) VALUES ($1) ON CONFLICT (user_id, currency) DO NOTHING`,
        [userId]
    );
}

export async function writeSimonAction({ agent, actionType, toolCalled, input, output, confidence, reasoning, status = 'completed', source = 'request' }) {
    try {
        const { rows } = await pool.query(
            `INSERT INTO simon_actions(agent, action_type, tool_called, input, output, confidence, reasoning, status, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [agent, actionType, toolCalled, input ? JSON.stringify(input) : null, output ? JSON.stringify(output) : null, confidence, reasoning, status, source]
        );
        return rows[0];
    } catch (err) {
        console.error('Failed to write Simon action:', err);
        return null;
    }
}

export async function writeSimonMemory(key, value, confidence, sourceAgent, ttlHours = 24) {
    try {
        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
        const { rows } = await pool.query(
            `INSERT INTO simon_memory(key, value, confidence, source_agent, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (key) DO UPDATE SET
                 value = EXCLUDED.value,
                 confidence = EXCLUDED.confidence,
                 source_agent = EXCLUDED.source_agent,
                 expires_at = EXCLUDED.expires_at,
                 updated_at = NOW()
             RETURNING *`,
            [key, JSON.stringify(value), confidence, sourceAgent, expiresAt]
        );
        return rows[0];
    } catch (err) {
        console.error('Failed to write Simon memory:', err);
        return null;
    }
}

export async function readSimonMemory(key) {
    try {
        const { rows } = await pool.query(
            `SELECT value, confidence, source_agent FROM simon_memory 
             WHERE key = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
            [key]
        );
        if (rows.length === 0) return null;
        return { value: rows[0].value, confidence: rows[0].confidence, sourceAgent: rows[0].source_agent };
    } catch (err) {
        console.error('Failed to read Simon memory:', err);
        return null;
    }
}

export async function initNeighborhoodTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Neighborhood zones table
        await client.query(`
            CREATE TABLE IF NOT EXISTS neighborhood_zones (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                area TEXT,
                city TEXT DEFAULT 'Karachi',
                health_score NUMERIC(5,2) DEFAULT 50.00,
                demand_index NUMERIC(5,2) DEFAULT 0.00,
                active_providers INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        // Seed some default zones if table is empty
        const { rows: existingZones } = await client.query('SELECT COUNT(*) FROM neighborhood_zones');
        if (parseInt(existingZones[0].count) === 0) {
            await client.query(`
                INSERT INTO neighborhood_zones (name, area, city, health_score, demand_index) VALUES
                ('DHA Phase 5', 'Defence Housing Authority', 'Karachi', 75.0, 60.0),
                ('Clifton Block 9', 'Clifton', 'Karachi', 82.0, 75.0),
                ('Gulshan-e-Iqbal Block 10', 'Gulshan-e-Iqbal', 'Karachi', 68.0, 55.0),
                ('North Nazimabad Block A', 'North Nazimabad', 'Karachi', 71.0, 65.0),
                ('Johar Chowrangi', 'Gulistan-e-Johar', 'Karachi', 64.0, 58.0)
            `);
        }

        // Community posts table
        await client.query(`
            CREATE TABLE IF NOT EXISTS community_posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post','announcement','event','poll','alert')),
                title TEXT,
                body TEXT NOT NULL,
                author_name TEXT,
                author_email TEXT,
                author_id UUID REFERENCES users(id) ON DELETE SET NULL,
                image_url TEXT,
                upvotes INT DEFAULT 0,
                reply_count INT DEFAULT 0,
                created_date TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_community_posts_date ON community_posts(created_date DESC)`);

        // Post comments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
                author_email TEXT NOT NULL,
                author_name TEXT,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at ASC)`);

        // Neighborhood polls table
        await client.query(`
            CREATE TABLE IF NOT EXISTS neighborhood_polls (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                question TEXT NOT NULL,
                options JSONB NOT NULL DEFAULT '[]',
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Events table
        await client.query(`
            CREATE TABLE IF NOT EXISTS events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'community',
                venue_name TEXT,
                venue_type TEXT,
                address TEXT,
                date DATE,
                start_time TEXT,
                end_time TEXT,
                organizer_name TEXT,
                organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
                ticket_price NUMERIC(10,2) DEFAULT 0,
                is_free BOOLEAN DEFAULT TRUE,
                total_tickets INT DEFAULT 100,
                tickets_sold INT DEFAULT 0,
                bundle_services JSONB DEFAULT '[]',
                cover_image_url TEXT,
                status TEXT DEFAULT 'published' CHECK (status IN ('draft','published','cancelled','completed')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date ASC)`);

        // Event tickets table
        await client.query(`
            CREATE TABLE IF NOT EXISTS event_tickets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                event_title TEXT,
                buyer_email TEXT NOT NULL,
                buyer_name TEXT,
                quantity INT DEFAULT 1,
                unit_price NUMERIC(10,2) DEFAULT 0,
                total_amount NUMERIC(10,2) DEFAULT 0,
                ticket_code TEXT UNIQUE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_event_tickets_buyer ON event_tickets(buyer_email, created_at DESC)`);

        // Group buys table
        await client.query(`
            CREATE TABLE IF NOT EXISTS group_buys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                zone_id UUID,
                service_category TEXT NOT NULL,
                description TEXT,
                initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                target_participants INT DEFAULT 5,
                current_participants INT DEFAULT 1,
                discount_percent INT DEFAULT 10,
                expires_at TIMESTAMPTZ,
                status TEXT DEFAULT 'open' CHECK (status IN ('open','locked','completed','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Group buy participants table
        await client.query(`
            CREATE TABLE IF NOT EXISTS group_buy_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_buy_id UUID NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(group_buy_id, user_id)
            )
        `);

        // Skill swaps table
        await client.query(`
            CREATE TABLE IF NOT EXISTS skill_swaps (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                zone_id UUID,
                offerer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                offering TEXT NOT NULL,
                seeking TEXT,
                time_credits_offered INT DEFAULT 1,
                matched_with_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                status TEXT DEFAULT 'open' CHECK (status IN ('open','matched','completed','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Time credits ledger table
        await client.query(`
            CREATE TABLE IF NOT EXISTS time_credits_ledger (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount INT NOT NULL,
                reason TEXT,
                reference_type TEXT,
                reference_id UUID,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_time_credits_user ON time_credits_ledger(user_id, created_at DESC)`);

        // Emergency requests table
        await client.query(`
            CREATE TABLE IF NOT EXISTS emergency_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                category TEXT NOT NULL,
                urgency TEXT DEFAULT 'immediate' CHECK (urgency IN ('critical','immediate','urgent','scheduled')),
                description TEXT,
                lat NUMERIC(10,8),
                lng NUMERIC(11,8),
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','resolved','cancelled')),
                assigned_provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Disputes table
        await client.query(`
            CREATE TABLE IF NOT EXISTS disputes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                raised_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                against_id UUID REFERENCES users(id) ON DELETE SET NULL,
                booking_id UUID,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                evidence_urls TEXT[] DEFAULT '{}',
                status TEXT DEFAULT 'open' CHECK (status IN ('open','voting','resolved','dismissed')),
                resolution TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                resolved_at TIMESTAMPTZ
            )
        `);

        // Jury assignments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS jury_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
                juror_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                vote TEXT CHECK (vote IN ('for_plaintiff','for_defendant','abstain')),
                voted_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(dispute_id, juror_user_id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                thread_key TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','voice','location')),
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_thread ON chat_messages(thread_key, created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id, read)`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS ride_shares (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                type TEXT NOT NULL DEFAULT 'carpool' CHECK (type IN ('carpool','delivery','moving','car_rental')),
                from_location TEXT NOT NULL,
                to_location TEXT NOT NULL,
                departure_at TIMESTAMPTZ,
                seats_total INT NOT NULL DEFAULT 1,
                seats_available INT NOT NULL DEFAULT 1,
                price_pkr NUMERIC(10,2) NOT NULL DEFAULT 0,
                vehicle TEXT,
                notes TEXT,
                contact_phone TEXT,
                recurring BOOLEAN DEFAULT FALSE,
                status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','completed','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS ride_passengers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ride_id UUID NOT NULL REFERENCES ride_shares(id) ON DELETE CASCADE,
                passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(ride_id, passenger_id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS committees (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                description TEXT,
                organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                monthly_amount_pkr NUMERIC(12,2) NOT NULL,
                member_limit INT NOT NULL DEFAULT 12,
                total_rounds INT NOT NULL DEFAULT 12,
                current_round INT NOT NULL DEFAULT 0,
                payout_day INT NOT NULL DEFAULT 1 CHECK (payout_day BETWEEN 1 AND 28),
                status TEXT NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting','active','completed','cancelled')),
                next_payout_at DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS committee_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                payout_position INT,
                contributed_rounds INT NOT NULL DEFAULT 0,
                has_received_payout BOOLEAN DEFAULT FALSE,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(committee_id, user_id)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS committee_contributions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                committee_id UUID NOT NULL REFERENCES committees(id),
                member_id UUID NOT NULL REFERENCES users(id),
                round_number INT NOT NULL,
                amount_pkr NUMERIC(12,2) NOT NULL,
                paid_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS marketplace_listings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                title TEXT NOT NULL,
                description TEXT,
                price_pkr NUMERIC(12,2) NOT NULL,
                category TEXT NOT NULL DEFAULT 'other',
                condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('new','like_new','good','fair','for_parts')),
                images TEXT[] DEFAULT '{}',
                negotiable BOOLEAN DEFAULT TRUE,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','reserved','removed')),
                views INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_zone ON marketplace_listings(zone_id, status, created_at DESC)`);
        await client.query(`
            CREATE TABLE IF NOT EXISTS marketplace_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
                buyer_id UUID NOT NULL REFERENCES users(id),
                seller_id UUID NOT NULL REFERENCES users(id),
                amount_pkr NUMERIC(12,2) NOT NULL,
                message TEXT,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS blood_donors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                blood_type TEXT NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
                available BOOLEAN DEFAULT TRUE,
                last_donation_at DATE,
                contact_phone TEXT,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS blood_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                blood_type TEXT NOT NULL,
                urgency TEXT NOT NULL DEFAULT 'urgent' CHECK (urgency IN ('emergency','urgent','planned')),
                hospital TEXT,
                notes TEXT,
                units_needed INT DEFAULT 1,
                fulfilled BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS notice_board (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                type TEXT NOT NULL CHECK (type IN ('lost','found','sell','free','room','job','announcement','other')),
                title TEXT NOT NULL,
                body TEXT,
                price_pkr NUMERIC(12,2),
                contact_phone TEXT,
                images TEXT[] DEFAULT '{}',
                active BOOLEAN DEFAULT TRUE,
                expires_at DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS tool_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                description TEXT,
                deposit_pkr NUMERIC(10,2) DEFAULT 0,
                available BOOLEAN DEFAULT TRUE,
                images TEXT[] DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS tool_loans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_id UUID NOT NULL REFERENCES tool_items(id) ON DELETE CASCADE,
                borrower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                return_by DATE NOT NULL,
                returned_at TIMESTAMPTZ,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned','overdue','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS job_posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                poster_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL DEFAULT 'general',
                wage_pkr NUMERIC(10,2),
                duration TEXT,
                job_type TEXT NOT NULL DEFAULT 'gig' CHECK (job_type IN ('gig','part_time','full_time','apprenticeship','volunteer')),
                status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                job_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
                applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message TEXT,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','shortlisted','hired','rejected')),
                applied_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(job_id, applicant_id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS food_shares (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                title TEXT NOT NULL,
                description TEXT,
                quantity TEXT NOT NULL,
                is_free BOOLEAN DEFAULT TRUE,
                price_pkr NUMERIC(10,2) DEFAULT 0,
                available_until TIMESTAMPTZ,
                claimed_by UUID REFERENCES users(id),
                claimed_at TIMESTAMPTZ,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS watch_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
                zone_id UUID,
                type TEXT NOT NULL CHECK (type IN ('theft','suspicious','hazard','infrastructure','noise','other')),
                title TEXT NOT NULL,
                description TEXT,
                location_text TEXT,
                anonymous BOOLEAN DEFAULT FALSE,
                upvotes INT DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS local_businesses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                address TEXT,
                phone TEXT,
                hours TEXT,
                payment_methods TEXT[] DEFAULT '{"cash"}',
                verified BOOLEAN DEFAULT FALSE,
                rating_avg NUMERIC(3,2) DEFAULT 0,
                rating_count INT DEFAULT 0,
                open_now BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS event_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'community',
                proposed_date DATE,
                venue TEXT,
                expected_attendees INT DEFAULT 50,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
                admin_notes TEXT,
                approved_event_id UUID,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS religious_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                type TEXT NOT NULL CHECK (type IN ('prayer','ramzan','eid','funeral','nikah','aqeeqa','other')),
                title TEXT NOT NULL,
                description TEXT,
                event_date TIMESTAMPTZ,
                location TEXT,
                open_to_all BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS load_shedding_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
                zone_id UUID,
                area_name TEXT,
                started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                restored_at TIMESTAMPTZ,
                duration_hours NUMERIC(5,2),
                notes TEXT,
                upvotes INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query('COMMIT');
        console.log('Neighborhood tables initialized');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('initNeighborhoodTables error:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

export async function initLocationIntelligence() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Enable PostGIS extension
        await client.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

        // Add geometry columns to providers table
        await client.query(`
            ALTER TABLE providers
                ADD COLUMN IF NOT EXISTS geolocation GEOGRAPHY(POINT, 4326)
        `);
        
        // Update existing providers with geolocation if they have lat/lng
        await client.query(`
            UPDATE providers
            SET geolocation = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
            WHERE lat IS NOT NULL AND lng IS NOT NULL AND geolocation IS NULL
        `);
        
        // Create GIST index for providers geolocation
        await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_geo ON providers USING GIST(geolocation)`);

        // Add geometry columns to neighborhood_zones table
        await client.query(`
            ALTER TABLE neighborhood_zones
                ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS center_lng DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS geolocation GEOGRAPHY(POINT, 4326),
                ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 25000
        `);
        
        // Update existing zones with default coordinates if they don't have them
        await client.query(`
            UPDATE neighborhood_zones
            SET 
                center_lat = CASE 
                    WHEN center_lat IS NULL THEN 24.8607
                    ELSE center_lat 
                END,
                center_lng = CASE 
                    WHEN center_lng IS NULL THEN 67.0011
                    ELSE center_lng 
                END
            WHERE center_lat IS NULL OR center_lng IS NULL
        `);
        
        await client.query(`
            UPDATE neighborhood_zones
            SET geolocation = ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
            WHERE center_lat IS NOT NULL AND center_lng IS NOT NULL AND geolocation IS NULL
        `);
        
        // Create GIST index for zones geolocation
        await client.query(`CREATE INDEX IF NOT EXISTS idx_zones_geo ON neighborhood_zones USING GIST(geolocation)`);

        // Add location columns to users table
        await client.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS detected_zone_id TEXT
        `);
        
        // Create index for detected_zone_id
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_zone ON users(detected_zone_id)`);

        // Create provider_presence table for real-time heartbeat tracking
        await client.query(`
            CREATE TABLE IF NOT EXISTS provider_presence (
                provider_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                lat DOUBLE PRECISION NOT NULL,
                lng DOUBLE PRECISION NOT NULL,
                geolocation GEOGRAPHY(POINT, 4326),
                is_online BOOLEAN DEFAULT true,
                is_accepting_jobs BOOLEAN DEFAULT true,
                last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
                current_zone_id TEXT,
                active_booking_id UUID,
                device_info TEXT
            )
        `);
        
        // Create indexes for provider_presence
        await client.query(`CREATE INDEX IF NOT EXISTS idx_presence_online ON provider_presence(is_online, last_heartbeat)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_presence_geo ON provider_presence USING GIST(geolocation)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_presence_heartbeat ON provider_presence(last_heartbeat DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_presence_accepting ON provider_presence(is_accepting_jobs) WHERE is_accepting_jobs = true`);

        await client.query('COMMIT');
        console.log('Location intelligence initialized successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('initLocationIntelligence error:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

export async function initExtendedTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS skill_verifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category TEXT NOT NULL,
                verified_count INT NOT NULL DEFAULT 0,
                last_active_at TIMESTAMPTZ,
                first_verified_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(provider_id, category)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS income_snapshots (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                period TEXT NOT NULL CHECK (period IN ('30d','90d','365d')),
                amount_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
                transaction_count INT NOT NULL DEFAULT 0,
                computed_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, period)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS demand_forecasts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                zone_id TEXT NOT NULL,
                area TEXT NOT NULL DEFAULT 'your area',
                category TEXT NOT NULL,
                forecast_hour TIMESTAMPTZ NOT NULL,
                demand_index INT NOT NULL DEFAULT 50 CHECK (demand_index BETWEEN 0 AND 100),
                estimated_price_pkr NUMERIC(10,2),
                supply_shortfall BOOLEAN DEFAULT FALSE,
                living_wage_floor_pkr NUMERIC(10,2) DEFAULT 800,
                generated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(zone_id, category, forecast_hour)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_demand_forecasts_zone_time
            ON demand_forecasts(zone_id, forecast_hour)
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS idle_slots (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                starts_at TIMESTAMPTZ NOT NULL,
                ends_at TIMESTAMPTZ NOT NULL,
                categories TEXT[] NOT NULL DEFAULT '{}',
                zone_id TEXT,
                status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','expired','cancelled')),
                matched_micro_job_id UUID,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS micro_jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                zone_id TEXT NOT NULL,
                area TEXT NOT NULL DEFAULT 'your area',
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                estimated_duration_hours NUMERIC(4,1) NOT NULL DEFAULT 1,
                price_pkr NUMERIC(10,2) NOT NULL,
                status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','completed','cancelled')),
                provider_id UUID REFERENCES users(id),
                customer_id UUID REFERENCES users(id),
                scheduled_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS care_bridge_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                recipient_name TEXT NOT NULL,
                recipient_phone TEXT NOT NULL,
                recipient_city TEXT NOT NULL DEFAULT 'Hyderabad',
                recipient_country TEXT NOT NULL DEFAULT 'PK',
                services JSONB NOT NULL DEFAULT '[]',
                notes TEXT,
                total_pkr NUMERIC(12,2) NOT NULL,
                currency_sent TEXT NOT NULL DEFAULT 'EUR',
                amount_sent NUMERIC(12,4) NOT NULL,
                exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 310,
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','in_progress','completed','proof_sent','cancelled')),
                proof_photo_url TEXT,
                proof_notes TEXT,
                proof_submitted_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_care_bridge_sender ON care_bridge_orders(sender_id, created_at DESC)
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS service_bundles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                zone_id UUID,
                title TEXT NOT NULL,
                description TEXT,
                category_slug TEXT NOT NULL DEFAULT 'other',
                service_name TEXT,
                zone_name TEXT,
                address_hint TEXT,
                max_participants INT NOT NULL DEFAULT 5,
                current_participants INT NOT NULL DEFAULT 1,
                discount_percentage INT NOT NULL DEFAULT 20,
                base_price NUMERIC(12,2),
                discounted_price NUMERIC(12,2),
                status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming','confirmed','active','completed','cancelled')),
                scheduled_date DATE,
                deadline_date DATE,
                organizer_email TEXT,
                participant_emails TEXT[] DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS bundle_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bundle_id UUID NOT NULL REFERENCES service_bundles(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(bundle_id, user_id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS savings_goals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                target_pkr NUMERIC(12,2) NOT NULL,
                saved_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
                deadline DATE,
                category TEXT,
                simon_routing_active BOOLEAN DEFAULT TRUE,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
