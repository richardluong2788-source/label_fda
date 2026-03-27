-- ============================================================================
-- FSVP PRODUCTS - Product Catalog with Version Control for Labels
-- Supports: Importer creating products for unregistered suppliers
--           Supplier managing their own product catalog
--           Label version history for FSVP audit trail
-- ============================================================================

-- Create enum for product status
DO $$ BEGIN
  CREATE TYPE fsvp_product_status AS ENUM (
    'draft',           -- Product created but not finalized
    'active',          -- Product is active and can be linked to FSVP records
    'discontinued',    -- Product no longer manufactured
    'archived'         -- Historical record only
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for label status
DO $$ BEGIN
  CREATE TYPE fsvp_label_status AS ENUM (
    'draft',           -- Label uploaded but not approved
    'pending_review',  -- Awaiting review (by importer or internal)
    'approved',        -- Label approved and current
    'superseded',      -- Replaced by newer version
    'rejected'         -- Label rejected (compliance issues)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MAIN TABLE: fsvp_products
-- Product catalog with created_by tracking for importer/supplier ownership
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supplier reference (required)
  supplier_id UUID NOT NULL REFERENCES fsvp_suppliers(id) ON DELETE CASCADE,
  
  -- Ownership tracking - WHO created this product
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('importer', 'supplier')),
  
  -- Product identification
  product_name TEXT NOT NULL,
  product_name_local TEXT,          -- Name in local language
  brand_name TEXT,
  sku TEXT,                          -- Supplier's internal SKU
  upc TEXT,                          -- Universal Product Code (barcode)
  
  -- Product details
  product_description TEXT,
  product_category TEXT,             -- e.g., 'Seafood - Fish', 'Dairy - Cheese'
  fda_product_code TEXT,             -- FDA product code
  hs_code TEXT,                      -- Harmonized System code for import
  
  -- Packaging and format
  packaging_format TEXT,             -- e.g., 'Frozen IQF', 'Canned', 'Fresh'
  net_weight TEXT,                   -- e.g., '500g', '1kg', '10oz'
  units_per_case INTEGER,
  shelf_life_days INTEGER,
  storage_requirements TEXT,         -- e.g., 'Frozen -18°C', 'Refrigerated 0-4°C'
  
  -- Ingredients and allergens (cached from latest approved label)
  ingredient_list TEXT,
  allergens TEXT[] DEFAULT '{}',     -- e.g., ['fish', 'soy', 'wheat']
  contains_major_allergen BOOLEAN DEFAULT FALSE,
  
  -- Country and origin
  country_of_origin TEXT,
  manufacturing_facility TEXT,
  facility_fda_registration TEXT,    -- FDA facility registration number
  
  -- Risk classification (cached, can be overridden per FSVP record)
  default_risk_level TEXT DEFAULT 'medium' CHECK (default_risk_level IN ('low', 'medium', 'high', 'sahcodha')),
  is_sahcodha BOOLEAN DEFAULT FALSE,
  known_hazards TEXT[] DEFAULT '{}',
  
  -- Certifications
  certifications TEXT[] DEFAULT '{}', -- e.g., ['HACCP', 'BRC', 'FSSC 22000', 'Halal', 'Kosher']
  
  -- Status
  status fsvp_product_status DEFAULT 'draft',
  
  -- Current label reference (denormalized for quick access)
  current_label_id UUID,             -- Will reference fsvp_product_labels.id
  current_label_version INTEGER DEFAULT 0,
  
  -- Linked records
  linked_audit_report_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
  auto_generated BOOLEAN DEFAULT FALSE,
  auto_generated_from TEXT,          -- 'label_scan', 'import', etc.
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index for case-insensitive product name per supplier
CREATE UNIQUE INDEX IF NOT EXISTS idx_fsvp_products_supplier_name_unique 
ON fsvp_products (supplier_id, LOWER(product_name));

-- ============================================================================
-- LABEL VERSION CONTROL: fsvp_product_labels
-- Tracks all versions of labels for audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_product_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product reference
  product_id UUID NOT NULL REFERENCES fsvp_products(id) ON DELETE CASCADE,
  
  -- Version tracking
  version INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  
  -- Label images
  label_image_url TEXT NOT NULL,
  label_image_urls TEXT[] DEFAULT '{}', -- Multiple images (front, back, nutrition panel, etc.)
  
  -- Label status
  status fsvp_label_status DEFAULT 'draft',
  
  -- Who uploaded/modified
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_role TEXT NOT NULL CHECK (uploaded_by_role IN ('importer', 'supplier')),
  
  -- Review tracking
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Extracted content (from AI analysis or manual entry)
  product_name_on_label TEXT,
  brand_name_on_label TEXT,
  ingredient_list TEXT,
  allergen_statement TEXT,
  nutrition_facts JSONB DEFAULT '{}',
  net_weight TEXT,
  country_of_origin TEXT,
  manufacturer_info TEXT,
  
  -- AI analysis results (if label was analyzed)
  ai_analysis_id UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
  ai_extracted_data JSONB DEFAULT '{}',
  compliance_issues JSONB DEFAULT '[]',
  
  -- Change tracking
  change_reason TEXT,                -- Why this version was created
  changes_from_previous JSONB DEFAULT '{}', -- What changed from previous version
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,       -- NULL if current
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique version per product
  UNIQUE (product_id, version)
);

-- ============================================================================
-- PRODUCT-SUPPLIER MAPPING FOR IMPORTERS
-- When importer creates product for unregistered supplier
-- ============================================================================
CREATE TABLE IF NOT EXISTS fsvp_product_importer_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product and user references
  product_id UUID NOT NULL REFERENCES fsvp_products(id) ON DELETE CASCADE,
  importer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Access level
  can_edit BOOLEAN DEFAULT FALSE,
  can_request_updates BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE (product_id, importer_user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Products indexes
CREATE INDEX IF NOT EXISTS idx_fsvp_products_supplier ON fsvp_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_created_by ON fsvp_products(created_by);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_created_by_role ON fsvp_products(created_by_role);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_status ON fsvp_products(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_category ON fsvp_products(product_category);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_fda_code ON fsvp_products(fda_product_code);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_hs_code ON fsvp_products(hs_code);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_risk ON fsvp_products(default_risk_level);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_sahcodha ON fsvp_products(is_sahcodha) WHERE is_sahcodha = TRUE;
CREATE INDEX IF NOT EXISTS idx_fsvp_products_allergens ON fsvp_products USING GIN (allergens);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_certifications ON fsvp_products USING GIN (certifications);
CREATE INDEX IF NOT EXISTS idx_fsvp_products_auto_generated ON fsvp_products(auto_generated) WHERE auto_generated = TRUE;
CREATE INDEX IF NOT EXISTS idx_fsvp_products_name_search ON fsvp_products USING GIN (to_tsvector('english', product_name || ' ' || COALESCE(brand_name, '')));

-- Labels indexes
CREATE INDEX IF NOT EXISTS idx_fsvp_product_labels_product ON fsvp_product_labels(product_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_product_labels_current ON fsvp_product_labels(product_id, is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_fsvp_product_labels_uploaded_by ON fsvp_product_labels(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_fsvp_product_labels_status ON fsvp_product_labels(status);
CREATE INDEX IF NOT EXISTS idx_fsvp_product_labels_version ON fsvp_product_labels(product_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_fsvp_product_labels_effective ON fsvp_product_labels(effective_from, effective_until);

-- Access indexes
CREATE INDEX IF NOT EXISTS idx_fsvp_product_importer_access_product ON fsvp_product_importer_access(product_id);
CREATE INDEX IF NOT EXISTS idx_fsvp_product_importer_access_importer ON fsvp_product_importer_access(importer_user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE fsvp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_product_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsvp_product_importer_access ENABLE ROW LEVEL SECURITY;

-- FSVP Products policies
-- Users can see products they have access to (via importer_user_id or created_by)
CREATE POLICY "Users can view their products"
  ON fsvp_products FOR SELECT
  USING (
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
    OR created_by = auth.uid()
    OR id IN (
      SELECT product_id FROM fsvp_product_importer_access WHERE importer_user_id = auth.uid()
    )
  );

-- Users can create products (for their supplier or as importer)
CREATE POLICY "Users can create products"
  ON fsvp_products FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- User creating for supplier they manage
      supplier_id IN (
        SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
      )
      OR
      -- Importer can create products for any supplier
      created_by_role = 'importer'
    )
  );

-- Update policy
CREATE POLICY "Users can update their products"
  ON fsvp_products FOR UPDATE
  USING (
    -- User can update products for suppliers they manage
    supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    )
    OR 
    -- Creator can update
    created_by = auth.uid()
    OR
    -- Importers with edit access can update
    id IN (
      SELECT product_id FROM fsvp_product_importer_access 
      WHERE importer_user_id = auth.uid() AND can_edit = TRUE
    )
  );

-- Delete policy
CREATE POLICY "Users can delete their products"
  ON fsvp_products FOR DELETE
  USING (
    -- User can delete products for suppliers they manage
    (supplier_id IN (
      SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid()
    ))
    OR
    -- Creator can delete if they created it
    (created_by = auth.uid() AND created_by_role = 'importer')
  );

-- Label policies
CREATE POLICY "Users can view labels for accessible products"
  ON fsvp_product_labels FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM fsvp_products WHERE
        supplier_id IN (SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid())
        OR created_by = auth.uid()
        OR id IN (SELECT product_id FROM fsvp_product_importer_access WHERE importer_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create labels for their products"
  ON fsvp_product_labels FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND product_id IN (
      SELECT id FROM fsvp_products WHERE
        supplier_id IN (SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid())
        OR created_by = auth.uid()
        OR id IN (SELECT product_id FROM fsvp_product_importer_access WHERE importer_user_id = auth.uid() AND can_edit = TRUE)
    )
  );

CREATE POLICY "Users can update labels for their products"
  ON fsvp_product_labels FOR UPDATE
  USING (
    product_id IN (
      SELECT id FROM fsvp_products WHERE
        supplier_id IN (SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid())
        OR created_by = auth.uid()
    )
  );

-- Access control policies
CREATE POLICY "Importers can view their access records"
  ON fsvp_product_importer_access FOR SELECT
  USING (importer_user_id = auth.uid());

CREATE POLICY "Product owners can manage access"
  ON fsvp_product_importer_access FOR ALL
  USING (
    product_id IN (
      SELECT id FROM fsvp_products WHERE
        supplier_id IN (SELECT id FROM fsvp_suppliers WHERE importer_user_id = auth.uid())
        OR created_by = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get next label version for a product
CREATE OR REPLACE FUNCTION get_next_label_version(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM fsvp_product_labels
  WHERE product_id = p_product_id;
  
  RETURN max_version + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set current label and update product
CREATE OR REPLACE FUNCTION set_current_product_label(p_label_id UUID)
RETURNS VOID AS $$
DECLARE
  v_product_id UUID;
  v_version INTEGER;
BEGIN
  -- Get product and version info
  SELECT product_id, version INTO v_product_id, v_version
  FROM fsvp_product_labels
  WHERE id = p_label_id;
  
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Label not found';
  END IF;
  
  -- Mark all other labels as not current
  UPDATE fsvp_product_labels
  SET is_current = FALSE, effective_until = NOW()
  WHERE product_id = v_product_id AND is_current = TRUE AND id != p_label_id;
  
  -- Mark this label as current
  UPDATE fsvp_product_labels
  SET is_current = TRUE, status = 'approved', effective_until = NULL
  WHERE id = p_label_id;
  
  -- Update product with current label reference
  UPDATE fsvp_products
  SET 
    current_label_id = p_label_id,
    current_label_version = v_version,
    updated_at = NOW()
  WHERE id = v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create product from label analysis (auto-generation)
CREATE OR REPLACE FUNCTION create_product_from_label_analysis(
  p_supplier_id UUID,
  p_created_by UUID,
  p_created_by_role TEXT,
  p_product_name TEXT,
  p_brand_name TEXT DEFAULT NULL,
  p_ingredient_list TEXT DEFAULT NULL,
  p_allergens TEXT[] DEFAULT '{}',
  p_country_of_origin TEXT DEFAULT NULL,
  p_label_image_url TEXT DEFAULT NULL,
  p_audit_report_id UUID DEFAULT NULL,
  p_ai_extracted_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_product_id UUID;
  v_label_id UUID;
  v_existing_product_id UUID;
BEGIN
  -- Check if product already exists for this supplier
  SELECT id INTO v_existing_product_id
  FROM fsvp_products
  WHERE supplier_id = p_supplier_id 
    AND LOWER(product_name) = LOWER(p_product_name);
  
  IF v_existing_product_id IS NOT NULL THEN
    -- Product exists, create new label version
    v_product_id := v_existing_product_id;
  ELSE
    -- Create new product
    INSERT INTO fsvp_products (
      supplier_id,
      created_by,
      created_by_role,
      product_name,
      brand_name,
      ingredient_list,
      allergens,
      contains_major_allergen,
      country_of_origin,
      linked_audit_report_id,
      auto_generated,
      auto_generated_from,
      status
    ) VALUES (
      p_supplier_id,
      p_created_by,
      p_created_by_role,
      p_product_name,
      p_brand_name,
      p_ingredient_list,
      p_allergens,
      array_length(p_allergens, 1) > 0,
      p_country_of_origin,
      p_audit_report_id,
      TRUE,
      'label_scan',
      'active'
    )
    RETURNING id INTO v_product_id;
  END IF;
  
  -- Create label version if image URL provided
  IF p_label_image_url IS NOT NULL THEN
    INSERT INTO fsvp_product_labels (
      product_id,
      version,
      is_current,
      label_image_url,
      uploaded_by,
      uploaded_by_role,
      status,
      product_name_on_label,
      brand_name_on_label,
      ingredient_list,
      country_of_origin,
      ai_analysis_id,
      ai_extracted_data,
      change_reason
    ) VALUES (
      v_product_id,
      get_next_label_version(v_product_id),
      TRUE,
      p_label_image_url,
      p_created_by,
      p_created_by_role,
      'approved',
      p_product_name,
      p_brand_name,
      p_ingredient_list,
      p_country_of_origin,
      p_audit_report_id,
      p_ai_extracted_data,
      CASE 
        WHEN v_existing_product_id IS NULL THEN 'Initial label from AI analysis'
        ELSE 'New label version from AI analysis'
      END
    )
    RETURNING id INTO v_label_id;
    
    -- Update product with current label
    UPDATE fsvp_products
    SET current_label_id = v_label_id, current_label_version = 1
    WHERE id = v_product_id;
  END IF;
  
  -- Grant access to importer if they created the product
  IF p_created_by_role = 'importer' THEN
    INSERT INTO fsvp_product_importer_access (product_id, importer_user_id, can_edit, granted_by)
    VALUES (v_product_id, p_created_by, TRUE, p_created_by)
    ON CONFLICT (product_id, importer_user_id) DO NOTHING;
  END IF;
  
  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_fsvp_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fsvp_products_updated_at ON fsvp_products;
CREATE TRIGGER trigger_update_fsvp_products_updated_at
  BEFORE UPDATE ON fsvp_products
  FOR EACH ROW
  EXECUTE FUNCTION update_fsvp_products_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for products with current label info
CREATE OR REPLACE VIEW fsvp_products_with_labels AS
SELECT 
  p.*,
  s.supplier_name,
  s.supplier_country,
  l.label_image_url AS current_label_image_url,
  l.ingredient_list AS current_ingredient_list,
  l.allergen_statement AS current_allergen_statement,
  l.nutrition_facts AS current_nutrition_facts,
  l.uploaded_at AS current_label_uploaded_at,
  (
    SELECT COUNT(*) 
    FROM fsvp_product_labels pl 
    WHERE pl.product_id = p.id
  ) AS total_label_versions
FROM fsvp_products p
JOIN fsvp_suppliers s ON p.supplier_id = s.id
LEFT JOIN fsvp_product_labels l ON p.current_label_id = l.id;

-- Grant access to view
GRANT SELECT ON fsvp_products_with_labels TO authenticated;

-- ============================================================================
-- ADD FOREIGN KEY TO PRODUCTS TABLE
-- ============================================================================
-- Add self-referencing FK for current_label_id after table creation
ALTER TABLE fsvp_products
ADD CONSTRAINT fk_fsvp_products_current_label
FOREIGN KEY (current_label_id) REFERENCES fsvp_product_labels(id) ON DELETE SET NULL;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'FSVP Products migration completed successfully!';
  RAISE NOTICE 'Tables created: fsvp_products, fsvp_product_labels, fsvp_product_importer_access';
  RAISE NOTICE 'View created: fsvp_products_with_labels';
  RAISE NOTICE 'Function created: create_product_from_label_analysis';
END $$;
