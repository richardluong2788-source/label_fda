-- Create storage bucket for label images
-- This script creates the necessary storage bucket and sets up policies

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('label-images', 'label-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload label images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own images
CREATE POLICY "Users can view their own label images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for public URLs
CREATE POLICY "Public can view label images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'label-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own label images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
