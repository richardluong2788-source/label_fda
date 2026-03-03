-- Backfill product_name for reports that don't have it
-- This script attempts to extract product info from various sources

-- First, let's see what data we have
-- SELECT id, file_name, product_name, brand_name FROM audit_reports LIMIT 10;

-- Update reports where product_name is null but we can extract from file_name
UPDATE audit_reports
SET product_name = 
  CASE 
    -- Remove common file extensions and clean up
    WHEN file_name IS NOT NULL AND product_name IS NULL THEN
      TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(file_name, '\.[^.]+$', ''), -- Remove extension
            '[-_]', ' ', 'g'  -- Replace dashes/underscores with spaces
          ),
          '\d{10,}', '', 'g'  -- Remove long number sequences (timestamps)
        )
      )
    ELSE product_name
  END
WHERE product_name IS NULL 
  AND file_name IS NOT NULL
  AND LENGTH(TRIM(file_name)) > 0;

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM audit_reports 
  WHERE product_name IS NOT NULL;
  
  RAISE NOTICE 'Reports with product_name: %', updated_count;
END $$;
