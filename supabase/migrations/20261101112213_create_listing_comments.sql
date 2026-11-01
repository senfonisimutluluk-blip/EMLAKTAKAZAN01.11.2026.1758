/*
# Create listing_comments (public comments on listings)

1. New Tables
- `listing_comments`: a public comment left by a signed-in user on a listing.
  - `id` (uuid, primary key)
  - `listing_id` (uuid, references listings, deleted with the listing)
  - `user_id` (uuid, the signed-in user who wrote the comment; defaults to the current session user)
  - `body` (text, 1-500 characters)
  - `created_at` (timestamp)

2. Security
- Row level security is enabled.
- Anyone (including visitors who are not signed in) can read comments on listings that are publicly visible: approved and active. The listing owner can also read comments on their own listing.
- Only signed-in users can write a comment, and only as themselves, on a publicly visible listing.
- A comment can be deleted by its author or by the owner of the listing it belongs to. Comments cannot be edited.

3. Grants
- anon: SELECT only.
- authenticated: SELECT, INSERT (listing_id, body), DELETE.

4. Notes
- Listing owners see comments left by other people through the notifications panel, where they can also delete them.
*/

CREATE TABLE IF NOT EXISTS listing_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_comments_listing_idx ON listing_comments (listing_id, created_at DESC);

ALTER TABLE listing_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON listing_comments FROM anon, authenticated;
GRANT SELECT ON listing_comments TO anon, authenticated;
GRANT INSERT (listing_id, body) ON listing_comments TO authenticated;
GRANT DELETE ON listing_comments TO authenticated;

DROP POLICY IF EXISTS "select_listing_comments" ON listing_comments;
CREATE POLICY "select_listing_comments" ON listing_comments FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_comments.listing_id
      AND ((l.approval_status = 'approved' AND l.status = 'active') OR l.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "insert_listing_comments" ON listing_comments;
CREATE POLICY "insert_listing_comments" ON listing_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_comments.listing_id
      AND l.approval_status = 'approved'
      AND l.status = 'active'
  )
);

DROP POLICY IF EXISTS "delete_listing_comments" ON listing_comments;
CREATE POLICY "delete_listing_comments" ON listing_comments FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_comments.listing_id AND l.user_id = auth.uid())
);
