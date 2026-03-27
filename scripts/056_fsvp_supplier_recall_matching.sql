-- ================================================================
-- Migration 056: Supplier Recall History Matching
-- Per 21 CFR 1.505: Supplier Evaluation requirements
-- Auto-match FDA recall data with suppliers for risk assessment
--
-- DEPENDENCIES: 
--   - 019_add_recalls_pipeline.sql (creates pending_recalls table)
--   - 039_fsvp_integration.sql (creates fsvp_suppliers table)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Add recall tracking columns to fsvp_suppliers
-- ----------------------------------------------------------------
ALTER TABLE fsvp_suppliers
ADD COLUMN IF NOT EXISTS has_recall_history BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recall_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_recall_date DATE,
ADD COLUMN IF NOT EXISTS recall_severity VARCHAR(20) CHECK (recall_severity IN ('none', 'class_i', 'class_ii', 'class_iii')),
ADD COLUMN IF NOT EXISTS recall_last_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recall_check_notes TEXT;

COMMENT ON COLUMN fsvp_suppliers.has_recall_history IS 'Whether supplier has FDA recall history';
COMMENT ON COLUMN fsvp_suppliers.recall_count IS 'Total number of recalls associated with this supplier';
COMMENT ON COLUMN fsvp_suppliers.recall_severity IS 'Most severe recall classification (Class I = most serious)';

-- ----------------------------------------------------------------
-- 2. Create supplier_recall_matches table
-- Stores matches between suppliers and FDA recalls
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fsvp_supplier_recall_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  supplier_id UUID NOT NULL REFERENCES fsvp_suppliers(id) ON DELETE CASCADE,
  recall_id UUID REFERENCES pending_recalls(id) ON DELETE SET NULL,
  
  -- Recall details (denormalized for quick access)
  recall_number VARCHAR(100) NOT NULL,
  recalling_firm TEXT NOT NULL,
  product_description TEXT,
  reason_for_recall TEXT,
  recall_classification VARCHAR(20), -- Class I, II, III
  recall_initiation_date DATE,
  termination_date DATE,
  
  -- Match metadata
  match_type VARCHAR(50) NOT NULL CHECK (match_type IN (
    'exact_name',           -- Exact supplier name match
    'fuzzy_name',           -- Fuzzy/similar name match
    'manual',               -- Manually linked by user
    'product_match',        -- Matched by product type
    'address_match'         -- Matched by address
  )),
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  matched_field TEXT, -- Which field matched (name, address, etc.)
  
  -- Review status
  review_status VARCHAR(50) DEFAULT 'pending' CHECK (review_status IN (
    'pending',      -- Needs review
    'confirmed',    -- Confirmed match
    'dismissed',    -- False positive, dismissed
    'under_review'  -- Being investigated
  )),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Risk assessment
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(supplier_id, recall_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_recall_matches_supplier ON fsvp_supplier_recall_matches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_recall_matches_recall ON fsvp_supplier_recall_matches(recall_id);
CREATE INDEX IF NOT EXISTS idx_supplier_recall_matches_status ON fsvp_supplier_recall_matches(review_status);
CREATE INDEX IF NOT EXISTS idx_supplier_recall_matches_firm ON fsvp_supplier_recall_matches(recalling_firm);

-- ----------------------------------------------------------------
-- 3. Create supplier recall check log
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fsvp_supplier_recall_check_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES fsvp_suppliers(id) ON DELETE CASCADE,
  
  -- Check details
  check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('auto', 'manual', 'scheduled')),
  search_terms TEXT[], -- Terms used to search
  
  -- Results
  recalls_found INTEGER DEFAULT 0,
  new_matches INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  
  checked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 4. Function to auto-update supplier recall summary
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_supplier_recall_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update supplier's recall summary when a match is confirmed
  IF NEW.review_status = 'confirmed' OR TG_OP = 'INSERT' THEN
    UPDATE fsvp_suppliers
    SET 
      has_recall_history = true,
      recall_count = (
        SELECT COUNT(*) FROM fsvp_supplier_recall_matches 
        WHERE supplier_id = NEW.supplier_id 
        AND review_status IN ('confirmed', 'pending')
      ),
      last_recall_date = (
        SELECT MAX(recall_initiation_date) FROM fsvp_supplier_recall_matches 
        WHERE supplier_id = NEW.supplier_id 
        AND review_status IN ('confirmed', 'pending')
      ),
      recall_severity = (
        SELECT 
          CASE 
            WHEN EXISTS (SELECT 1 FROM fsvp_supplier_recall_matches WHERE supplier_id = NEW.supplier_id AND recall_classification = 'Class I' AND review_status IN ('confirmed', 'pending')) THEN 'class_i'
            WHEN EXISTS (SELECT 1 FROM fsvp_supplier_recall_matches WHERE supplier_id = NEW.supplier_id AND recall_classification = 'Class II' AND review_status IN ('confirmed', 'pending')) THEN 'class_ii'
            WHEN EXISTS (SELECT 1 FROM fsvp_supplier_recall_matches WHERE supplier_id = NEW.supplier_id AND recall_classification = 'Class III' AND review_status IN ('confirmed', 'pending')) THEN 'class_iii'
            ELSE 'none'
          END
      ),
      recall_last_checked_at = NOW()
    WHERE id = NEW.supplier_id;
  END IF;
  
  -- Reset if match is dismissed
  IF NEW.review_status = 'dismissed' THEN
    UPDATE fsvp_suppliers
    SET 
      recall_count = (
        SELECT COUNT(*) FROM fsvp_supplier_recall_matches 
        WHERE supplier_id = NEW.supplier_id 
        AND review_status IN ('confirmed', 'pending')
      ),
      has_recall_history = (
        SELECT COUNT(*) > 0 FROM fsvp_supplier_recall_matches 
        WHERE supplier_id = NEW.supplier_id 
        AND review_status IN ('confirmed', 'pending')
      )
    WHERE id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supplier_recall_summary ON fsvp_supplier_recall_matches;
CREATE TRIGGER trigger_update_supplier_recall_summary
  AFTER INSERT OR UPDATE OF review_status ON fsvp_supplier_recall_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_recall_summary();

-- ----------------------------------------------------------------
-- 5. View for suppliers with recall warnings
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW fsvp_suppliers_with_recall_warnings AS
SELECT 
  s.id AS supplier_id,
  s.supplier_name,
  s.supplier_country,
  s.has_recall_history,
  s.recall_count,
  s.recall_severity,
  s.last_recall_date,
  
  -- Risk level based on recalls
  CASE 
    WHEN s.recall_severity = 'class_i' THEN 'critical'
    WHEN s.recall_severity = 'class_ii' THEN 'high'
    WHEN s.recall_severity = 'class_iii' THEN 'medium'
    WHEN s.recall_count > 0 THEN 'low'
    ELSE 'none'
  END AS recall_risk_level,
  
  -- Warning message
  CASE 
    WHEN s.recall_severity = 'class_i' THEN 'CRITICAL: This supplier has Class I recall history. Enhanced verification required per §1.505.'
    WHEN s.recall_severity = 'class_ii' THEN 'WARNING: This supplier has Class II recall history. Additional supplier evaluation recommended.'
    WHEN s.recall_severity = 'class_iii' THEN 'NOTICE: This supplier has Class III recall history. Consider in supplier evaluation.'
    WHEN s.recall_count > 0 THEN 'INFO: This supplier has recall history. Review details in supplier evaluation.'
    ELSE NULL
  END AS recall_warning_message,
  
  -- Recent recall details
  (
    SELECT json_agg(json_build_object(
      'recall_number', m.recall_number,
      'classification', m.recall_classification,
      'reason', m.reason_for_recall,
      'date', m.recall_initiation_date,
      'product', m.product_description
    ) ORDER BY m.recall_initiation_date DESC)
    FROM fsvp_supplier_recall_matches m
    WHERE m.supplier_id = s.id 
    AND m.review_status IN ('confirmed', 'pending')
    LIMIT 5
  ) AS recent_recalls

FROM fsvp_suppliers s
WHERE s.has_recall_history = true
  OR s.recall_count > 0;

-- ----------------------------------------------------------------
-- 6. Function to search and match recalls for a supplier
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_supplier_recalls(
  p_supplier_id UUID,
  p_search_terms TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  recall_id UUID,
  recall_number TEXT,
  recalling_firm TEXT,
  product_description TEXT,
  reason_for_recall TEXT,
  classification TEXT,
  recall_date DATE,
  match_confidence DECIMAL,
  match_type TEXT
) AS $$
DECLARE
  v_supplier_name TEXT;
  v_search_terms TEXT[];
BEGIN
  -- Get supplier name
  SELECT supplier_name INTO v_supplier_name 
  FROM fsvp_suppliers WHERE id = p_supplier_id;
  
  -- Use provided search terms or generate from supplier name
  IF p_search_terms IS NOT NULL THEN
    v_search_terms := p_search_terms;
  ELSE
    -- Split supplier name into search terms
    v_search_terms := string_to_array(LOWER(v_supplier_name), ' ');
  END IF;
  
  RETURN QUERY
  SELECT 
    pr.id AS recall_id,
    pr.recall_number,
    pr.recalling_firm,
    pr.product_description,
    pr.reason_for_recall,
    pr.classification,
    pr.recall_initiation_date AS recall_date,
    -- Calculate match confidence
    CASE 
      WHEN LOWER(pr.recalling_firm) = LOWER(v_supplier_name) THEN 1.0
      WHEN LOWER(pr.recalling_firm) LIKE '%' || LOWER(v_supplier_name) || '%' THEN 0.9
      WHEN LOWER(v_supplier_name) LIKE '%' || LOWER(pr.recalling_firm) || '%' THEN 0.9
      ELSE 0.5
    END::DECIMAL AS match_confidence,
    -- Match type
    CASE 
      WHEN LOWER(pr.recalling_firm) = LOWER(v_supplier_name) THEN 'exact_name'
      ELSE 'fuzzy_name'
    END AS match_type
  FROM pending_recalls pr
  WHERE pr.product_type = 'food'
    AND pr.status IN ('approved', 'imported', 'pending_review')
    AND (
      -- Exact match
      LOWER(pr.recalling_firm) = LOWER(v_supplier_name)
      -- Partial match
      OR LOWER(pr.recalling_firm) LIKE '%' || LOWER(v_supplier_name) || '%'
      OR LOWER(v_supplier_name) LIKE '%' || LOWER(pr.recalling_firm) || '%'
      -- Search terms match
      OR EXISTS (
        SELECT 1 FROM unnest(v_search_terms) term
        WHERE LOWER(pr.recalling_firm) LIKE '%' || term || '%'
        AND LENGTH(term) > 3
      )
    )
    -- Exclude already matched
    AND NOT EXISTS (
      SELECT 1 FROM fsvp_supplier_recall_matches m
      WHERE m.supplier_id = p_supplier_id 
      AND m.recall_number = pr.recall_number
    )
  ORDER BY match_confidence DESC, pr.recall_initiation_date DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- 7. RLS Policies
-- ----------------------------------------------------------------
ALTER TABLE fsvp_supplier_recall_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_supplier_recall_check_log ENABLE ROW LEVEL SECURITY;

-- Users can view/manage recall matches for their suppliers
CREATE POLICY fsvp_recall_matches_policy ON fsvp_supplier_recall_matches
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM fsvp_document_requests r
      WHERE r.supplier_id = fsvp_supplier_recall_matches.supplier_id
      AND r.importer_user_id = auth.uid()
    )
  );

CREATE POLICY fsvp_recall_check_log_policy ON fsvp_supplier_recall_check_log
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
    OR checked_by = auth.uid()
  );

-- Grant permissions
GRANT ALL ON fsvp_supplier_recall_matches TO authenticated;
GRANT ALL ON fsvp_supplier_recall_check_log TO authenticated;
GRANT SELECT ON fsvp_suppliers_with_recall_warnings TO authenticated;

-- ----------------------------------------------------------------
-- Done
-- ----------------------------------------------------------------
COMMENT ON TABLE fsvp_supplier_recall_matches IS
  'Matches between FSVP suppliers and FDA recall records for risk assessment per §1.505';

COMMENT ON TABLE fsvp_supplier_recall_check_log IS
  'Log of recall history checks performed on suppliers';

COMMENT ON VIEW fsvp_suppliers_with_recall_warnings IS
  'Suppliers with FDA recall history and associated warning levels';
