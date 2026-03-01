-- Migration 023: CFR Versioning support
-- Adds indexes for efficient version-check queries on compliance_knowledge.
-- The lastAmendedDate is stored inside the JSONB metadata column by
-- fetch-ecfr-to-json.mjs v2 and the bulk-import route.
-- Safe to run multiple times (idempotent).

-- ── 1. Index on regulation_id within metadata ────────────────────────────────
-- Used by the /api/knowledge/check-updates route to group chunks by CFR Part
CREATE INDEX IF NOT EXISTS idx_ck_metadata_regulation_id
  ON public.compliance_knowledge ((metadata->>'regulation_id'));

-- ── 2. Index on lastAmendedDate within metadata ──────────────────────────────
-- Used to quickly find the latest version date per Part
CREATE INDEX IF NOT EXISTS idx_ck_metadata_last_amended
  ON public.compliance_knowledge ((metadata->>'lastAmendedDate'))
  WHERE metadata->>'lastAmendedDate' IS NOT NULL;

-- ── 3. Index for contains_table flag ─────────────────────────────────────────
-- Helps identify chunks with tabular data (nutrition facts, additive limits)
CREATE INDEX IF NOT EXISTS idx_ck_metadata_contains_table
  ON public.compliance_knowledge ((metadata->>'contains_table'))
  WHERE metadata->>'contains_table' = 'true';
