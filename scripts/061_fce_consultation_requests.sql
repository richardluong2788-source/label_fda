-- =====================================================
-- FCE/SID Consultation Requests Table
-- =====================================================
-- Stores consultation requests for FCE/SID registration
-- assistance from importers who need help registering
-- their foreign suppliers with FDA.
-- =====================================================

-- Create consultation requests table
CREATE TABLE IF NOT EXISTS fsvp_consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User info (optional - can be submitted without login)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Contact information
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Supplier/Product info
  supplier_name TEXT,
  product_type TEXT,
  product_name TEXT,
  product_category TEXT,
  country_of_origin TEXT,
  
  -- Request details
  message TEXT,
  request_type TEXT DEFAULT 'fce_sid_registration',
  fce_sid_category TEXT, -- 'lacf' or 'acidified'
  
  -- Link to audit report if available
  audit_report_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT, -- Vexim team member handling
  notes TEXT, -- Internal notes
  
  -- Follow-up tracking
  contacted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fsvp_consultation_requests_user 
  ON fsvp_consultation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_consultation_requests_status 
  ON fsvp_consultation_requests(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_consultation_requests_email 
  ON fsvp_consultation_requests(email);
CREATE INDEX IF NOT EXISTS idx_fsvp_consultation_requests_created 
  ON fsvp_consultation_requests(created_at DESC);

-- RLS Policies
ALTER TABLE fsvp_consultation_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own consultation requests
CREATE POLICY "Users can view own consultation requests"
  ON fsvp_consultation_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create consultation requests
CREATE POLICY "Users can create consultation requests"
  ON fsvp_consultation_requests
  FOR INSERT
  WITH CHECK (true); -- Allow both logged in and anonymous

-- Service role can manage all
CREATE POLICY "Service role can manage all consultation requests"
  ON fsvp_consultation_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_fsvp_consultation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fsvp_consultation_requests_updated_at 
  ON fsvp_consultation_requests;
CREATE TRIGGER trigger_update_fsvp_consultation_requests_updated_at
  BEFORE UPDATE ON fsvp_consultation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_fsvp_consultation_requests_updated_at();

-- Comments
COMMENT ON TABLE fsvp_consultation_requests IS 'Stores FCE/SID registration consultation requests from importers';
COMMENT ON COLUMN fsvp_consultation_requests.request_type IS 'Type of consultation: fce_sid_registration, process_filing, compliance_audit, etc.';
COMMENT ON COLUMN fsvp_consultation_requests.fce_sid_category IS 'Product category: lacf (Low-Acid Canned Foods) or acidified (Acidified Foods)';
COMMENT ON COLUMN fsvp_consultation_requests.assigned_to IS 'Vexim team member assigned to handle this request';
