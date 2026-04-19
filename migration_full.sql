-- ============================================================
-- PfotenMatch – Full Migration (all remaining features)
-- Run this in the Supabase SQL Editor AFTER migration_chat.sql
-- ============================================================

-- ============================================================
-- 1. USER SETTINGS
--    Persists per-user preferences (push, dark mode, language…)
-- ============================================================
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  push BOOLEAN DEFAULT TRUE,
  chat_notif BOOLEAN DEFAULT TRUE,
  match_notif BOOLEAN DEFAULT TRUE,
  danger_notif BOOLEAN DEFAULT TRUE,
  invisible BOOLEAN DEFAULT FALSE,
  loc_share BOOLEAN DEFAULT TRUE,
  read_receipts BOOLEAN DEFAULT TRUE,
  dark BOOLEAN DEFAULT FALSE,
  lang TEXT DEFAULT 'de',
  unit TEXT DEFAULT 'km',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. SITTER PROFILES
--    Users who register as dog sitters
-- ============================================================
CREATE TABLE sitter_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '👩',
  neighborhood TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating DOUBLE PRECISION DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  price_hour INTEGER,
  price_day INTEGER,
  price_night INTEGER,
  services TEXT[] DEFAULT '{}',
  bio TEXT,
  experience TEXT,
  verified BOOLEAN DEFAULT FALSE,
  accepted_sizes TEXT[] DEFAULT '{}',
  response_time TEXT,
  availability TEXT DEFAULT 'Nach Absprache',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sitter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sitter profiles"
  ON sitter_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users manage own sitter profile"
  ON sitter_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sitter profile"
  ON sitter_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own sitter profile"
  ON sitter_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_sitter_profiles_user ON sitter_profiles(user_id);

-- ============================================================
-- 3. BOOKINGS
--    Sitter service bookings between users
-- ============================================================
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sitter_id UUID REFERENCES sitter_profiles(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE,
  hours INTEGER DEFAULT 0,
  notes TEXT,
  total INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bookers see own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = booker_id);

CREATE POLICY "Sitters see their bookings"
  ON bookings FOR SELECT
  USING (sitter_id IN (SELECT id FROM sitter_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = booker_id);

CREATE POLICY "Bookers update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = booker_id)
  WITH CHECK (auth.uid() = booker_id);

CREATE POLICY "Sitters update their bookings"
  ON bookings FOR UPDATE
  USING (sitter_id IN (SELECT id FROM sitter_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Bookers delete own bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = booker_id);

CREATE INDEX idx_bookings_booker ON bookings(booker_id);
CREATE INDEX idx_bookings_sitter ON bookings(sitter_id);

-- ============================================================
-- 4. SITTER REQUESTS
--    Incoming requests to a sitter from other users
-- ============================================================
CREATE TABLE sitter_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sitter_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requester_name TEXT NOT NULL,
  requester_dog TEXT NOT NULL,
  requester_emoji TEXT DEFAULT '🐕',
  dog_size TEXT,
  service TEXT NOT NULL,
  hours INTEGER DEFAULT 0,
  date_from DATE,
  note TEXT,
  total INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sitter_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sitters see own requests"
  ON sitter_requests FOR ALL
  USING (auth.uid() = sitter_user_id)
  WITH CHECK (auth.uid() = sitter_user_id);

CREATE INDEX idx_sitter_requests_user ON sitter_requests(sitter_user_id);

-- ============================================================
-- 5. DANGER REPORTS
--    Community danger alerts (Giftköder, aggressive dogs, etc.)
-- ============================================================
CREATE TABLE danger_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT,
  reporter_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE danger_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read danger reports"
  ON danger_reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users create reports"
  ON danger_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters delete own reports"
  ON danger_reports FOR DELETE
  USING (auth.uid() = reporter_id);

CREATE INDEX idx_danger_reports_location ON danger_reports(lat, lng);

-- ============================================================
-- 6. CHECK-INS
--    Live presence at meeting spots (auto-expire after 2 hours)
-- ============================================================
CREATE TABLE check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spot_id TEXT NOT NULL,
  dog_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read check-ins"
  ON check_ins FOR SELECT
  USING (true);

CREATE POLICY "Users manage own check-ins"
  ON check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own check-ins"
  ON check_ins FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_check_ins_spot ON check_ins(spot_id);
CREATE INDEX idx_check_ins_expires ON check_ins(expires_at);

-- ============================================================
-- 7. STORIES
--    24-hour photo stories (image stored as data URL or
--    Supabase Storage URL in a future upgrade)
-- ============================================================
CREATE TABLE stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  src TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stories"
  ON stories FOR SELECT
  USING (true);

CREATE POLICY "Users create own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_stories_user ON stories(user_id);
CREATE INDEX idx_stories_created ON stories(created_at);

-- ============================================================
-- 8. PAW STAMPS
--    Collected POI visit stamps per user
-- ============================================================
CREATE TABLE paw_stamps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  poi_id TEXT NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, poi_id)
);

ALTER TABLE paw_stamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own paw stamps"
  ON paw_stamps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users collect paw stamps"
  ON paw_stamps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_paw_stamps_user ON paw_stamps(user_id);

-- ============================================================
-- 9. LIKED BY (Premium feature)
--    Tracks which dog profiles liked the current user
-- ============================================================
CREATE TABLE liked_by (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dog_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, dog_id)
);

ALTER TABLE liked_by ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own liked-by"
  ON liked_by FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own liked-by"
  ON liked_by FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_liked_by_user ON liked_by(user_id);

-- ============================================================
-- 10. REALTIME
--     Enable realtime for tables that benefit from live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE danger_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE sitter_requests;
