-- ============================================================
-- PfotenMatch – Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Dog Profiles (one per user)
CREATE TABLE dog_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Bello',
  breed TEXT DEFAULT 'Mischling',
  age INTEGER DEFAULT 3,
  size TEXT DEFAULT 'Mittel',
  neutered TEXT DEFAULT 'Nein',
  energy TEXT DEFAULT 'Ausgeglichen',
  play_style TEXT DEFAULT 'Rennend',
  tags TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  emoji TEXT DEFAULT '',
  avatar_image TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  city TEXT DEFAULT 'Basel',
  lat DOUBLE PRECISION DEFAULT 47.5585,
  lng DOUBLE PRECISION DEFAULT 7.5880,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Matches (user matched with a static DOG_PROFILES entry)
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dog_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, dog_id)
);

-- 3. Messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL DEFAULT 'me',
  type TEXT DEFAULT 'text',
  text TEXT,
  image TEXT,
  location JSONB,
  duration TEXT,
  reply_to TEXT,
  reactions JSONB DEFAULT '[]'::jsonb,
  deleted BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Row Level Security
ALTER TABLE dog_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"
  ON dog_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own matches"
  ON matches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage messages in own matches"
  ON messages FOR ALL
  USING (match_id IN (SELECT id FROM matches WHERE user_id = auth.uid()))
  WITH CHECK (match_id IN (SELECT id FROM matches WHERE user_id = auth.uid()));

-- 5. Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 6. Index for fast message queries
CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_matches_user_id ON matches(user_id);
