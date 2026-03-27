-- ============================================================================
-- Migration: Add product_id to fsvp_records
-- Links FSVP records to product catalog for better data integrity
-- ============================================================================

-- Add product_id column to fsvp_records
ALTER TABLE fsvp_records
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES fsvp_products(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fsvp_records_product_id 
ON fsvp_records(product_id) WHERE product_id IS NOT NULL;

-- Update the view to include product_id
DROP VIEW IF EXISTS fsvp_records_with_supplier;

CREATE VIEW fsvp_records_with_supplier AS
SELECT 
  r.*,
  s.supplier_name,
  s.supplier_country,
  s.supplier_address,
  s.supplier_fei,
  s.is_sahcodha_risk,
  s.status as supplier_status,
  s.last_verification_date as supplier_last_verification,
  p.current_label_id,
  p.current_label_version,
  p.brand_name as product_brand_name
FROM fsvp_records r
LEFT JOIN fsvp_suppliers s ON r.supplier_id = s.id
LEFT JOIN fsvp_products p ON r.product_id = p.id;

-- Grant permissions
GRANT SELECT ON fsvp_records_with_supplier TO authenticated;
GRANT SELECT ON fsvp_records_with_supplier TO anon;

COMMENT ON COLUMN fsvp_records.product_id IS 'Reference to product in fsvp_products catalog. Links record to centralized product information and label versions.';
