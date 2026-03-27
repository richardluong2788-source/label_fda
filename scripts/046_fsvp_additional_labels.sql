-- Migration: Add additional_labels column to fsvp_hazard_analyses
-- This allows tracking multiple packaging levels/labels for the same product

-- Add additional_labels JSONB array to store multiple label versions
ALTER TABLE fsvp_hazard_analyses 
ADD COLUMN IF NOT EXISTS additional_labels JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN fsvp_hazard_analyses.additional_labels IS 
'Array of additional labels for different packaging levels. Each entry: {label_image_url, net_weight, change_reason, linked_audit_report_id, added_at, added_by}';

-- Add fsvp_link_type to audit_reports to distinguish primary vs additional labels
ALTER TABLE audit_reports 
ADD COLUMN IF NOT EXISTS fsvp_link_type VARCHAR(50) DEFAULT 'primary';

COMMENT ON COLUMN audit_reports.fsvp_link_type IS 
'Type of FSVP link: "primary" for the original product label, "additional_label" for subsequent packaging levels';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_reports_fsvp_link_type 
ON audit_reports(fsvp_link_type) 
WHERE fsvp_link_type IS NOT NULL;

-- Add GIN index for JSONB array queries on additional_labels
CREATE INDEX IF NOT EXISTS idx_fsvp_ha_additional_labels 
ON fsvp_hazard_analyses USING GIN (additional_labels);
