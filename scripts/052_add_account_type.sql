-- ============================================================================
-- Migration: Add Account Type to User Profiles
-- Purpose: Support role-based access (Importer, Supplier, QI)
-- ============================================================================

-- ============================================================================
-- Step 1: Add account_type column to user_profiles
-- ============================================================================
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'importer' 
CHECK (account_type IN ('importer', 'supplier', 'qi'));

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.account_type IS 
'User account type: importer (US food importer), supplier (foreign food supplier), qi (Qualified Individual/FSVP expert)';

-- ============================================================================
-- Step 2: Add QI-specific fields
-- ============================================================================

-- QI Profile Information
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_profile JSONB DEFAULT '{}';

COMMENT ON COLUMN public.user_profiles.qi_profile IS 
'QI profile data: credentials, certifications, specializations, bio, experience_years, etc.';

-- QI Certifications (array of certification names)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_certifications TEXT[] DEFAULT '{}';

-- QI Specializations (e.g., seafood, dairy, produce)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_specializations TEXT[] DEFAULT '{}';

-- QI Availability for hire
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_available_for_hire BOOLEAN DEFAULT FALSE;

-- QI Hourly Rate (for marketplace)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_hourly_rate DECIMAL(10,2);

-- QI Languages (important for document review)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_languages TEXT[] DEFAULT '{English}';

-- QI Former FDA indicator
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_former_fda BOOLEAN DEFAULT FALSE;

-- QI Years of Experience
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS qi_experience_years INTEGER DEFAULT 0;

-- ============================================================================
-- Step 3: Add Supplier-specific fields
-- ============================================================================

-- Supplier Company Info
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS supplier_company_name TEXT;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS supplier_country TEXT;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS supplier_fei TEXT; -- FDA Establishment Identifier

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS supplier_product_categories TEXT[] DEFAULT '{}';

-- ============================================================================
-- Step 4: Create QI Assignments Table
-- Links Importers with their assigned QIs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qi_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Importer who hired the QI
  importer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- QI who is assigned
  qi_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Assignment Details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'terminated')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Scope
  scope TEXT DEFAULT 'full' CHECK (scope IN ('full', 'limited', 'specific_suppliers')),
  supplier_ids UUID[] DEFAULT '{}', -- If scope is 'specific_suppliers'
  
  -- Contract/Agreement
  agreement_terms JSONB DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  monthly_retainer DECIMAL(10,2),
  
  -- Activity Tracking
  last_activity_date TIMESTAMPTZ,
  total_reviews_completed INTEGER DEFAULT 0,
  total_hours_logged DECIMAL(10,2) DEFAULT 0,
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique active assignment per importer-QI pair
  CONSTRAINT unique_active_assignment UNIQUE (importer_user_id, qi_user_id, status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qi_assignments_importer ON qi_assignments(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_qi_assignments_qi ON qi_assignments(qi_user_id);
CREATE INDEX IF NOT EXISTS idx_qi_assignments_status ON qi_assignments(status);

-- Enable RLS
ALTER TABLE public.qi_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Importers can see their assignments, QIs can see assignments to them
CREATE POLICY "Importers can view own QI assignments" ON qi_assignments
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "QIs can view assignments to them" ON qi_assignments
  FOR SELECT USING (auth.uid() = qi_user_id);

CREATE POLICY "Importers can create QI assignments" ON qi_assignments
  FOR INSERT WITH CHECK (auth.uid() = importer_user_id);

CREATE POLICY "Importers can update own QI assignments" ON qi_assignments
  FOR UPDATE USING (auth.uid() = importer_user_id);

CREATE POLICY "QIs can update assignments to them" ON qi_assignments
  FOR UPDATE USING (auth.uid() = qi_user_id);

-- ============================================================================
-- Step 5: Create QI Review Queue Table
-- Tracks items pending QI review/approval
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qi_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Assignment reference
  assignment_id UUID REFERENCES qi_assignments(id) ON DELETE CASCADE,
  
  -- Who needs review
  importer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qi_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What needs review
  review_type TEXT NOT NULL CHECK (review_type IN (
    'hazard_analysis',
    'supplier_evaluation', 
    'verification_plan',
    'corrective_action',
    'document_review',
    'annual_reassessment'
  )),
  
  -- Reference to the item being reviewed
  reference_id UUID NOT NULL, -- Can be hazard_analysis_id, supplier_id, etc.
  reference_table TEXT NOT NULL, -- e.g., 'fsvp_hazard_analyses', 'fsvp_suppliers'
  
  -- Review Details
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_revision')),
  
  -- QI Response
  qi_notes TEXT,
  qi_decision TEXT,
  qi_reviewed_at TIMESTAMPTZ,
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qi_review_queue_qi ON qi_review_queue(qi_user_id);
CREATE INDEX IF NOT EXISTS idx_qi_review_queue_importer ON qi_review_queue(importer_user_id);
CREATE INDEX IF NOT EXISTS idx_qi_review_queue_status ON qi_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_qi_review_queue_type ON qi_review_queue(review_type);

-- Enable RLS
ALTER TABLE public.qi_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "QIs can view their review queue" ON qi_review_queue
  FOR SELECT USING (auth.uid() = qi_user_id);

CREATE POLICY "Importers can view their review requests" ON qi_review_queue
  FOR SELECT USING (auth.uid() = importer_user_id);

CREATE POLICY "Importers can create review requests" ON qi_review_queue
  FOR INSERT WITH CHECK (auth.uid() = importer_user_id);

CREATE POLICY "QIs can update reviews assigned to them" ON qi_review_queue
  FOR UPDATE USING (auth.uid() = qi_user_id);

-- ============================================================================
-- Step 6: Create indexes for account_type queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_type ON user_profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_qi_available ON user_profiles(qi_available_for_hire) WHERE qi_available_for_hire = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_qi_former_fda ON user_profiles(qi_former_fda) WHERE qi_former_fda = TRUE;

-- ============================================================================
-- Step 7: Function to get available QIs (for marketplace)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_qis(
  p_specialization TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_former_fda_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  qi_profile JSONB,
  qi_certifications TEXT[],
  qi_specializations TEXT[],
  qi_hourly_rate DECIMAL,
  qi_languages TEXT[],
  qi_former_fda BOOLEAN,
  qi_experience_years INTEGER,
  active_clients INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id AS user_id,
    u.email,
    COALESCE(up.qi_profile->>'full_name', u.email) AS full_name,
    up.qi_profile,
    up.qi_certifications,
    up.qi_specializations,
    up.qi_hourly_rate,
    up.qi_languages,
    up.qi_former_fda,
    up.qi_experience_years,
    (SELECT COUNT(*)::INTEGER FROM qi_assignments qa WHERE qa.qi_user_id = up.id AND qa.status = 'active') AS active_clients
  FROM user_profiles up
  JOIN auth.users u ON u.id = up.id
  WHERE up.account_type = 'qi'
    AND up.qi_available_for_hire = TRUE
    AND (p_specialization IS NULL OR p_specialization = ANY(up.qi_specializations))
    AND (p_language IS NULL OR p_language = ANY(up.qi_languages))
    AND (p_former_fda_only = FALSE OR up.qi_former_fda = TRUE)
  ORDER BY 
    up.qi_former_fda DESC,  -- Former FDA first
    up.qi_experience_years DESC,
    up.qi_hourly_rate ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_available_qis TO authenticated;

-- ============================================================================
-- Step 8: Update trigger for updated_at
-- ============================================================================
CREATE TRIGGER update_qi_assignments_updated_at
  BEFORE UPDATE ON public.qi_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qi_review_queue_updated_at
  BEFORE UPDATE ON public.qi_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
