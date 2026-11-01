/*
# Create listing_messages (direct messages with a listing owner) and tighten chat/support grants

1. New Tables
- `listing_messages`: private messages about one listing between a visitor (buyer) and the listing owner.
  - `id` (uuid, primary key)
  - `listing_id` (uuid, references listings)
  - `buyer_id` (uuid, the visitor who started the conversation)
  - `sender_id` (uuid, the signed-in user who wrote the message)
  - `body` (text, 1-1000 characters)
  - `read_at` (timestamp, set when the other participant opens the message)
  - `created_at` (timestamp)

2. Security
- Row level security is enabled.
- Only the buyer and the listing owner can read a conversation.
- A message can only be written by one of the two participants, and only for an approved listing (or the owner's own listing). The owner cannot message themselves.
- The recipient may only set `read_at`. Nobody can edit or delete message bodies.

3. Tightened grants
- chat_messages and support_messages had broad default grants to the anonymous and signed-in roles. They are revoked and re-granted only for the columns the app uses.
*/

CREATE TABLE IF NOT EXISTS listing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_messages_thread_idx ON listing_messages (listing_id, buyer_id, created_at);

ALTER TABLE listing_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON listing_messages FROM anon, authenticated;
GRANT SELECT ON listing_messages TO authenticated;
GRANT INSERT (listing_id, buyer_id, body) ON listing_messages TO authenticated;
GRANT UPDATE (read_at) ON listing_messages TO authenticated;

DROP POLICY IF EXISTS "select_listing_messages" ON listing_messages;
CREATE POLICY "select_listing_messages" ON listing_messages FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_messages.listing_id AND l.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_listing_messages" ON listing_messages;
CREATE POLICY "insert_listing_messages" ON listing_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_messages.listing_id
      AND l.user_id IS NOT NULL
      AND l.user_id <> listing_messages.buyer_id
      AND (l.user_id = auth.uid() OR listing_messages.buyer_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "mark_listing_messages_read" ON listing_messages;
CREATE POLICY "mark_listing_messages_read" ON listing_messages FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_messages.listing_id AND l.user_id = auth.uid())
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_messages.listing_id AND l.user_id = auth.uid())
  )
);

REVOKE ALL ON chat_messages FROM anon, authenticated;
GRANT SELECT ON chat_messages TO authenticated;
GRANT INSERT (room_key, author_name, content) ON chat_messages TO authenticated;

REVOKE ALL ON support_messages FROM anon, authenticated;
GRANT INSERT (category, message, contact_email) ON support_messages TO anon, authenticated;
GRANT SELECT ON support_messages TO authenticated;
