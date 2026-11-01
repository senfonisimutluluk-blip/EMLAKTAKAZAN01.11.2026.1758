/*
# Create admin listing approval function

1. New function
- `approve_listing(uuid)`: sets a listing's approval_status to 'approved'.
- `reject_listing(uuid)`: sets a listing's approval_status to 'rejected'.
- Both are SECURITY DEFINER functions that run with elevated privileges so they can write
  the `approval_status` column which is not client-writable.
- Only the designated admin email can call these functions; all other users get a 403 error.

2. Security
- Functions check `auth.jwt() ->> 'email'` against the admin email 'hakan1000gol@gmail.com'.
- EXECUTE is revoked from PUBLIC and granted only to `authenticated`.
- The functions only modify `approval_status`; no other columns are touched.

3. Notes
- Existing RLS policies and grants on `listings` are unchanged.
- The admin email is hardcoded; to change admins, update the function or create a profiles.role check.
*/

CREATE OR REPLACE FUNCTION public.approve_listing(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'email') <> 'hakan1000gol@gmail.com' THEN
    RAISE EXCEPTION 'Yetkisiz erişim' USING ERRCODE = '42501';
  END IF;
  UPDATE public.listings SET approval_status = 'approved' WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_listing(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'email') <> 'hakan1000gol@gmail.com' THEN
    RAISE EXCEPTION 'Yetkisiz erişim' USING ERRCODE = '42501';
  END IF;
  UPDATE public.listings SET approval_status = 'rejected' WHERE id = target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_listing(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_listing(uuid) TO authenticated;
