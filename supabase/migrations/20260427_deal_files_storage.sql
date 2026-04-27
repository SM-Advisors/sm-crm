-- Create deal-files storage bucket so users can attach physical documents
-- (PDFs, Word docs, etc.) to sales pipeline deals.
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-files', 'deal-files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies mirror the contact-files bucket: any authenticated user can
-- read, upload, or delete files within the bucket.
DROP POLICY IF EXISTS "Authenticated users can download deal files" ON storage.objects;
CREATE POLICY "Authenticated users can download deal files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'deal-files');

DROP POLICY IF EXISTS "Authenticated users can upload deal files" ON storage.objects;
CREATE POLICY "Authenticated users can upload deal files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deal-files');

DROP POLICY IF EXISTS "Authenticated users can delete deal files" ON storage.objects;
CREATE POLICY "Authenticated users can delete deal files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'deal-files');
