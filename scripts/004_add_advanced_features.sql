-- Add product category and dimension tracking to audit_reports
ALTER TABLE audit_reports
ADD COLUMN IF NOT EXISTS product_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS product_subcategory VARCHAR(100),
ADD COLUMN IF NOT EXISTS physical_width_cm DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS physical_height_cm DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pixel_width INTEGER,
ADD COLUMN IF NOT EXISTS pixel_height INTEGER,
ADD COLUMN IF NOT EXISTS pixels_per_inch DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pdp_area_square_inches DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS contrast_violations JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS claim_violations JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS multilanguage_issues JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS has_foreign_language BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS foreign_language VARCHAR(50),
ADD COLUMN IF NOT EXISTS required_disclaimers TEXT[];

-- Create claims blacklist table
CREATE TABLE IF NOT EXISTS claims_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('prohibited', 'restricted', 'drug_like', 'structure_function')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  regulation TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE claims_blacklist ENABLE ROW LEVEL SECURITY;

-- Public read access for claims blacklist
CREATE POLICY "claims_blacklist_select_all" ON claims_blacklist
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify claims blacklist
CREATE POLICY "claims_blacklist_admin_all" ON claims_blacklist
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

-- Insert default prohibited terms
INSERT INTO claims_blacklist (term, category, severity, regulation, description) VALUES
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_claims_blacklist_term ON claims_blacklist(term);
CREATE INDEX IF NOT EXISTS idx_claims_blacklist_category ON claims_blacklist(category);

-- Create product categories table for reference
CREATE TABLE IF NOT EXISTS product_categories (
  id VARCHAR(100) PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id VARCHAR(100) REFERENCES product_categories(id),
  regulations TEXT[],
  mandatory_fields TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "product_categories_select_all" ON product_categories
  FOR SELECT TO authenticated
  USING (true);

-- Insert main categories
INSERT INTO product_categories (id, name, regulations, mandatory_fields, description) VALUES
('conventional-foods', 'Conventional Foods', ARRAY['21 CFR 101', '21 CFR 102'], ARRAY['Product name', 'Net quantity', 'Ingredient list', 'Nutrition Facts', 'Allergen declaration'], 'Regular food products'),
('dietary-supplements', 'Dietary Supplements', ARRAY['21 CFR 101.36', 'DSHEA'], ARRAY['Supplement Facts', 'Disclaimer', 'Serving size'], 'Vitamins, minerals, herbs, supplements'),
('alcoholic-beverages', 'Alcoholic Beverages', ARRAY['27 CFR Part 4', '27 CFR Part 5'], ARRAY['Alcohol content', 'Health warning', 'Sulfite declaration'], 'Wine, beer, spirits'),
('cosmetics', 'Cosmetics', ARRAY['21 CFR 701', 'FD&C Act'], ARRAY['Product identity', 'Ingredient declaration', 'Warning statements'], 'Skincare, makeup, personal care')
ON CONFLICT (id) DO NOTHING;

-- Insert subcategories
INSERT INTO product_categories (id, name, parent_id, regulations, mandatory_fields) VALUES
('seafood', 'Seafood', 'conventional-foods', ARRAY['21 CFR 123'], ARRAY['Country of origin', 'Fish species']),
('dried-foods', 'Dried Foods', 'conventional-foods', ARRAY['21 CFR 101.9'], ARRAY['Storage instructions']),
('beverages', 'Beverages', 'conventional-foods', ARRAY['21 CFR 101.30'], ARRAY['Serving size per container']),
('vitamins', 'Vitamins', 'dietary-supplements', ARRAY['21 CFR 101.36(b)'], ARRAY['% Daily Value', 'Dosage form']),
('herbal', 'Herbal Products', 'dietary-supplements', ARRAY['21 CFR 101.36'], ARRAY['Plant part used']),
('wine', 'Wine', 'alcoholic-beverages', ARRAY['27 CFR Part 4'], ARRAY['Vintage year']),
('skincare', 'Skincare', 'cosmetics', ARRAY['21 CFR 701.3'], ARRAY['Skin type indication'])
ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON COLUMN audit_reports.product_category IS 'Main product category for targeted compliance checking';
COMMENT ON COLUMN audit_reports.physical_width_cm IS 'Real-world label width in centimeters';
COMMENT ON COLUMN audit_reports.physical_height_cm IS 'Real-world label height in centimeters';
COMMENT ON COLUMN audit_reports.pixels_per_inch IS 'Conversion ratio for font size validation';
COMMENT ON COLUMN audit_reports.contrast_violations IS 'Color contrast readability issues';
COMMENT ON COLUMN audit_reports.claim_violations IS 'Prohibited or restricted health claims detected';
COMMENT ON COLUMN audit_reports.multilanguage_issues IS 'Missing translations or inconsistencies';

COMMENT ON TABLE claims_blacklist IS 'Database of prohibited and restricted claim terminology';
COMMENT ON TABLE product_categories IS 'Hierarchical product categorization for targeted compliance';
