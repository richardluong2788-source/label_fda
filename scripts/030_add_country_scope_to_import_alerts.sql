-- Migration 030: Add country_scope column to pending_import_alerts
-- country_scope: text[] — list of countries this alert is restricted to.
-- Empty array [] = category-wide (applies to all countries).
-- Non-empty = only applies to products from those countries.
-- Example: ARRAY['China', 'Hong Kong'] for alert 16-131.

ALTER TABLE pending_import_alerts
  ADD COLUMN IF NOT EXISTS country_scope text[] NOT NULL DEFAULT '{}';

-- Index for fast filtering when country_of_origin is provided
CREATE INDEX IF NOT EXISTS idx_import_alerts_country_scope
  ON pending_import_alerts USING GIN (country_scope);

-- Tag known country-restricted alert (16-131 is the canonical example in curated list)
UPDATE pending_import_alerts
SET country_scope = ARRAY['China', 'Hong Kong']
WHERE alert_number = '16-131'
  AND (country_scope IS NULL OR country_scope = '{}');

-- Confirm
SELECT alert_number, country_scope
FROM pending_import_alerts
WHERE country_scope != '{}'
ORDER BY alert_number;
