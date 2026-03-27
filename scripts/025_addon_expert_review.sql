-- Migration: Add support for addon Expert Review purchases
-- This allows Pro users to buy additional Expert Review credits via VNPay

-- 1. Add transaction_type to payment_transactions to distinguish subscription vs addon
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS
  transaction_type TEXT DEFAULT 'subscription';

-- Add check constraint for transaction_type (separate statement for IF NOT EXISTS behavior)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_transaction_type_check'
  ) THEN
    ALTER TABLE payment_transactions 
    ADD CONSTRAINT payment_transactions_transaction_type_check 
    CHECK (transaction_type IN ('subscription', 'addon_expert_review'));
  END IF;
END $$;

-- 2. Add reference to audit_report for addon purchases (which report is this addon for)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS
  addon_audit_report_id UUID REFERENCES audit_reports(id);

-- 3. Add metadata field to store addon-specific data (target_market, user_context, etc.)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS
  addon_metadata JSONB;

-- 4. Add fields to expert_review_requests to track addon purchases
ALTER TABLE expert_review_requests ADD COLUMN IF NOT EXISTS
  is_addon_purchase BOOLEAN DEFAULT false;

ALTER TABLE expert_review_requests ADD COLUMN IF NOT EXISTS
  payment_transaction_id UUID REFERENCES payment_transactions(id);

-- 5. Create index for efficient addon transaction lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_addon 
ON payment_transactions(transaction_type, addon_audit_report_id) 
WHERE transaction_type = 'addon_expert_review';

-- 6. Create index for expert_review_requests by payment
CREATE INDEX IF NOT EXISTS idx_expert_review_payment 
ON expert_review_requests(payment_transaction_id) 
WHERE payment_transaction_id IS NOT NULL;

-- 7. Add unique constraint to prevent duplicate expert requests for same payment
ALTER TABLE expert_review_requests DROP CONSTRAINT IF EXISTS unique_payment_transaction;
ALTER TABLE expert_review_requests ADD CONSTRAINT unique_payment_transaction 
UNIQUE (payment_transaction_id);

COMMENT ON COLUMN payment_transactions.transaction_type IS 'Type of transaction: subscription (monthly plan) or addon_expert_review (one-time purchase)';
COMMENT ON COLUMN payment_transactions.addon_audit_report_id IS 'Reference to audit_report for addon purchases';
COMMENT ON COLUMN payment_transactions.addon_metadata IS 'JSON metadata for addon: target_market, user_context, etc.';
COMMENT ON COLUMN expert_review_requests.is_addon_purchase IS 'True if this request was paid via addon purchase (not from plan quota)';
COMMENT ON COLUMN expert_review_requests.payment_transaction_id IS 'Reference to payment transaction for addon purchases';
