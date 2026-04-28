-- ============================================================
-- PfotenMatch – Komplette Datenbank-Migration
-- Diese eine Datei ersetzt alle vorherigen Migrationsdateien.
-- Im Supabase SQL Editor ausführen.
--
-- ⚠️ WARNUNG: Diese Migration LÖSCHT alle vorhandenen Daten
-- in den PfotenMatch-Tabellen und erstellt sie neu!
-- ============================================================

-- ============================================================
-- 0. CLEANUP – Alle alten Tabellen entfernen (in FK-Reihenfolge)
-- ============================================================
DROP TABLE IF EXISTS identity_verifications CASCADE;
DROP TABLE IF EXISTS sitter_reviews   CASCADE;
DROP TABLE IF EXISTS sitter_bookings  CASCADE;
DROP TABLE IF EXISTS sitter_requests  CASCADE;
DROP TABLE IF EXISTS bookings         CASCADE;
DROP TABLE IF EXISTS sitter_profiles  CASCADE;
DROP TABLE IF EXISTS chat_messages    CASCADE;
DROP TABLE IF EXISTS conversations    CASCADE;
DROP TABLE IF EXISTS messages         CASCADE;
DROP TABLE IF EXISTS matches          CASCADE;
DROP TABLE IF EXISTS check_ins        CASCADE;
DROP TABLE IF EXISTS danger_reports   CASCADE;
DROP TABLE IF EXISTS stories          CASCADE;
DROP TABLE IF EXISTS paw_stamps       CASCADE;
DROP TABLE IF EXISTS liked_by         CASCADE;
DROP TABLE IF EXISTS user_settings    CASCADE;
DROP TABLE IF EXISTS dog_profiles     CASCADE;

DROP FUNCTION IF EXISTS find_sitters_nearby(double precision, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS enforce_sitter_subscription() CASCADE;
DROP FUNCTION IF EXISTS update_sitter_rating() CASCADE;

-- ============================================================
-- 1. DOG PROFILES (Profil + Standort + Friend Code)
-- ============================================================
CREATE TABLE dog_profiles (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL DEFAULT 'Bello',
    breed        TEXT DEFAULT 'Mischling',
    age          INTEGER DEFAULT 3,
    size         TEXT DEFAULT 'Mittel',
    neutered     TEXT DEFAULT 'Nein',
    energy       TEXT DEFAULT 'Ausgeglichen',
    play_style   TEXT DEFAULT 'Rennend',
    tags         TEXT DEFAULT '',
    bio          TEXT DEFAULT '',
    emoji        TEXT DEFAULT '',
    avatar_image TEXT,
    photos       JSONB DEFAULT '[]'::jsonb,
    city         TEXT DEFAULT 'Basel',
    lat          DOUBLE PRECISION DEFAULT 47.5585,
    lng          DOUBLE PRECISION DEFAULT 7.5880,
    friend_code  TEXT UNIQUE,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dog_profiles_friend_code ON dog_profiles(friend_code);
CREATE INDEX idx_dog_profiles_user_id     ON dog_profiles(user_id);

ALTER TABLE dog_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dog_select_all"
    ON dog_profiles FOR SELECT
    USING (true);

CREATE POLICY "dog_insert_own"
    ON dog_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dog_update_own"
    ON dog_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dog_delete_own"
    ON dog_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 2. MATCHES (Verbindung User <-> Demo-Hund)
-- ============================================================
CREATE TABLE matches (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id     INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, dog_id)
);

CREATE INDEX idx_matches_user_id ON matches(user_id);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_manage_own"
    ON matches FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. MESSAGES (Bot-Chat mit Demo-Hunden)
-- ============================================================
CREATE TABLE messages (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender     TEXT NOT NULL DEFAULT 'me',
    type       TEXT DEFAULT 'text',
    text       TEXT,
    image      TEXT,
    location   JSONB,
    duration   TEXT,
    reply_to   TEXT,
    reactions  JSONB DEFAULT '[]'::jsonb,
    deleted    BOOLEAN DEFAULT FALSE,
    status     TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_match_id ON messages(match_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_manage_own"
    ON messages FOR ALL
    USING (match_id IN (SELECT id FROM matches WHERE user_id = auth.uid()))
    WITH CHECK (match_id IN (SELECT id FROM matches WHERE user_id = auth.uid()));

-- ============================================================
-- 4. CONVERSATIONS (Echte Chats zwischen zwei Usern)
-- ============================================================
CREATE TABLE conversations (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_a_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conv_a ON conversations(user_a_id);
CREATE INDEX idx_conv_b ON conversations(user_b_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_manage_own"
    ON conversations FOR ALL
    USING (auth.uid() = user_a_id OR auth.uid() = user_b_id)
    WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- ============================================================
-- 5. CHAT MESSAGES (Echte Nachrichten zwischen Usern)
-- ============================================================
CREATE TABLE chat_messages (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type            TEXT DEFAULT 'text',
    text            TEXT,
    image           TEXT,
    location        JSONB,
    duration        TEXT,
    reply_to        TEXT,
    reactions       JSONB DEFAULT '[]'::jsonb,
    deleted         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_msg_conv ON chat_messages(conversation_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_msg_manage_own"
    ON chat_messages FOR ALL
    USING (conversation_id IN (
        SELECT id FROM conversations
        WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()
    ))
    WITH CHECK (conversation_id IN (
        SELECT id FROM conversations
        WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()
    ));

-- ============================================================
-- 6. SITTER PROFILES (mit Standort, Stripe-Abo, Verifizierung)
-- ============================================================
CREATE TABLE sitter_profiles (
    id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name                   TEXT NOT NULL,
    avatar                 TEXT DEFAULT '👩',
    avatar_image           TEXT,
    photos                 JSONB DEFAULT '[]',
    bio                    TEXT DEFAULT '',
    about                  TEXT DEFAULT '',
    experience             TEXT DEFAULT '< 1 Jahr',
    response_time          TEXT DEFAULT '~1 Std',
    availability           TEXT DEFAULT 'Nach Absprache',
    services               TEXT[] DEFAULT '{}',
    accepted_sizes         TEXT[] DEFAULT '{}',
    price_hour             INTEGER,
    price_day              INTEGER,
    price_night            INTEGER,
    lat                    DOUBLE PRECISION,
    lng                    DOUBLE PRECISION,
    city                   TEXT DEFAULT '',
    phone_verified         BOOLEAN DEFAULT FALSE,
    identity_verified      BOOLEAN DEFAULT FALSE,
    identity_session_id    TEXT,
    subscription_status    TEXT DEFAULT 'inactive'
        CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    is_public              BOOLEAN DEFAULT FALSE,
    rating                 NUMERIC(2,1) DEFAULT 5.0,
    review_count           INTEGER DEFAULT 0,
    created_at             TIMESTAMPTZ DEFAULT now(),
    updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sitter_user_id  ON sitter_profiles(user_id);
CREATE INDEX idx_sitter_public   ON sitter_profiles(is_public) WHERE is_public = TRUE;

ALTER TABLE sitter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sitter_select"
    ON sitter_profiles FOR SELECT
    USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "sitter_insert_own"
    ON sitter_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sitter_update_own"
    ON sitter_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sitter_delete_own"
    ON sitter_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger: is_public darf nur TRUE sein wenn Abo aktiv
CREATE FUNCTION enforce_sitter_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_public = TRUE AND NEW.subscription_status != 'active' THEN
        NEW.is_public := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_sitter_subscription
    BEFORE INSERT OR UPDATE ON sitter_profiles
    FOR EACH ROW EXECUTE FUNCTION enforce_sitter_subscription();

-- ============================================================
-- 7. SITTER BOOKINGS (Buchungen)
-- ============================================================
CREATE TABLE sitter_bookings (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sitter_id  UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    service    TEXT NOT NULL,
    date_from  DATE NOT NULL,
    date_to    DATE,
    hours      INTEGER,
    notes      TEXT DEFAULT '',
    total      INTEGER NOT NULL DEFAULT 0,
    status     TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookings_client ON sitter_bookings(client_id);
CREATE INDEX idx_bookings_sitter ON sitter_bookings(sitter_id);

ALTER TABLE sitter_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_select"
    ON sitter_bookings FOR SELECT
    USING (
        auth.uid() = client_id
        OR auth.uid() = (SELECT user_id FROM sitter_profiles WHERE id = sitter_id)
    );

CREATE POLICY "booking_insert"
    ON sitter_bookings FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "booking_update"
    ON sitter_bookings FOR UPDATE
    USING (
        auth.uid() = client_id
        OR auth.uid() = (SELECT user_id FROM sitter_profiles WHERE id = sitter_id)
    );

-- ============================================================
-- 8. SITTER REVIEWS
-- ============================================================
CREATE TABLE sitter_reviews (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id  UUID NOT NULL UNIQUE REFERENCES sitter_bookings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sitter_id   UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text        TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reviews_sitter ON sitter_reviews(sitter_id);

ALTER TABLE sitter_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_select_all"
    ON sitter_reviews FOR SELECT
    USING (true);

CREATE POLICY "review_insert_own"
    ON sitter_reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id
        AND auth.uid() = (SELECT client_id FROM sitter_bookings WHERE id = booking_id)
    );

-- Trigger: Rating und review_count auto-update
CREATE FUNCTION update_sitter_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sitter_profiles SET
        rating = (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM sitter_reviews r WHERE r.sitter_id = NEW.sitter_id),
        review_count = (SELECT COUNT(*) FROM sitter_reviews r WHERE r.sitter_id = NEW.sitter_id),
        updated_at = now()
    WHERE id = NEW.sitter_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_sitter_rating
    AFTER INSERT ON sitter_reviews
    FOR EACH ROW EXECUTE FUNCTION update_sitter_rating();

-- ============================================================
-- 8b. IDENTITY VERIFICATIONS (Stripe Identity)
-- ============================================================
CREATE TABLE identity_verifications (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_session_id TEXT,
    status            TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'verified', 'requires_input')),
    verified_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_identity_user ON identity_verifications(user_id);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identity_select_own"
    ON identity_verifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "identity_insert_own"
    ON identity_verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. RPC: find_sitters_nearby (Haversine, Privacy-safe)
-- ============================================================
CREATE FUNCTION find_sitters_nearby(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    avatar TEXT,
    bio TEXT,
    experience TEXT,
    response_time TEXT,
    availability TEXT,
    services TEXT[],
    accepted_sizes TEXT[],
    price_hour INTEGER,
    price_day INTEGER,
    price_night INTEGER,
    city TEXT,
    approx_lat DOUBLE PRECISION,
    approx_lng DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    phone_verified BOOLEAN,
    subscription_status TEXT,
    rating NUMERIC,
    review_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.id,
        sp.user_id,
        sp.name,
        sp.avatar,
        sp.bio,
        sp.experience,
        sp.response_time,
        sp.availability,
        sp.services,
        sp.accepted_sizes,
        sp.price_hour,
        sp.price_day,
        sp.price_night,
        sp.city,
        ROUND(sp.lat::numeric, 2)::double precision AS approx_lat,
        ROUND(sp.lng::numeric, 2)::double precision AS approx_lng,
        ROUND((
            6371.0 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(user_lat)) * cos(radians(sp.lat))
                    * cos(radians(sp.lng) - radians(user_lng))
                    + sin(radians(user_lat)) * sin(radians(sp.lat))
                ))
            )
        )::numeric, 1)::double precision AS distance_km,
        sp.phone_verified,
        sp.subscription_status,
        sp.rating,
        sp.review_count
    FROM sitter_profiles sp
    WHERE sp.is_public = TRUE
      AND sp.subscription_status = 'active'
      AND sp.lat IS NOT NULL
      AND sp.lng IS NOT NULL
      AND (
          6371.0 * acos(
              LEAST(1.0, GREATEST(-1.0,
                  cos(radians(user_lat)) * cos(radians(sp.lat))
                  * cos(radians(sp.lng) - radians(user_lng))
                  + sin(radians(user_lat)) * sin(radians(sp.lat))
              ))
          )
      ) <= radius_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. USER SETTINGS
-- ============================================================
CREATE TABLE user_settings (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    push          BOOLEAN DEFAULT TRUE,
    chat_notif    BOOLEAN DEFAULT TRUE,
    match_notif   BOOLEAN DEFAULT TRUE,
    danger_notif  BOOLEAN DEFAULT TRUE,
    invisible     BOOLEAN DEFAULT FALSE,
    loc_share     BOOLEAN DEFAULT TRUE,
    read_receipts BOOLEAN DEFAULT TRUE,
    dark          BOOLEAN DEFAULT FALSE,
    lang          TEXT DEFAULT 'de',
    unit          TEXT DEFAULT 'km',
    updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_manage_own"
    ON user_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 11. DANGER REPORTS (Gefahren-Radar)
-- ============================================================
CREATE TABLE danger_reports (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type          TEXT NOT NULL,
    lat           DOUBLE PRECISION NOT NULL,
    lng           DOUBLE PRECISION NOT NULL,
    description   TEXT,
    reporter_name TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_danger_location ON danger_reports(lat, lng);

ALTER TABLE danger_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "danger_select_all"
    ON danger_reports FOR SELECT
    USING (true);

CREATE POLICY "danger_insert_auth"
    ON danger_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "danger_delete_own"
    ON danger_reports FOR DELETE
    USING (auth.uid() = reporter_id);

-- ============================================================
-- 12. CHECK-INS (Live-Präsenz an POIs)
-- ============================================================
CREATE TABLE check_ins (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    spot_id    TEXT NOT NULL,
    dog_name   TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checkins_spot    ON check_ins(spot_id);
CREATE INDEX idx_checkins_expires ON check_ins(expires_at);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_select_all"
    ON check_ins FOR SELECT
    USING (true);

CREATE POLICY "checkin_insert_own"
    ON check_ins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkin_delete_own"
    ON check_ins FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 13. STORIES (24-Std Foto-Stories)
-- ============================================================
CREATE TABLE stories (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    src        TEXT NOT NULL,
    caption    TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stories_user    ON stories(user_id);
CREATE INDEX idx_stories_created ON stories(created_at);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_select_all"
    ON stories FOR SELECT
    USING (true);

CREATE POLICY "story_insert_own"
    ON stories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "story_delete_own"
    ON stories FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 14. PAW STAMPS (gesammelte POI-Pfoten)
-- ============================================================
CREATE TABLE paw_stamps (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    poi_id       TEXT NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, poi_id)
);

CREATE INDEX idx_paw_user ON paw_stamps(user_id);

ALTER TABLE paw_stamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paw_select_own"
    ON paw_stamps FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "paw_insert_own"
    ON paw_stamps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 15. LIKED BY (Premium: wer hat MICH gelikt)
-- ============================================================
CREATE TABLE liked_by (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id     INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, dog_id)
);

CREATE INDEX idx_liked_user ON liked_by(user_id);

ALTER TABLE liked_by ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liked_select_own"
    ON liked_by FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "liked_insert_own"
    ON liked_by FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 16. REALTIME
-- Realtime nur einschalten, wenn nicht schon aktiv
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'check_ins'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'danger_reports'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE danger_reports;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'stories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE stories;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'sitter_bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sitter_bookings;
    END IF;
END $$;

-- ============================================================
-- ✅ FERTIG
-- ============================================================
