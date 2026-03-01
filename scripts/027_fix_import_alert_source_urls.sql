-- Fix incorrect source_url values in pending_import_alerts
-- Correct URL format: https://www.fda.gov/safety/import-alerts/import-alert-XXXXXX
-- This is the stable FDA URL pattern that never returns 404

UPDATE pending_import_alerts
SET source_url = CASE alert_number
  WHEN '66-40' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-6640'
  WHEN '99-33' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-9933'
  WHEN '45-02' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-4502'
  WHEN '54-15' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-5415'
  WHEN '62-08' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-6208'
  WHEN '99-19' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-9919'
  WHEN '99-23' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-9923'
  WHEN '99-41' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-9941'
  WHEN '99-42' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-9942'
  WHEN '99-22' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-9922'
  WHEN '99-32' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-9932'
  WHEN '16-120' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-16120'
  WHEN '16-124' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-16124'
  WHEN '16-81'  THEN 'https://www.fda.gov/safety/import-alerts/import-alert-1681'
  WHEN '54-14' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-5414'
  WHEN '54-16' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-5416'
  WHEN '54-18' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-5418'
  WHEN '53-06' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-5306'
  WHEN '53-21' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-5321'
  WHEN '66-41' THEN 'https://www.fda.gov/safety/import-alerts/import-alert-6641'
  ELSE source_url -- keep existing for any others
END
WHERE alert_number IN (
  '66-40','99-33','45-02','54-15','62-08',
  '99-19','99-23','99-41','99-42','99-22','99-32',
  '16-120','16-124','16-81',
  '54-14','54-16','54-18',
  '53-06','53-21','66-41'
);

-- Also update alert titles and last_updated_date for seed data that has stale info
UPDATE pending_import_alerts
SET
  alert_title = 'Detention Without Physical Examination of Drugs From Firms Which Have Not Met Drug GMPs',
  last_updated_date = '2025-02-12',
  effective_date = '2025-02-12'
WHERE alert_number = '66-40';

UPDATE pending_import_alerts
SET
  alert_title = 'Detention Without Physical Examination of Human and Animal Food Products from Foreign Establishments Refusing FDA Inspection',
  last_updated_date = '2025-02-13'
WHERE alert_number = '99-33';

UPDATE pending_import_alerts
SET
  alert_title = 'Detention Without Physical Examination and Guidance of Foods Containing Illegal and/or Undeclared Colors',
  last_updated_date = '2025-02-13'
WHERE alert_number = '45-02';

UPDATE pending_import_alerts
SET
  alert_title = 'Detention Without Physical Examination of Dietary Supplements and Bulk Dietary Ingredients That Are or Contain Mitragyna Speciosa or Kratom',
  last_updated_date = '2024-11-26'
WHERE alert_number = '54-15';

UPDATE pending_import_alerts
SET
  alert_title = 'Detention Without Physical Examination of Alcohol-Based Hand Sanitizers Manufactured in Mexico',
  last_updated_date = '2024-12-20',
  industry_type = 'drug'
WHERE alert_number = '62-08';
