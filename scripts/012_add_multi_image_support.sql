-- Migration: Add multi-image support to audit_reports
-- This allows storing multiple label images (PDP, Nutrition Facts, Ingredients, etc.)

-- Add column to store multiple images with their types
ALTER TABLE audit_reports
ADD COLUMN IF NOT EXISTS label_images JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN audit_reports.label_images IS 
'Array of label images with format: [{"type": "pdp"|"nutrition"|"ingredients"|"other", "url": "https://..."}]
- pdp: Principal Display Panel (front) - REQUIRED (has Net Weight)
- nutrition: Nutrition Facts panel - REQUIRED  
- ingredients: Ingredients and allergen declaration - RECOMMENDED
- other: Additional panels with claims or warnings - OPTIONAL';

-- Create index for querying by image types
CREATE INDEX IF NOT EXISTS idx_audit_reports_label_images ON audit_reports USING gin(label_images);

-- Update existing reports to have label_images array format
UPDATE audit_reports
SET label_images = jsonb_build_array(
  jsonb_build_object(
    'type', 'other',
    'url', label_image_url
  )
)
WHERE label_images = '[]'::jsonb 
  AND label_image_url IS NOT NULL 
  AND label_image_url != 'manual-entry';

COMMENT ON TABLE audit_reports IS 'FDA compliance audit reports with multi-image support. Each report can have multiple label images (PDP, nutrition facts, ingredients, etc.) for comprehensive analysis.';
