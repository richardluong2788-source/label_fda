-- ============================================================================
-- Migration: Add Label-FSVP Linking Support
-- Description: Adds columns to support automatic FSVP hazard analysis creation
--              when AI label scan detects imported/SAHCODHA ingredients
-- ============================================================================

-- Add columns to audit_reports for FSVP linking
ALTER TABLE audit_reports 
ADD COLUMN IF NOT EXISTS fsvp_hazard_analyses UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS has_fsvp_link BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fsvp_sahcodha_detected BOOLEAN DEFAULT FALSE;

-- Add columns to fsvp_hazard_analyses for auto-generation tracking
ALTER TABLE fsvp_hazard_analyses
ADD COLUMN IF NOT EXISTS linked_audit_report_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_generated_from TEXT CHECK (auto_generated_from IN ('label_scan', 'supplier_create', 'manual'));

-- Create index for finding auto-generated analyses
CREATE INDEX IF NOT EXISTS idx_fsvp_hazard_auto_generated 
ON fsvp_hazard_analyses(auto_generated) WHERE auto_generated = TRUE;

-- Create index for finding analyses linked to reports
CREATE INDEX IF NOT EXISTS idx_fsvp_hazard_linked_report 
ON fsvp_hazard_analyses(linked_audit_report_id) WHERE linked_audit_report_id IS NOT NULL;

-- Create index for reports with FSVP links
CREATE INDEX IF NOT EXISTS idx_audit_reports_fsvp_link 
ON audit_reports(has_fsvp_link) WHERE has_fsvp_link = TRUE;

-- ============================================================================
-- System Logs table (if not exists) for cron job tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_date ON system_logs(created_at DESC);

-- ============================================================================
-- Function to check FSVP expiry alerts
-- Returns suppliers/documents expiring within N days
-- ============================================================================
CREATE OR REPLACE FUNCTION check_fsvp_expiry_alerts(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  alert_type TEXT,
  item_id UUID,
  item_name TEXT,
  expiry_date TIMESTAMPTZ,
  days_until_expiry INTEGER,
  is_sahcodha BOOLEAN,
  country TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Supplier verifications due
  SELECT 
    'verification'::TEXT as alert_type,
    s.id as item_id,
    s.supplier_name as item_name,
    s.next_verification_due as expiry_date,
    EXTRACT(DAY FROM s.next_verification_due - NOW())::INTEGER as days_until_expiry,
    s.is_sahcodha_risk as is_sahcodha,
    s.supplier_country as country
  FROM fsvp_suppliers s
  WHERE s.importer_user_id = p_user_id
    AND s.next_verification_due IS NOT NULL
    AND s.next_verification_due <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND s.next_verification_due >= NOW()
    AND s.status = 'approved'
  
  UNION ALL
  
  -- SAHCODHA annual audits due
  SELECT 
    'annual_audit'::TEXT as alert_type,
    s.id as item_id,
    s.supplier_name as item_name,
    s.next_onsite_audit_due as expiry_date,
    EXTRACT(DAY FROM s.next_onsite_audit_due - NOW())::INTEGER as days_until_expiry,
    TRUE as is_sahcodha,
    s.supplier_country as country
  FROM fsvp_suppliers s
  WHERE s.importer_user_id = p_user_id
    AND s.requires_annual_audit = TRUE
    AND s.next_onsite_audit_due IS NOT NULL
    AND s.next_onsite_audit_due <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND s.next_onsite_audit_due >= NOW()
  
  UNION ALL
  
  -- Documents expiring
  SELECT 
    'document'::TEXT as alert_type,
    d.id as item_id,
    COALESCE(d.document_name, d.document_type) as item_name,
    d.expiry_date as expiry_date,
    EXTRACT(DAY FROM d.expiry_date - NOW())::INTEGER as days_until_expiry,
    COALESCE(s.is_sahcodha_risk, FALSE) as is_sahcodha,
    COALESCE(s.supplier_country, 'Unknown') as country
  FROM fsvp_documents d
  LEFT JOIN fsvp_suppliers s ON d.supplier_id = s.id
  WHERE d.importer_user_id = p_user_id
    AND d.expiry_date IS NOT NULL
    AND d.expiry_date <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND d.expiry_date >= NOW()
    AND d.status = 'valid'
  
  ORDER BY days_until_expiry ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_fsvp_expiry_alerts TO authenticated;

-- ============================================================================
-- Trigger to auto-link hazard analysis when SAHCODHA detected
-- ============================================================================
CREATE OR REPLACE FUNCTION update_supplier_sahcodha_from_hazard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If hazard analysis is SAHCODHA, update the linked supplier
  IF NEW.is_sahcodha_product = TRUE AND NEW.supplier_id IS NOT NULL THEN
    UPDATE fsvp_suppliers
    SET 
      is_sahcodha_risk = TRUE,
      requires_annual_audit = TRUE,
      sahcodha_assessment_date = COALESCE(sahcodha_assessment_date, NOW()),
      updated_at = NOW()
    WHERE id = NEW.supplier_id
      AND (is_sahcodha_risk = FALSE OR is_sahcodha_risk IS NULL);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trg_update_supplier_sahcodha ON fsvp_hazard_analyses;
CREATE TRIGGER trg_update_supplier_sahcodha
AFTER INSERT OR UPDATE OF is_sahcodha_product ON fsvp_hazard_analyses
FOR EACH ROW
WHEN (NEW.is_sahcodha_product = TRUE)
EXECUTE FUNCTION update_supplier_sahcodha_from_hazard();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN audit_reports.fsvp_hazard_analyses IS 'Array of FSVP hazard analysis IDs auto-created from this label scan';
COMMENT ON COLUMN audit_reports.has_fsvp_link IS 'Whether this report has linked FSVP records';
COMMENT ON COLUMN audit_reports.fsvp_sahcodha_detected IS 'Whether SAHCODHA ingredients were detected in this label scan';
COMMENT ON COLUMN fsvp_hazard_analyses.linked_audit_report_id IS 'The audit report this hazard analysis was auto-generated from';
COMMENT ON COLUMN fsvp_hazard_analyses.auto_generated IS 'Whether this record was auto-generated by the system';
COMMENT ON COLUMN fsvp_hazard_analyses.auto_generated_from IS 'Source of auto-generation: label_scan, supplier_create, or manual';
COMMENT ON FUNCTION check_fsvp_expiry_alerts IS 'Returns FSVP items (suppliers, audits, documents) expiring within N days';
