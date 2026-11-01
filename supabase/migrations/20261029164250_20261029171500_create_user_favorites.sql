/*
# Create user favorites for public and sample listings

1. New table
- `public.user_favorites`
- `user_id`: authenticated account that saved the favorite, filled from the session.
- `listing_key`: stable listing identifier; supports both database UUIDs and sample catalog keys.
- `created_at`: save timestamp.

2. Security
- Row-level security is enabled.
- Authenticated users can only read, add, or remove their own favorites.
- Anonymous visitors cannot access favorites.
- Grants are limited to SELECT, INSERT, and DELETE for authenticated users.

3. Notes
- Existing listing and social tables are unchanged.
- Duplicate favorites are prevented with a composite primary key.
*/

CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_key text NOT NULL CHECK (char_length(listing_key) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_key)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;

DROP POLICY IF EXISTS "users_read_own_favorites" ON public.user_favorites;
CREATE POLICY "users_read_own_favorites" ON public.user_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_insert_own_favorites" ON public.user_favorites;
CREATE POLICY "users_insert_own_favorites" ON public.user_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_delete_own_favorites" ON public.user_favorites;
CREATE POLICY "users_delete_own_favorites" ON public.user_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);
