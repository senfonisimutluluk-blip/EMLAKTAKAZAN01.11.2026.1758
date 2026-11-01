/*
# Fix profiles table-level UPDATE grant

1. Problem
- The `profiles` table has column-level UPDATE grants on `display_name, office_name, avatar_url, bio`
  but lacks a table-level UPDATE grant for the `authenticated` role.
- Supabase JS `upsert()` executes `INSERT ... ON CONFLICT DO UPDATE SET ...`, which requires
  table-level UPDATE permission. Without it, the upsert fails with `permission denied for table profiles`.
- This blocked new user registration: signup succeeded in `auth.users` but the profile row could not be saved.

2. Fix
- Grant table-level UPDATE on `public.profiles` to `authenticated`.
- The existing column-level UPDATE restrictions (`display_name, office_name, avatar_url, bio`)
  remain in effect — columns not in that list (e.g. `id`, `role`, `created_at`) are still not
  updatable by clients.

3. Security impact
- No new columns become writable. RLS policies (`users_update_own_profile`) still enforce
  `auth.uid() = id`. This only fixes a missing table-level privilege that prevented upsert from working.
*/

GRANT UPDATE ON public.profiles TO authenticated;
