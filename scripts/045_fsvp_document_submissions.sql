-- FSVP Document Submissions Table
-- Tracks when suppliers send their FSVP documentation to importers for review
-- This enables the Supplier flow: scan label → create FSVP → upload docs → send to importer

CREATE TABLE IF NOT EXISTS fsvp_document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supplier who is sending the documents
  supplier_user_id UUID NOT NULL,
  supplier_id UUID REFERENCES fsvp_suppliers(id) ON DELETE SET NULL,
  
  -- Importer who will receive the documents (optional - can be sent to "any importer")
  importer_user_id UUID,
  
  -- Link to hazard analysis if applicable
  hazard_analysis_id UUID REFERENCES fsvp_hazard_analyses(id) ON DELETE SET NULL,
  
  -- Product information
  product_name TEXT NOT NULL,
  product_category TEXT,
  country_of_origin TEXT,
  is_sahcodha BOOLEAN DEFAULT FALSE,
  
  -- Documents that are ready/submitted
  documents_ready TEXT[] DEFAULT '{}',
  
  -- Supplier message to importer
  supplier_message TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'draft',
    'submitted',
    'received',
    'under_review',
    'approved',
    'rejected',
    'needs_revision'
  )),
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  
  -- Importer response
  importer_response TEXT,
  importer_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_submissions_supplier ON fsvp_document_submissions(supplier_user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_submissions_importer ON fsvp_document_submissions(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_submissions_status ON fsvp_document_submissions(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_doc_submissions_hazard ON fsvp_document_submissions(hazard_analysis_id);

-- Add supplier_ready_documents and supplier_submission_date columns to hazard analyses if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fsvp_hazard_analyses' AND column_name = 'supplier_ready_documents'
  ) THEN
    ALTER TABLE fsvp_hazard_analyses ADD COLUMN supplier_ready_documents TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fsvp_hazard_analyses' AND column_name = 'supplier_submission_date'
  ) THEN
    ALTER TABLE fsvp_hazard_analyses ADD COLUMN supplier_submission_date TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fsvp_hazard_analyses' AND column_name = 'supplier_message'
  ) THEN
    ALTER TABLE fsvp_hazard_analyses ADD COLUMN supplier_message TEXT;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE fsvp_document_submissions ENABLE ROW LEVEL SECURITY;

-- Suppliers can view and manage their own submissions
CREATE POLICY "Suppliers can manage own submissions"
  ON fsvp_document_submissions
  FOR ALL
  USING (supplier_user_id = auth.uid())
  WITH CHECK (supplier_user_id = auth.uid());

-- Importers can view submissions sent to them
CREATE POLICY "Importers can view received submissions"
  ON fsvp_document_submissions
  FOR SELECT
  USING (importer_user_id = auth.uid());

-- Importers can update status of submissions sent to them
CREATE POLICY "Importers can update received submissions"
  ON fsvp_document_submissions
  FOR UPDATE
  USING (importer_user_id = auth.uid())
  WITH CHECK (importer_user_id = auth.uid());

COMMENT ON TABLE fsvp_document_submissions IS 'Tracks FSVP document submissions from suppliers to importers';
