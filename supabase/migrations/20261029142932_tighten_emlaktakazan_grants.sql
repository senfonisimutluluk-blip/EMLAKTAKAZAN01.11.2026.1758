/*
# Tighten EMLAKTAKAZAN browser permissions

1. Scope
- No tables or data are removed.
- Existing row-level policies remain the source of row authorization.

2. Security changes
- Anonymous users can only read public profiles and active listings.
- Anonymous users cannot create, update, or delete listings, follows, likes, comments, or profiles.
- Authenticated users retain only the social and ownership operations required by the application.
- Social records are not updateable; users create or delete their own records instead.
*/

REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.listings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.listing_likes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.listing_comments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.follows FROM anon;

REVOKE UPDATE, DELETE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.listing_likes FROM authenticated;
REVOKE UPDATE ON public.listing_comments FROM authenticated;
REVOKE UPDATE ON public.follows FROM authenticated;
