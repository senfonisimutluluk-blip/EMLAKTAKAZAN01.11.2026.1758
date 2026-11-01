/*
# Create chat_messages (general, Türkiye-wide and per-province chat rooms)

1. New Tables
- `chat_messages`: messages posted in a chat room.
  - `id` (uuid, primary key)
  - `room_key` (text): 'genel' for the general room, 'turkiye' for the all-Turkey room, or 'il-<province id>' for a province room
  - `user_id` (uuid, defaults to the signed-in user)
  - `author_name` (text, 1-40 characters)
  - `content` (text, 1-500 characters)
  - `created_at` (timestamp)

2. Security
- Row level security is enabled.
- Only signed-in users can read and post messages.
- A message must be posted under the poster's own user id.
- Messages are added to the realtime feed so open rooms update live.

3. Notes
- Column-level INSERT is granted only on the fields the client sends; the owner id is filled from the session.
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key text NOT NULL CHECK (room_key ~ '^(genel|turkiye|il-[0-9]+)$'),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 40),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_room_created_idx ON chat_messages (room_key, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON chat_messages TO authenticated;
GRANT INSERT (room_key, author_name, content) ON chat_messages TO authenticated;

DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;
CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;
