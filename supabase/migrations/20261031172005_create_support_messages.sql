/*
# Create support_messages (CanlınDestek Hattı)

1. New Tables
- `support_messages`: feedback sent from the site's support line.
  - `id` (uuid, primary key)
  - `category` (text): 'suggestion', 'comment' or 'complaint'
  - `message` (text, 1-1000 characters)
  - `contact_email` (text, optional)
  - `user_id` (uuid, optional, filled from the session when the visitor is signed in)
  - `created_at` (timestamp)

2. Security
- Row level security is enabled.
- Anyone (including visitors who are not signed in) may insert a message.
- A signed-in visitor may only attach their own user id; no one can attach someone else's.
- Only the admin account may read the messages.
- No updates or deletes are granted.
*/

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('suggestion', 'comment', 'complaint')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 200),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

GRANT INSERT (category, message, contact_email) ON support_messages TO anon, authenticated;
GRANT SELECT ON support_messages TO authenticated;

DROP POLICY IF EXISTS "insert_support_messages" ON support_messages;
CREATE POLICY "insert_support_messages" ON support_messages FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "admin_select_support_messages" ON support_messages;
CREATE POLICY "admin_select_support_messages" ON support_messages FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'hakan1000gol@gmail.com');
