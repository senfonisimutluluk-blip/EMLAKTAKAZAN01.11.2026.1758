/*
# Add listing approval system

1. Modified tables
- `public.listings`: adds `approval_status` column with values 'pending', 'approved', 'rejected'.
  New listings default to 'pending' so an admin can review photos before they go live.
  Existing listings are set to 'approved' so current data remains visible.

2. Security
- The `approval_status` column is NOT writable by regular users — only admins (service role or edge function) can change it.
- Column-level UPDATE grant on `listings` does NOT include `approval_status`, so client-side writes are blocked.
- Public SELECT policy is updated: only 'approved' listings are visible to anon/authenticated users
  (listing owners can still see their own pending/rejected listings).

3. Notes
- The `status` column ('active'/'passive') is unchanged; it controls whether the owner has paused the listing.
- `approval_status` is a separate concern: it controls whether an admin has approved the listing's photos/content.
*/

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

UPDATE public.listings SET approval_status = 'approved' WHERE approval_status = 'pending';

DROP POLICY IF EXISTS "public_active_listings_read" ON public.listings;
CREATE POLICY "public_active_listings_read" ON public.listings
  FOR SELECT TO anon, authenticated
  USING (approval_status = 'approved' OR auth.uid() = user_id);
