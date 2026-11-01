/*
# Add listing views tracking, user presence, and favorite count features

## Modified Tables
- `listings`: Added `views` column (integer, not null, default 0) to track how many times a listing detail page has been viewed.

## New Tables
- `user_presence`: Tracks which users are online via periodic heartbeat timestamps.
  - `user_id` (uuid, primary key, references auth.users ON DELETE CASCADE)
  - `last_seen` (timestamptz, defaults to now())
  A user is considered "online" if their last_seen is within the last 2 minutes.

## New Functions (all SECURITY DEFINER)
1. `increment_listing_views(p_listing_id uuid)`: Atomically increments the views counter on a listing. Callable by anon + authenticated (view tracking should work even for non-logged-in visitors).
2. `get_site_stats()`: Returns total_users (count of profiles) and online_users (count of user_presence rows with last_seen within 2 minutes). Callable by anon + authenticated.
3. `get_favorite_counts()`: Returns listing_key and favorite count for all listings that have at least one favorite. Callable by anon + authenticated (aggregate counts are public).
4. `get_listing_favoriters(p_listing_id text)`: Returns user_id, display_name, and favorited_at for every user who favorited a given listing. SECURITY DEFINER + ownership check: only the listing's owner (auth.uid() = listings.user_id) receives data; others get an empty result set.

## Security
- RLS enabled on `user_presence`.
- Anyone (anon + authenticated) can SELECT from user_presence — only user_id and last_seen are stored, no sensitive data.
- Only authenticated users can INSERT/UPDATE their own presence row (auth.uid() = user_id).
- All four functions use SECURITY DEFINER and have EXECUTE revoked from PUBLIC, then granted to the appropriate roles.
- `get_listing_favoriters` enforces listing ownership inside the function body so RLS on user_favorites doesn't need to be loosened.
*/

-- 1. Add views column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

-- 2. Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON user_presence TO anon, authenticated;
GRANT INSERT, UPDATE ON user_presence TO authenticated;

DROP POLICY IF EXISTS "Anyone can read presence" ON user_presence;
CREATE POLICY "Anyone can read presence"
ON user_presence FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own presence" ON user_presence;
CREATE POLICY "Users can insert own presence"
ON user_presence FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
CREATE POLICY "Users can update own presence"
ON user_presence FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. SECURITY DEFINER: increment_listing_views
CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE listings SET views = views + 1 WHERE id = p_listing_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_listing_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_listing_views(uuid) TO anon, authenticated;

-- 4. SECURITY DEFINER: get_site_stats
CREATE OR REPLACE FUNCTION get_site_stats()
RETURNS TABLE(total_users bigint, online_users bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*)::bigint FROM profiles),
    (SELECT count(*)::bigint FROM user_presence WHERE last_seen > now() - interval '2 minutes');
END;
$$;

REVOKE EXECUTE ON FUNCTION get_site_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_site_stats() TO anon, authenticated;

-- 5. SECURITY DEFINER: get_favorite_counts
CREATE OR REPLACE FUNCTION get_favorite_counts()
RETURNS TABLE(listing_key text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT listing_key, count(*)::bigint
  FROM user_favorites
  GROUP BY listing_key
$$;

REVOKE EXECUTE ON FUNCTION get_favorite_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_favorite_counts() TO anon, authenticated;

-- 6. SECURITY DEFINER: get_listing_favoriters (owner-only)
CREATE OR REPLACE FUNCTION get_listing_favoriters(p_listing_id text)
RETURNS TABLE(user_id uuid, display_name text, favorited_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM listings
    WHERE id::text = p_listing_id
    AND user_id = auth.uid()
  ) THEN
    RETURN QUERY
    SELECT uf.user_id, p.display_name, uf.created_at
    FROM user_favorites uf
    LEFT JOIN profiles p ON p.id = uf.user_id
    WHERE uf.listing_key = p_listing_id
    ORDER BY uf.created_at DESC;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_listing_favoriters(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_listing_favoriters(text) TO authenticated;