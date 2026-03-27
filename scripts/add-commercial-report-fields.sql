-- Add commercial reporting fields to audit_reports table
-- These fields support the smart citation formatter and violation-to-CFR mapper

ALTER TABLE audit_reports
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_cost_usd DECIMAL(10, 4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS commercial_summary JSONB,
ADD COLUMN IF NOT EXISTS expert_tips JSONB;

-- Add comments to document the fields
COMMENT ON COLUMN audit_reports.ai_tokens_used IS 'Total AI tokens consumed during analysis (GPT-4o Vision + embeddings)';
COMMENT ON COLUMN audit_reports.ai_cost_usd IS 'Estimated cost in USD for AI API calls';
COMMENT ON COLUMN audit_reports.commercial_summary IS 'Professional report summary with severity breakdown and statistics';
COMMENT ON COLUMN audit_reports.expert_tips IS 'Expert recommendations generated from detected violations';

-- Create index on ai_cost_usd for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_audit_reports_ai_cost ON audit_reports(ai_cost_usd);

-- Create index on ai_tokens_used for usage analytics
CREATE INDEX IF NOT EXISTS idx_audit_reports_tokens ON audit_reports(ai_tokens_used);
