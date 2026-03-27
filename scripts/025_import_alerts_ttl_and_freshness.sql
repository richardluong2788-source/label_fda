-- ================================================================
-- Migration 025: Import Alerts TTL + Data Freshness Controls
-- ================================================================
-- Muc dich:
--   1. Them last_checked_at de biet alert con "song" tren FDA hay da bi removed
--   2. Them auto-deactivate cho alerts chua duoc re-verify trong > 180 ngay
--   3. Index tang toc query theo approved + industry_type (production query path)
--   4. Function cleanup_stale_import_alerts() de cron job goi sau moi fetch
--   5. View active_import_alerts_summary de admin monitor nhanh
-- ================================================================

-- 1. Them cot last_checked_at (lan cuoi scraper verify alert van con tren FDA)
ALTER TABLE public.pending_import_alerts
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Index cho production query path trong search functions
--    match_import_alerts_by_entity va search_import_alerts_by_reason
--    deu filter status = 'approved' truoc
CREATE INDEX IF NOT EXISTS idx_pia_approved_industry
  ON public.pending_import_alerts (status, industry_type)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_pia_approved_checked
  ON public.pending_import_alerts (status, last_checked_at DESC)
  WHERE status = 'approved';

-- 3. Full-text search index tren reason_for_alert + extracted_content
--    De PostgreSQL dung GIN index thay vi seq scan trong search function
CREATE INDEX IF NOT EXISTS idx_pia_fts_reason
  ON public.pending_import_alerts
  USING GIN (
    to_tsvector('english',
      COALESCE(reason_for_alert, '') || ' ' || COALESCE(extracted_content, '')
    )
  );

-- 4. Function: cleanup stale import alerts
--    Goi sau moi scrape run de tu dong deactivate alerts khong con tren FDA
--    va expire alerts qua cu (> 5 years old va chua duoc re-verify)
CREATE OR REPLACE FUNCTION public.cleanup_stale_import_alerts(
  p_stale_days   INT DEFAULT 180,  -- alert chua duoc check trong N ngay -> warning
  p_expire_years INT DEFAULT 7     -- alert cu hon N nam va khong duoc check -> reject
)
RETURNS TABLE (
  deactivated_count INT,
  expired_count     INT,
  healthy_count     INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stale_cutoff   TIMESTAMPTZ := NOW() - (p_stale_days  || ' days')::INTERVAL;
  v_expire_cutoff  TIMESTAMPTZ := NOW() - (p_expire_years || ' years')::INTERVAL;
  v_deactivated    INT := 0;
  v_expired        INT := 0;
  v_healthy        INT := 0;
BEGIN
  -- Mark very old alerts (> 7 years, never re-checked) as rejected
  UPDATE public.pending_import_alerts
  SET
    status       = 'rejected',
    review_notes = COALESCE(review_notes, '') ||
                   ' [Auto-expired: last_checked_at > ' || p_expire_years || ' years ago]',
    updated_at   = NOW()
  WHERE status     = 'approved'
    AND last_checked_at < v_expire_cutoff;

  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Add review_notes warning for alerts not checked in p_stale_days (but keep approved)
  -- Admin will see these flagged in the dashboard
  UPDATE public.pending_import_alerts
  SET
    review_notes = CASE
      WHEN review_notes NOT LIKE '%[Stale:%' THEN
        COALESCE(review_notes, '') || ' [Stale: not re-verified in ' || p_stale_days || '+ days]'
      ELSE review_notes
    END,
    updated_at = NOW()
  WHERE status         = 'approved'
    AND last_checked_at < v_stale_cutoff
    AND last_checked_at >= v_expire_cutoff;

  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- Count healthy approved alerts
  SELECT COUNT(*) INTO v_healthy
  FROM public.pending_import_alerts
  WHERE status = 'approved'
    AND last_checked_at >= v_stale_cutoff;

  RETURN QUERY SELECT v_deactivated, v_expired, v_healthy;
END;
$$;

-- 5. Update match_import_alerts_by_entity to prefer recently-checked alerts
--    Replaces the version from migration 024 with freshness-aware ORDER BY
CREATE OR REPLACE FUNCTION match_import_alerts_by_entity(
  p_company_name   TEXT,
  p_industry_type  TEXT  DEFAULT NULL,
  p_similarity     FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id               UUID, alert_number TEXT, alert_title TEXT, industry_type TEXT,
  reason_for_alert TEXT, action_type TEXT, red_list_entities JSONB,
  effective_date   DATE, source_url TEXT, match_score FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ia.id, ia.alert_number, ia.alert_title, ia.industry_type,
    ia.reason_for_alert, ia.action_type, ia.red_list_entities,
    ia.effective_date, ia.source_url,
    COALESCE((
      SELECT MAX(similarity(LOWER(p_company_name), LOWER(entity->>'name')))
      FROM jsonb_array_elements(ia.red_list_entities) AS entity
      WHERE entity->>'name' IS NOT NULL
    ), 0.0)::FLOAT AS match_score
  FROM pending_import_alerts ia
  WHERE ia.status = 'approved'
    AND (p_industry_type IS NULL OR ia.industry_type = p_industry_type)
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(ia.red_list_entities) AS entity
      WHERE entity->>'name' IS NOT NULL
        AND similarity(LOWER(p_company_name), LOWER(entity->>'name')) >= p_similarity
    )
  ORDER BY match_score DESC,
           ia.last_checked_at DESC;  -- freshness tiebreaker
END; $$;

-- 6. Update search_import_alerts_by_reason with freshness tiebreaker
CREATE OR REPLACE FUNCTION search_import_alerts_by_reason(
  p_query         TEXT,
  p_industry_type TEXT  DEFAULT NULL,
  p_limit         INT   DEFAULT 2
)
RETURNS TABLE (
  id UUID, alert_number TEXT, alert_title TEXT, industry_type TEXT,
  reason_for_alert TEXT, action_type TEXT, effective_date DATE,
  source_url TEXT, ts_rank FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ia.id, ia.alert_number, ia.alert_title, ia.industry_type,
    ia.reason_for_alert, ia.action_type, ia.effective_date, ia.source_url,
    ts_rank(
      to_tsvector('english', COALESCE(ia.reason_for_alert, '') || ' ' || COALESCE(ia.extracted_content, '')),
      plainto_tsquery('english', p_query)
    )::FLOAT AS ts_rank
  FROM pending_import_alerts ia
  WHERE ia.status = 'approved'
    AND (p_industry_type IS NULL OR ia.industry_type = p_industry_type)
    AND to_tsvector('english',
      COALESCE(ia.reason_for_alert, '') || ' ' || COALESCE(ia.extracted_content, '')
    ) @@ plainto_tsquery('english', p_query)
  ORDER BY ts_rank DESC,
           ia.last_checked_at DESC   -- freshness tiebreaker: newest check first
  LIMIT p_limit;
END; $$;

-- 7. View: active_import_alerts_summary (for admin dashboard monitoring)
CREATE OR REPLACE VIEW public.active_import_alerts_summary AS
SELECT
  industry_type,
  COUNT(*) FILTER (WHERE status = 'approved')                                        AS approved_count,
  COUNT(*) FILTER (WHERE status = 'pending_review')                                  AS pending_count,
  COUNT(*) FILTER (WHERE status = 'approved'
    AND last_checked_at < NOW() - INTERVAL '180 days')                               AS stale_count,
  COUNT(*) FILTER (WHERE status = 'approved'
    AND review_notes LIKE '%[Stale:%')                                               AS flagged_stale,
  MAX(last_checked_at) FILTER (WHERE status = 'approved')                            AS last_fetch_at,
  MIN(last_checked_at) FILTER (WHERE status = 'approved')                            AS oldest_check_at
FROM public.pending_import_alerts
GROUP BY industry_type
ORDER BY approved_count DESC;

-- 8. Update cron schedule comment (reminder for Vercel cron config)
COMMENT ON TABLE public.pending_import_alerts IS
  'Staging bang cho FDA Import Alerts. Layer 4 RAG — risk context only.
   Cron: /api/cron/fetch-import-alerts chay moi 24h de update last_checked_at.
   Auto-cleanup: cleanup_stale_import_alerts() sau moi fetch run.
   TTL: 180 ngay khong check -> stale flag; 7 nam -> auto-reject.
   Token budget: max 2 results × 120 tokens = 240 tokens trong prompt.';

-- Update last_checked_at cho seed data
UPDATE public.pending_import_alerts
SET last_checked_at = NOW()
WHERE last_checked_at IS NULL;
