-- Create Prior Notice tables for FDA import notification system

-- Prior Notices table
CREATE TABLE IF NOT EXISTS prior_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Shipment details
  product_name TEXT NOT NULL,
  manufacturer_name TEXT,
  manufacturer_country VARCHAR(100),
  intended_use TEXT,
  
  -- Import details
  quantity NUMERIC(10, 2),
  unit_of_measure VARCHAR(20),
  import_date TIMESTAMP WITH TIME ZONE,
  port_of_entry VARCHAR(100),
  commodity_code VARCHAR(20),
  
  -- FDA submission
  pnrn VARCHAR(50) UNIQUE, -- Prior Notice Reference Number
  compliance_status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, rejected
  
  -- Risk assessment
  risk_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  risk_factors TEXT[], -- array of identified risks
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_to_fda BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT quantity_positive CHECK (quantity IS NULL OR quantity > 0)
);

-- Prior Notice Items (individual products in shipment)
CREATE TABLE IF NOT EXISTS prior_notice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prior_notice_id UUID NOT NULL REFERENCES prior_notices(id) ON DELETE CASCADE,
  
  ingredient_or_component TEXT NOT NULL,
  quantity_per_unit NUMERIC(10, 2),
  unit_of_measure VARCHAR(20),
  source_country VARCHAR(100),
  
  -- Risk assessment
  allergen_flags TEXT[], -- allergens detected
  compliance_issues TEXT[], -- FDA concerns
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prior Notice Documents (supporting attachments)
CREATE TABLE IF NOT EXISTS prior_notice_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prior_notice_id UUID NOT NULL REFERENCES prior_notices(id) ON DELETE CASCADE,
  
  document_type VARCHAR(50), -- certificate_of_analysis, health_certificate, etc
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Prior Notice Compliance Checks
CREATE TABLE IF NOT EXISTS prior_notice_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prior_notice_id UUID NOT NULL REFERENCES prior_notices(id) ON DELETE CASCADE,
  
  check_type VARCHAR(50), -- fda_database, allergen_check, ingredient_validation
  check_passed BOOLEAN,
  findings TEXT,
  
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prior_notices_user_id ON prior_notices(user_id);
CREATE INDEX IF NOT EXISTS idx_prior_notices_pnrn ON prior_notices(pnrn);
CREATE INDEX IF NOT EXISTS idx_prior_notices_status ON prior_notices(compliance_status);
CREATE INDEX IF NOT EXISTS idx_prior_notice_items_notice_id ON prior_notice_items(prior_notice_id);
CREATE INDEX IF NOT EXISTS idx_prior_notice_documents_notice_id ON prior_notice_documents(prior_notice_id);

-- Enable RLS (Row Level Security) for prior notices
ALTER TABLE prior_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_notice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_notice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_notice_compliance_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see only their own prior notices
CREATE POLICY "users_can_view_own_prior_notices"
  ON prior_notices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_prior_notices"
  ON prior_notices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_prior_notices"
  ON prior_notices
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Items belong to user through prior_notice
CREATE POLICY "users_can_view_own_items"
  ON prior_notice_items
  FOR SELECT
  USING (prior_notice_id IN (
    SELECT id FROM prior_notices WHERE user_id = auth.uid()
  ));

CREATE POLICY "users_can_insert_own_items"
  ON prior_notice_items
  FOR INSERT
  WITH CHECK (prior_notice_id IN (
    SELECT id FROM prior_notices WHERE user_id = auth.uid()
  ));

-- RLS Policy: Documents belong to user through prior_notice
CREATE POLICY "users_can_view_own_documents"
  ON prior_notice_documents
  FOR SELECT
  USING (prior_notice_id IN (
    SELECT id FROM prior_notices WHERE user_id = auth.uid()
  ));

CREATE POLICY "users_can_upload_own_documents"
  ON prior_notice_documents
  FOR INSERT
  WITH CHECK (prior_notice_id IN (
    SELECT id FROM prior_notices WHERE user_id = auth.uid()
  ));
