-- 019_add_expert_review_price.sql
-- Thêm cột expert_review_price_vnd vào subscription_plans
-- Mặc định 499000 VND (giá lẻ cho gói Free/Starter không có expert review included)
-- Gói Pro/Enterprise = 0 (included trong gói)

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS expert_review_price_vnd INTEGER NOT NULL DEFAULT 499000;

-- Seed giá theo từng gói
UPDATE subscription_plans SET expert_review_price_vnd = 0      WHERE id = 'free';
UPDATE subscription_plans SET expert_review_price_vnd = 499000 WHERE id = 'starter';
UPDATE subscription_plans SET expert_review_price_vnd = 0      WHERE id = 'pro';
UPDATE subscription_plans SET expert_review_price_vnd = 0      WHERE id = 'enterprise';
