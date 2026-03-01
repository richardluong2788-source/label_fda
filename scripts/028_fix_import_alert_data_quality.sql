-- Migration 028: Fix Import Alert data quality issues
-- Corrects alert_title, industry_type, reason_for_alert, source_url for all existing alerts
-- that have stale/wrong data from the original seed script.
--
-- Source of truth: https://www.accessdata.fda.gov/cms_ia/ialist.html (verified 2026-02-28)

-- Helper: stable source URL = FDA ialist index with anchor
-- e.g. https://www.accessdata.fda.gov/cms_ia/ialist.html#99-19

UPDATE pending_import_alerts SET
  alert_title    = 'Detention Without Physical Examination of Drugs From Firms Which Have Not Met Drug GMPs',
  industry_type  = 'drug',
  reason_for_alert = 'Pharmaceutical manufacturers detained due to failure to meet CGMP requirements under 21 CFR Parts 210/211. Updated: 02/12/2025. Covers all finished drug products from firms not operating in conformity with CGMP.',
  source_url     = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#66-40'
WHERE alert_number = '66-40';

UPDATE pending_import_alerts SET
  alert_title    = 'Detention Without Physical Examination of Dietary Supplements and Bulk Dietary Ingredients That Are or Contain Mitragyna Speciosa or Kratom',
  industry_type  = 'dietary-supplement',
  reason_for_alert = 'Dietary supplements containing Mitragyna speciosa (Kratom) are adulterated under Section 402(f)(1)(A) of the FD&C Act. Updated: 11/26/2024.',
  source_url     = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#54-15'
WHERE alert_number = '54-15';

UPDATE pending_import_alerts SET
  alert_title    = 'Detention Without Physical Examination of Human and Animal Food Products from Foreign Establishments Refusing FDA Inspection',
  industry_type  = 'food',
  reason_for_alert = 'Food products from foreign firms that have refused or denied FDA inspection. Updated: 02/13/2025.',
  source_url     = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#99-33'
WHERE alert_number = '99-33';

UPDATE pending_import_alerts SET
  alert_title    = 'Detention Without Physical Examination and Guidance of Foods Containing Illegal and/or Undeclared Colors',
  industry_type  = 'food',
  reason_for_alert = 'Human foods detained due to presence of illegal color additives or undeclared certified colors. Updated: 02/13/2025.',
  source_url     = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#45-02'
WHERE alert_number = '45-02';

UPDATE pending_import_alerts SET
  alert_title    = 'Detention Without Physical Examination of Dietary Supplement Products From Firms That Have Not Met Dietary Supplement GMP',
  industry_type  = 'dietary-supplement',
  reason_for_alert = 'Dietary supplements detained from firms that have not met CGMP requirements under 21 CFR Part 111. Updated: 01/27/2025.',
  source_url     = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#54-14'
WHERE alert_number = '62-08';  -- seed had wrong alert number mapped to wrong content

-- Fix 62-08 separately if it exists with wrong title
UPDATE pending_import_alerts SET
  alert_title    = 'Detention Without Physical Examination of Dietary Supplement Products From Firms That Have Not Met Dietary Supplement GMP',
  industry_type  = 'dietary-supplement',
  reason_for_alert = 'Dietary supplements detained from firms that have not met CGMP requirements under 21 CFR Part 111. Updated: 01/27/2025.',
  source_url     = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#62-08'
WHERE alert_number = '62-08' AND alert_title ILIKE '%hand sanitizer%';

-- Fix all source_url entries that used old broken patterns
UPDATE pending_import_alerts
SET source_url = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#' || alert_number
WHERE source_url LIKE '%fda.gov/safety/import-alerts/%'
   OR source_url LIKE '%cms_ia/importalert_%';

-- Verify
SELECT alert_number, alert_title, industry_type, source_url, status
FROM pending_import_alerts
ORDER BY alert_number;
