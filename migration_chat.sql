-- ============================================================
-- PfotenMatch – Real Chat Migration
-- Run this in the Supabase SQL Editor AFTER migration_friends.sql
-- ============================================================

-- 1. Conversations between two real users
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Chat messages in conversations
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'text',
  text TEXT,
  image TEXT,
  location JSONB,
  duration TEXT,
  reply_to TEXT,
  reactions JSONB DEFAULT '[]'::jsonb,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id)
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users manage messages in own conversations"
  ON chat_messages FOR ALL
  USING (conversation_id IN (SELECT id FROM conversations WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()))
  WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()));

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 5. Indexes
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_conversations_user_a ON conversations(user_a_id);
CREATE INDEX idx_conversations_user_b ON conversations(user_b_id);
