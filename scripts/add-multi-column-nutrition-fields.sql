-- Migration: Add multi-column nutrition facts support to audit_reports
-- This adds fields for variety pack / multi-column nutrition label support

-- Add is_multi_column_nutrition flag
ALTER TABLE audit_reports 
ADD COLUMN IF NOT EXISTS is_multi_column_nutrition BOOLEAN DEFAULT FALSE;

-- Add nutrition_facts_columns for storing multiple columns of nutrition data
ALTER TABLE audit_reports 
ADD COLUMN IF NOT EXISTS nutrition_facts_columns JSONB DEFAULT NULL;

-- Add multi_column_validation for validation results
ALTER TABLE audit_reports 
ADD COLUMN IF NOT EXISTS multi_column_validation JSONB DEFAULT NULL;

-- Add index for querying multi-column reports
CREATE INDEX IF NOT EXISTS idx_audit_reports_multi_column 
ON audit_reports (is_multi_column_nutrition) 
WHERE is_multi_column_nutrition = TRUE;

-- Comment for documentation
COMMENT ON COLUMN audit_reports.is_multi_column_nutrition IS 'True if nutrition label has multiple columns (variety packs, dual-column layouts)';
COMMENT ON COLUMN audit_reports.nutrition_facts_columns IS 'Array of nutrition fact columns for multi-column labels (variety packs)';
COMMENT ON COLUMN audit_reports.multi_column_validation IS 'Validation results for multi-column nutrition fact cross-checking';
