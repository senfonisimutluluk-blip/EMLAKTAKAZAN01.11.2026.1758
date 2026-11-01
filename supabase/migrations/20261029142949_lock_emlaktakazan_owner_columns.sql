/*
# Lock EMLAKTAKAZAN ownership and moderation columns

1. Security changes
- Listing ownership, featured status, and audit creation fields are database-controlled.
- Social record ownership is filled from the signed-in session, not the browser payload.
- Profile role is not user-editable; public profile text remains editable by its owner.

2. Application impact
- Normal listing and social inserts continue to work without sending owner IDs.
- Profile editing is limited to display name, office name, avatar, and bio.
*/

REVOKE INSERT, UPDATE ON public.listings FROM authenticated;
GRANT INSERT (title, description, property_type, city, district, neighborhood, price, area, rooms, floor, features, details, image_urls, latitude, longitude, status) ON public.listings TO authenticated;
GRANT UPDATE (title, description, property_type, city, district, neighborhood, price, area, rooms, floor, features, details, image_urls, latitude, longitude, status, updated_at) ON public.listings TO authenticated;

REVOKE INSERT ON public.listing_likes FROM authenticated;
GRANT INSERT (listing_id) ON public.listing_likes TO authenticated;
REVOKE INSERT ON public.listing_comments FROM authenticated;
GRANT INSERT (listing_id, body) ON public.listing_comments TO authenticated;
REVOKE INSERT ON public.follows FROM authenticated;
GRANT INSERT (followed_id) ON public.follows TO authenticated;

GRANT UPDATE (display_name, office_name, avatar_url, bio) ON public.profiles TO authenticated;
