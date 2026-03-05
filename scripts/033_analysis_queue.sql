-- =============================================================
-- 033_analysis_queue.sql
-- Async job queue for heavy label analysis workloads.
-- Phase 2: Queue Database Schema
-- =============================================================

CREATE TABLE IF NOT EXISTS analysis_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID        NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  -- queued | processing | completed | failed
  status          TEXT        NOT NULL DEFAULT 'queued',
  -- 1 = highest (enterprise), 10 = lowest (free trial)
  priority        INT         NOT NULL DEFAULT 5,
  attempts        INT         NOT NULL DEFAULT 0,
  max_attempts    INT         NOT NULL DEFAULT 3,
  -- Payload forwarded from /api/analyze/submit
  payload         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  -- Step-level progress for frontend polling
  current_step    TEXT,
  progress        INT         DEFAULT 0   -- 0-100
);

-- Fast dequeue: pick oldest queued job with highest priority (lowest number)
CREATE INDEX IF NOT EXISTS idx_queue_status_priority
  ON analysis_queue(status, priority, created_at);

-- Lookup by report so the status route can query by report_id
CREATE INDEX IF NOT EXISTS idx_queue_report_id
  ON analysis_queue(report_id);

-- Lookup by user
CREATE INDEX IF NOT EXISTS idx_queue_user_id
  ON analysis_queue(user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE analysis_queue ENABLE ROW LEVEL SECURITY;

-- Users may read their own jobs
CREATE POLICY "Users can read own queue jobs"
  ON analysis_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Service-role (process route uses supabase admin client) can do everything
-- so no INSERT/UPDATE policy needed for anon/authenticated here.
-- The submit route creates the job server-side with the service role.
