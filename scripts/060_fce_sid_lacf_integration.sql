-- ============================================================================
-- FCE/SID Integration for LACF/Acidified Foods (21 CFR 113/114)
-- 
-- This migration adds FCE (Food Canning Establishment) and SID (Submission 
-- Identifier/Process Filing) fields required for Low-Acid Canned Foods and 
-- Acidified Foods per FDA regulations.
--
-- References:
-- - 21 CFR 108.25 (Registration)
-- - 21 CFR 108.35 (Process Filing)
-- - 21 CFR 113 (Thermally Processed Low-Acid Foods)
-- - 21 CFR 114 (Acidified Foods)
-- ============================================================================

-- Add FCE/SID columns to fsvp_hazard_analyses table
ALTER TABLE fsvp_hazard_analyses 
ADD COLUMN IF NOT EXISTS fce_number TEXT,
ADD COLUMN IF NOT EXISTS sid_number TEXT,
ADD COLUMN IF NOT EXISTS process_authority_name TEXT,
ADD COLUMN IF NOT EXISTS process_authority_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_process_filed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS thermal_process_type TEXT,
ADD COLUMN IF NOT EXISTS equilibrium_ph DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS water_activity DECIMAL(3,2);

-- Add comments for documentation
COMMENT ON COLUMN fsvp_hazard_analyses.fce_number IS 'Food Canning Establishment Number (FCE) - Required for LACF/AF per 21 CFR 108.25';
COMMENT ON COLUMN fsvp_hazard_analyses.sid_number IS 'Submission Identifier/Process Filing Number (SID) - Required for LACF/AF per 21 CFR 108.35';
COMMENT ON COLUMN fsvp_hazard_analyses.process_authority_name IS 'Name of Process Authority who validated the scheduled process';
COMMENT ON COLUMN fsvp_hazard_analyses.process_authority_date IS 'Date of Process Authority validation';
COMMENT ON COLUMN fsvp_hazard_analyses.scheduled_process_filed IS 'Whether scheduled process has been filed with FDA';
COMMENT ON COLUMN fsvp_hazard_analyses.thermal_process_type IS 'Type of thermal process: retort, aseptic, hot_fill, acidification, etc.';
COMMENT ON COLUMN fsvp_hazard_analyses.equilibrium_ph IS 'Equilibrium pH value for acidified foods (must be ≤4.6)';
COMMENT ON COLUMN fsvp_hazard_analyses.water_activity IS 'Water activity (aw) value if applicable';

-- Add FCE/SID to suppliers table for establishment-level tracking
ALTER TABLE fsvp_suppliers
ADD COLUMN IF NOT EXISTS fce_number TEXT,
ADD COLUMN IF NOT EXISTS fce_registration_date DATE,
ADD COLUMN IF NOT EXISTS fce_expiry_date DATE,
ADD COLUMN IF NOT EXISTS is_lacf_manufacturer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_acidified_manufacturer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS better_process_control_certified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bpcs_certificate_date DATE;

COMMENT ON COLUMN fsvp_suppliers.fce_number IS 'Food Canning Establishment Number for the supplier facility';
COMMENT ON COLUMN fsvp_suppliers.fce_registration_date IS 'Date of FCE registration with FDA';
COMMENT ON COLUMN fsvp_suppliers.fce_expiry_date IS 'FCE registration expiry date';
COMMENT ON COLUMN fsvp_suppliers.is_lacf_manufacturer IS 'Whether supplier manufactures Low-Acid Canned Foods';
COMMENT ON COLUMN fsvp_suppliers.is_acidified_manufacturer IS 'Whether supplier manufactures Acidified Foods';
COMMENT ON COLUMN fsvp_suppliers.better_process_control_certified IS 'Whether supplier has Better Process Control School certification';
COMMENT ON COLUMN fsvp_suppliers.bpcs_certificate_date IS 'Date of Better Process Control School certification';

-- Create a table for tracking process filings (SID records)
CREATE TABLE IF NOT EXISTS fsvp_process_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES fsvp_suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES fsvp_hazard_analyses(id) ON DELETE SET NULL,
  
  -- FCE/SID Information
  fce_number TEXT NOT NULL,
  sid_number TEXT NOT NULL,
  
  -- Product Information
  product_name TEXT NOT NULL,
  product_description TEXT,
  container_type TEXT, -- can, pouch, jar, bottle
  container_size TEXT,
  
  -- Process Details
  process_type TEXT NOT NULL, -- lacf_thermal, acidified, aseptic
  thermal_process_description TEXT,
  critical_factors TEXT[], -- pH, aw, fill weight, headspace, etc.
  scheduled_process_details JSONB,
  
  -- Process Authority
  process_authority_name TEXT,
  process_authority_organization TEXT,
  process_authority_contact TEXT,
  process_authority_letter_date DATE,
  process_authority_letter_url TEXT,
  
  -- Filing Status
  filing_status TEXT DEFAULT 'pending', -- pending, filed, accepted, rejected
  filing_date DATE,
  fda_acceptance_date DATE,
  fda_response_notes TEXT,
  
  -- Verification
  last_verification_date DATE,
  next_verification_due DATE,
  verification_method TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT valid_process_type CHECK (process_type IN ('lacf_thermal', 'acidified', 'aseptic', 'hot_fill', 'other'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_process_filings_fce ON fsvp_process_filings(fce_number);
CREATE INDEX IF NOT EXISTS idx_process_filings_sid ON fsvp_process_filings(sid_number);
CREATE INDEX IF NOT EXISTS idx_process_filings_supplier ON fsvp_process_filings(supplier_id);

-- NOTE: Document types for LACF/AF are defined in TypeScript (lib/fsvp-document-request-types.ts)
-- The system uses code-based document type definitions, not database tables.
-- Document types added in this migration:
-- - process_authority_letter (21 CFR 113.83)
-- - scheduled_process_filing (21 CFR 108.35)
-- - fce_registration (21 CFR 108.25)
-- - retort_records (21 CFR 113.100)
-- - ph_monitoring_records (21 CFR 114.90)
-- - container_integrity_records (21 CFR 113.60)
-- - bpcs_certificate (21 CFR 113.10)

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_process_filings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_process_filings_updated_at ON fsvp_process_filings;
CREATE TRIGGER trigger_update_process_filings_updated_at
  BEFORE UPDATE ON fsvp_process_filings
  FOR EACH ROW
  EXECUTE FUNCTION update_process_filings_updated_at();

-- RLS Policies
ALTER TABLE fsvp_process_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view process filings for their suppliers"
  ON fsvp_process_filings FOR SELECT
  USING (
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert process filings for their suppliers"
  ON fsvp_process_filings FOR INSERT
  WITH CHECK (
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update process filings for their suppliers"
  ON fsvp_process_filings FOR UPDATE
  USING (
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
  );
