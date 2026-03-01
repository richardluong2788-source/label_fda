-- Migration 015: Add Payment and Preview Fields
-- Purpose: Enable freemium model with payment wall

-- Add payment fields to audit_reports
ALTER TABLE audit_reports 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'free_preview',
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS report_unlocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unlock_token VARCHAR(255);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_reports_payment_status ON audit_reports(payment_status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_unlock_token ON audit_reports(unlock_token);

-- Add comments
COMMENT ON COLUMN audit_reports.payment_status IS 'Payment status: free_preview, paid, expert_review, refunded';
COMMENT ON COLUMN audit_reports.report_unlocked IS 'Whether full report is accessible (TRUE after payment)';
COMMENT ON COLUMN audit_reports.unlock_token IS 'Unique token for unlocking report after payment';
