-- Migration 051: Add allergen_declaration column to fsvp_hazard_analyses
-- This enables tracking of declared allergens from label scan for better FSVP compliance

DO $$
BEGIN
  -- Add allergen_declaration column to fsvp_hazard_analyses
  ALTER TABLE public.fsvp_hazard_analyses
  ADD COLUMN IF NOT EXISTS allergen_declaration TEXT;
  
  -- Add comment
  COMMENT ON COLUMN fsvp_hazard_analyses.allergen_declaration IS 'Allergen declaration text from label (e.g., "CONTAINS: Cashews, Peanut")';
  
  RAISE NOTICE 'Migration 051 completed: Added allergen_declaration to fsvp_hazard_analyses';
END $$;
