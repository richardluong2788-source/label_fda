-- ================================================================
-- Migration 055: Document Integrity Check
-- Per FDA 483 Observation: Documents must have QA signature/stamp
-- Per 21 CFR 1.510(b)(1): Document control requirements
-- 
-- DEPENDENCY: Requires 054_fsvp_document_requests.sql to run first
--             (creates fsvp_document_request_items table)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Add document integrity columns to fsvp_document_request_items
-- ----------------------------------------------------------------
ALTER TABLE fsvp_document_request_items 
ADD COLUMN IF NOT EXISTS has_qa_signature BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_official_stamp BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS document_integrity_status VARCHAR(50) DEFAULT 'pending_review' 
  CHECK (document_integrity_status IN (
    'pending_review',      -- Not yet checked
    'verified_complete',   -- Has signature and stamp
    'missing_signature',   -- Missing QA signature
    'missing_stamp',       -- Missing official stamp
    'incomplete',          -- Missing both
    'waived'              -- Integrity check waived by importer
  )),
ADD COLUMN IF NOT EXISTS integrity_checked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS integrity_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS integrity_notes TEXT,
ADD COLUMN IF NOT EXISTS ai_detected_signature BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_detected_stamp BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_integrity_confidence DECIMAL(3,2);

COMMENT ON COLUMN fsvp_document_request_items.has_qa_signature IS 'Whether document has QA personnel signature (per FDA 483 observation)';
COMMENT ON COLUMN fsvp_document_request_items.has_official_stamp IS 'Whether document has official company stamp/seal';
COMMENT ON COLUMN fsvp_document_request_items.document_integrity_status IS 'Overall integrity status of the document';
COMMENT ON COLUMN fsvp_document_request_items.ai_detected_signature IS 'AI Vision detected signature in document';
COMMENT ON COLUMN fsvp_document_request_items.ai_detected_stamp IS 'AI Vision detected stamp/seal in document';

-- ----------------------------------------------------------------
-- 2. Create document integrity audit log table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fsvp_document_integrity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES fsvp_document_request_items(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES fsvp_document_requests(id) ON DELETE CASCADE,
  
  -- Check result
  check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('manual', 'ai_vision', 'auto')),
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Detection details
  signature_detected BOOLEAN,
  stamp_detected BOOLEAN,
  confidence_score DECIMAL(3,2),
  
  -- AI analysis details
  ai_analysis_result JSONB,
  
  -- User info
  checked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_integrity_log_item ON fsvp_document_integrity_log(item_id);
CREATE INDEX IF NOT EXISTS idx_doc_integrity_log_request ON fsvp_document_integrity_log(request_id);
CREATE INDEX IF NOT EXISTS idx_doc_integrity_log_created ON fsvp_document_integrity_log(created_at DESC);

-- ----------------------------------------------------------------
-- 3. Create view for documents needing integrity check
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW fsvp_documents_needing_integrity_check AS
SELECT 
  i.id AS item_id,
  i.request_id,
  r.request_number,
  r.product_name,
  r.supplier_id,
  s.supplier_name,
  i.document_type,
  i.document_name,
  i.uploaded_file_url,
  i.uploaded_at,
  i.document_integrity_status,
  i.has_qa_signature,
  i.has_official_stamp,
  i.ai_detected_signature,
  i.ai_detected_stamp,
  -- Highlight critical documents that must have integrity
  CASE 
    WHEN i.document_type IN ('food_safety_certificate', 'annual_audit_report', 'haccp_plan', 'test_report_coa', 'corrective_action_record')
    THEN true 
    ELSE false 
  END AS requires_integrity_check
FROM fsvp_document_request_items i
JOIN fsvp_document_requests r ON i.request_id = r.id
LEFT JOIN fsvp_suppliers s ON r.supplier_id = s.id
WHERE i.status IN ('uploaded', 'approved')
  AND i.uploaded_file_url IS NOT NULL
  AND (i.document_integrity_status = 'pending_review' 
       OR i.document_integrity_status IS NULL);

-- ----------------------------------------------------------------
-- 4. Function to update integrity status automatically
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_document_integrity_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-determine status based on signature and stamp
  IF NEW.has_qa_signature IS NOT NULL OR NEW.has_official_stamp IS NOT NULL THEN
    IF NEW.has_qa_signature = true AND NEW.has_official_stamp = true THEN
      NEW.document_integrity_status := 'verified_complete';
    ELSIF NEW.has_qa_signature = false AND NEW.has_official_stamp = false THEN
      NEW.document_integrity_status := 'incomplete';
    ELSIF NEW.has_qa_signature = false THEN
      NEW.document_integrity_status := 'missing_signature';
    ELSIF NEW.has_official_stamp = false THEN
      NEW.document_integrity_status := 'missing_stamp';
    END IF;
    
    -- Record check timestamp if not already set
    IF NEW.integrity_checked_at IS NULL THEN
      NEW.integrity_checked_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_doc_integrity_status ON fsvp_document_request_items;
CREATE TRIGGER trigger_update_doc_integrity_status
  BEFORE UPDATE OF has_qa_signature, has_official_stamp ON fsvp_document_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_document_integrity_status();

-- ----------------------------------------------------------------
-- 5. RLS Policies
-- ----------------------------------------------------------------
ALTER TABLE fsvp_document_integrity_log ENABLE ROW LEVEL SECURITY;

-- Importers can view/insert logs for their requests
CREATE POLICY fsvp_doc_integrity_log_importer_policy ON fsvp_document_integrity_log
  FOR ALL USING (
    request_id IN (
      SELECT id FROM fsvp_document_requests 
      WHERE importer_user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON fsvp_document_integrity_log TO authenticated;
GRANT SELECT ON fsvp_documents_needing_integrity_check TO authenticated;

-- ----------------------------------------------------------------
-- Done
-- ----------------------------------------------------------------
COMMENT ON TABLE fsvp_document_integrity_log IS
  'Audit log for document integrity checks (QA signature, official stamp) per FDA 483 requirements';

COMMENT ON VIEW fsvp_documents_needing_integrity_check IS
  'Documents uploaded but pending integrity verification for QA signature and official stamp';
