-- ============================================================
-- PfotenMatch – Sitter System Migration
-- PostGIS, RLS, Stripe Subscription, Verification
-- ============================================================

-- 1) Enable PostGIS extension (needed for geo queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2) Sitter profiles table
CREATE TABLE IF NOT EXISTS sitter_profiles (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    avatar        TEXT DEFAULT '👩',
    bio           TEXT DEFAULT '',
    experience    TEXT DEFAULT '< 1 Jahr',
    response_time TEXT DEFAULT '~1 Std',
    availability  TEXT DEFAULT 'Nach Absprache',
    services      TEXT[] DEFAULT '{}',
    accepted_sizes TEXT[] DEFAULT '{}',
    price_hour    INTEGER,
    price_day     INTEGER,
    price_night   INTEGER,
    -- Location: approximate (city-level), never exact address
    location      GEOGRAPHY(Point, 4326),
    city          TEXT DEFAULT '',
    -- Verification & subscription
    phone_verified   BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
    stripe_customer_id  TEXT,
    stripe_subscription_id TEXT,
    -- Visibility: only visible when subscription is active
    public        BOOLEAN DEFAULT FALSE,
    -- Stats
    rating        NUMERIC(2,1) DEFAULT 5.0,
    review_count  INTEGER DEFAULT 0,
    -- Timestamps
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Index for geo queries
CREATE INDEX IF NOT EXISTS idx_sitter_location ON sitter_profiles USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_sitter_public ON sitter_profiles (public) WHERE public = TRUE;
CREATE INDEX IF NOT EXISTS idx_sitter_user ON sitter_profiles (user_id);

-- 3) Sitter bookings table
CREATE TABLE IF NOT EXISTS sitter_bookings (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sitter_id   UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    service     TEXT NOT NULL,
    date_from   DATE NOT NULL,
    date_to     DATE,
    hours       INTEGER,
    notes       TEXT DEFAULT '',
    total       INTEGER NOT NULL DEFAULT 0,
    status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'canceled')),
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON sitter_bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sitter ON sitter_bookings (sitter_id);

-- 4) Sitter reviews table
CREATE TABLE IF NOT EXISTS sitter_reviews (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id  UUID NOT NULL REFERENCES sitter_bookings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sitter_id   UUID NOT NULL REFERENCES sitter_profiles(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text        TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(booking_id)
);

-- ============================================================
-- 5) RLS Policies
-- ============================================================

ALTER TABLE sitter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_reviews  ENABLE ROW LEVEL SECURITY;

-- Sitter profiles: anyone can read public profiles, owners can edit their own
CREATE POLICY "Public sitter profiles are viewable by everyone"
    ON sitter_profiles FOR SELECT
    USING (public = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own sitter profile"
    ON sitter_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sitter profile"
    ON sitter_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sitter profile"
    ON sitter_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- CRITICAL: Enforce that public=true only when subscription is active
-- This is enforced via a trigger rather than RLS to prevent client-side bypass
CREATE OR REPLACE FUNCTION enforce_sitter_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public = TRUE AND NEW.subscription_status != 'active' THEN
        NEW.public := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_sitter_subscription
    BEFORE INSERT OR UPDATE ON sitter_profiles
    FOR EACH ROW EXECUTE FUNCTION enforce_sitter_subscription();

-- Bookings: clients see their own, sitters see bookings for them
CREATE POLICY "Clients can view their own bookings"
    ON sitter_bookings FOR SELECT
    USING (
        auth.uid() = client_id
        OR auth.uid() = (SELECT user_id FROM sitter_profiles WHERE id = sitter_id)
    );

CREATE POLICY "Clients can create bookings"
    ON sitter_bookings FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Sitters can update booking status"
    ON sitter_bookings FOR UPDATE
    USING (auth.uid() = (SELECT user_id FROM sitter_profiles WHERE id = sitter_id));

-- Reviews: anyone can read, only booking clients can write
CREATE POLICY "Anyone can view reviews"
    ON sitter_reviews FOR SELECT
    USING (TRUE);

CREATE POLICY "Clients can write reviews for their bookings"
    ON sitter_reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id
        AND auth.uid() = (SELECT client_id FROM sitter_bookings WHERE id = booking_id)
    );

-- ============================================================
-- 6) RPC: Find sitters within radius (privacy-safe)
-- Returns approximate location only (rounded to ~500m)
-- ============================================================

CREATE OR REPLACE FUNCTION find_sitters_nearby(
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
        -- Round coordinates to ~500m for privacy
        ROUND(ST_Y(sp.location::geometry)::numeric, 2)::double precision AS approx_lat,
        ROUND(ST_X(sp.location::geometry)::numeric, 2)::double precision AS approx_lng,
        -- Distance in km
        ROUND((ST_Distance(
            sp.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000.0)::numeric, 1)::double precision AS distance_km,
        sp.phone_verified,
        sp.subscription_status,
        sp.rating,
        sp.review_count
    FROM sitter_profiles sp
    WHERE sp.public = TRUE
      AND sp.subscription_status = 'active'
      AND ST_DWithin(
          sp.location,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
          radius_km * 1000
      )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7) Auto-update rating when a review is added
-- ============================================================

CREATE OR REPLACE FUNCTION update_sitter_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sitter_profiles SET
        rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM sitter_reviews WHERE sitter_id = NEW.sitter_id),
        review_count = (SELECT COUNT(*) FROM sitter_reviews WHERE sitter_id = NEW.sitter_id),
        updated_at = now()
    WHERE id = NEW.sitter_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_sitter_rating
    AFTER INSERT ON sitter_reviews
    FOR EACH ROW EXECUTE FUNCTION update_sitter_rating();
