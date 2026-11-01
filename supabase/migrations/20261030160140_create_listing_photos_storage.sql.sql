/*
# Create listing-photos storage bucket

1. New storage resource
- `listing-photos` public bucket for property listing images.
- Objects are stored under `<user-id>/<random-file-name>` so each user's photos are isolated.

2. Security
- Any visitor may read listing photos because they appear on public listings.
- Signed-in users may upload and delete only files inside their own user-id folder.
- File ownership is enforced by storage policies.

3. Notes
- Existing buckets and tables are unchanged.
- The application validates image type and size before upload.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_read_listing_photos" ON storage.objects;
CREATE POLICY "public_read_listing_photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'listing-photos');

DROP POLICY IF EXISTS "users_upload_own_listing_photos" ON storage.objects;
CREATE POLICY "users_upload_own_listing_photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_update_own_listing_photos" ON storage.objects;
CREATE POLICY "users_update_own_listing_photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_delete_own_listing_photos" ON storage.objects;
CREATE POLICY "users_delete_own_listing_photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
