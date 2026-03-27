-- ============================================================================
-- FSVP RECORDS - Master table for Product-Supplier FSVP compliance
-- Per 21 CFR Part 1 Subpart L: Each product from each supplier needs its own FSVP
-- ============================================================================

-- Create enum for FSVP compliance status
DO $$ BEGIN
  CREATE TYPE fsvp_compliance_status AS ENUM (
    'draft',        -- FSVP record created but not yet active
    'pending',      -- Awaiting supplier documents/verification
    'active',       -- FSVP fully compliant and active
    'needs_review', -- Requires re-evaluation (e.g., regulation change)
    'suspended',    -- Temporarily suspended due to issues
    'archived'      -- No longer importing this product
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for risk level
DO $$ BEGIN
  CREATE TYPE fsvp_risk_level AS ENUM (
    'low',
    'medium', 
    'high',
    'sahcodha'  -- Serious Adverse Health Consequences or Death
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MAIN TABLE: fsvp_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  importer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Supplier reference
  supplier_id UUID NOT NULL REFERENCES fsvp_suppliers(id) ON DELETE CASCADE,
  
  -- Product information
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_category TEXT,
  fda_product_code TEXT,           -- FDA product code if applicable
  hs_code TEXT,                    -- Harmonized System code for import
  country_of_origin TEXT,
  
  -- Risk assessment
  risk_level fsvp_risk_level DEFAULT 'medium',
  is_sahcodha BOOLEAN DEFAULT FALSE,
  hazard_types TEXT[] DEFAULT '{}', -- biological, chemical, physical, allergen, radiological
  
  -- Compliance tracking
  compliance_status fsvp_compliance_status DEFAULT 'draft',
  compliance_score INTEGER DEFAULT 0 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  
  -- Linked records
  hazard_analysis_id UUID REFERENCES fsvp_hazard_analyses(id) ON DELETE SET NULL,
  primary_qi_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Qualified Individual
  
  -- Verification schedule
  verification_frequency TEXT DEFAULT 'annual', -- annual, semi-annual, quarterly, as-needed
  last_verification_date TIMESTAMPTZ,
  next_verification_due TIMESTAMPTZ,
  
  -- Linked audit report (from label analysis)
  linked_audit_report_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
  
  -- Notes and metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique product-supplier combination per importer
  UNIQUE (importer_user_id, supplier_id, product_name)
);

-- ============================================================================
-- FSVP RECORD ACTIVITIES - Track all activities for an FSVP record
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_record_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsvp_record_id UUID NOT NULL REFERENCES fsvp_records(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL, -- 'verification', 'document_review', 'audit', 'corrective_action', 'status_change', 'note'
  activity_title TEXT NOT NULL,
  activity_description TEXT,
  
  -- Who performed the activity
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_role TEXT, -- 'importer', 'qi', 'supplier'
  
  -- Result of activity
  result TEXT, -- 'pass', 'fail', 'pending', 'not_applicable'
  result_details JSONB DEFAULT '{}',
  
  -- Linked documents
  linked_document_ids UUID[] DEFAULT '{}',
  
  -- Timestamps
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FSVP COMPLIANCE CHECKLIST - Per-record checklist items
-- Based on 21 CFR 1.502-1.514
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_compliance_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsvp_record_id UUID NOT NULL REFERENCES fsvp_records(id) ON DELETE CASCADE,
  
  -- Checklist item
  requirement_code TEXT NOT NULL,  -- e.g., '1.502', '1.505(a)', '1.506(d)(1)'
  requirement_title TEXT NOT NULL,
  requirement_description TEXT,
  category TEXT NOT NULL, -- 'hazard_analysis', 'evaluation', 'verification', 'corrective_action', 'reassessment', 'recordkeeping'
  
  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  is_applicable BOOLEAN DEFAULT TRUE,
  completed_date TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Evidence
  evidence_notes TEXT,
  evidence_document_ids UUID[] DEFAULT '{}',
  
  -- Timestamps  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (fsvp_record_id, requirement_code)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_fsvp_records_importer ON fsvp_records(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_records_supplier ON fsvp_records(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_records_status ON fsvp_records(compliance_status);
CREATE INDEX IF NOT EXISTS idx_fsvp_records_risk ON fsvp_records(risk_level);
CREATE INDEX IF NOT EXISTS idx_fsvp_records_verification_due ON fsvp_records(next_verification_due);
CREATE INDEX IF NOT EXISTS idx_fsvp_records_sahcodha ON fsvp_records(is_sahcodha) WHERE is_sahcodha = TRUE;

CREATE INDEX IF NOT EXISTS idx_fsvp_record_activities_record ON fsvp_record_activities(fsvp_record_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_record_activities_type ON fsvp_record_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_fsvp_record_activities_date ON fsvp_record_activities(activity_date);

CREATE INDEX IF NOT EXISTS idx_fsvp_compliance_checklist_record ON fsvp_compliance_checklist(fsvp_record_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_compliance_checklist_category ON fsvp_compliance_checklist(category);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE fsvp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_record_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_compliance_checklist ENABLE ROW LEVEL SECURITY;

-- FSVP Records policies
CREATE POLICY "Users can view own FSVP records"
  ON fsvp_records FOR SELECT
  USING (importer_user_id = auth.uid() OR primary_qi_user_id = auth.uid());

CREATE POLICY "Users can create own FSVP records"
  ON fsvp_records FOR INSERT
  WITH CHECK (importer_user_id = auth.uid());

CREATE POLICY "Users can update own FSVP records"
  ON fsvp_records FOR UPDATE
  USING (importer_user_id = auth.uid() OR primary_qi_user_id = auth.uid());

CREATE POLICY "Users can delete own FSVP records"
  ON fsvp_records FOR DELETE
  USING (importer_user_id = auth.uid());

-- Activities policies
CREATE POLICY "Users can view activities for their FSVP records"
  ON fsvp_record_activities FOR SELECT
  USING (
    fsvp_record_id IN (
      SELECT id FROM fsvp_records 
      WHERE importer_user_id = auth.uid() OR primary_qi_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities for their FSVP records"
  ON fsvp_record_activities FOR INSERT
  WITH CHECK (
    fsvp_record_id IN (
      SELECT id FROM fsvp_records 
      WHERE importer_user_id = auth.uid() OR primary_qi_user_id = auth.uid()
    )
  );

-- Checklist policies
CREATE POLICY "Users can view checklist for their FSVP records"
  ON fsvp_compliance_checklist FOR SELECT
  USING (
    fsvp_record_id IN (
      SELECT id FROM fsvp_records 
      WHERE importer_user_id = auth.uid() OR primary_qi_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage checklist for their FSVP records"
  ON fsvp_compliance_checklist FOR ALL
  USING (
    fsvp_record_id IN (
      SELECT id FROM fsvp_records 
      WHERE importer_user_id = auth.uid() OR primary_qi_user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate compliance score based on checklist completion
CREATE OR REPLACE FUNCTION calculate_fsvp_compliance_score(record_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
  score INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE is_applicable = TRUE),
    COUNT(*) FILTER (WHERE is_applicable = TRUE AND is_completed = TRUE)
  INTO total_items, completed_items
  FROM fsvp_compliance_checklist
  WHERE fsvp_record_id = record_id;
  
  IF total_items = 0 THEN
    RETURN 0;
  END IF;
  
  score := ROUND((completed_items::NUMERIC / total_items::NUMERIC) * 100);
  
  -- Update the record
  UPDATE fsvp_records 
  SET compliance_score = score, updated_at = NOW()
  WHERE id = record_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-populate checklist when FSVP record is created
CREATE OR REPLACE FUNCTION populate_fsvp_checklist()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert standard FSVP checklist items based on 21 CFR Part 1 Subpart L
  INSERT INTO fsvp_compliance_checklist (fsvp_record_id, requirement_code, requirement_title, requirement_description, category) VALUES
    -- Hazard Analysis (21 CFR 1.504)
    (NEW.id, '1.504(a)', 'Identify Known Hazards', 'Identify hazards that are known or reasonably foreseeable for each type of food', 'hazard_analysis'),
    (NEW.id, '1.504(b)', 'Evaluate Hazards', 'Evaluate the hazards to determine if they require a control', 'hazard_analysis'),
    (NEW.id, '1.504(c)', 'Document Hazard Analysis', 'Document the hazard analysis in writing', 'hazard_analysis'),
    
    -- Evaluation of Foreign Supplier (21 CFR 1.505)
    (NEW.id, '1.505(a)(1)', 'Supplier Performance', 'Evaluate supplier performance including hazard analysis', 'evaluation'),
    (NEW.id, '1.505(a)(2)', 'Supplier Procedures', 'Evaluate supplier food safety procedures', 'evaluation'),
    (NEW.id, '1.505(a)(3)', 'Supplier Compliance History', 'Evaluate supplier FDA compliance history', 'evaluation'),
    
    -- Verification Activities (21 CFR 1.506)
    (NEW.id, '1.506(a)', 'Determine Verification Activities', 'Determine and conduct appropriate verification activities', 'verification'),
    (NEW.id, '1.506(b)', 'Onsite Audit (if required)', 'Conduct onsite audit if SAHCODHA hazard or other risk factors', 'verification'),
    (NEW.id, '1.506(c)', 'Sampling and Testing', 'Conduct sampling and testing of food as appropriate', 'verification'),
    (NEW.id, '1.506(d)', 'Review Records', 'Review supplier food safety records', 'verification'),
    
    -- Corrective Actions (21 CFR 1.508)
    (NEW.id, '1.508(a)', 'Corrective Action Plan', 'Have corrective action procedures in place', 'corrective_action'),
    (NEW.id, '1.508(b)', 'Document Corrective Actions', 'Document all corrective actions taken', 'corrective_action'),
    
    -- Reassessment (21 CFR 1.505(c))
    (NEW.id, '1.505(c)(1)', 'Reassess When Needed', 'Reassess FSVP when new information becomes available', 'reassessment'),
    (NEW.id, '1.505(c)(2)', 'Periodic Reassessment', 'Conduct periodic reassessment at least every 3 years', 'reassessment'),
    
    -- Recordkeeping (21 CFR 1.510)
    (NEW.id, '1.510(a)', 'Maintain Records', 'Maintain required FSVP records', 'recordkeeping'),
    (NEW.id, '1.510(b)(1)', 'Importer Identification', 'Maintain importer identification records', 'recordkeeping'),
    (NEW.id, '1.510(b)(2)', 'FSVP Documentation', 'Maintain FSVP documentation for each food', 'recordkeeping');
    
  -- If SAHCODHA, add additional requirements
  IF NEW.is_sahcodha THEN
    INSERT INTO fsvp_compliance_checklist (fsvp_record_id, requirement_code, requirement_title, requirement_description, category) VALUES
      (NEW.id, '1.506(d)(1)', 'Annual Onsite Audit', 'SAHCODHA products require annual onsite audit', 'verification'),
      (NEW.id, '1.506(d)(2)', 'Audit Documentation', 'Maintain documentation of onsite audits', 'verification');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-populate checklist
DROP TRIGGER IF EXISTS trigger_populate_fsvp_checklist ON fsvp_records;
CREATE TRIGGER trigger_populate_fsvp_checklist
  AFTER INSERT ON fsvp_records
  FOR EACH ROW
  EXECUTE FUNCTION populate_fsvp_checklist();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_fsvp_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fsvp_records_updated_at ON fsvp_records;
CREATE TRIGGER trigger_update_fsvp_records_updated_at
  BEFORE UPDATE ON fsvp_records
  FOR EACH ROW
  EXECUTE FUNCTION update_fsvp_records_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for FSVP records with supplier info
CREATE OR REPLACE VIEW fsvp_records_with_supplier AS
SELECT 
  r.*,
  s.supplier_name,
  s.supplier_country,
  s.supplier_contact_email AS supplier_email,
  s.supplier_fei AS supplier_fda_number,
  (
    SELECT COUNT(*) 
    FROM fsvp_compliance_checklist c 
    WHERE c.fsvp_record_id = r.id AND c.is_applicable = TRUE
  ) AS total_checklist_items,
  (
    SELECT COUNT(*) 
    FROM fsvp_compliance_checklist c 
    WHERE c.fsvp_record_id = r.id AND c.is_applicable = TRUE AND c.is_completed = TRUE
  ) AS completed_checklist_items
FROM fsvp_records r
JOIN fsvp_suppliers s ON r.supplier_id = s.id;

-- Grant access to view
GRANT SELECT ON fsvp_records_with_supplier TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'FSVP Records migration completed successfully!';
  RAISE NOTICE 'Tables created: fsvp_records, fsvp_record_activities, fsvp_compliance_checklist';
  RAISE NOTICE 'View created: fsvp_records_with_supplier';
END $$;
