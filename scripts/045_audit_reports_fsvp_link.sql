-- Add FSVP link columns to audit_reports table
-- This allows linking audit reports to FSVP hazard analyses

ALTER TABLE audit_reports
ADD COLUMN IF NOT EXISTS fsvp_hazard_analyses UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS has_fsvp_link BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fsvp_sahcodha_detected BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN audit_reports.fsvp_hazard_analyses IS 'Array of FSVP hazard analysis IDs linked to this audit report';
COMMENT ON COLUMN audit_reports.has_fsvp_link IS 'Whether this audit report has been linked to FSVP hazard analyses';
COMMENT ON COLUMN audit_reports.fsvp_sahcodha_detected IS 'Whether SAHCODHA products were detected in this audit report';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_reports_has_fsvp_link 
ON audit_reports(has_fsvp_link) 
WHERE has_fsvp_link = TRUE;
