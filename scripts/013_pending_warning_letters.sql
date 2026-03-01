-- ============================================
-- 013_pending_warning_letters.sql
-- Semi-automated FDA Warning Letter pipeline
-- Stores letters fetched from FDA for admin review before import
-- ============================================

-- Table: pending_warning_letters
-- Holds Warning Letters fetched automatically from FDA website
-- Admin reviews and approves before they enter the AI pipeline
CREATE TABLE IF NOT EXISTS pending_warning_letters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- FDA metadata
  letter_id text NOT NULL,
  company_name text NOT NULL,
  subject text,
  issue_date date NOT NULL,
  fda_url text NOT NULL,
  issuing_office text,
  
  -- Extracted content
  extracted_content text,
  content_length integer DEFAULT 0,
  
  -- Pipeline status
  status text NOT NULL DEFAULT 'pending_review' 
    CHECK (status IN ('pending_review', 'approved', 'processing', 'imported', 'rejected', 'fetch_failed')),
  fetch_method text NOT NULL DEFAULT 'auto_cron'
    CHECK (fetch_method IN ('auto_cron', 'manual')),
  
  -- Fetch tracking
  fetched_at timestamptz DEFAULT now(),
  fetch_error text,
  
  -- Review tracking
  reviewed_by text,
  reviewed_at timestamptz,
  review_notes text,
  
  -- Import result (after AI pipeline processes it)
  import_result jsonb,
  imported_at timestamptz,
  violations_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint on letter_id to prevent duplicate fetches
  CONSTRAINT unique_pending_letter_id UNIQUE (letter_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pending_wl_status ON pending_warning_letters(status);
CREATE INDEX IF NOT EXISTS idx_pending_wl_issue_date ON pending_warning_letters(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_pending_wl_fetched_at ON pending_warning_letters(fetched_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_pending_wl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pending_wl_updated_at ON pending_warning_letters;
CREATE TRIGGER trigger_pending_wl_updated_at
  BEFORE UPDATE ON pending_warning_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_wl_updated_at();

-- Tracking table for cron job runs
CREATE TABLE IF NOT EXISTS fda_fetch_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz DEFAULT now(),
  letters_found integer DEFAULT 0,
  letters_new integer DEFAULT 0,
  letters_skipped integer DEFAULT 0,
  letters_failed integer DEFAULT 0,
  fetch_source text,
  duration_ms integer,
  error text,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_fda_fetch_log_run_at ON fda_fetch_log(run_at DESC);

-- RLS policies: service_role only (API routes use service_role key)
ALTER TABLE pending_warning_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE fda_fetch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access pending_warning_letters"
  ON pending_warning_letters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access fda_fetch_log"
  ON fda_fetch_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON pending_warning_letters TO service_role;
GRANT ALL ON fda_fetch_log TO service_role;
