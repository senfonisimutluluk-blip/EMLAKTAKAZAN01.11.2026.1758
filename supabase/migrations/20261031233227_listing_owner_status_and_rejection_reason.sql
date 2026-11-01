/*
# Listing owner status controls and rejection reasons

Plain-English summary: owners can now switch their approved listings between active (visible to everyone) and passive (hidden from the public feed), and admins can attach a reason when rejecting a listing so the owner can read it on their profile.

## 1. Modified table: listings
- New column `rejection_reason` (text, nullable). Filled by the admin when rejecting. Empty for listings that were never rejected.

## 2. Functions
- `reject_listing` now accepts an optional reason: `reject_listing(target_id uuid, reason text DEFAULT NULL)`.
- The admin check is enforced inside the function (only the master admin email may reject).
- The old one-argument version is removed so calls resolve to a single function.
- EXECUTE is revoked from PUBLIC and anon and granted to authenticated only.

## 3. Security changes
- Public read policy on listings now only exposes listings that are approved AND active. Owners still see all of their own rows through the ownership clause.
- The `rejection_reason` column is readable only by signed-in users (column-level grant), so it is not exposed to anonymous visitors.
- Owners get table-level DELETE on listings (their own rows only, enforced by the existing delete policy) so they can remove a listing from their profile.

## Important notes
1. Owners change `status` (active / passive) through the existing column-restricted UPDATE grant; `approval_status` stays admin-only.
2. The migration is idempotent and safe to re-run.
*/

ALTER TABLE listings ADD COLUMN IF NOT EXISTS rejection_reason text;

GRANT SELECT (rejection_reason) ON listings TO authenticated;

DROP POLICY IF EXISTS "public_active_listings_read" ON listings;
CREATE POLICY "public_active_listings_read" ON listings FOR SELECT
TO anon, authenticated
USING ((approval_status = 'approved' AND status = 'active') OR auth.uid() = user_id);

GRANT DELETE ON listings TO authenticated;

DROP FUNCTION IF EXISTS reject_listing(uuid);
CREATE OR REPLACE FUNCTION reject_listing(target_id uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'email', '') <> 'hakan1000gol@gmail.com' THEN
    RAISE EXCEPTION 'Bu işlem için yönetici yetkisi gerekir';
  END IF;

  UPDATE listings
  SET approval_status = 'rejected',
      rejection_reason = NULLIF(LEFT(TRIM(COALESCE(reason, '')), 500), '')
  WHERE id = target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_listing(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_listing(uuid, text) TO authenticated;
