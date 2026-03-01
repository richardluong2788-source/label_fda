-- ========== MIGRATION 017: AUTO-CORRECT CFR METADATA TRIGGER ==========
-- Purpose: Prevent "Part 701 stored as Food & Beverages" class of bugs.
-- This trigger fires on every INSERT/UPDATE on compliance_knowledge and
-- auto-corrects source, industry, category, part_number based on the
-- actual CFR part number detected in the content.
--
-- This is the server-side counterpart of lib/rag/cfr-metadata-mapper.ts.
-- Both must be kept in sync when adding new CFR parts.
-- =========================================================================

-- Step 1: Create the correction function
CREATE OR REPLACE FUNCTION public.correct_cfr_metadata()
RETURNS TRIGGER AS $$
DECLARE
  detected_part TEXT;
  v_source      TEXT;
  v_industry    TEXT;
  v_category    TEXT;
  v_regulation  TEXT;
BEGIN
  -- -----------------------------------------------------------------------
  -- Detect CFR part number from content (same priority as TypeScript mapper)
  -- Priority 1: section reference  "§ 701.30"
  -- Priority 2: "21 CFR Part 701" / "CFR Part 701"
  -- Priority 3: "Part 701"
  -- -----------------------------------------------------------------------
  detected_part := (regexp_match(NEW.content, '[§]\s*([78][0-9]{2}|[12][0-9]{2})\.[0-9]'))[1];

  IF detected_part IS NULL THEN
    detected_part := (regexp_match(NEW.content, '(?:21\s*)?[Cc][Ff][Rr]\s*[Pp]art\s*([0-9]{2,3})\b'))[1];
  END IF;

  IF detected_part IS NULL THEN
    detected_part := (regexp_match(NEW.content, '\b[Pp]art\s*([78][0-9]{2}|[12][0-9]{2})\b'))[1];
  END IF;

  -- -----------------------------------------------------------------------
  -- If no part detected, leave metadata unchanged
  -- -----------------------------------------------------------------------
  IF detected_part IS NULL THEN
    RETURN NEW;
  END IF;

  -- -----------------------------------------------------------------------
  -- Map part number → correct metadata values
  -- -----------------------------------------------------------------------
  CASE detected_part
    -- Food labeling
    WHEN '101' THEN v_source := '21 CFR Part 101'; v_industry := 'Food & Beverages';    v_category := 'food';       v_regulation := '21 CFR Part 101';
    WHEN '102' THEN v_source := '21 CFR Part 102'; v_industry := 'Food & Beverages';    v_category := 'food';       v_regulation := '21 CFR Part 102';
    WHEN '104' THEN v_source := '21 CFR Part 104'; v_industry := 'Food & Beverages';    v_category := 'food';       v_regulation := '21 CFR Part 104';
    WHEN '105' THEN v_source := '21 CFR Part 105'; v_industry := 'Food & Beverages';    v_category := 'food';       v_regulation := '21 CFR Part 105';
    -- Drug labeling
    WHEN '201' THEN v_source := '21 CFR Part 201'; v_industry := 'Pharmaceuticals';     v_category := 'drug';       v_regulation := '21 CFR Part 201';
    WHEN '202' THEN v_source := '21 CFR Part 202'; v_industry := 'Pharmaceuticals';     v_category := 'drug';       v_regulation := '21 CFR Part 202';
    WHEN '206' THEN v_source := '21 CFR Part 206'; v_industry := 'Pharmaceuticals';     v_category := 'drug';       v_regulation := '21 CFR Part 206';
    -- Dietary supplements
    WHEN '111' THEN v_source := '21 CFR Part 111'; v_industry := 'Dietary Supplements'; v_category := 'supplement'; v_regulation := '21 CFR Part 111';
    WHEN '190' THEN v_source := '21 CFR Part 190'; v_industry := 'Dietary Supplements'; v_category := 'supplement'; v_regulation := '21 CFR Part 190';
    -- Cosmetics
    WHEN '700' THEN v_source := '21 CFR Part 700'; v_industry := 'Cosmetics';           v_category := 'cosmetic';   v_regulation := '21 CFR Part 700';
    WHEN '701' THEN v_source := '21 CFR Part 701'; v_industry := 'Cosmetics';           v_category := 'cosmetic';   v_regulation := '21 CFR Part 701';
    WHEN '710' THEN v_source := '21 CFR Part 710'; v_industry := 'Cosmetics';           v_category := 'cosmetic';   v_regulation := '21 CFR Part 710';
    WHEN '720' THEN v_source := '21 CFR Part 720'; v_industry := 'Cosmetics';           v_category := 'cosmetic';   v_regulation := '21 CFR Part 720';
    WHEN '740' THEN v_source := '21 CFR Part 740'; v_industry := 'Cosmetics';           v_category := 'cosmetic';   v_regulation := '21 CFR Part 740';
    -- Medical devices
    WHEN '801' THEN v_source := '21 CFR Part 801'; v_industry := 'Medical Devices';     v_category := 'device';     v_regulation := '21 CFR Part 801';
    WHEN '820' THEN v_source := '21 CFR Part 820'; v_industry := 'Medical Devices';     v_category := 'device';     v_regulation := '21 CFR Part 820';
    ELSE
      -- Unknown part — leave metadata unchanged
      RETURN NEW;
  END CASE;

  -- -----------------------------------------------------------------------
  -- Apply corrections to the row being inserted/updated
  -- -----------------------------------------------------------------------
  NEW.source := v_source;
  NEW.metadata := NEW.metadata
    || jsonb_build_object(
         'source',       v_source,
         'regulation',   v_regulation,
         'industry',     v_industry,
         'category',     v_category,
         'part_number',  detected_part,
         'document_type','FDA Regulation'
       );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop old trigger if exists, then create fresh
DROP TRIGGER IF EXISTS trg_correct_cfr_metadata ON public.compliance_knowledge;

CREATE TRIGGER trg_correct_cfr_metadata
  BEFORE INSERT OR UPDATE ON public.compliance_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.correct_cfr_metadata();

-- Step 3: Back-fill all existing rows that are missing or wrong
-- Run the same correction logic on the full table as a one-time fix.
UPDATE public.compliance_knowledge
SET updated_at = now()   -- touching updated_at fires the BEFORE UPDATE trigger above
WHERE
  -- Only rows where content contains a recognisable CFR part reference
  content ~ '[§]\s*[0-9]{3}\.[0-9]'
  OR content ~* '(?:21\s*)?cfr\s*part\s*[0-9]{2,3}'
  OR content ~* '\bpart\s*[78][0-9]{2}\b';

-- Step 4: Verify results
SELECT
  metadata->>'source'      AS source,
  metadata->>'industry'    AS industry,
  metadata->>'category'    AS category,
  metadata->>'part_number' AS part_number,
  COUNT(*)                 AS doc_count
FROM public.compliance_knowledge
GROUP BY 1, 2, 3, 4
ORDER BY doc_count DESC;
