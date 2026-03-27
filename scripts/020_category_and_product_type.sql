-- ================================================================
-- Migration 020: Category Tagging & Product Type Classification
-- ================================================================
-- Muc tieu:
--   1. Them column product_type vao pending_warning_letters
--      de phan loai warning letter theo loai san pham (food/drug/
--      cosmetic/device/tobacco/veterinary/biologics/unknown).
--
--   2. Backfill metadata->>'category', metadata->>'regulation',
--      metadata->>'part_number' va top-level source column cho
--      3,117+ chunks trong compliance_knowledge bi thieu tag.
--      Nguyen nhan: khi import, data duoc luu vao JSONB metadata
--      nhung cac truong phan loai khong duoc promote len.
--
--   3. Fix top-level source column cho tat ca rows con null
--      bang cach dong bo tu metadata->>'source'.
--
-- AN TOAN chay lai: tat ca deu dung IF NOT EXISTS / CASE / WHERE
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. Them column product_type vao pending_warning_letters
-- ----------------------------------------------------------------
ALTER TABLE public.pending_warning_letters
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'unknown';

-- Backfill existing rows dua tren issuing_office
UPDATE public.pending_warning_letters
SET product_type = CASE
  WHEN issuing_office ILIKE '%cfsan%'
    OR issuing_office ILIKE '%food safety%'
    OR issuing_office ILIKE '%nutrition%'       THEN 'food'
  WHEN issuing_office ILIKE '%cder%'
    OR issuing_office ILIKE '%drug evaluation%' THEN 'drug'
  WHEN issuing_office ILIKE '%cdrh%'
    OR issuing_office ILIKE '%devices%'
    OR issuing_office ILIKE '%radiological%'    THEN 'device'
  WHEN issuing_office ILIKE '%ctp%'
    OR issuing_office ILIKE '%tobacco%'         THEN 'tobacco'
  WHEN issuing_office ILIKE '%cvm%'
    OR issuing_office ILIKE '%veterinary%'      THEN 'veterinary'
  WHEN issuing_office ILIKE '%cber%'
    OR issuing_office ILIKE '%biologics%'       THEN 'biologics'
  ELSE 'unknown'
END
WHERE product_type = 'unknown' OR product_type IS NULL;

-- Index cho filter theo product_type
CREATE INDEX IF NOT EXISTS idx_pending_wl_product_type
  ON public.pending_warning_letters (product_type);

-- ----------------------------------------------------------------
-- 2. Backfill category / regulation / part_number vao JSONB
--    metadata cua compliance_knowledge (cac rows bi thieu tag)
-- ----------------------------------------------------------------

-- 2a. 21 CFR Part 101 — Food labeling (so luong lon nhat)
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 101',
  metadata = metadata || jsonb_build_object(
    'category',    'food',
    'regulation',  '21 CFR Part 101',
    'part_number', '101'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source'   = '21 CFR Part 101';

-- 2b. 21 CFR Part 102 — Common or usual name for nonstandardized food
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 102',
  metadata = metadata || jsonb_build_object(
    'category',    'food',
    'regulation',  '21 CFR Part 102',
    'part_number', '102'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source'   = '21 CFR Part 102';

-- 2c. 21 CFR Part 104 — Nutritional quality guidelines
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 104',
  metadata = metadata || jsonb_build_object(
    'category',    'food',
    'regulation',  '21 CFR Part 104',
    'part_number', '104'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source'   = '21 CFR Part 104';

-- 2d. 21 CFR Part 105 — Foods for special dietary use
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 105',
  metadata = metadata || jsonb_build_object(
    'category',    'food',
    'regulation',  '21 CFR Part 105',
    'part_number', '105'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source'   = '21 CFR Part 105';

-- 2e. 21 CFR Part 201 — Drug labeling
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 201',
  metadata = metadata || jsonb_build_object(
    'category',    'drug',
    'regulation',  '21 CFR Part 201',
    'part_number', '201'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source'   = '21 CFR Part 201';

-- 2f. 21 CFR Part 701 — Cosmetic labeling
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 701',
  metadata = metadata || jsonb_build_object(
    'category',    'cosmetic',
    'regulation',  '21 CFR Part 701',
    'part_number', '701'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source'   = '21 CFR Part 701';

-- 2g. 21 CFR Part 720 — Voluntary filing of cosmetic product formulations
UPDATE public.compliance_knowledge
SET
  source   = '21 CFR Part 720',
  metadata = metadata || jsonb_build_object(
    'category',    'cosmetic',
    'regulation',  '21 CFR Part 720',
    'part_number', '720'
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source'   = '21 CFR Part 720';

-- 2h. Catch-all: bat ky source nao chua ro, phan loai qua pattern
--     so part number: 100-199 = food, 200-499 = drug,
--     600-799 = biologics/cosmetic
UPDATE public.compliance_knowledge
SET
  metadata = metadata || jsonb_build_object(
    'category', CASE
      WHEN metadata->>'source' ~ '21 CFR Part (10[0-9]|1[1-9][0-9])$' THEN 'food'
      WHEN metadata->>'source' ~ '21 CFR Part (2[0-9]{2}|3[0-9]{2}|4[0-9]{2})$' THEN 'drug'
      WHEN metadata->>'source' ~ '21 CFR Part (60[0-9]|6[1-9][0-9])$' THEN 'biologics'
      WHEN metadata->>'source' ~ '21 CFR Part (70[0-9]|7[1-9][0-9])$' THEN 'cosmetic'
      ELSE 'food'  -- default: food (majority of FDA labeling regs)
    END
  )
WHERE metadata->>'category' IS NULL
  AND metadata->>'source' IS NOT NULL;

-- ----------------------------------------------------------------
-- 3. Fix top-level source column: dong bo tu metadata->>'source'
--    cho tat ca rows con null o cot source
-- ----------------------------------------------------------------
UPDATE public.compliance_knowledge
SET source = metadata->>'source'
WHERE source IS NULL
  AND metadata->>'source' IS NOT NULL;

-- ----------------------------------------------------------------
-- 4. Index moi de RAG query theo category hieu qua hon
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ck_category
  ON public.compliance_knowledge ((metadata->>'category'));

CREATE INDEX IF NOT EXISTS idx_ck_source
  ON public.compliance_knowledge (source);

CREATE INDEX IF NOT EXISTS idx_ck_category_source
  ON public.compliance_knowledge ((metadata->>'category'), source);

-- ----------------------------------------------------------------
-- Verification (ket qua mong doi: remaining_null_category = 0)
-- ----------------------------------------------------------------
DO $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM compliance_knowledge
  WHERE metadata->>'category' IS NULL;

  IF remaining > 0 THEN
    RAISE WARNING 'Migration 020: % rows still missing category tag', remaining;
  ELSE
    RAISE NOTICE 'Migration 020: All compliance_knowledge rows have category tag. OK.';
  END IF;
END $$;

COMMIT;
