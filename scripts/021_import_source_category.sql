-- ============================================================
-- Migration 021: Backfill category + source for already-imported
--                Warning Letter and Recall chunks in compliance_knowledge
--
-- Purpose: Any chunks imported BEFORE the fix in routes (letters/recalls
--          import) will be missing metadata.category and top-level source.
--          This migration corrects them so RAG can find them properly.
--
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 021-1. Backfill category for Warning Letter chunks
--        Rule: industry field (Drug/Food/Cosmetic/Device) → lowercase category
UPDATE public.compliance_knowledge
SET
  source   = 'FDA Warning Letter',
  metadata = metadata || jsonb_build_object(
    'category', CASE
      WHEN (metadata->>'industry') ILIKE 'drug'       THEN 'drug'
      WHEN (metadata->>'industry') ILIKE 'cosmetic'   THEN 'cosmetic'
      WHEN (metadata->>'industry') ILIKE 'device'     THEN 'device'
      WHEN (metadata->>'industry') ILIKE 'tobacco'    THEN 'tobacco'
      WHEN (metadata->>'industry') ILIKE 'veterinary' THEN 'veterinary'
      WHEN (metadata->>'industry') ILIKE 'biologics'  THEN 'biologics'
      ELSE 'food'
    END,
    'source', 'FDA Warning Letter'
  )
WHERE metadata->>'document_type' = 'FDA Warning Letter'
  AND (
    metadata->>'category' IS NULL
    OR source IS NULL
  );

-- 021-2. Backfill category for Recall chunks
--        Rule: product_type field → lowercase category
UPDATE public.compliance_knowledge
SET
  source   = 'FDA Recall',
  metadata = metadata || jsonb_build_object(
    'category', CASE
      WHEN (metadata->>'product_type') ILIKE 'drug%'        THEN 'drug'
      WHEN (metadata->>'product_type') ILIKE 'cosmetic%'    THEN 'cosmetic'
      WHEN (metadata->>'product_type') ILIKE 'device%'
        OR (metadata->>'product_type') ILIKE 'medical%'     THEN 'device'
      WHEN (metadata->>'product_type') ILIKE 'tobacco%'     THEN 'tobacco'
      WHEN (metadata->>'product_type') ILIKE 'veterinary%'
        OR (metadata->>'product_type') ILIKE 'animal%'      THEN 'veterinary'
      WHEN (metadata->>'product_type') ILIKE 'biologic%'    THEN 'biologics'
      ELSE 'food'
    END,
    'source', 'FDA Recall'
  )
WHERE metadata->>'document_type' = 'FDA Recall'
  AND (
    metadata->>'category' IS NULL
    OR source IS NULL
  );

-- 021-3. Verify counts after backfill (informational only)
-- SELECT 
--   metadata->>'document_type' as doc_type,
--   metadata->>'category'      as category,
--   source,
--   COUNT(*) as count
-- FROM compliance_knowledge
-- WHERE metadata->>'document_type' IN ('FDA Warning Letter', 'FDA Recall')
-- GROUP BY doc_type, category, source
-- ORDER BY doc_type, count DESC;
