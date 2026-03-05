-- Migration 032: Add enforcement risk scoring columns to audit_reports
-- These columns are used by the risk engine in app/api/analyze/route.ts
-- but were never added to the database schema.

ALTER TABLE audit_reports
  ADD COLUMN IF NOT EXISTS enforcement_risk_score NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warning_letter_weight NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recall_heat_index NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS import_alert_heat_index NUMERIC DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN audit_reports.enforcement_risk_score IS 'Composite enforcement risk score from risk engine';
COMMENT ON COLUMN audit_reports.warning_letter_weight IS 'Weight score from FDA warning letter matching';
COMMENT ON COLUMN audit_reports.recall_heat_index IS 'Heat index from FDA recall data matching';
COMMENT ON COLUMN audit_reports.import_alert_heat_index IS 'Heat index from FDA import alert matching';
