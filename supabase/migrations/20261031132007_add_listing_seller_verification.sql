/*
# Seller type, agent verification and authority documents for listings

1. Summary
- Each listing now records whether the seller is the property owner or a licensed real estate agent (emlakçı).
- Agent listings must include the agent's office name, authority certificate number (EİDS / Taşınmaz Ticareti Yetki Belgesi), MYK certificate number and an uploaded screenshot of the authority certificate.
- Every listing records the property number (ada/parsel / taşınmaz numarası) that the admin cross-checks against the uploaded document.

2. Modified table: listings
- `seller_type` (text, default 'owner'): 'owner' or 'agent'.
- `property_number` (text): taşınmaz numarası. Required for new listings; older rows without it are not re-checked.
- `agent_office_name` (text): işletme unvanı of the agent.
- `agent_authority_number` (text): yetki belge numarası.
- `agent_myk_number` (text): MYK belge numarası.
- `authority_document_path` (text): storage path of the uploaded authority certificate screenshot.
- Check: agent listings must include all agent fields and the document path.

3. New storage bucket: listing-authority-docs
- Private bucket (not public). Accepts JPEG, PNG and WEBP images up to 5 MB.
- Agents can upload only into their own user folder.
- Agents can read their own files. The admin account can read all files for review.
- Nobody can update or delete these files through the API.

4. Security
- Listing columns are granted to signed-in users for insert only, so approval status and other admin fields stay protected.
- Admin account can read all listings (including pending ones) so it can review them. Ordinary users still see only approved listings and their own listings.

5. Important notes
- Existing listings keep the default 'owner' seller type and are not affected by the agent checks.
- Verification is manual: the admin compares the document, the authority number, the MYK number and the agent's office name, then approves or rejects the listing.
*/

ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_type text NOT NULL DEFAULT 'owner';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_number text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS agent_office_name text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS agent_authority_number text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS agent_myk_number text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS authority_document_path text;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_seller_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_seller_type_check CHECK (seller_type IN ('owner', 'agent'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_agent_details_check;
ALTER TABLE listings ADD CONSTRAINT listings_agent_details_check CHECK (
  seller_type = 'owner'
  OR (
    length(trim(coalesce(agent_office_name, ''))) > 0
    AND length(trim(coalesce(agent_authority_number, ''))) > 0
    AND length(trim(coalesce(agent_myk_number, ''))) > 0
    AND length(trim(coalesce(authority_document_path, ''))) > 0
  )
);

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_property_number_check;
ALTER TABLE listings ADD CONSTRAINT listings_property_number_check CHECK (length(trim(coalesce(property_number, ''))) > 0) NOT VALID;

GRANT INSERT (seller_type, property_number, agent_office_name, agent_authority_number, agent_myk_number, authority_document_path) ON listings TO authenticated;

DROP POLICY IF EXISTS "admin_read_all_listings" ON listings;
CREATE POLICY "admin_read_all_listings" ON listings FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'hakan1000gol@gmail.com');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing-authority-docs', 'listing-authority-docs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "agents_upload_own_authority_docs" ON storage.objects;
CREATE POLICY "agents_upload_own_authority_docs" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-authority-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "owner_or_admin_read_authority_docs" ON storage.objects;
CREATE POLICY "owner_or_admin_read_authority_docs" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-authority-docs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (auth.jwt() ->> 'email') = 'hakan1000gol@gmail.com'
  )
);
