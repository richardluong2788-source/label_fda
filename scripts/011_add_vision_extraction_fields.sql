-- Add vision extraction fields to audit_reports table
-- These fields store the raw data extracted by GPT-4o Vision from label images

-- Add columns for AI-extracted vision data
ALTER TABLE public.audit_reports 
  ADD COLUMN IF NOT EXISTS nutrition_facts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ingredient_list TEXT,
  ADD COLUMN IF NOT EXISTS allergen_declaration TEXT,
  ADD COLUMN IF NOT EXISTS health_claims JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detected_languages JSONB DEFAULT '["English"]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS net_quantity TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS vision_data_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vision_data_verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS vision_data_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_phase TEXT CHECK (analysis_phase IN ('vision_extraction', 'compliance_check', 'completed')),
  ADD COLUMN IF NOT EXISTS double_pass_needed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_cost_usd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commercial_summary TEXT,
  ADD COLUMN IF NOT EXISTS expert_tips JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_audit_reports_analysis_phase ON public.audit_reports(analysis_phase);
CREATE INDEX IF NOT EXISTS idx_audit_reports_double_pass ON public.audit_reports(double_pass_needed) WHERE double_pass_needed = true;
CREATE INDEX IF NOT EXISTS idx_audit_reports_vision_verified ON public.audit_reports(vision_data_verified);

-- Comments
COMMENT ON COLUMN public.audit_reports.nutrition_facts IS 'Array of nutrition facts extracted from label (name, value, unit, dailyValue)';
COMMENT ON COLUMN public.audit_reports.ingredient_list IS 'Comma-separated list of ingredients detected in label';
COMMENT ON COLUMN public.audit_reports.allergen_declaration IS 'Allergen warning text detected in label';
COMMENT ON COLUMN public.audit_reports.health_claims IS 'Array of health claims detected by AI vision';
COMMENT ON COLUMN public.audit_reports.detected_languages IS 'Array of languages detected in label text';
COMMENT ON COLUMN public.audit_reports.brand_name IS 'Brand name extracted from label';
COMMENT ON COLUMN public.audit_reports.product_name IS 'Product name extracted from label';
COMMENT ON COLUMN public.audit_reports.net_quantity IS 'Net quantity/weight text from label';
COMMENT ON COLUMN public.audit_reports.ocr_confidence IS 'Overall confidence score from vision extraction (0-1)';
COMMENT ON COLUMN public.audit_reports.vision_data_verified IS 'Whether vision extraction data has been verified by human';
COMMENT ON COLUMN public.audit_reports.analysis_phase IS 'Current phase: vision_extraction (awaiting verification) or compliance_check (running rules)';
COMMENT ON COLUMN public.audit_reports.double_pass_needed IS 'Flag indicating low OCR confidence - needs double verification';
COMMENT ON COLUMN public.audit_reports.commercial_summary IS 'Professional summary for commercial reports';
COMMENT ON COLUMN public.audit_reports.expert_tips IS 'Expert recommendations array';
