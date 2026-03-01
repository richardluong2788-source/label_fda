-- Migration 029: Fix alert 62-08 source_url that was mistakenly set to #54-14
UPDATE pending_import_alerts
SET source_url = 'https://www.accessdata.fda.gov/cms_ia/ialist.html#62-08'
WHERE alert_number = '62-08';

-- Verify
SELECT alert_number, alert_title, industry_type, source_url FROM pending_import_alerts WHERE alert_number = '62-08';
