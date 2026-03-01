-- Fix audit_reports schema - make all columns nullable and add missing ones
-- Run this in Supabase SQL Editor

-- First, drop any problematic constraints
ALTER TABLE public.audit_reports 
  DROP CONSTRAINT IF EXISTS audit_reports_status_check,
  DROP CONSTRAINT IF EXISTS audit_reports_overall_result_check;

-- Drop and recreate the table with correct schema
DROP TABLE IF EXISTS public.audit_reports CASCADE;

CREATE TABLE public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ai_completed', 'verified', 'rejected', 'error')),
  overall_result TEXT CHECK (overall_result IN ('pass', 'warning', 'fail')),
  violations JSONB DEFAULT '[]'::jsonb,
  findings JSONB DEFAULT '[]'::jsonb,
  geometry_violations JSONB DEFAULT '[]'::jsonb,
  contrast_violations JSONB DEFAULT '[]'::jsonb,
  claim_violations JSONB DEFAULT '[]'::jsonb,
  multilanguage_issues JSONB DEFAULT '[]'::jsonb,
  required_disclaimers JSONB DEFAULT '[]'::jsonb,
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  needs_expert_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  citation_count INTEGER DEFAULT 0,
  version_number INTEGER DEFAULT 1,
  parent_report_id UUID REFERENCES public.audit_reports(id),
  is_latest_version BOOLEAN DEFAULT true,
  version_notes TEXT,
  pixels_per_inch NUMERIC,
  pdp_area_square_inches NUMERIC,
  product_category TEXT,
  product_sub_category TEXT,
  physical_width_cm NUMERIC,
  physical_height_cm NUMERIC,
  pixel_width INTEGER,
  pixel_height INTEGER,
  has_foreign_language BOOLEAN DEFAULT false,
  foreign_language TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own audit reports"
  ON public.audit_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit reports"
  ON public.audit_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audit reports"
  ON public.audit_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audit reports"
  ON public.audit_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policies (check admin_users table)
CREATE POLICY "Admins can view all audit reports"
  ON public.audit_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update all audit reports"
  ON public.audit_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_audit_reports_user_id ON public.audit_reports(user_id);
CREATE INDEX idx_audit_reports_status ON public.audit_reports(status);
CREATE INDEX idx_audit_reports_needs_review ON public.audit_reports(needs_expert_review) WHERE needs_expert_review = true;
CREATE INDEX idx_audit_reports_parent ON public.audit_reports(parent_report_id) WHERE parent_report_id IS NOT NULL;
CREATE INDEX idx_audit_reports_created_at ON public.audit_reports(created_at DESC);

-- Comments
COMMENT ON TABLE public.audit_reports IS 'Stores FDA compliance audit reports with AI analysis results';
COMMENT ON COLUMN public.audit_reports.label_image_url IS 'URL to the uploaded food label image';
COMMENT ON COLUMN public.audit_reports.needs_expert_review IS 'Flag indicating if this report needs human expert verification';
