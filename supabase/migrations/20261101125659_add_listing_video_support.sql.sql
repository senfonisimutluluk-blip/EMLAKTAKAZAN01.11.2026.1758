/*
# Add video support to listings

1. Schema Changes
- Add `video_url` column (text, nullable) to `listings` table.
  This stores the public URL of an optional single property tour video.
- Add `video_file_size` column (bigint, nullable) to `listings` table.
  This stores the file size in bytes for the uploaded video (for audit/debugging).

2. Storage Changes
- Update the existing `listing-photos` storage bucket to also allow video MIME types:
  video/mp4, video/webm, video/quicktime
- Raise the bucket file size limit to 100 MB to accommodate video uploads.
- Existing storage policies (folder-based ownership via auth.uid()) already cover videos
  stored in the same bucket, so no new policies are needed.

3. Security
- No new tables created.
- Existing RLS policies on `listings` remain unchanged; the new columns are nullable
  and covered by existing INSERT/UPDATE grants.
- GRANT UPDATE on the new columns to `authenticated` so owners can set/clear their video.

4. Important Notes
- Each listing can have at most ONE video (enforced at the application layer).
- Video files are uploaded to the same `listing-photos` bucket under the user's folder.
- The column is nullable so existing listings are unaffected.
*/

ALTER TABLE listings ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS video_file_size bigint;

UPDATE storage.buckets
SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
WHERE name = 'listing-photos';

GRANT UPDATE (video_url, video_file_size) ON listings TO authenticated;
