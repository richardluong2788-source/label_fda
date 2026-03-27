-- FSVP Document Request System
-- Phase 1: Importer requests documents from Supplier
-- Per 21 CFR Part 1, Subpart L (§1.504-§1.506)

-- =====================================================
-- Table: fsvp_document_requests
-- Main request from importer to supplier for documents
-- =====================================================
CREATE TABLE IF NOT EXISTS fsvp_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request metadata
  request_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Parties involved
  importer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES fsvp_suppliers(id) ON DELETE SET NULL,
  supplier_email VARCHAR(255), -- For suppliers not yet in system
  
  -- Product information
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100), -- e.g., 'tree_nuts', 'seafood', 'produce'
  is_sahcodha BOOLEAN DEFAULT false, -- Subject to §1.506(d)(2) annual audit
  fda_product_code VARCHAR(50),
  
  -- Request details
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Importer creating request
    'sent',            -- Sent to supplier
    'in_progress',     -- Supplier uploading documents
    'under_review',    -- Importer reviewing documents
    'approved',        -- All documents approved
    'rejected',        -- Documents rejected, needs re-upload
    'expired'          -- Deadline passed
  )),
  
  -- Deadlines
  deadline DATE,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Notes
  importer_notes TEXT,
  supplier_notes TEXT,
  
  -- CFR reference
  applicable_cfr_sections TEXT[], -- e.g., ['§1.504', '§1.505', '§1.506']
  
  -- AI learning metadata
  ai_suggestion_used BOOLEAN DEFAULT false,
  ai_confidence_score DECIMAL(3,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- Table: fsvp_document_request_items
-- Individual document items in a request
-- =====================================================
CREATE TABLE IF NOT EXISTS fsvp_document_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES fsvp_document_requests(id) ON DELETE CASCADE,
  
  -- Document type from FSVP requirements
  document_type VARCHAR(100) NOT NULL CHECK (document_type IN (
    'food_safety_certificate',    -- ISO 22000, FSSC 22000, BRC, SQF (§1.506(e))
    'annual_audit_report',        -- Required for SAHCODHA (§1.506(d)(2))
    'haccp_plan',                 -- Hazard Analysis Critical Control Points
    'hazard_analysis',            -- Per §1.504
    'test_report_coa',            -- Certificate of Analysis, pathogen/chemical tests
    'specification_sheet',        -- Product specifications
    'letter_of_guarantee',        -- Continuing guarantee letter
    'corrective_action_record',   -- Per §1.508
    'supplier_questionnaire',     -- Supplier evaluation per §1.505
    'sop_document',               -- Standard Operating Procedures
    'allergen_control_plan',      -- Allergen management
    'recall_plan',                -- Product recall procedures
    'other'                       -- Other supporting documents
  )),
  
  -- Display information
  document_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Requirements
  is_required BOOLEAN DEFAULT true,
  cfr_reference VARCHAR(50), -- e.g., '§1.506(d)(2)'
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',          -- Waiting for supplier upload
    'uploaded',         -- Supplier uploaded, awaiting review
    'approved',         -- Importer approved
    'rejected',         -- Importer rejected, needs re-upload
    'waived'            -- Importer waived this requirement
  )),
  
  -- Uploaded document reference
  uploaded_document_id UUID REFERENCES fsvp_documents(id) ON DELETE SET NULL,
  uploaded_file_name VARCHAR(255),
  uploaded_file_url TEXT,
  uploaded_at TIMESTAMPTZ,
  
  -- Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- AI verification
  ai_verified BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  ai_document_type_match BOOLEAN,
  
  -- Priority/Order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: fsvp_document_request_notifications
-- Track notifications sent to suppliers
-- =====================================================
CREATE TABLE IF NOT EXISTS fsvp_document_request_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES fsvp_document_requests(id) ON DELETE CASCADE,
  
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
    'initial_request',
    'reminder',
    'deadline_warning',
    'document_approved',
    'document_rejected',
    'request_completed',
    'request_expired'
  )),
  
  -- Recipient
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id),
  
  -- Status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Content
  subject VARCHAR(255),
  message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: fsvp_ai_document_patterns
-- Store patterns for AI learning/suggestions
-- =====================================================
CREATE TABLE IF NOT EXISTS fsvp_ai_document_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  product_category VARCHAR(100) NOT NULL,
  country_of_origin VARCHAR(100),
  is_sahcodha BOOLEAN DEFAULT false,
  
  -- Suggested documents
  suggested_document_types TEXT[] NOT NULL,
  suggested_required_docs TEXT[] NOT NULL,
  
  -- Learning data
  usage_count INTEGER DEFAULT 1,
  success_rate DECIMAL(3,2), -- How often this pattern led to approval
  
  -- Source
  source_request_id UUID REFERENCES fsvp_document_requests(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique pattern
  UNIQUE(product_category, country_of_origin, is_sahcodha)
);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_requests_importer ON fsvp_document_requests(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_requests_supplier ON fsvp_document_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_requests_status ON fsvp_document_requests(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_requests_deadline ON fsvp_document_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_request_items_request ON fsvp_document_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_request_items_status ON fsvp_document_request_items(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_ai_patterns_category ON fsvp_ai_document_patterns(product_category);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_fsvp_document_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fsvp_document_requests_updated ON fsvp_document_requests;
CREATE TRIGGER trigger_fsvp_document_requests_updated
  BEFORE UPDATE ON fsvp_document_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_fsvp_document_requests_timestamp();

DROP TRIGGER IF EXISTS trigger_fsvp_document_request_items_updated ON fsvp_document_request_items;
CREATE TRIGGER trigger_fsvp_document_request_items_updated
  BEFORE UPDATE ON fsvp_document_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_fsvp_document_requests_timestamp();

-- =====================================================
-- Function to generate request number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_fsvp_request_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  request_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(request_number FROM 'FSVP-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM fsvp_document_requests
  WHERE request_number LIKE 'FSVP-' || year_part || '-%';
  
  request_num := 'FSVP-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  
  RETURN request_num;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- View: fsvp_document_requests_summary
-- Summary view for dashboard
-- =====================================================
CREATE OR REPLACE VIEW fsvp_document_requests_summary AS
SELECT 
  r.id,
  r.request_number,
  r.importer_user_id,
  r.supplier_id,
  r.supplier_email,
  s.supplier_name,
  r.product_name,
  r.product_category,
  r.is_sahcodha,
  r.status,
  r.deadline,
  r.created_at,
  r.sent_at,
  r.completed_at,
  
  -- Progress calculation
  COUNT(i.id) AS total_items,
  COUNT(CASE WHEN i.status IN ('approved', 'waived') THEN 1 END) AS completed_items,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 END) AS pending_items,
  COUNT(CASE WHEN i.status = 'uploaded' THEN 1 END) AS uploaded_items,
  COUNT(CASE WHEN i.status = 'rejected' THEN 1 END) AS rejected_items,
  
  -- Progress percentage
  CASE 
    WHEN COUNT(i.id) > 0 THEN 
      ROUND((COUNT(CASE WHEN i.status IN ('approved', 'waived') THEN 1 END)::DECIMAL / COUNT(i.id)) * 100, 0)
    ELSE 0 
  END AS progress_percentage,
  
  -- Days until deadline
  CASE 
    WHEN r.deadline IS NOT NULL THEN 
      r.deadline - CURRENT_DATE
    ELSE NULL 
  END AS days_until_deadline

FROM fsvp_document_requests r
LEFT JOIN fsvp_suppliers s ON r.supplier_id = s.id
LEFT JOIN fsvp_document_request_items i ON r.id = i.request_id
GROUP BY r.id, r.request_number, r.importer_user_id, r.supplier_id, 
         r.supplier_email, s.supplier_name, r.product_name, r.product_category,
         r.is_sahcodha, r.status, r.deadline, r.created_at, r.sent_at, r.completed_at;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE fsvp_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_document_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_document_request_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_ai_document_patterns ENABLE ROW LEVEL SECURITY;

-- Importers can manage their own requests
CREATE POLICY fsvp_doc_requests_importer_policy ON fsvp_document_requests
  FOR ALL USING (auth.uid() = importer_user_id);

-- Suppliers can view requests sent to them
CREATE POLICY fsvp_doc_requests_supplier_policy ON fsvp_document_requests
  FOR SELECT USING (
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
    OR supplier_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Request items follow parent request permissions
CREATE POLICY fsvp_doc_request_items_policy ON fsvp_document_request_items
  FOR ALL USING (
    request_id IN (
      SELECT id FROM fsvp_document_requests 
      WHERE importer_user_id = auth.uid()
         OR supplier_id IN (SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid())
         OR supplier_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Notifications visible to recipients
CREATE POLICY fsvp_notifications_policy ON fsvp_document_request_notifications
  FOR SELECT USING (
    recipient_user_id = auth.uid()
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- AI patterns readable by all authenticated users
CREATE POLICY fsvp_ai_patterns_read_policy ON fsvp_ai_document_patterns
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON fsvp_document_requests TO authenticated;
GRANT ALL ON fsvp_document_request_items TO authenticated;
GRANT ALL ON fsvp_document_request_notifications TO authenticated;
GRANT SELECT ON fsvp_ai_document_patterns TO authenticated;
GRANT SELECT ON fsvp_document_requests_summary TO authenticated;
