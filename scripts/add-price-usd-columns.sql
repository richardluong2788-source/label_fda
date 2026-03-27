-- Migration: Add strategic USD pricing columns to subscription_plans
-- Run this when you are ready to implement Phương án 2 (Dual pricing VND + USD)
--
-- After running this migration:
-- 1. Update app/api/admin/plans/route.ts to read/write the new columns
-- 2. Update app/admin/pricing/admin-pricing-manager.tsx to expose USD price inputs
-- 3. Update PricingClient, PricingPageContent, PricingCTA to prefer price_usd when set
-- 4. Update lib/currency.ts getDisplayPrice() — it already accepts an optional priceUsd param

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS price_usd           NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS annual_price_usd    NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expert_review_price_usd NUMERIC(10, 2) DEFAULT NULL;

COMMENT ON COLUMN subscription_plans.price_usd
  IS 'Strategic USD monthly price. When set, this is used instead of converting from price_vnd. NULL = auto-convert.';

COMMENT ON COLUMN subscription_plans.annual_price_usd
  IS 'Strategic USD annual price. When set, this is used instead of converting from annual_price_vnd. NULL = auto-convert.';

COMMENT ON COLUMN subscription_plans.expert_review_price_usd
  IS 'Strategic USD price per expert review. When set, used instead of converting from expert_review_price_vnd. NULL = auto-convert.';
