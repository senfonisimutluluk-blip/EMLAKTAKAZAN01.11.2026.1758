/*
# Create EMLAKTAKAZAN multi-user real-estate core

1. New tables
- `profiles`: public agency/owner profile basics linked to Supabase Auth.
- `listings`: public property listings owned by an authenticated user.
- `listing_likes`: one like per authenticated user and listing.
- `listing_comments`: comments authored by authenticated users.
- `follows`: follower/followed profile relationships.

2. Important columns
- Listings store category-specific property data in `details` JSONB so each property type can evolve without destructive schema changes.
- `user_id` on all owner-authored records defaults to `auth.uid()` and cannot be forged through normal policies.

3. Security
- RLS is enabled on every new table.
- Public listing/profile reads are allowed to anon and authenticated users.
- Listing writes and all social writes require authentication and are scoped to the current user.
- Grants are limited to the operations used by the browser application.

4. Notes
- No existing tables are modified or removed.
- Images remain represented by URLs; private storage can be added later with owner-folder policies.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  office_name text,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('agent', 'owner')),
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  property_type text NOT NULL CHECK (property_type IN ('Daire', 'Villa', 'Ofis', 'Arsa', 'Dükkan')),
  city text NOT NULL,
  district text NOT NULL,
  neighborhood text,
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  area numeric(10,2) NOT NULL CHECK (area > 0),
  rooms text,
  floor text,
  features text[] NOT NULL DEFAULT '{}',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_urls text[] NOT NULL DEFAULT '{}',
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passive')),
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_likes (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.listing_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS listings_location_idx ON public.listings (city, district, property_type, status);
CREATE INDEX IF NOT EXISTS listings_user_idx ON public.listings (user_id, status);
CREATE INDEX IF NOT EXISTS listing_comments_listing_idx ON public.listing_comments (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS follows_followed_idx ON public.follows (followed_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.listing_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.listing_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "public_profiles_read" ON public.profiles;
CREATE POLICY "public_profiles_read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
CREATE POLICY "users_insert_own_profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "public_active_listings_read" ON public.listings;
CREATE POLICY "public_active_listings_read" ON public.listings FOR SELECT TO anon, authenticated USING (status = 'active' OR auth.uid() = user_id);
DROP POLICY IF EXISTS "users_insert_own_listings" ON public.listings;
CREATE POLICY "users_insert_own_listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_update_own_listings" ON public.listings;
CREATE POLICY "users_update_own_listings" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_delete_own_listings" ON public.listings;
CREATE POLICY "users_delete_own_listings" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated_read_likes" ON public.listing_likes;
CREATE POLICY "authenticated_read_likes" ON public.listing_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users_insert_own_likes" ON public.listing_likes;
CREATE POLICY "users_insert_own_likes" ON public.listing_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_delete_own_likes" ON public.listing_likes;
CREATE POLICY "users_delete_own_likes" ON public.listing_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "public_read_comments" ON public.listing_comments;
CREATE POLICY "public_read_comments" ON public.listing_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "users_insert_own_comments" ON public.listing_comments;
CREATE POLICY "users_insert_own_comments" ON public.listing_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_delete_own_comments" ON public.listing_comments;
CREATE POLICY "users_delete_own_comments" ON public.listing_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated_read_follows" ON public.follows;
CREATE POLICY "authenticated_read_follows" ON public.follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users_insert_own_follows" ON public.follows;
CREATE POLICY "users_insert_own_follows" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "users_delete_own_follows" ON public.follows;
CREATE POLICY "users_delete_own_follows" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
