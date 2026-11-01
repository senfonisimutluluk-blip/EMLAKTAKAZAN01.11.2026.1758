/*
# Create profile avatar storage

1. New storage resource
- `avatars` public bucket for profile images that appear on public profiles.
- Objects are stored under `<user-id>/<random-file-name>`.

2. Security
- Any visitor may read avatar images because profile avatars are intentionally public.
- Signed-in users may upload, replace, and delete only files inside their own user-id folder.
- File ownership is enforced by storage policies, not only by the browser interface.

3. Notes
- Existing profile records are unchanged.
- The application validates image type and size before upload; the folder policy prevents cross-account writes.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_read_profile_avatars" ON storage.objects;
CREATE POLICY "public_read_profile_avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "users_upload_own_profile_avatar" ON storage.objects;
CREATE POLICY "users_upload_own_profile_avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "users_update_own_profile_avatar" ON storage.objects;
CREATE POLICY "users_update_own_profile_avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "users_delete_own_profile_avatar" ON storage.objects;
CREATE POLICY "users_delete_own_profile_avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
