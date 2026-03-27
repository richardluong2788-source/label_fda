-- ============================================================================
-- FSVP Integration Migration
-- Foreign Supplier Verification Program (21 CFR Part 1, Subpart L)
-- Reference: §1.500-§1.514
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: fsvp_suppliers
-- Stores foreign supplier information for FSVP compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Supplier Identity
  supplier_name TEXT NOT NULL,
  supplier_country TEXT NOT NULL,
  supplier_address TEXT,
  supplier_fei TEXT,  -- FDA Establishment Identifier
  supplier_duns TEXT, -- D-U-N-S Number (9 digits)
  supplier_contact_name TEXT,
  supplier_contact_email TEXT,
  supplier_contact_phone TEXT,
  
  -- Product Information
  product_categories TEXT[] DEFAULT '{}', -- e.g., ['seafood', 'leafy_greens']
  primary_products TEXT[], -- List of products from this supplier
  
  -- FSVP Required Documentation (21 CFR 1.504-1.506)
  hazard_analysis JSONB DEFAULT '{}',           -- Documented hazard analysis
  supplier_evaluation JSONB DEFAULT '{}',       -- Evaluation of foreign supplier performance
  verification_activities JSONB DEFAULT '[]',   -- Audits, sampling, testing records
  corrective_actions JSONB DEFAULT '[]',        -- Corrective action records
  
  -- Status & Dates
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'conditionally_approved', 'suspended', 'removed')),
  approval_date TIMESTAMPTZ,
  last_verification_date TIMESTAMPTZ,
  next_verification_due TIMESTAMPTZ,
  
  -- SAHCODHA Risk Classification (Serious Adverse Health Consequences or Death)
  -- Per 21 CFR 1.506(d) - requires annual onsite audit
  is_sahcodha_risk BOOLEAN DEFAULT FALSE,
  sahcodha_hazards TEXT[] DEFAULT '{}',  -- List of SAHCODHA hazards identified
  sahcodha_assessment_date TIMESTAMPTZ,
  requires_annual_audit BOOLEAN DEFAULT FALSE,
  last_onsite_audit_date TIMESTAMPTZ,
  next_onsite_audit_due TIMESTAMPTZ,
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_fsvp_suppliers_importer ON fsvp_suppliers(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_suppliers_country ON fsvp_suppliers(supplier_country);
CREATE INDEX IF NOT EXISTS idx_fsvp_suppliers_status ON fsvp_suppliers(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_suppliers_verification_due ON fsvp_suppliers(next_verification_due);
CREATE INDEX IF NOT EXISTS idx_fsvp_suppliers_sahcodha ON fsvp_suppliers(is_sahcodha_risk) WHERE is_sahcodha_risk = TRUE;
CREATE INDEX IF NOT EXISTS idx_fsvp_suppliers_audit_due ON fsvp_suppliers(next_onsite_audit_due) WHERE requires_annual_audit = TRUE;

-- ============================================================================
-- Table: fsvp_verification_activities
-- Tracks individual verification activities for suppliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_verification_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES fsvp_suppliers(id) ON DELETE CASCADE,
  importer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'onsite_audit',           -- Physical inspection of supplier facility
    'third_party_audit',      -- Audit by accredited third party
    'sampling_testing',       -- Product sampling and testing
    'document_review',        -- Review of supplier's food safety records
    'annual_onsite_audit',    -- Required annual audit for SAHCODHA
    'corrective_action_followup'
  )),
  
  activity_date TIMESTAMPTZ NOT NULL,
  conducted_by TEXT NOT NULL,        -- Name/organization that conducted activity
  findings JSONB DEFAULT '{}',       -- Detailed findings
  result TEXT CHECK (result IN ('passed', 'passed_with_conditions', 'failed', 'pending_review')),
  
  -- Documentation
  documents JSONB DEFAULT '[]',      -- Array of {filename, url, uploaded_at}
  notes TEXT,
  
  -- Follow-up
  requires_followup BOOLEAN DEFAULT FALSE,
  followup_due_date TIMESTAMPTZ,
  followup_completed BOOLEAN DEFAULT FALSE,
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_fsvp_activities_supplier ON fsvp_verification_activities(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_activities_type ON fsvp_verification_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_fsvp_activities_date ON fsvp_verification_activities(activity_date DESC);

-- ============================================================================
-- Table: fsvp_hazard_analyses
-- Stores hazard analyses for imported products (21 CFR 1.504)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_hazard_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES fsvp_suppliers(id) ON DELETE CASCADE,
  importer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Product Info
  product_name TEXT NOT NULL,
  product_category TEXT,
  product_description TEXT,
  
  -- Hazard Analysis (per 21 CFR 1.504)
  known_hazards JSONB DEFAULT '[]',      -- Known or reasonably foreseeable hazards
  biological_hazards JSONB DEFAULT '[]', -- Pathogens, parasites, etc.
  chemical_hazards JSONB DEFAULT '[]',   -- Pesticides, allergens, additives
  physical_hazards JSONB DEFAULT '[]',   -- Foreign objects, glass, metal
  radiological_hazards JSONB DEFAULT '[]',
  
  -- SAHCODHA Assessment
  is_sahcodha_product BOOLEAN DEFAULT FALSE,
  sahcodha_justification TEXT,
  
  -- Control Measures
  control_measures JSONB DEFAULT '[]',   -- How hazards are controlled
  supplier_controls JSONB DEFAULT '{}',  -- Supplier's control procedures
  
  -- Analysis Details
  analysis_date TIMESTAMPTZ NOT NULL,
  analyzed_by TEXT NOT NULL,            -- Qualified Individual who conducted analysis
  qualified_individual_credentials TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
  superseded_by UUID REFERENCES fsvp_hazard_analyses(id),
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fsvp_hazard_supplier ON fsvp_hazard_analyses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_hazard_product ON fsvp_hazard_analyses(product_name);
CREATE INDEX IF NOT EXISTS idx_fsvp_hazard_sahcodha ON fsvp_hazard_analyses(is_sahcodha_product) WHERE is_sahcodha_product = TRUE;

-- ============================================================================
-- Create user_profiles table for FSVP importer data
-- This table stores FSVP-specific information for importers (21 CFR Part 1, Subpart L)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- DUNS Number (required for customs declaration, role "FSV")
  importer_duns TEXT,
  importer_duns_verified BOOLEAN DEFAULT FALSE,
  importer_duns_verified_at TIMESTAMPTZ,
  
  -- Qualified Individual (21 CFR 1.502)
  fsvp_qualified_individual TEXT,
  fsvp_qi_title TEXT,
  fsvp_qi_credentials JSONB DEFAULT '{}',
  fsvp_qi_training_records JSONB DEFAULT '[]',
  
  -- FSVP Program Status
  fsvp_program_active BOOLEAN DEFAULT FALSE,
  fsvp_program_established_date TIMESTAMPTZ,
  fsvp_last_dossier_export TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_duns ON user_profiles(importer_duns) WHERE importer_duns IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_fsvp_active ON user_profiles(fsvp_program_active) WHERE fsvp_program_active = TRUE;

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and modify their own profile
CREATE POLICY "user_profiles_select_own" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-update trigger
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Alter audit_reports: Link to FSVP suppliers
-- ============================================================================
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS fsvp_supplier_id UUID REFERENCES fsvp_suppliers(id);
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS fsvp_applicable BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS fsvp_compliance_status TEXT CHECK (fsvp_compliance_status IN ('compliant', 'non_compliant', 'needs_review', 'not_applicable'));
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS fsvp_violations JSONB DEFAULT '[]';

-- ============================================================================
-- Table: fsvp_dossier_exports
-- Tracks dossier exports for 24-hour compliance (21 CFR 1.510)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_dossier_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Export Details
  export_type TEXT NOT NULL CHECK (export_type IN ('full_program', 'supplier_specific', 'product_specific', 'fda_request')),
  supplier_ids UUID[] DEFAULT '{}',     -- Which suppliers included
  product_ids UUID[] DEFAULT '{}',      -- Which products included
  
  -- Generated Files
  pdf_url TEXT,
  json_backup_url TEXT,
  export_size_bytes BIGINT,
  
  -- Timing (for 24-hour compliance tracking)
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  generated_at TIMESTAMPTZ,
  generation_time_ms INTEGER,           -- Track how fast we generate
  
  -- FDA Request Tracking
  is_fda_request BOOLEAN DEFAULT FALSE,
  fda_request_date TIMESTAMPTZ,
  fda_request_reference TEXT,
  delivered_to_fda_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fsvp_dossier_user ON fsvp_dossier_exports(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_dossier_fda ON fsvp_dossier_exports(is_fda_request) WHERE is_fda_request = TRUE;

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE fsvp_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_verification_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_hazard_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_dossier_exports ENABLE ROW LEVEL SECURITY;

-- Users can only access their own FSVP data
CREATE POLICY "Users can view own suppliers" ON fsvp_suppliers
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can insert own suppliers" ON fsvp_suppliers
  FOR INSERT WITH CHECK (auth.uid() = importer_user_id);

CREATE POLICY "Users can update own suppliers" ON fsvp_suppliers
  FOR UPDATE USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can delete own suppliers" ON fsvp_suppliers
  FOR DELETE USING (auth.uid() = importer_user_id);

-- Verification activities
CREATE POLICY "Users can view own verification activities" ON fsvp_verification_activities
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can insert own verification activities" ON fsvp_verification_activities
  FOR INSERT WITH CHECK (auth.uid() = importer_user_id);

-- Hazard analyses
CREATE POLICY "Users can view own hazard analyses" ON fsvp_hazard_analyses
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can manage own hazard analyses" ON fsvp_hazard_analyses
  FOR ALL USING (auth.uid() = importer_user_id);

-- Dossier exports
CREATE POLICY "Users can view own dossier exports" ON fsvp_dossier_exports
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "Users can create own dossier exports" ON fsvp_dossier_exports
  FOR INSERT WITH CHECK (auth.uid() = importer_user_id);

-- Admin access to all FSVP data
CREATE POLICY "Admins can view all suppliers" ON fsvp_suppliers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all verification activities" ON fsvp_verification_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all hazard analyses" ON fsvp_hazard_analyses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all dossier exports" ON fsvp_dossier_exports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Function: Update supplier updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_fsvp_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fsvp_supplier_updated_at
  BEFORE UPDATE ON fsvp_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_fsvp_supplier_updated_at();

-- ============================================================================
-- Function: Auto-calculate next verification due date
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_fsvp_verification_due()
RETURNS TRIGGER AS $$
BEGIN
  -- For SAHCODHA products, verification due in 12 months
  IF NEW.requires_annual_audit = TRUE THEN
    NEW.next_onsite_audit_due = NEW.last_onsite_audit_date + INTERVAL '12 months';
  END IF;
  
  -- Standard verification due based on risk level
  IF NEW.is_sahcodha_risk = TRUE THEN
    NEW.next_verification_due = NEW.last_verification_date + INTERVAL '6 months';
  ELSE
    NEW.next_verification_due = NEW.last_verification_date + INTERVAL '12 months';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fsvp_verification_due
  BEFORE INSERT OR UPDATE OF last_verification_date, last_onsite_audit_date, requires_annual_audit, is_sahcodha_risk
  ON fsvp_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_fsvp_verification_due();

-- ============================================================================
-- Function: Get suppliers needing verification soon (for alerts)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_fsvp_suppliers_due_verification(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  supplier_country TEXT,
  is_sahcodha_risk BOOLEAN,
  next_verification_due TIMESTAMPTZ,
  next_onsite_audit_due TIMESTAMPTZ,
  days_until_due INTEGER,
  urgency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS supplier_id,
    s.supplier_name,
    s.supplier_country,
    s.is_sahcodha_risk,
    s.next_verification_due,
    s.next_onsite_audit_due,
    EXTRACT(DAY FROM (LEAST(
      COALESCE(s.next_verification_due, 'infinity'::timestamptz),
      COALESCE(s.next_onsite_audit_due, 'infinity'::timestamptz)
    ) - NOW()))::INTEGER AS days_until_due,
    CASE
      WHEN LEAST(
        COALESCE(s.next_verification_due, 'infinity'::timestamptz),
        COALESCE(s.next_onsite_audit_due, 'infinity'::timestamptz)
      ) < NOW() THEN 'overdue'
      WHEN LEAST(
        COALESCE(s.next_verification_due, 'infinity'::timestamptz),
        COALESCE(s.next_onsite_audit_due, 'infinity'::timestamptz)
      ) < NOW() + INTERVAL '7 days' THEN 'critical'
      WHEN LEAST(
        COALESCE(s.next_verification_due, 'infinity'::timestamptz),
        COALESCE(s.next_onsite_audit_due, 'infinity'::timestamptz)
      ) < NOW() + INTERVAL '30 days' THEN 'warning'
      ELSE 'normal'
    END AS urgency
  FROM fsvp_suppliers s
  WHERE s.importer_user_id = p_user_id
    AND s.status IN ('approved', 'conditionally_approved')
    AND (
      s.next_verification_due < NOW() + (p_days_ahead || ' days')::INTERVAL
      OR s.next_onsite_audit_due < NOW() + (p_days_ahead || ' days')::INTERVAL
    )
  ORDER BY 
    LEAST(
      COALESCE(s.next_verification_due, 'infinity'::timestamptz),
      COALESCE(s.next_onsite_audit_due, 'infinity'::timestamptz)
    ) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_fsvp_suppliers_due_verification TO authenticated;
