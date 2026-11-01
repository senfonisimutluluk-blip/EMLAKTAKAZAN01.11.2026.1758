/*
# Send edited approved listings back to pending review

1. What changes
- When the listing owner edits the content of an approved listing (title, description, price, location, photos, features, details, etc.), the listing is set back to "pending" and waits for admin approval again.
- Its rejection reason is cleared at the same time.
- Status-only changes (switching a listing between active and passive) do NOT trigger review.
- Admin actions (approve / reject) are not affected.

2. Objects added
- Function `reset_listing_approval_on_owner_edit()` (trigger function, not callable through the API).
- Trigger `listings_reset_approval_on_owner_edit` on `listings`, BEFORE UPDATE, per row.

3. Security
- The function only acts when the caller is the listing owner (auth.uid() = user_id).
- EXECUTE is revoked from PUBLIC, anon and authenticated so the function cannot be called directly.
- No table grants or policies change.

4. Notes
- Idempotent: the function is replaced and the trigger is dropped before being created again.
- No data is deleted; only approval_status and rejection_reason of edited approved listings are updated.
*/

CREATE OR REPLACE FUNCTION public.reset_listing_approval_on_owner_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status = 'approved'
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.user_id
     AND (NEW.title, NEW.description, NEW.property_type, NEW.city, NEW.district, NEW.neighborhood,
          NEW.price, NEW.area, NEW.rooms, NEW.floor, NEW.features, NEW.details, NEW.image_urls,
          NEW.latitude, NEW.longitude)
         IS DISTINCT FROM
         (OLD.title, OLD.description, OLD.property_type, OLD.city, OLD.district, OLD.neighborhood,
          OLD.price, OLD.area, OLD.rooms, OLD.floor, OLD.features, OLD.details, OLD.image_urls,
          OLD.latitude, OLD.longitude)
  THEN
    NEW.approval_status := 'pending';
    NEW.rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_listing_approval_on_owner_edit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS listings_reset_approval_on_owner_edit ON public.listings;
CREATE TRIGGER listings_reset_approval_on_owner_edit
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.reset_listing_approval_on_owner_edit();
