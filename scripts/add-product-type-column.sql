-- Add product_type column to pending_warning_letters
ALTER TABLE pending_warning_letters
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'unknown';

-- Backfill existing rows based on issuing_office
UPDATE pending_warning_letters
SET product_type = CASE
  WHEN issuing_office ILIKE '%food safety%' OR issuing_office ILIKE '%CFSAN%' THEN 'food'
  WHEN issuing_office ILIKE '%drug evaluation%' OR issuing_office ILIKE '%CDER%' THEN 'drug'
  WHEN issuing_office ILIKE '%devices%' OR issuing_office ILIKE '%radiological%' OR issuing_office ILIKE '%CDRH%' THEN 'device'
  WHEN issuing_office ILIKE '%veterinary%' OR issuing_office ILIKE '%CVM%' THEN 'veterinary'
  WHEN issuing_office ILIKE '%tobacco%' OR issuing_office ILIKE '%CTP%' THEN 'tobacco'
  ELSE 'unknown'
END
WHERE product_type = 'unknown' OR product_type IS NULL;
