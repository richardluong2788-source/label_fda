-- ============================================================================
-- Migration: Add missing columns to fsvp_hazard_analyses
-- Description: Adds allergen_hazards and other columns required by link-from-label API
-- ============================================================================

-- Add allergen_hazards column (required by link-from-label API)
ALTER TABLE fsvp_hazard_analyses
ADD COLUMN IF NOT EXISTS allergen_hazards JSONB DEFAULT '[]';

-- Add missing columns for FSVP compliance tracking
ALTER TABLE fsvp_hazard_analyses
ADD COLUMN IF NOT EXISTS fda_product_code TEXT,
ADD COLUMN IF NOT EXISTS intended_use TEXT,
ADD COLUMN IF NOT EXISTS sahcodha_category TEXT,
ADD COLUMN IF NOT EXISTS requires_annual_audit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_type TEXT,
ADD COLUMN IF NOT EXISTS verification_frequency TEXT,
ADD COLUMN IF NOT EXISTS verification_options TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fsvp_required BOOLEAN DEFAULT TRUE;

-- Add columns for audit report data mapping
ALTER TABLE fsvp_hazard_analyses
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS ingredient_list TEXT,
ADD COLUMN IF NOT EXISTS net_weight TEXT,
ADD COLUMN IF NOT EXISTS label_image_url TEXT,
ADD COLUMN IF NOT EXISTS linked_audit_report_id UUID,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_generated_from TEXT;

-- Add comments
COMMENT ON COLUMN fsvp_hazard_analyses.allergen_hazards IS 'JSONB array of allergen hazards detected';
COMMENT ON COLUMN fsvp_hazard_analyses.sahcodha_category IS 'SAHCODHA category if applicable (e.g., seafood, leafy_greens)';
COMMENT ON COLUMN fsvp_hazard_analyses.requires_annual_audit IS 'Whether annual onsite audit is required (21 CFR 1.506(d)(2))';
COMMENT ON COLUMN fsvp_hazard_analyses.verification_type IS 'Type of verification: annual_onsite_audit or risk_based_verification';
COMMENT ON COLUMN fsvp_hazard_analyses.verification_frequency IS 'Frequency of verification: annually or as_needed_based_on_risk';
COMMENT ON COLUMN fsvp_hazard_analyses.verification_options IS 'Array of allowed verification options';
COMMENT ON COLUMN fsvp_hazard_analyses.fsvp_required IS 'Whether FSVP is required (always true for imported products)';
COMMENT ON COLUMN fsvp_hazard_analyses.brand_name IS 'Brand name from audit report';
COMMENT ON COLUMN fsvp_hazard_analyses.ingredient_list IS 'Ingredient list from audit report';
COMMENT ON COLUMN fsvp_hazard_analyses.net_weight IS 'Net weight/quantity from audit report';
COMMENT ON COLUMN fsvp_hazard_analyses.label_image_url IS 'URL to label image from audit report';
COMMENT ON COLUMN fsvp_hazard_analyses.linked_audit_report_id IS 'UUID of linked audit report';
COMMENT ON COLUMN fsvp_hazard_analyses.auto_generated IS 'Whether this was auto-generated from label scan';
COMMENT ON COLUMN fsvp_hazard_analyses.auto_generated_from IS 'Source of auto-generation (e.g., label_scan)';
