-- Add missing columns to audit_reports table
ALTER TABLE public.audit_reports 
  ADD COLUMN IF NOT EXISTS label_image_url TEXT,
  ADD COLUMN IF NOT EXISTS overall_result TEXT CHECK (overall_result IN ('pass', 'warning', 'fail')),
  ADD COLUMN IF NOT EXISTS violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step TEXT,
  ADD COLUMN IF NOT EXISTS needs_expert_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS citation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_report_id UUID REFERENCES public.audit_reports(id),
  ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS version_notes TEXT,
  ADD COLUMN IF NOT EXISTS geometry_violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS contrast_violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS claim_violations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS multilanguage_issues JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS required_disclaimers JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pixels_per_inch NUMERIC,
  ADD COLUMN IF NOT EXISTS pdp_area_square_inches NUMERIC,
  ADD COLUMN IF NOT EXISTS product_category TEXT,
  ADD COLUMN IF NOT EXISTS product_sub_category TEXT,
  ADD COLUMN IF NOT EXISTS physical_width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS physical_height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS pixel_width INTEGER,
  ADD COLUMN IF NOT EXISTS pixel_height INTEGER,
  ADD COLUMN IF NOT EXISTS has_foreign_language BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS foreign_language TEXT;

-- Update status column to include new statuses
ALTER TABLE public.audit_reports 
  DROP CONSTRAINT IF EXISTS audit_reports_status_check;

ALTER TABLE public.audit_reports
  ADD CONSTRAINT audit_reports_status_check 
  CHECK (status IN ('pending', 'processing', 'ai_completed', 'verified', 'rejected', 'error'));

-- Rename file_url to label_image_url if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_reports' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.audit_reports RENAME COLUMN file_url TO label_image_url_old;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_reports_user_id ON public.audit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_status ON public.audit_reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_needs_review ON public.audit_reports(needs_expert_review) WHERE needs_expert_review = true;
CREATE INDEX IF NOT EXISTS idx_audit_reports_parent ON public.audit_reports(parent_report_id) WHERE parent_report_id IS NOT NULL;

COMMENT ON TABLE public.audit_reports IS 'Stores FDA compliance audit reports with AI analysis results';
COMMENT ON COLUMN public.audit_reports.label_image_url IS 'URL to the uploaded food label image in Supabase Storage';
COMMENT ON COLUMN public.audit_reports.needs_expert_review IS 'Flag indicating if this report needs human expert verification';
