-- Add RLS policy for bulk-imports folder (Admin only)
-- This ensures only admin users can upload to bulk-imports/ folder

-- Allow admin users to upload to bulk-imports folder
CREATE POLICY "Only admins can upload to bulk-imports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = 'bulk-imports' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Allow admin users to read from bulk-imports folder
CREATE POLICY "Only admins can read bulk-imports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = 'bulk-imports' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Allow admin users to delete from bulk-imports folder (for cleanup)
CREATE POLICY "Only admins can delete from bulk-imports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'label-images' AND
  (storage.foldername(name))[1] = 'bulk-imports' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Create index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id_role 
ON public.admin_users(user_id, role);

COMMENT ON POLICY "Only admins can upload to bulk-imports" ON storage.objects IS 
'Restricts bulk-imports folder to admin users only to prevent spam and unauthorized uploads';
