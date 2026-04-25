-- ============================================================
-- PfotenMatch – Sitter System Migration (ohne PostGIS)
-- Nutzt lat/lng Spalten + Haversine-Formel für Distanzsuche
-- ============================================================

-- 1) Sitter profiles table
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
    lat           DOUBLE PRECISION,
    lng           DOUBLE PRECISION,
    city          TEXT DEFAULT '',
    phone_verified      BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive'
        CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    is_public     BOOLEAN DEFAULT FALSE,
    rating        NUMERIC(2,1) DEFAULT 5.0,
    review_count  INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_sitter_public ON sitter_profiles (is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_sitter_user   ON sitter_profiles (user_id);

-- 2) Sitter bookings table
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
    status      TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'canceled')),
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON sitter_bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sitter ON sitter_bookings (sitter_id);

-- 3) Sitter reviews table
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
-- 4) RLS Policies
-- ============================================================

ALTER TABLE sitter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitter_reviews  ENABLE ROW LEVEL SECURITY;

-- Sitter profiles
CREATE POLICY "sitter_select" ON sitter_profiles FOR SELECT
    USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "sitter_insert" ON sitter_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sitter_update" ON sitter_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sitter_delete" ON sitter_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Enforce: public=true only when subscription_status='active'
CREATE OR REPLACE FUNCTION enforce_sitter_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_public = TRUE AND NEW.subscription_status != 'active' THEN
        NEW.is_public := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_sitter_subscription ON sitter_profiles;
CREATE TRIGGER trg_enforce_sitter_subscription
    BEFORE INSERT OR UPDATE ON sitter_profiles
    FOR EACH ROW EXECUTE FUNCTION enforce_sitter_subscription();

-- Bookings
CREATE POLICY "booking_select" ON sitter_bookings FOR SELECT
    USING (
        auth.uid() = client_id
        OR auth.uid() = (SELECT user_id FROM sitter_profiles WHERE id = sitter_id)
    );

CREATE POLICY "booking_insert" ON sitter_bookings FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "booking_update" ON sitter_bookings FOR UPDATE
    USING (auth.uid() = (SELECT user_id FROM sitter_profiles WHERE id = sitter_id));

-- Reviews
CREATE POLICY "review_select" ON sitter_reviews FOR SELECT
    USING (TRUE);

CREATE POLICY "review_insert" ON sitter_reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id
        AND auth.uid() = (SELECT client_id FROM sitter_bookings WHERE id = booking_id)
    );

-- ============================================================
-- 5) RPC: Find sitters nearby using Haversine formula
-- Returns approximate location (rounded to ~500m for privacy)
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
        -- Round to ~500m for privacy (2 decimal places)
        ROUND(sp.lat::numeric, 2)::double precision AS approx_lat,
        ROUND(sp.lng::numeric, 2)::double precision AS approx_lng,
        -- Haversine distance in km
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
-- 6) Auto-update rating when a review is added
-- ============================================================

CREATE OR REPLACE FUNCTION update_sitter_rating()
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

DROP TRIGGER IF EXISTS trg_update_sitter_rating ON sitter_reviews;
CREATE TRIGGER trg_update_sitter_rating
    AFTER INSERT ON sitter_reviews
    FOR EACH ROW EXECUTE FUNCTION update_sitter_rating();
