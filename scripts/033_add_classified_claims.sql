-- Migration 033: Add classified_claims column for dietary supplement claims classification
-- This column stores the result of 21 CFR 101.36 and DSHEA compliance classification
-- Reference: lib/types.ts ClassifiedClaim interface and lib/claims-validator.ts classifyClaimsForSupplements()

ALTER TABLE audit_reports
  ADD COLUMN IF NOT EXISTS classified_claims JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN audit_reports.classified_claims IS 'Array of ClassifiedClaim objects from dietary supplement claims classification (21 CFR 101.36, DSHEA). Null if product is not a supplement.';
