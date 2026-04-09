
CREATE POLICY "Authenticated users can download contact files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contact-files');

CREATE POLICY "Authenticated users can upload contact files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contact-files');

CREATE POLICY "Authenticated users can delete contact files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contact-files');
