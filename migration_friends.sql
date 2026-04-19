-- ============================================================
-- PfotenMatch – Friends Migration
-- Run this in the Supabase SQL Editor AFTER migration.sql
-- ============================================================

-- 1. Add friend_code column
ALTER TABLE dog_profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

-- 2. Update RLS: allow public SELECT so friend code lookups work
DROP POLICY IF EXISTS "Users manage own profile" ON dog_profiles;

CREATE POLICY "Write own profile"
  ON dog_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own profile"
  ON dog_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own profile"
  ON dog_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can read profiles (needed for friend code lookup)
CREATE POLICY "Public read profiles"
  ON dog_profiles FOR SELECT
  USING (true);

-- 3. Index for fast friend code lookups
CREATE INDEX IF NOT EXISTS idx_dog_profiles_friend_code ON dog_profiles(friend_code);
