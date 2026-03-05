-- Migration 036: Add index to support daily cleanup-expired-reports cron
-- The cron scans audit_reports by (user_id, created_at) to find expired reports.

-- Composite index: user_id + created_at (supports JOIN + date filter)
CREATE INDEX IF NOT EXISTS idx_audit_reports_user_created
  ON public.audit_reports (user_id, created_at);

-- Index on user_subscriptions.user_id already exists (from 016),
-- but ensure it covers plan_id for the nested join
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_plan
  ON public.user_subscriptions (user_id, plan_id);
