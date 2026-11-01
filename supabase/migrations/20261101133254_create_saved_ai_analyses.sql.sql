/*
# Create saved_ai_analyses table

1. New Tables
- `saved_ai_analyses`
  - id (uuid, primary key)
  - user_id (uuid, not null, defaults to auth.uid(), references auth.users)
  - title (text, not null) — e.g. "İzmir / Foça — Daire 120 m²"
  - city (text, not null)
  - district (text, not null)
  - neighborhood (text, nullable)
  - property_type (text, not null)
  - area (numeric, not null)
  - listing_mode (text, not null) — 'satilik' or 'kiralik'
  - low (numeric, not null) — estimated price low
  - high (numeric, not null) — estimated price high
  - price_per_square_meter (numeric, not null)
  - unit (text, not null) — 'TL' or 'TL/ay'
  - confidence (integer, not null) — 0-100
  - summary (text, not null)
  - report_json (jsonb, nullable) — full report sections
  - signals_json (jsonb, nullable) — source links
  - created_at (timestamptz, default now())

2. Security
- Enable RLS on saved_ai_analyses.
- GRANT SELECT, INSERT, DELETE TO authenticated (owners only).
- 4 separate policies: SELECT/INSERT/UPDATE/DELETE scoped by auth.uid() = user_id.
- REVOKE EXECUTE not needed (no functions).

3. Index
- Index on user_id for fast profile queries.
*/

CREATE TABLE IF NOT EXISTS saved_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  neighborhood text,
  property_type text NOT NULL,
  area numeric NOT NULL,
  listing_mode text NOT NULL,
  low numeric NOT NULL,
  high numeric NOT NULL,
  price_per_square_meter numeric NOT NULL,
  unit text NOT NULL DEFAULT 'TL',
  confidence integer NOT NULL DEFAULT 0,
  summary text NOT NULL,
  report_json jsonb,
  signals_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_saved_ai_analyses_user_id ON saved_ai_analyses(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_ai_analyses TO authenticated;

DROP POLICY IF EXISTS "select_own_saved_analyses" ON saved_ai_analyses;
CREATE POLICY "select_own_saved_analyses"
ON saved_ai_analyses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_analyses" ON saved_ai_analyses;
CREATE POLICY "insert_own_saved_analyses"
ON saved_ai_analyses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_saved_analyses" ON saved_ai_analyses;
CREATE POLICY "update_own_saved_analyses"
ON saved_ai_analyses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_analyses" ON saved_ai_analyses;
CREATE POLICY "delete_own_saved_analyses"
ON saved_ai_analyses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
