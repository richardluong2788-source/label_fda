-- Add form_data column to audit_reports table
-- Stores the complete form data from manual entry for label preview

ALTER TABLE public.audit_reports 
  ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT NULL;

-- Add index for future queries
CREATE INDEX IF NOT EXISTS idx_audit_reports_form_data ON public.audit_reports USING gin(form_data);

-- Comment
COMMENT ON COLUMN public.audit_reports.form_data IS 'Complete form data object from manual entry (servingSize, calories, totalFat, etc.) used for label preview';
