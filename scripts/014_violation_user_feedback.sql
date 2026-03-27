-- Create table for tracking user behavior on violations
-- This builds the enforcement intelligence dataset over time

CREATE TABLE IF NOT EXISTS violation_user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
  violation_id TEXT NOT NULL,
  violation_category TEXT NOT NULL,
  violation_severity TEXT NOT NULL CHECK (violation_severity IN ('critical', 'warning', 'info')),
  regulation_reference TEXT NOT NULL,
  user_action TEXT NOT NULL CHECK (user_action IN ('fixed', 'ignored', 'disputed', 'needs_help')),
  time_to_action_ms BIGINT, -- Time from report creation to action (milliseconds)
  user_notes TEXT,
  product_category TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, violation_id, user_action) -- Prevent duplicate logs
);

-- Index for fast pattern queries
CREATE INDEX IF NOT EXISTS idx_violation_feedback_category ON violation_user_feedback(violation_category);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_regulation ON violation_user_feedback(regulation_reference);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_action ON violation_user_feedback(user_action);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_product_category ON violation_user_feedback(product_category);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_industry ON violation_user_feedback(industry);
CREATE INDEX IF NOT EXISTS idx_violation_feedback_created_at ON violation_user_feedback(created_at);

-- Add risk scoring fields to audit_reports table
ALTER TABLE audit_reports 
  ADD COLUMN IF NOT EXISTS overall_risk_score NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS projected_risk_score NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS risk_assessment TEXT;

COMMENT ON TABLE violation_user_feedback IS 'Tracks user actions on violations to build enforcement intelligence dataset. Analyzes which violations users fix vs ignore by industry and product category.';

COMMENT ON COLUMN violation_user_feedback.user_action IS 'User action on violation: fixed (user corrected it), ignored (user skipped), disputed (user disagrees), needs_help (user requested expert review)';

COMMENT ON COLUMN violation_user_feedback.time_to_action_ms IS 'Time from report creation to user action in milliseconds. Helps identify which violations users prioritize.';

COMMENT ON COLUMN audit_reports.overall_risk_score IS 'Current FDA enforcement risk score (0-10) based on violation severity and historical enforcement patterns';

COMMENT ON COLUMN audit_reports.projected_risk_score IS 'Projected risk score (0-10) after fixing all critical violations';

COMMENT ON COLUMN audit_reports.risk_assessment IS 'Risk level category: Low, Low-Medium, Medium, Medium-High, High, Critical';
