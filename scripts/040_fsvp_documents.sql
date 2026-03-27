-- ============================================================================
-- FSVP Documents Table Migration
-- Stores supporting documents for FSVP compliance
-- ============================================================================

-- ============================================================================
-- Table: fsvp_documents
-- Stores all supporting documents (certificates, reports, plans, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES fsvp_suppliers(id) ON DELETE SET NULL,
  
  -- Document Information
  document_type TEXT NOT NULL CHECK (document_type IN (
    'certificate',
    'test_report',
    'audit_report',
    'haccp_plan',
    'food_safety_plan',
    'sop',
    'letter_of_guarantee',
    'specification_sheet',
    'coa',  -- Certificate of Analysis
    'other'
  )),
  document_name TEXT NOT NULL,
  description TEXT,
  
  -- File Information
  file_url TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- Dates
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  issue_date TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'valid',
    'expired',
    'pending_review',
    'rejected',
    'archived'
  )),
  
  -- Versioning
  version TEXT DEFAULT '1.0',
  superseded_by UUID REFERENCES fsvp_documents(id),
  
  -- Review Information
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Additional Info
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fsvp_documents_user ON fsvp_documents(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_documents_supplier ON fsvp_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_documents_type ON fsvp_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_fsvp_documents_status ON fsvp_documents(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_documents_expiry ON fsvp_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Enable RLS
ALTER TABLE fsvp_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own documents" ON fsvp_documents
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can insert own documents" ON fsvp_documents
  FOR INSERT WITH CHECK (auth.uid() = importer_user_id);

CREATE POLICY "Users can update own documents" ON fsvp_documents
  FOR UPDATE USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can delete own documents" ON fsvp_documents
  FOR DELETE USING (auth.uid() = importer_user_id);

-- Admin access
CREATE POLICY "Admins can view all documents" ON fsvp_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Update trigger
CREATE OR REPLACE FUNCTION update_fsvp_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fsvp_documents_updated_at
  BEFORE UPDATE ON fsvp_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_fsvp_documents_updated_at();

-- ============================================================================
-- Function: Auto-expire documents
-- ============================================================================
CREATE OR REPLACE FUNCTION check_fsvp_document_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < NOW() THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fsvp_documents_expiry_check
  BEFORE INSERT OR UPDATE OF expiry_date
  ON fsvp_documents
  FOR EACH ROW
  EXECUTE FUNCTION check_fsvp_document_expiry();
