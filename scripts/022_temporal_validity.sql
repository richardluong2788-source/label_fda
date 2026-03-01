-- Migration 022: Temporal validity system for compliance_knowledge
-- Adds is_active, valid_from, valid_until, superseded_by, temporal_scope
-- to allow time-scoped enforcement data management.
-- Safe to run multiple times (idempotent).

-- ── 1. Add temporal columns ─────────────────────────────────────────────────
ALTER TABLE public.compliance_knowledge
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS valid_from    DATE,
  ADD COLUMN IF NOT EXISTS valid_until   DATE,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.compliance_knowledge(id),
  ADD COLUMN IF NOT EXISTS temporal_scope TEXT DEFAULT 'permanent';
-- temporal_scope values:
--   'permanent'   → 21 CFR regulations, never expires
--   'enforcement' → Warning Letters / Recalls, expires after sunset_months
--   'emergency'   → COVID EUA, PHE-era rules, manual expiry required

-- ── 2. Add temporal columns to pending tables ────────────────────────────────
ALTER TABLE public.pending_warning_letters
  ADD COLUMN IF NOT EXISTS actual_issue_date DATE;  -- real FDA letter date, NOT fetch date

ALTER TABLE public.pending_recalls
  ADD COLUMN IF NOT EXISTS closed_date DATE,        -- date recall was closed/terminated
  ADD COLUMN IF NOT EXISTS is_ongoing  BOOLEAN DEFAULT true;

-- ── 3. Backfill: 21 CFR chunks → permanent, never expires ───────────────────
UPDATE public.compliance_knowledge
SET
  is_active      = true,
  temporal_scope = 'permanent',
  valid_from     = '2000-01-01'::date
WHERE source IN (
  '21 CFR Part 101', '21 CFR Part 102', '21 CFR Part 104',
  '21 CFR Part 105', '21 CFR Part 201', '21 CFR Part 701', '21 CFR Part 720'
)
AND temporal_scope IS NULL OR temporal_scope = 'permanent';

-- ── 4. Backfill: Warning Letter chunks → enforcement scope ───────────────────
-- Auto-expire WL chunks older than 5 years (they become less relevant
-- for current enforcement patterns but not completely invalid)
UPDATE public.compliance_knowledge
SET
  is_active      = CASE
    WHEN (metadata->>'issue_date')::date > CURRENT_DATE - INTERVAL '5 years' THEN true
    ELSE true  -- keep active but flag temporal_scope for search weighting
  END,
  temporal_scope = 'enforcement',
  valid_from     = (metadata->>'issue_date')::date,
  valid_until    = (metadata->>'issue_date')::date + INTERVAL '5 years'
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND metadata->>'issue_date' IS NOT NULL
  AND metadata->>'issue_date' ~ '^\d{4}-\d{2}-\d{2}$';

-- ── 5. Backfill: Recall chunks → enforcement scope, 3-year window ─────────────
UPDATE public.compliance_knowledge
SET
  is_active      = true,
  temporal_scope = 'enforcement',
  valid_from     = (metadata->>'recall_initiation_date')::date,
  valid_until    = (metadata->>'recall_initiation_date')::date + INTERVAL '3 years'
WHERE metadata->>'document_type' = 'FDA Recall'
  AND metadata->>'recall_initiation_date' IS NOT NULL
  AND metadata->>'recall_initiation_date' ~ '^\d{4}-\d{2}-\d{2}$';

-- ── 6. Mark emergency/PHE-era content inactive if present ───────────────────
-- COVID EUA warning letters (2020-2022) should be deprioritized
UPDATE public.compliance_knowledge
SET
  is_active      = false,
  temporal_scope = 'emergency'
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND (
    content ILIKE '%covid%'
    OR content ILIKE '%SARS-CoV-2%'
    OR content ILIKE '%emergency use authorization%'
    OR content ILIKE '%EUA%'
    OR content ILIKE '%public health emergency%'
  )
  AND (metadata->>'issue_date' IS NULL
    OR (metadata->>'issue_date')::date BETWEEN '2020-01-01' AND '2023-05-11');
-- NOTE: 2023-05-11 = official end of COVID-19 PHE in the US

-- ── 7. Indexes for fast temporal filtering in RAG ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ck_is_active
  ON public.compliance_knowledge (is_active);

CREATE INDEX IF NOT EXISTS idx_ck_temporal_scope
  ON public.compliance_knowledge (temporal_scope);

CREATE INDEX IF NOT EXISTS idx_ck_valid_until
  ON public.compliance_knowledge (valid_until)
  WHERE valid_until IS NOT NULL;

-- Combined index used by searchKnowledge + searchWarningLetters
CREATE INDEX IF NOT EXISTS idx_ck_active_category
  ON public.compliance_knowledge (is_active, (metadata->>'category'));

-- ── 8. Auto-deactivation function (run via cron or manually) ────────────────
CREATE OR REPLACE FUNCTION public.deactivate_expired_knowledge()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.compliance_knowledge
  SET is_active = false
  WHERE temporal_scope = 'enforcement'
    AND valid_until IS NOT NULL
    AND valid_until < CURRENT_DATE
    AND is_active = true;

  RAISE NOTICE 'Deactivated % expired enforcement chunks',
    (SELECT COUNT(*) FROM public.compliance_knowledge
     WHERE is_active = false AND temporal_scope = 'enforcement'
       AND valid_until < CURRENT_DATE);
END;
$$;

-- ── 9. View: active knowledge with temporal info ─────────────────────────────
CREATE OR REPLACE VIEW public.active_compliance_knowledge AS
SELECT
  id, content, metadata, embedding, source, section,
  is_active, valid_from, valid_until, temporal_scope,
  CASE
    WHEN temporal_scope = 'permanent' THEN 'Permanent regulation'
    WHEN valid_until IS NULL THEN 'No expiry set'
    WHEN valid_until > CURRENT_DATE THEN 'Active until ' || valid_until::text
    ELSE 'Expired ' || valid_until::text
  END as validity_status
FROM public.compliance_knowledge
WHERE is_active = true;
