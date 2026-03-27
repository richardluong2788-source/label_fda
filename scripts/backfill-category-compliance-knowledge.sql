-- ============================================================
-- Backfill category + regulation fields for 3,117 null-category
-- chunks in compliance_knowledge.
--
-- Root cause: these rows were imported with metadata->>'source'
-- and metadata->>'industry' set correctly inside the JSONB blob,
-- but the following fields were never promoted / populated:
--   • metadata->>'category'
--   • metadata->>'regulation'
--   • metadata->>'part_number'
--   • top-level column: source
--
-- All 3,117 rows confirmed as: 21 CFR Part 101 / Food & Beverages.
-- ============================================================

BEGIN;

UPDATE compliance_knowledge
SET
  -- 1. Top-level source column
  source = '21 CFR Part 101',

  -- 2. Merge new keys into existing JSONB metadata without overwriting
  --    anything already present
  metadata = metadata
    || jsonb_build_object(
         'category',    'food',
         'regulation',  '21 CFR Part 101',
         'part_number', '101'
       )

WHERE
  -- Only touch rows that are missing category
  metadata->>'category' IS NULL
  -- Confirm they really are 21 CFR Part 101 / food rows before writing
  AND metadata->>'source'   = '21 CFR Part 101'
  AND metadata->>'industry' = 'Food & Beverages';

-- Verify: should return 0 after update
SELECT COUNT(*) AS remaining_null_category
FROM compliance_knowledge
WHERE metadata->>'category' IS NULL;

COMMIT;
