-- Simplified Ingredient/Formula Review Schema - Basic Tables
-- Part 1: Core tables for ingredient and formula management

-- 1. Ingredient Master Table
CREATE TABLE public.ingredient_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fda_common_name TEXT,
  inci_name TEXT,
  cas_number TEXT UNIQUE,
  e_number TEXT,
  vietnamese_name TEXT,
  synonyms JSONB DEFAULT '[]',
  category TEXT NOT NULL,
  ingredient_type TEXT,
  allergen_group TEXT,
  regulatory_status JSONB DEFAULT '{}',
  max_usage_level JSONB DEFAULT '{}',
  is_allergen BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customer Formulas Table
CREATE TABLE public.customer_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_report_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  formula_version TEXT,
  total_percentage DECIMAL,
  ingredients JSONB NOT NULL,
  ingredient_count INT,
  uploaded_file_url TEXT,
  file_name TEXT,
  parsed_by_ai BOOLEAN DEFAULT FALSE,
  parsing_confidence DECIMAL,
  ai_suggestions JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  submission_date TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  approval_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Formula Label Comparisons Table
CREATE TABLE public.formula_label_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES customer_formulas(id) ON DELETE CASCADE,
  audit_report_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
  label_ingredients JSONB NOT NULL,
  formula_ingredients JSONB NOT NULL,
  ingredients_match BOOLEAN,
  order_correct BOOLEAN,
  critical_issues JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Formula Review Assignments Table
CREATE TABLE public.formula_review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES customer_formulas(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'normal',
  review_type TEXT NOT NULL,
  status TEXT DEFAULT 'assigned',
  due_date TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ingredient Review History Table
CREATE TABLE public.ingredient_review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID REFERENCES customer_formulas(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES formula_review_assignments(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  reviewer_notes TEXT,
  issues_identified JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ingredient_master_fda ON ingredient_master(fda_common_name);
CREATE INDEX idx_customer_formulas_user ON customer_formulas(user_id);
CREATE INDEX idx_customer_formulas_status ON customer_formulas(status);
CREATE INDEX idx_formulas_assigned_to ON customer_formulas(assigned_to);
CREATE INDEX idx_comparisons_formula ON formula_label_comparisons(formula_id);
CREATE INDEX idx_assignments_formula ON formula_review_assignments(formula_id);
CREATE INDEX idx_assignments_assigned_to ON formula_review_assignments(assigned_to);
CREATE INDEX idx_history_formula ON ingredient_review_history(formula_id);

-- Enable RLS
ALTER TABLE public.ingredient_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_label_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_review_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingredient_master
CREATE POLICY "ingredient_master_read" ON public.ingredient_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredient_master_admin_write" ON public.ingredient_master FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- RLS Policies for customer_formulas
CREATE POLICY "formulas_read" ON public.customer_formulas FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = assigned_to OR auth.uid() = reviewed_by OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "formulas_insert" ON public.customer_formulas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "formulas_update" ON public.customer_formulas FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- RLS Policies for comparisons
CREATE POLICY "comparisons_read" ON public.formula_label_comparisons FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM customer_formulas WHERE id = formula_id AND (auth.uid() = user_id OR auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))));

-- RLS Policies for assignments
CREATE POLICY "assignments_read" ON public.formula_review_assignments FOR SELECT TO authenticated USING (auth.uid() = assigned_to OR auth.uid() = assigned_by OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "assignments_admin" ON public.formula_review_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- RLS Policies for history
CREATE POLICY "history_read" ON public.ingredient_review_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM customer_formulas WHERE id = formula_id AND (auth.uid() = user_id OR auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))));

-- Helper function for timestamp updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingredient_master_update_trigger BEFORE UPDATE ON ingredient_master FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER customer_formulas_update_trigger BEFORE UPDATE ON customer_formulas FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER formula_comparisons_update_trigger BEFORE UPDATE ON formula_label_comparisons FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER review_assignments_update_trigger BEFORE UPDATE ON formula_review_assignments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
