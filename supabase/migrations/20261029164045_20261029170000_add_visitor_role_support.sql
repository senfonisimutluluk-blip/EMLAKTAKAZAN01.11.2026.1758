/*
# Add visitor account role support

1. Purpose
- Adds `visitor` as a supported profile role so people who only browse, save listings, and follow profiles have a clear account type.

2. Modified tables
- `public.profiles.role`: keeps existing `agent` and legacy `owner` values while allowing the new `visitor` value.

3. Security
- Existing row-level security and grants remain in place.
- No ownership or profile data is removed.

4. Notes
- Existing `owner` profiles continue to work without conversion.
*/

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('agent', 'visitor', 'owner'));
