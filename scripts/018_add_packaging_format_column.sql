-- Migration: Add packaging_format column to audit_reports
-- This column stores the type of packaging being analyzed, which affects
-- which FDA rules apply (outer carton vs retail box vs individual sachet etc.)

-- Add the packaging_format column
ALTER TABLE audit_reports 
ADD COLUMN IF NOT EXISTS packaging_format TEXT DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN audit_reports.packaging_format IS 
  'Packaging tier classification: outer_carton, retail_box, individual_unit, multipack_wrapper, single_package. Affects which FDA rules apply.';

-- Create an index for filtering reports by packaging format
CREATE INDEX IF NOT EXISTS idx_audit_reports_packaging_format 
  ON audit_reports(packaging_format) 
  WHERE packaging_format IS NOT NULL;
