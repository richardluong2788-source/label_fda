-- Migration: Add nutrition_column_format_type column to audit_reports
-- Purpose: Store the detected format type of multi-column nutrition facts panels
-- Values: 'AS_PACKAGED_PREPARED', 'DUAL_SERVING_CONTAINER', 'VARIETY_PACK', etc.

ALTER TABLE audit_reports
ADD COLUMN IF NOT EXISTS nutrition_column_format_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN audit_reports.nutrition_column_format_type IS 'Format type of multi-column nutrition facts: AS_PACKAGED_PREPARED, DUAL_SERVING_CONTAINER, VARIETY_PACK, etc.';
