-- ============================================
-- VEXIM COMPLIANCE AI - FULL DATABASE MIGRATION
-- ============================================
-- Phien ban: 3.0 (Idempotent - an toan chay lai nhieu lan)
-- Hoat dong tot tren CA database moi VA database da co du lieu
-- 
-- Chien luoc:
--   1. CREATE TABLE IF NOT EXISTS: tao bang neu chua co
--   2. ALTER TABLE ADD COLUMN IF NOT EXISTS: them column moi vao bang da ton tai
--   3. DROP POLICY IF EXISTS + CREATE POLICY: tao lai policy
--   4. DROP TRIGGER IF EXISTS + CREATE TRIGGER: tao lai trigger
--   5. CREATE OR REPLACE FUNCTION: ghi de function
--   6. CREATE INDEX IF NOT EXISTS: bo qua neu da co
--   7. ON CONFLICT DO NOTHING: khong loi khi seed data trung
--
-- SAU KHI CHAY XONG:
--   1. Thay YOUR_ADMIN_USER_ID bang UUID that (cuoi file)
--   2. Import knowledge base qua /admin/knowledge/bulk-import
-- ============================================


-- ========== BUOC 1: ENABLE EXTENSIONS ==========
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ========== BUOC 2: HELPER FUNCTIONS ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ========== BUOC 2.5: BANG admin_users + FUNCTION is_admin (TRUOC CAC BANG KHAC) ==========
-- Phai tao TRUOC vi cac RLS policy cua bang khac su dung is_admin()
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'expert' CHECK (role IN ('expert', 'admin', 'superadmin')),
  can_review boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
CREATE POLICY "admin_users_select"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
CREATE POLICY "admin_users_insert"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT au.user_id FROM public.admin_users au
      WHERE au.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;
CREATE POLICY "admin_users_update"
  ON public.admin_users FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    auth.uid() IN (
      SELECT au.user_id FROM public.admin_users au
      WHERE au.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;
CREATE POLICY "admin_users_delete"
  ON public.admin_users FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT au.user_id FROM public.admin_users au
      WHERE au.role = 'superadmin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id_role 
  ON public.admin_users(user_id, role);

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = user_uuid AND role IN ('admin', 'superadmin', 'expert')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========== BUOC 3: BANG compliance_knowledge ==========
CREATE TABLE IF NOT EXISTS public.compliance_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding vector(1536),
  section text,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.compliance_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_knowledge_select" ON public.compliance_knowledge;
CREATE POLICY "compliance_knowledge_select"
  ON public.compliance_knowledge FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "compliance_knowledge_insert" ON public.compliance_knowledge;
CREATE POLICY "compliance_knowledge_insert"
  ON public.compliance_knowledge FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "compliance_knowledge_update" ON public.compliance_knowledge;
CREATE POLICY "compliance_knowledge_update"
  ON public.compliance_knowledge FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "compliance_knowledge_delete" ON public.compliance_knowledge;
CREATE POLICY "compliance_knowledge_delete"
  ON public.compliance_knowledge FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_embedding 
  ON public.compliance_knowledge 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_source 
  ON public.compliance_knowledge(source);
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_section 
  ON public.compliance_knowledge(section);
CREATE INDEX IF NOT EXISTS compliance_knowledge_content_fts_idx 
  ON public.compliance_knowledge 
  USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_document_type
  ON public.compliance_knowledge 
  USING btree ((metadata->>'document_type'));
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_problematic_keywords
  ON public.compliance_knowledge 
  USING gin ((metadata->'problematic_keywords'));
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_is_violation_example
  ON public.compliance_knowledge 
  USING btree ((metadata->>'is_example_of_violation'));
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_industry
  ON public.compliance_knowledge 
  USING btree ((metadata->>'industry'));

DROP TRIGGER IF EXISTS update_compliance_knowledge_updated_at ON public.compliance_knowledge;
CREATE TRIGGER update_compliance_knowledge_updated_at
  BEFORE UPDATE ON public.compliance_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ========== BUOC 4: (Da chuyen len BUOC 2.5 - admin_users + is_admin) ==========


-- ========== BUOC 5: BANG audit_reports (CREATE + ALTER) ==========
-- Tao bang voi cac columns co ban truoc
CREATE TABLE IF NOT EXISTS public.audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label_image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Them TAT CA columns con thieu bang ALTER TABLE ADD COLUMN IF NOT EXISTS
-- Nay hoat dong cho ca database moi (vua tao bang) va database cu (bang da ton tai)

-- Label image fields
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS label_images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS label_image_urls text[] DEFAULT '{}';

-- Status fields
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS overall_result text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS current_step text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS file_name text;

-- AI Analysis results
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS violations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS findings jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS geometry_violations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS contrast_violations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS claim_violations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS multilanguage_issues jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS required_disclaimers jsonb DEFAULT '[]'::jsonb;

-- Extracted data
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS extracted_data jsonb DEFAULT '{}';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT NULL;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS vision_extracted_data jsonb DEFAULT '{}';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS vision_extraction_status text DEFAULT 'none';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS original_text text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS rag_context jsonb DEFAULT '{}';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS knowledge_sources jsonb DEFAULT '[]';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS suggestions jsonb DEFAULT '[]';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS citations jsonb DEFAULT '[]';

-- Vision extraction fields (011_vision)
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS nutrition_facts jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS ingredient_list text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS allergen_declaration text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS health_claims jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS detected_languages jsonb DEFAULT '["English"]'::jsonb;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS brand_name text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS net_quantity text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS ocr_confidence numeric;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS vision_data_verified boolean DEFAULT false;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS vision_data_verified_by uuid;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS vision_data_verified_at timestamptz;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS analysis_phase text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS double_pass_needed boolean DEFAULT false;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS error_message text;

-- Product category + dimensions (004 + 009)
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS product_category text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS product_sub_category text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS product_type text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS physical_width_cm numeric;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS physical_height_cm numeric;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS pixel_width integer;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS pixel_height integer;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS pixels_per_inch numeric;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS pdp_area_square_inches numeric;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS has_foreign_language boolean DEFAULT false;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS foreign_language text;

-- Risk scoring (014)
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS overall_compliance text DEFAULT 'unknown';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS overall_risk_score numeric(4,2);
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS projected_risk_score numeric(4,2);
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS risk_assessment text;

-- Expert review (002 + 009)
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS needs_expert_review boolean DEFAULT false;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS citation_count integer DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS expert_review_status text DEFAULT 'pending';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS expert_review_notes text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS expert_reviewed_by uuid;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS expert_reviewed_at timestamptz;

-- Version control (003)
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS report_version integer DEFAULT 1;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS parent_report_id uuid;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS is_latest_version boolean DEFAULT true;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS is_latest boolean DEFAULT true;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS version_notes text;

-- Analysis model info
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS analysis_model text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS analysis_duration_ms integer;

-- AI cost tracking (011_vision + add-commercial)
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS ai_tokens_used integer DEFAULT 0;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS ai_cost_usd numeric(10,4) DEFAULT 0.0000;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS commercial_summary text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS expert_tips jsonb DEFAULT '[]'::jsonb;

-- Payment fields (015)
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS payment_status varchar(50) DEFAULT 'free_preview';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS payment_amount decimal(10,2);
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS payment_currency text DEFAULT 'USD';
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS payment_method varchar(50);
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS payment_id varchar(255);
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS report_unlocked boolean DEFAULT false;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS unlock_token varchar(255);
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS commercial_report_url text;
ALTER TABLE public.audit_reports ADD COLUMN IF NOT EXISTS commercial_report_generated_at timestamptz;

-- RLS
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_reports_select" ON public.audit_reports;
CREATE POLICY "audit_reports_select"
  ON public.audit_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "audit_reports_insert" ON public.audit_reports;
CREATE POLICY "audit_reports_insert"
  ON public.audit_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "audit_reports_update" ON public.audit_reports;
CREATE POLICY "audit_reports_update"
  ON public.audit_reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "audit_reports_delete" ON public.audit_reports;
CREATE POLICY "audit_reports_delete"
  ON public.audit_reports FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Indexes (chi tren columns da chac chan ton tai sau ALTER TABLE)
CREATE INDEX IF NOT EXISTS idx_audit_reports_user_id ON public.audit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_status ON public.audit_reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_created_at ON public.audit_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_reports_latest ON public.audit_reports(is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_audit_reports_parent ON public.audit_reports(parent_report_id) WHERE parent_report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_reports_needs_review ON public.audit_reports(needs_expert_review) WHERE needs_expert_review = true;
CREATE INDEX IF NOT EXISTS idx_audit_reports_analysis_phase ON public.audit_reports(analysis_phase);
CREATE INDEX IF NOT EXISTS idx_audit_reports_double_pass ON public.audit_reports(double_pass_needed) WHERE double_pass_needed = true;
CREATE INDEX IF NOT EXISTS idx_audit_reports_vision_verified ON public.audit_reports(vision_data_verified);
CREATE INDEX IF NOT EXISTS idx_audit_reports_form_data ON public.audit_reports USING gin(form_data);
CREATE INDEX IF NOT EXISTS idx_audit_reports_label_images ON public.audit_reports USING gin(label_images);
CREATE INDEX IF NOT EXISTS idx_audit_reports_payment_status ON public.audit_reports(payment_status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_unlock_token ON public.audit_reports(unlock_token);
CREATE INDEX IF NOT EXISTS idx_audit_reports_ai_cost ON public.audit_reports(ai_cost_usd);
CREATE INDEX IF NOT EXISTS idx_audit_reports_tokens ON public.audit_reports(ai_tokens_used);

DROP TRIGGER IF EXISTS update_audit_reports_updated_at ON public.audit_reports;
CREATE TRIGGER update_audit_reports_updated_at
  BEFORE UPDATE ON public.audit_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ========== BUOC 6: BANG label_versions + comparison_sessions ==========
CREATE TABLE IF NOT EXISTS public.label_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id uuid NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label_image_url text NOT NULL,
  status text NOT NULL,
  overall_result text,
  findings jsonb DEFAULT '[]'::jsonb,
  geometry_violations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  version_notes text,
  changes_summary jsonb DEFAULT '{}'::jsonb,
  
  UNIQUE(original_report_id, version_number)
);

ALTER TABLE public.label_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own label versions" ON public.label_versions;
CREATE POLICY "Users can view own label versions"
  ON public.label_versions FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.audit_reports
      WHERE audit_reports.id = label_versions.original_report_id
      AND audit_reports.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create label versions" ON public.label_versions;
CREATE POLICY "Users can create label versions"
  ON public.label_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_reports
      WHERE audit_reports.id = label_versions.original_report_id
      AND audit_reports.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all label versions" ON public.label_versions;
CREATE POLICY "Admins can view all label versions"
  ON public.label_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_label_versions_original_report ON public.label_versions(original_report_id);
CREATE INDEX IF NOT EXISTS idx_label_versions_created_at ON public.label_versions(created_at DESC);

-- Comparison sessions
CREATE TABLE IF NOT EXISTS public.comparison_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_report_id uuid NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  version_a_id uuid NOT NULL REFERENCES public.label_versions(id) ON DELETE CASCADE,
  version_b_id uuid NOT NULL REFERENCES public.label_versions(id) ON DELETE CASCADE,
  compared_by uuid REFERENCES auth.users(id),
  comparison_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own comparisons" ON public.comparison_sessions;
CREATE POLICY "Users can view own comparisons"
  ON public.comparison_sessions FOR SELECT
  USING (compared_by = auth.uid());

DROP POLICY IF EXISTS "Users can create comparisons" ON public.comparison_sessions;
CREATE POLICY "Users can create comparisons"
  ON public.comparison_sessions FOR INSERT
  WITH CHECK (compared_by = auth.uid());

-- Trigger: auto create version on label resubmission
CREATE OR REPLACE FUNCTION public.create_label_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.label_image_url IS DISTINCT FROM NEW.label_image_url THEN
    INSERT INTO public.label_versions (
      original_report_id, version_number, label_image_url,
      status, overall_result, findings, geometry_violations,
      created_by, version_notes
    ) VALUES (
      OLD.id, OLD.version_number, OLD.label_image_url,
      OLD.status, OLD.overall_result, OLD.findings,
      COALESCE(OLD.geometry_violations, '[]'::jsonb),
      OLD.user_id, 'Auto-saved version before resubmission'
    );
    NEW.version_number := OLD.version_number + 1;
    NEW.is_latest_version := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_label_version ON public.audit_reports;
CREATE TRIGGER auto_create_label_version
  BEFORE UPDATE ON public.audit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.create_label_version();


-- ========== BUOC 7: BANG claims_blacklist ==========
CREATE TABLE IF NOT EXISTS public.claims_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL UNIQUE,
  category varchar(50) NOT NULL CHECK (category IN ('prohibited', 'restricted', 'drug_like', 'structure_function')),
  severity varchar(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  regulation text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.claims_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_blacklist_select_all" ON public.claims_blacklist;
CREATE POLICY "claims_blacklist_select_all" ON public.claims_blacklist
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "claims_blacklist_admin_all" ON public.claims_blacklist;
CREATE POLICY "claims_blacklist_admin_all" ON public.claims_blacklist
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_claims_blacklist_term ON public.claims_blacklist(term);
CREATE INDEX IF NOT EXISTS idx_claims_blacklist_category ON public.claims_blacklist(category);

-- Seed default prohibited terms
INSERT INTO public.claims_blacklist (term, category, severity, regulation, description) VALUES
('cure', 'prohibited', 'critical', '21 CFR 101.93', 'Disease cure claim - absolutely prohibited'),
('treat', 'prohibited', 'critical', '21 CFR 101.93', 'Disease treatment claim - absolutely prohibited'),
('prevent disease', 'prohibited', 'critical', '21 CFR 101.93', 'Disease prevention claim - requires FDA approval'),
('diagnose', 'prohibited', 'critical', 'FD&C Act 201(g)', 'Diagnostic claim - classifies as drug'),
('cancer', 'prohibited', 'critical', '21 CFR 101.93', 'Cancer claim - absolutely prohibited'),
('diabetes', 'prohibited', 'critical', '21 CFR 101.93', 'Diabetes claim - absolutely prohibited'),
('heart disease', 'prohibited', 'critical', '21 CFR 101.93', 'Heart disease claim - requires FDA approval'),
('covid', 'prohibited', 'critical', 'FDA Warning Letters', 'COVID-19 claim - prohibited without approval'),
('drug', 'drug_like', 'critical', 'FD&C Act 201(g)', 'Drug terminology causes product to be classified as drug'),
('medicine', 'drug_like', 'critical', 'FD&C Act 201(g)', 'Medicine terminology causes drug classification'),
('therapeutic', 'drug_like', 'critical', 'FD&C Act 201(g)', 'Therapeutic claim indicates drug use'),
('reduce risk of', 'restricted', 'warning', '21 CFR 101.14', 'Health claim requiring FDA approval'),
('lower cholesterol', 'restricted', 'warning', '21 CFR 101.14', 'Health claim requiring substantiation'),
('boost immune system', 'restricted', 'warning', '21 CFR 101.14', 'Immune claim requiring approval'),
('supports', 'structure_function', 'info', '21 CFR 101.93(f)', 'Structure/function claim - requires disclaimer'),
('maintains', 'structure_function', 'info', '21 CFR 101.93(f)', 'Structure/function claim - requires disclaimer'),
('promotes', 'structure_function', 'info', '21 CFR 101.93(f)', 'Structure/function claim - requires disclaimer')
ON CONFLICT (term) DO NOTHING;


-- ========== BUOC 8: BANG product_categories ==========
CREATE TABLE IF NOT EXISTS public.product_categories (
  id varchar(100) PRIMARY KEY,
  name text NOT NULL,
  parent_id varchar(100) REFERENCES public.product_categories(id),
  regulations text[],
  mandatory_fields text[],
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_categories_select_all" ON public.product_categories;
CREATE POLICY "product_categories_select_all" ON public.product_categories
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.product_categories (id, name, regulations, mandatory_fields, description) VALUES
('conventional-foods', 'Conventional Foods', ARRAY['21 CFR 101', '21 CFR 102'], ARRAY['Product name', 'Net quantity', 'Ingredient list', 'Nutrition Facts', 'Allergen declaration'], 'Regular food products'),
('dietary-supplements', 'Dietary Supplements', ARRAY['21 CFR 101.36', 'DSHEA'], ARRAY['Supplement Facts', 'Disclaimer', 'Serving size'], 'Vitamins, minerals, herbs, supplements'),
('alcoholic-beverages', 'Alcoholic Beverages', ARRAY['27 CFR Part 4', '27 CFR Part 5'], ARRAY['Alcohol content', 'Health warning', 'Sulfite declaration'], 'Wine, beer, spirits'),
('cosmetics', 'Cosmetics', ARRAY['21 CFR 701', 'FD&C Act'], ARRAY['Product identity', 'Ingredient declaration', 'Warning statements'], 'Skincare, makeup, personal care')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_categories (id, name, parent_id, regulations, mandatory_fields) VALUES
('seafood', 'Seafood', 'conventional-foods', ARRAY['21 CFR 123'], ARRAY['Country of origin', 'Fish species']),
('dried-foods', 'Dried Foods', 'conventional-foods', ARRAY['21 CFR 101.9'], ARRAY['Storage instructions']),
('beverages', 'Beverages', 'conventional-foods', ARRAY['21 CFR 101.30'], ARRAY['Serving size per container']),
('vitamins', 'Vitamins', 'dietary-supplements', ARRAY['21 CFR 101.36(b)'], ARRAY['% Daily Value', 'Dosage form']),
('herbal', 'Herbal Products', 'dietary-supplements', ARRAY['21 CFR 101.36'], ARRAY['Plant part used']),
('wine', 'Wine', 'alcoholic-beverages', ARRAY['27 CFR Part 4'], ARRAY['Vintage year']),
('skincare', 'Skincare', 'cosmetics', ARRAY['21 CFR 701.3'], ARRAY['Skin type indication'])
ON CONFLICT (id) DO NOTHING;


-- ========== BUOC 9: BANG warning_letters ==========
CREATE TABLE IF NOT EXISTS public.warning_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id text UNIQUE,
  company_name text,
  subject text,
  issuing_office text,
  issue_date date,
  letter_url text,
  response_date date,
  close_out_date date,
  status text DEFAULT 'active',
  content text,
  violations jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.warning_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warning_letters_select" ON public.warning_letters;
CREATE POLICY "warning_letters_select"
  ON public.warning_letters FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "warning_letters_admin_insert" ON public.warning_letters;
CREATE POLICY "warning_letters_admin_insert"
  ON public.warning_letters FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "warning_letters_admin_update" ON public.warning_letters;
CREATE POLICY "warning_letters_admin_update"
  ON public.warning_letters FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "warning_letters_admin_delete" ON public.warning_letters;
CREATE POLICY "warning_letters_admin_delete"
  ON public.warning_letters FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_warning_letters_company ON public.warning_letters(company_name);
CREATE INDEX IF NOT EXISTS idx_warning_letters_date ON public.warning_letters(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_warning_letters_status ON public.warning_letters(status);

DROP TRIGGER IF EXISTS update_warning_letters_updated_at ON public.warning_letters;
CREATE TRIGGER update_warning_letters_updated_at
  BEFORE UPDATE ON public.warning_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ========== BUOC 10: BANG pending_warning_letters ==========
-- Schema tu 013 - day du cho FDA pipeline
CREATE TABLE IF NOT EXISTS public.pending_warning_letters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_id text NOT NULL,
  company_name text NOT NULL,
  subject text,
  issue_date date NOT NULL,
  letter_url text,
  issuing_office text,
  status text NOT NULL DEFAULT 'pending',
  import_error text,
  imported_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Them cac columns moi (tu 013) neu chua co
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS extracted_content text;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS content_length integer DEFAULT 0;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS fetch_method text DEFAULT 'auto_cron';
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now();
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS fetch_error text;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS import_result jsonb;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS violations_count integer DEFAULT 0;
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- Rename letter_url to fda_url if needed (keep both for compatibility)
ALTER TABLE public.pending_warning_letters ADD COLUMN IF NOT EXISTS fda_url text;
-- Sync fda_url from letter_url for existing rows
DO $$
BEGIN
  UPDATE public.pending_warning_letters SET fda_url = letter_url WHERE fda_url IS NULL AND letter_url IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_pending_letter_id'
  ) THEN
    ALTER TABLE public.pending_warning_letters ADD CONSTRAINT unique_pending_letter_id UNIQUE (letter_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.pending_warning_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_letters_select" ON public.pending_warning_letters;
DROP POLICY IF EXISTS "pending_letters_insert" ON public.pending_warning_letters;
DROP POLICY IF EXISTS "pending_letters_update" ON public.pending_warning_letters;
DROP POLICY IF EXISTS "pending_letters_delete" ON public.pending_warning_letters;
DROP POLICY IF EXISTS "Service role full access pending_warning_letters" ON public.pending_warning_letters;
DROP POLICY IF EXISTS "Admins can view pending_warning_letters" ON public.pending_warning_letters;
DROP POLICY IF EXISTS "Admins can update pending_warning_letters" ON public.pending_warning_letters;

CREATE POLICY "pending_letters_select"
  ON public.pending_warning_letters FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "pending_letters_insert"
  ON public.pending_warning_letters FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "pending_letters_update"
  ON public.pending_warning_letters FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "pending_letters_delete"
  ON public.pending_warning_letters FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Service role needs full access for cron jobs
CREATE POLICY "Service role full access pending_warning_letters"
  ON public.pending_warning_letters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pending_wl_status ON public.pending_warning_letters(status);
CREATE INDEX IF NOT EXISTS idx_pending_wl_issue_date ON public.pending_warning_letters(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_pending_wl_fetched_at ON public.pending_warning_letters(fetched_at DESC);

CREATE OR REPLACE FUNCTION public.update_pending_wl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pending_wl_updated_at ON public.pending_warning_letters;
CREATE TRIGGER trigger_pending_wl_updated_at
  BEFORE UPDATE ON public.pending_warning_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pending_wl_updated_at();

GRANT ALL ON public.pending_warning_letters TO service_role;


-- ========== BUOC 11: BANG fda_fetch_log ==========
CREATE TABLE IF NOT EXISTS public.fda_fetch_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz DEFAULT now(),
  letters_found integer DEFAULT 0,
  letters_new integer DEFAULT 0,
  letters_skipped integer DEFAULT 0,
  letters_failed integer DEFAULT 0,
  fetch_source text,
  duration_ms integer,
  error text,
  details jsonb
);

ALTER TABLE public.fda_fetch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access fda_fetch_log" ON public.fda_fetch_log;
CREATE POLICY "Service role full access fda_fetch_log"
  ON public.fda_fetch_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view fda_fetch_log" ON public.fda_fetch_log;
CREATE POLICY "Admins can view fda_fetch_log"
  ON public.fda_fetch_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fda_fetch_log_run_at ON public.fda_fetch_log(run_at DESC);

GRANT ALL ON public.fda_fetch_log TO service_role;


-- ========== BUOC 12: BANG warning_letter_import_logs ==========
CREATE TABLE IF NOT EXISTS public.warning_letter_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text,
  total_fetched integer DEFAULT 0,
  total_new integer DEFAULT 0,
  total_skipped integer DEFAULT 0,
  total_errors integer DEFAULT 0,
  status text DEFAULT 'running',
  error_details jsonb DEFAULT '[]',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.warning_letter_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_logs_select" ON public.warning_letter_import_logs;
CREATE POLICY "import_logs_select"
  ON public.warning_letter_import_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "import_logs_insert" ON public.warning_letter_import_logs;
CREATE POLICY "import_logs_insert"
  ON public.warning_letter_import_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));


-- ========== BUOC 13: BANG violation_user_feedback ==========
-- Ho tro CA schema cu (feedback_type/violation_index) VA schema moi (user_action/violation_id)
CREATE TABLE IF NOT EXISTS public.violation_user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Them columns tu schema cu (co the da ton tai)
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS audit_report_id uuid;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS violation_index integer;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS feedback_type text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS original_violation jsonb;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS modified_violation jsonb;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS user_notes text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Them columns tu schema moi (014)
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS report_id uuid;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS violation_id text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS violation_category text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS violation_severity text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS regulation_reference text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS user_action text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS time_to_action_ms bigint;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS product_category text;
ALTER TABLE public.violation_user_feedback ADD COLUMN IF NOT EXISTS industry text;

ALTER TABLE public.violation_user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "violation_feedback_select" ON public.violation_user_feedback;
CREATE POLICY "violation_feedback_select"
  ON public.violation_user_feedback FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "violation_feedback_insert" ON public.violation_user_feedback;
CREATE POLICY "violation_feedback_insert"
  ON public.violation_user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "violation_feedback_update" ON public.violation_user_feedback;
CREATE POLICY "violation_feedback_update"
  ON public.violation_user_feedback FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "violation_feedback_delete" ON public.violation_user_feedback;
CREATE POLICY "violation_feedback_delete"
  ON public.violation_user_feedback FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_violation_feedback_category ON public.violation_user_feedback(violation_category);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_regulation ON public.violation_user_feedback(regulation_reference);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_action ON public.violation_user_feedback(user_action);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_product_category ON public.violation_user_feedback(product_category);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_industry ON public.violation_user_feedback(industry);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_created_at ON public.violation_user_feedback(created_at);


-- ========== BUOC 14: BANG user_behavior_logs ==========
CREATE TABLE IF NOT EXISTS public.user_behavior_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_behavior_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "behavior_logs_insert" ON public.user_behavior_logs;
CREATE POLICY "behavior_logs_insert"
  ON public.user_behavior_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "behavior_logs_select_admin" ON public.user_behavior_logs;
CREATE POLICY "behavior_logs_select_admin"
  ON public.user_behavior_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_behavior_logs_user ON public.user_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_action ON public.user_behavior_logs(action);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_created ON public.user_behavior_logs(created_at DESC);


-- ========== BUOC 15: VECTOR SEARCH FUNCTIONS ==========

-- Function 1: Basic vector search (dung trong embedding-utils.ts + search/route.ts)
DROP FUNCTION IF EXISTS public.match_compliance_knowledge(vector(1536), float, int);
CREATE OR REPLACE FUNCTION public.match_compliance_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.content,
    (1 - (ck.embedding <=> query_embedding))::float AS similarity,
    ck.metadata
  FROM public.compliance_knowledge ck
  WHERE 1 - (ck.embedding <=> query_embedding) > match_threshold
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function 2: Deduplicated vector search (dung trong embedding-utils.ts)
DROP FUNCTION IF EXISTS public.match_compliance_knowledge_deduplicated(vector(1536), float, int);
CREATE OR REPLACE FUNCTION public.match_compliance_knowledge_deduplicated(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb,
  section_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sub.id,
    sub.content,
    sub.similarity,
    sub.metadata,
    sub.section_name
  FROM (
    SELECT DISTINCT ON (ck.metadata->>'section')
      ck.id,
      ck.content,
      (1 - (ck.embedding <=> query_embedding))::float AS similarity,
      ck.metadata,
      (ck.metadata->>'section')::text as section_name
    FROM public.compliance_knowledge ck
    WHERE 1 - (ck.embedding <=> query_embedding) > match_threshold
    ORDER BY (ck.metadata->>'section'), (ck.embedding <=> query_embedding) ASC
  ) sub
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$$;

-- Function 3: Vector search by document type (dung trong embedding-utils.ts)
DROP FUNCTION IF EXISTS public.match_compliance_knowledge_by_type(vector(1536), text, float, int);
CREATE OR REPLACE FUNCTION public.match_compliance_knowledge_by_type(
  query_embedding vector(1536),
  doc_type text DEFAULT 'FDA Regulation',
  match_threshold float DEFAULT 0.35,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb,
  section_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sub.id,
    sub.content,
    sub.similarity,
    sub.metadata,
    sub.section_name
  FROM (
    SELECT DISTINCT ON (COALESCE(ck.metadata->>'section', ck.metadata->>'letter_id', ck.id::text))
      ck.id,
      ck.content,
      (1 - (ck.embedding <=> query_embedding))::float AS similarity,
      ck.metadata,
      COALESCE(ck.metadata->>'section', ck.metadata->>'letter_id', 'N/A')::text as section_name
    FROM public.compliance_knowledge ck
    WHERE 1 - (ck.embedding <=> query_embedding) > match_threshold
      AND ck.metadata->>'document_type' = doc_type
    ORDER BY COALESCE(ck.metadata->>'section', ck.metadata->>'letter_id', ck.id::text), 
             (ck.embedding <=> query_embedding) ASC
  ) sub
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$$;

-- Function 4: Legacy match_knowledge (backward compatible)
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_source text DEFAULT NULL,
  filter_section text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  section text,
  source text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.content,
    ck.metadata,
    ck.section,
    ck.source,
    1 - (ck.embedding <=> query_embedding) as similarity
  FROM public.compliance_knowledge ck
  WHERE 
    1 - (ck.embedding <=> query_embedding) > match_threshold
    AND (filter_source IS NULL OR ck.source = filter_source)
    AND (filter_section IS NULL OR ck.section = filter_section)
  ORDER BY ck.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_compliance_knowledge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_compliance_knowledge_deduplicated TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_compliance_knowledge_by_type TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge TO anon, authenticated;


-- ========== BUOC 16: VIEW warning_letter_violations ==========
CREATE OR REPLACE VIEW public.warning_letter_violations AS
SELECT 
  id,
  content,
  metadata->>'document_type' as document_type,
  metadata->>'letter_id' as letter_id,
  metadata->>'issue_date' as issue_date,
  metadata->>'company_name' as company_name,
  metadata->>'violation_type' as violation_type,
  metadata->>'problematic_claim' as problematic_claim,
  metadata->>'why_problematic' as why_problematic,
  metadata->>'correction_required' as correction_required,
  metadata->'problematic_keywords' as keywords,
  metadata->>'regulation_violated' as regulation_violated,
  metadata->>'industry' as industry,
  metadata->>'severity' as severity,
  metadata->>'product_category' as product_category,
  created_at
FROM public.compliance_knowledge
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND (metadata->>'is_example_of_violation')::boolean = true;

GRANT SELECT ON public.warning_letter_violations TO anon, authenticated;


-- ========== BUOC 17: VIEW expert_dashboard_stats ==========
CREATE OR REPLACE VIEW public.expert_dashboard_stats AS
SELECT
  count(*) FILTER (WHERE status = 'ai_completed') as pending_review,
  count(*) FILTER (WHERE status = 'verified') as verified_today,
  count(*) FILTER (WHERE needs_expert_review = true) as needs_attention,
  count(*) FILTER (WHERE status = 'rejected') as rejected
FROM public.audit_reports
WHERE created_at >= current_date;

GRANT SELECT ON public.expert_dashboard_stats TO authenticated;


-- ========== BUOC 18: STORAGE BUCKETS ==========

-- Bucket 1: label-images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'label-images', 
  'label-images', 
  true, 
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "label_images_select" ON storage.objects;
CREATE POLICY "label_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'label-images');

DROP POLICY IF EXISTS "label_images_insert" ON storage.objects;
CREATE POLICY "label_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'label-images');

DROP POLICY IF EXISTS "label_images_update" ON storage.objects;
CREATE POLICY "label_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'label-images');

DROP POLICY IF EXISTS "label_images_delete" ON storage.objects;
CREATE POLICY "label_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'label-images');

-- Bulk-imports admin-only policies
DROP POLICY IF EXISTS "Only admins can upload to bulk-imports" ON storage.objects;
CREATE POLICY "Only admins can upload to bulk-imports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'label-images' AND
    (storage.foldername(name))[1] = 'bulk-imports' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Only admins can read bulk-imports" ON storage.objects;
CREATE POLICY "Only admins can read bulk-imports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'label-images' AND
    (storage.foldername(name))[1] = 'bulk-imports' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Only admins can delete from bulk-imports" ON storage.objects;
CREATE POLICY "Only admins can delete from bulk-imports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'label-images' AND
    (storage.foldername(name))[1] = 'bulk-imports' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Bucket 2: bulk-import-temp (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bulk-import-temp', 
  'bulk-import-temp', 
  false, 
  52428800,
  ARRAY['application/json', 'text/plain', 'text/csv', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "bulk_import_select" ON storage.objects;
CREATE POLICY "bulk_import_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'bulk-import-temp' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "bulk_import_insert" ON storage.objects;
CREATE POLICY "bulk_import_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bulk-import-temp' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "bulk_import_delete" ON storage.objects;
CREATE POLICY "bulk_import_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bulk-import-temp' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ========== BUOC 19: TABLE COMMENTS ==========
COMMENT ON TABLE public.compliance_knowledge IS 'FDA regulations and Warning Letters stored as vector embeddings for RAG search';
COMMENT ON TABLE public.admin_users IS 'Admin/expert user roles for review and management';
COMMENT ON TABLE public.audit_reports IS 'FDA compliance audit reports with multi-image support, AI analysis, vision extraction, risk scoring, and payment';
COMMENT ON TABLE public.label_versions IS 'Stores historical versions of labels for comparison';
COMMENT ON TABLE public.comparison_sessions IS 'Tracks side-by-side label comparisons';
COMMENT ON TABLE public.claims_blacklist IS 'Database of prohibited and restricted claim terminology';
COMMENT ON TABLE public.product_categories IS 'Hierarchical product categorization for targeted compliance';
COMMENT ON TABLE public.warning_letters IS 'FDA Warning Letters with violation data';
COMMENT ON TABLE public.pending_warning_letters IS 'Semi-automated pipeline: fetched FDA Warning Letters pending admin review';
COMMENT ON TABLE public.fda_fetch_log IS 'Cron job run logs for FDA Warning Letter fetcher';
COMMENT ON TABLE public.violation_user_feedback IS 'Tracks user actions on violations to build enforcement intelligence dataset';
COMMENT ON TABLE public.user_behavior_logs IS 'User behavior tracking for analytics';


-- ========== BUOC 19a: MIGRATION 019 - FDA RECALLS PIPELINE ==========
-- Them bang pending_recalls + fda_recall_fetch_log cho FDA Enforcement Reports
-- tu openFDA API (food/drug/cosmetic/device enforcement)

-- 19a-1. Bang pending_recalls: staging area truoc khi import vao KB
CREATE TABLE IF NOT EXISTS public.pending_recalls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- openFDA fields
  recall_number       TEXT NOT NULL,
  product_description TEXT NOT NULL,
  recalling_firm      TEXT NOT NULL,
  reason_for_recall   TEXT NOT NULL,
  recall_initiation_date DATE,
  termination_date    DATE,
  recall_type         TEXT,
  voluntary_mandated  TEXT,

  -- Phan loai
  classification      TEXT,
  product_type        TEXT NOT NULL,
  product_quantity    TEXT,
  distribution_pattern TEXT,
  state               TEXT,
  country             TEXT DEFAULT 'US',
  openfda_url         TEXT,

  -- Noi dung da extract de embedding
  extracted_content   TEXT,
  content_length      INT GENERATED ALWAYS AS (COALESCE(LENGTH(extracted_content), 0)) STORED,

  -- Pipeline status
  status              TEXT NOT NULL DEFAULT 'pending_review'
                        CHECK (status IN ('pending_review','approved','processing','imported','rejected','failed')),
  fetch_method        TEXT DEFAULT 'openfda_api',
  fetch_error         TEXT,

  -- Review
  review_notes        TEXT,
  reviewed_at         TIMESTAMPTZ,

  -- Import result
  violations_count    INT DEFAULT 0,
  import_result       JSONB,
  imported_at         TIMESTAMPTZ,

  -- Timestamps
  fetched_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint de dedup theo recall_number + product_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_recalls_recall_number
  ON public.pending_recalls (recall_number, product_type);

-- Index cho queries pho bien
CREATE INDEX IF NOT EXISTS idx_pending_recalls_status
  ON public.pending_recalls (status);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_product_type
  ON public.pending_recalls (product_type);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_classification
  ON public.pending_recalls (classification);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_created_at
  ON public.pending_recalls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_recalls_initiation_date
  ON public.pending_recalls (recall_initiation_date DESC);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_pending_recalls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pending_recalls_updated_at ON public.pending_recalls;
CREATE TRIGGER trg_pending_recalls_updated_at
  BEFORE UPDATE ON public.pending_recalls
  FOR EACH ROW EXECUTE FUNCTION public.update_pending_recalls_updated_at();

-- 19a-2. Bang fda_recall_fetch_log: log moi lan fetch openFDA API
CREATE TABLE IF NOT EXISTS public.fda_recall_fetch_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at          TIMESTAMPTZ DEFAULT NOW(),
  product_type    TEXT,
  recalls_found   INT DEFAULT 0,
  recalls_new     INT DEFAULT 0,
  recalls_skipped INT DEFAULT 0,
  recalls_failed  INT DEFAULT 0,
  fetch_source    TEXT DEFAULT 'openfda_api',
  duration_ms     INT,
  error           TEXT,
  details         JSONB
);

-- 19a-3. RLS: chi admin moi doc/ghi duoc
ALTER TABLE public.pending_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_recall_fetch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass recalls" ON public.pending_recalls;
CREATE POLICY "Service role bypass recalls"
  ON public.pending_recalls FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass recall logs" ON public.fda_recall_fetch_log;
CREATE POLICY "Service role bypass recall logs"
  ON public.fda_recall_fetch_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin read pending_recalls" ON public.pending_recalls;
CREATE POLICY "Admin read pending_recalls"
  ON public.pending_recalls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

DROP POLICY IF EXISTS "Admin read recall fetch log" ON public.fda_recall_fetch_log;
CREATE POLICY "Admin read recall fetch log"
  ON public.fda_recall_fetch_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

-- 19a-4. Index metadata cho compliance_knowledge (tag Recall)
CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_doc_type
  ON public.compliance_knowledge ((metadata->>'document_type'));

CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_recall_number
  ON public.compliance_knowledge ((metadata->>'recall_number'))
  WHERE metadata->>'recall_number' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_knowledge_recall_class
  ON public.compliance_knowledge ((metadata->>'recall_classification'))
  WHERE metadata->>'recall_classification' IS NOT NULL;

COMMENT ON TABLE public.pending_recalls IS
  'Staging bang cho FDA Enforcement Recalls tu openFDA API. Admin review truoc khi import vao compliance_knowledge vector DB.';

COMMENT ON TABLE public.fda_recall_fetch_log IS
  'Log moi lan pipeline fetch openFDA Enforcement Reports.';


-- ========== BUOC 19b: MIGRATION 020 - CATEGORY TAGGING ==========
-- Them product_type cho pending_warning_letters va backfill
-- metadata->>'category' cho compliance_knowledge.
-- An toan chay lai nhieu lan (idempotent).

-- 19b-1. Them column product_type
ALTER TABLE public.pending_warning_letters
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'unknown';

-- 19b-2. Backfill product_type tu issuing_office
UPDATE public.pending_warning_letters
SET product_type = CASE
  WHEN issuing_office ILIKE '%cfsan%'
    OR issuing_office ILIKE '%food safety%'
    OR issuing_office ILIKE '%nutrition%'       THEN 'food'
  WHEN issuing_office ILIKE '%cder%'
    OR issuing_office ILIKE '%drug evaluation%' THEN 'drug'
  WHEN issuing_office ILIKE '%cdrh%'
    OR issuing_office ILIKE '%devices%'
    OR issuing_office ILIKE '%radiological%'    THEN 'device'
  WHEN issuing_office ILIKE '%ctp%'
    OR issuing_office ILIKE '%tobacco%'         THEN 'tobacco'
  WHEN issuing_office ILIKE '%cvm%'
    OR issuing_office ILIKE '%veterinary%'      THEN 'veterinary'
  WHEN issuing_office ILIKE '%cber%'
    OR issuing_office ILIKE '%biologics%'       THEN 'biologics'
  ELSE 'unknown'
END
WHERE product_type = 'unknown' OR product_type IS NULL;

-- 19b-3. Index product_type
CREATE INDEX IF NOT EXISTS idx_pending_wl_product_type
  ON public.pending_warning_letters (product_type);

-- 19b-4. Backfill category cho compliance_knowledge (21 CFR Parts 101/102/104/105)
UPDATE public.compliance_knowledge
SET
  source   = metadata->>'source',
  metadata = metadata || jsonb_build_object(
    'category',    'food',
    'regulation',  metadata->>'source',
    'part_number', REGEXP_REPLACE(metadata->>'source', '.*Part\s+', '')
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source' IN (
    '21 CFR Part 101', '21 CFR Part 102',
    '21 CFR Part 104', '21 CFR Part 105'
  );

-- 19b-5. Backfill category cho drug chunks (Part 201)
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 201',
  metadata = metadata || jsonb_build_object(
    'category',    'drug',
    'regulation',  '21 CFR Part 201',
    'part_number', '201'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source' = '21 CFR Part 201';

-- 19b-6. Backfill category cho cosmetic chunks (Part 701, 720)
UPDATE public.compliance_knowledge
SET
  source   = metadata->>'source',
  metadata = metadata || jsonb_build_object(
    'category',    'cosmetic',
    'regulation',  metadata->>'source',
    'part_number', REGEXP_REPLACE(metadata->>'source', '.*Part\s+', '')
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source' IN ('21 CFR Part 701', '21 CFR Part 720');

-- 19b-7. Catch-all: cac rows con lai co source nhung chua co category
UPDATE public.compliance_knowledge
SET
  source   = COALESCE(source, metadata->>'source'),
  metadata = metadata || jsonb_build_object(
    'category', CASE
      WHEN metadata->>'source' ~ '21 CFR Part 1[0-9]{2}$' THEN 'food'
      WHEN metadata->>'source' ~ '21 CFR Part [234][0-9]{2}$' THEN 'drug'
      WHEN metadata->>'source' ~ '21 CFR Part 6[0-9]{2}$' THEN 'biologics'
      WHEN metadata->>'source' ~ '21 CFR Part 7[0-9]{2}$' THEN 'cosmetic'
      ELSE 'food'
    END
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source' IS NOT NULL;

-- 19b-8. Fix top-level source column cho tat ca rows con null
UPDATE public.compliance_knowledge
SET source = metadata->>'source'
WHERE source IS NULL
  AND metadata->>'source' IS NOT NULL;

-- 19b-9. Indexes de RAG query nhanh hon theo category
CREATE INDEX IF NOT EXISTS idx_ck_category
  ON public.compliance_knowledge ((metadata->>'category'));

CREATE INDEX IF NOT EXISTS idx_ck_source
  ON public.compliance_knowledge (source);

CREATE INDEX IF NOT EXISTS idx_ck_category_source
  ON public.compliance_knowledge ((metadata->>'category'), source);


-- ========== BUOC 20 (THU CONG): GRANT ADMIN ==========
-- Thay YOUR_ADMIN_USER_ID bang UUID that tu Supabase > Authentication > Users
-- 
-- INSERT INTO public.admin_users (user_id, role, can_review)
-- VALUES ('YOUR_ADMIN_USER_ID', 'superadmin', true)
-- ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin', can_review = true;

-- ========== BUOC 20b: MIGRATION 021 - BACKFILL WL + RECALL CATEGORY ==========
-- Sau khi import Warning Letters / Recalls vao compliance_knowledge,
-- dam bao metadata.category va top-level source duoc set dung.
-- An toan chay lai nhieu lan (idempotent).

-- 021-1. Backfill category cho Warning Letter chunks
UPDATE public.compliance_knowledge
SET
  source   = 'FDA Warning Letter',
  metadata = metadata || jsonb_build_object(
    'category', CASE
      WHEN (metadata->>'industry') ILIKE 'drug'       THEN 'drug'
      WHEN (metadata->>'industry') ILIKE 'cosmetic'   THEN 'cosmetic'
      WHEN (metadata->>'industry') ILIKE 'device'     THEN 'device'
      WHEN (metadata->>'industry') ILIKE 'tobacco'    THEN 'tobacco'
      WHEN (metadata->>'industry') ILIKE 'veterinary' THEN 'veterinary'
      WHEN (metadata->>'industry') ILIKE 'biologics'  THEN 'biologics'
      ELSE 'food'
    END,
    'source', 'FDA Warning Letter'
  )
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND (metadata->>'category' IS NULL OR source IS NULL);

-- 021-2. Backfill category cho Recall chunks
UPDATE public.compliance_knowledge
SET
  source   = 'FDA Recall',
  metadata = metadata || jsonb_build_object(
    'category', CASE
      WHEN (metadata->>'product_type') ILIKE 'drug%'     THEN 'drug'
      WHEN (metadata->>'product_type') ILIKE 'cosmetic%' THEN 'cosmetic'
      WHEN (metadata->>'product_type') ILIKE 'device%'
        OR (metadata->>'product_type') ILIKE 'medical%'  THEN 'device'
      WHEN (metadata->>'product_type') ILIKE 'tobacco%'  THEN 'tobacco'
      WHEN (metadata->>'product_type') ILIKE 'veterinary%'
        OR (metadata->>'product_type') ILIKE 'animal%'   THEN 'veterinary'
      WHEN (metadata->>'product_type') ILIKE 'biologic%' THEN 'biologics'
      ELSE 'food'
    END,
    'source', 'FDA Recall'
  )
WHERE metadata->>'document_type' = 'FDA Recall'
  AND (metadata->>'category' IS NULL OR source IS NULL);

--
-- ========== HOAN TAT ==========
-- Phien ban 6.0 - them migrations 019, 020, 021, 022, 024
-- 019: pending_recalls + fda_recall_fetch_log cho FDA Enforcement Reports pipeline
-- 020: product_type cho pending_warning_letters, category backfill cho 21 CFR chunks
-- 021: category + source backfill cho Warning Letter / Recall chunks sau khi import
-- 022: temporal validity system (is_active, valid_from, valid_until, temporal_scope)
-- 024: pending_import_alerts + fda_import_alert_fetch_log cho FDA Import Alerts (Layer 4)
--      Auto-deactivation function + COVID/PHE-era content handling
--      Auto-deactivation function + COVID/PHE-era content handling

-- ========== BUOC 21: MIGRATION 022 - TEMPORAL VALIDITY ==========
-- Them is_active, valid_from, valid_until, temporal_scope cho compliance_knowledge
-- Backfill: 21 CFR = permanent, WL = 5-year window, Recall = 3-year window
-- Deactivate COVID/EUA-era warning letters (2020-05-11 2023-05-11)

ALTER TABLE public.compliance_knowledge
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS valid_from    DATE,
  ADD COLUMN IF NOT EXISTS valid_until   DATE,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.compliance_knowledge(id),
  ADD COLUMN IF NOT EXISTS temporal_scope TEXT DEFAULT 'permanent';

ALTER TABLE public.pending_warning_letters
  ADD COLUMN IF NOT EXISTS actual_issue_date DATE;

ALTER TABLE public.pending_recalls
  ADD COLUMN IF NOT EXISTS closed_date DATE,
  ADD COLUMN IF NOT EXISTS is_ongoing  BOOLEAN DEFAULT true;

UPDATE public.compliance_knowledge
SET is_active = true, temporal_scope = 'permanent', valid_from = '2000-01-01'
WHERE source IN (
  '21 CFR Part 101','21 CFR Part 102','21 CFR Part 104',
  '21 CFR Part 105','21 CFR Part 201','21 CFR Part 701','21 CFR Part 720'
);

UPDATE public.compliance_knowledge
SET temporal_scope = 'enforcement',
    valid_from  = (metadata->>'issue_date')::date,
    valid_until = (metadata->>'issue_date')::date + INTERVAL '5 years'
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND metadata->>'issue_date' ~ '^\d{4}-\d{2}-\d{2}$';

UPDATE public.compliance_knowledge
SET temporal_scope = 'enforcement',
    valid_from  = (metadata->>'recall_initiation_date')::date,
    valid_until = (metadata->>'recall_initiation_date')::date + INTERVAL '3 years'
WHERE metadata->>'document_type' = 'FDA Recall'
  AND metadata->>'recall_initiation_date' ~ '^\d{4}-\d{2}-\d{2}$';

UPDATE public.compliance_knowledge
SET is_active = false, temporal_scope = 'emergency'
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND (content ILIKE '%covid%' OR content ILIKE '%SARS-CoV-2%'
    OR content ILIKE '%emergency use authorization%'
    OR content ILIKE '%public health emergency%')
  AND (metadata->>'issue_date' IS NULL
    OR (metadata->>'issue_date')::date BETWEEN '2020-01-01' AND '2023-05-11');

CREATE INDEX IF NOT EXISTS idx_ck_is_active ON public.compliance_knowledge (is_active);
CREATE INDEX IF NOT EXISTS idx_ck_temporal_scope ON public.compliance_knowledge (temporal_scope);
CREATE INDEX IF NOT EXISTS idx_ck_valid_until ON public.compliance_knowledge (valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ck_active_category ON public.compliance_knowledge (is_active, (metadata->>'category'));

CREATE OR REPLACE FUNCTION public.deactivate_expired_knowledge()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.compliance_knowledge
  SET is_active = false
  WHERE temporal_scope = 'enforcement'
    AND valid_until IS NOT NULL AND valid_until < CURRENT_DATE AND is_active = true;
END;
$$;

CREATE OR REPLACE VIEW public.active_compliance_knowledge AS
SELECT id, content, metadata, embedding, source, section,
  is_active, valid_from, valid_until, temporal_scope,
  CASE WHEN temporal_scope = 'permanent' THEN 'Permanent'
       WHEN valid_until > CURRENT_DATE THEN 'Active until ' || valid_until::text
       ELSE 'Expired' END as validity_status
FROM public.compliance_knowledge WHERE is_active = true;

-- ========== BUOC 22: MIGRATION 024 - FDA IMPORT ALERTS PIPELINE ==========
-- Tao bang pending_import_alerts cho FDA Import Alerts (Layer 4 RAG)
-- Thu thap bang HTML Scraping (FDA khong co official API cho Import Alerts)
-- Dung lam Risk Context, KHONG dung cho Citations

CREATE TABLE IF NOT EXISTS pending_import_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_number          TEXT NOT NULL,
  alert_title           TEXT NOT NULL,
  industry_type         TEXT NOT NULL,
  reason_for_alert      TEXT NOT NULL,
  action_type           TEXT NOT NULL DEFAULT 'DWPE',
  red_list_entities     JSONB NOT NULL DEFAULT '[]'::jsonb,
  effective_date        DATE,
  last_updated_date     DATE,
  extracted_content     TEXT,
  source_url            TEXT,
  status                TEXT NOT NULL DEFAULT 'pending_review'
                          CHECK (status IN ('pending_review', 'approved', 'rejected', 'failed')),
  fetch_method          TEXT DEFAULT 'html_scraping',
  fetch_error           TEXT,
  review_notes          TEXT,
  reviewed_at           TIMESTAMPTZ,
  fetched_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_import_alerts_number
  ON pending_import_alerts (alert_number);
CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_status
  ON pending_import_alerts (status);
CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_industry
  ON pending_import_alerts (industry_type);
CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_action_type
  ON pending_import_alerts (action_type);
CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_red_list
  ON pending_import_alerts USING GIN (red_list_entities);
CREATE INDEX IF NOT EXISTS idx_pending_import_alerts_created_at
  ON pending_import_alerts (created_at DESC);

-- Fetch log table
CREATE TABLE IF NOT EXISTS fda_import_alert_fetch_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at          TIMESTAMPTZ DEFAULT NOW(),
  alerts_found    INT DEFAULT 0,
  alerts_new      INT DEFAULT 0,
  alerts_updated  INT DEFAULT 0,
  alerts_failed   INT DEFAULT 0,
  fetch_source    TEXT DEFAULT 'fda_import_alerts_scraper',
  duration_ms     INT,
  error           TEXT,
  details         JSONB
);

-- RLS
ALTER TABLE pending_import_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fda_import_alert_fetch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass import_alerts" ON pending_import_alerts;
CREATE POLICY "Service role bypass import_alerts"
  ON pending_import_alerts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass import_alert_logs" ON fda_import_alert_fetch_log;
CREATE POLICY "Service role bypass import_alert_logs"
  ON fda_import_alert_fetch_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin read pending_import_alerts" ON pending_import_alerts;
CREATE POLICY "Admin read pending_import_alerts"
  ON pending_import_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

DROP POLICY IF EXISTS "Admin read import_alert_fetch_log" ON fda_import_alert_fetch_log;
CREATE POLICY "Admin read import_alert_fetch_log"
  ON fda_import_alert_fetch_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'expert')
    )
  );

-- pg_trgm extension (de dung similarity matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function: fuzzy entity matching cho Import Alerts
CREATE OR REPLACE FUNCTION match_import_alerts_by_entity(
  p_company_name   TEXT,
  p_industry_type  TEXT  DEFAULT NULL,
  p_similarity     FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id               UUID, alert_number TEXT, alert_title TEXT, industry_type TEXT,
  reason_for_alert TEXT, action_type TEXT, red_list_entities JSONB,
  effective_date   DATE, source_url TEXT, match_score FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ia.id, ia.alert_number, ia.alert_title, ia.industry_type,
    ia.reason_for_alert, ia.action_type, ia.red_list_entities,
    ia.effective_date, ia.source_url,
    COALESCE((
      SELECT MAX(similarity(LOWER(p_company_name), LOWER(entity->>'name')))
      FROM jsonb_array_elements(ia.red_list_entities) AS entity
      WHERE entity->>'name' IS NOT NULL
    ), 0.0)::FLOAT AS match_score
  FROM pending_import_alerts ia
  WHERE ia.status = 'approved'
    AND (p_industry_type IS NULL OR ia.industry_type = p_industry_type)
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(ia.red_list_entities) AS entity
      WHERE entity->>'name' IS NOT NULL
        AND similarity(LOWER(p_company_name), LOWER(entity->>'name')) >= p_similarity
    )
  ORDER BY match_score DESC;
END; $$;

-- Function: full-text search Import Alerts theo reason
CREATE OR REPLACE FUNCTION search_import_alerts_by_reason(
  p_query         TEXT,
  p_industry_type TEXT  DEFAULT NULL,
  p_limit         INT   DEFAULT 2
)
RETURNS TABLE (
  id UUID, alert_number TEXT, alert_title TEXT, industry_type TEXT,
  reason_for_alert TEXT, action_type TEXT, effective_date DATE,
  source_url TEXT, ts_rank FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ia.id, ia.alert_number, ia.alert_title, ia.industry_type,
    ia.reason_for_alert, ia.action_type, ia.effective_date, ia.source_url,
    ts_rank(
      to_tsvector('english', COALESCE(ia.reason_for_alert, '') || ' ' || COALESCE(ia.extracted_content, '')),
      plainto_tsquery('english', p_query)
    )::FLOAT AS ts_rank
  FROM pending_import_alerts ia
  WHERE ia.status = 'approved'
    AND (p_industry_type IS NULL OR ia.industry_type = p_industry_type)
    AND to_tsvector('english',
      COALESCE(ia.reason_for_alert, '') || ' ' || COALESCE(ia.extracted_content, '')
    ) @@ plainto_tsquery('english', p_query)
  ORDER BY ts_rank DESC LIMIT p_limit;
END; $$;

-- Seed data: Import Alerts quan trong voi VN exporters
INSERT INTO pending_import_alerts (
  alert_number, alert_title, industry_type, reason_for_alert, action_type,
  red_list_entities, effective_date, source_url, status, extracted_content
) VALUES
('66-40','Detention Without Physical Examination of Dietary Supplements and Conventional Foods That Are Adulterated With Undeclared Drugs and/or Undeclared Ingredients','dietary-supplement','Products adulterated with undeclared drugs, undeclared active pharmaceutical ingredients, or undeclared substances that may render the product adulterated under section 402(a)(2)(C) of the FD&C Act.','DWPE','[]'::jsonb,'1999-01-01','https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=66-40','approved','Import Alert 66-40: Detention of dietary supplements containing undeclared drugs or active pharmaceutical ingredients.'),
('99-33','Detention Without Physical Examination of All Products from Firms in Vietnam Due to CGMP and Filth Violations','food','Products from certain Vietnamese firms detained due to Current Good Manufacturing Practice (CGMP) violations, filth, decomposition, or adulteration under 21 CFR Part 110/117.','DWPE','[]'::jsonb,'2006-01-01','https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=99-33','approved','Import Alert 99-33: Detention of food products from Vietnamese firms with CGMP violations.'),
('45-02','Detention Without Physical Examination of Human Foods Due to Filth, Decomposition, and Pesticide Contamination','food','Human foods detained due to filth, decomposition, or pesticide contamination exceeding FDA tolerance levels.','DWPE','[]'::jsonb,'1991-01-01','https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=45-02','approved','Import Alert 45-02: Detention of human food products containing pesticide residues above FDA/EPA tolerance levels.'),
('54-15','Detention Without Physical Examination of Cosmetics Due to Adulteration - Prohibited/Restricted Ingredients','cosmetic','Cosmetic products detained due to presence of prohibited or restricted ingredients including mercury compounds, chloroform, methylene chloride.','DWPE','[]'::jsonb,'2001-01-01','https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=54-15','approved','Import Alert 54-15: Detention of cosmetic products containing prohibited ingredients such as mercury.'),
('62-08','Detention Without Physical Examination of Dietary Supplements - CGMP Non-Compliance','dietary-supplement','Dietary supplements detained due to CGMP violations under 21 CFR Part 111.','DWPE','[]'::jsonb,'2008-06-25','https://www.accessdata.fda.gov/cms_api/import_alerts/alert_num.json?alert_num=62-08','approved','Import Alert 62-08: Dietary supplement firms subject to DWPE for failure to comply with 21 CFR Part 111 CGMP.')
ON CONFLICT (alert_number) DO NOTHING;

COMMENT ON TABLE pending_import_alerts IS 'Staging bang cho FDA Import Alerts. Layer 4 RAG - risk context only, khong dung cho citations.';
COMMENT ON TABLE fda_import_alert_fetch_log IS 'Log moi lan pipeline scrape FDA Import Alerts.';

-- Chien luoc chinh:
--   - CREATE TABLE IF NOT EXISTS: tao bang moi neu chua co
--   - ALTER TABLE ADD COLUMN IF NOT EXISTS: them columns thieu vao bang da ton tai
--   - DROP POLICY IF EXISTS + CREATE POLICY: tao lai policy (an toan)
--   - CREATE OR REPLACE FUNCTION: ghi de function
--   - CREATE INDEX IF NOT EXISTS: bo qua neu index da co
--   - ON CONFLICT DO NOTHING: khong loi khi seed data trung
--
-- Bao gom day du tat ca tu:
--   001_create_tables, 002_add_expert_review, 003_add_version_control,
--   004_add_advanced_features, 005_vector_search_function,
--   006_grant_admin, 007_fix_admin_rls, 008_create_storage_bucket,
--   009_add_missing_columns, 010_fix_audit_reports_schema,
--   011_add_vision_extraction_fields, 011_add_bulk_import_storage_security,
--   012_add_form_data_column, 012_add_multi_image_support,
--   012_warning_letters_support, 013_pending_warning_letters,
--   014_violation_user_feedback, 015_add_payment_fields,
--   add-commercial-report-fields, 016_create_subscriptions,
--   017_auto_correct_cfr_metadata, 018_add_packaging_format_column,
--   018_expert_review_requests, 019_add_recalls_pipeline,
--   020_category_and_product_type, 024_import_alerts_pipeline
--
-- Phien ban 6.0 - them migration 024:
--   - pending_import_alerts + fda_import_alert_fetch_log cho FDA Import Alerts
--   - match_import_alerts_by_entity() fuzzy matching function
--   - search_import_alerts_by_reason() full-text search function
--   - Layer 4 RAG: Border Enforcement risk context
--
-- Phien ban 4.0 - them migration 020:
--   - product_type cho pending_warning_letters
--   - category backfill cho 3,117+ compliance_knowledge chunks
--   - category/source indexes cho RAG query hieu qua
