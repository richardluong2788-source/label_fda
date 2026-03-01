-- Migration 016: Create Subscription Tables
-- Purpose: Implement SaaS Subscription model (Model B) for Vietnamese market
-- Note: No Stripe — using VNPay QR for payment

-- ============================================================
-- TABLE: subscription_plans (master plan catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id          TEXT PRIMARY KEY,                 -- 'free', 'starter', 'pro', 'enterprise'
  name        TEXT NOT NULL,
  price_vnd   INTEGER NOT NULL DEFAULT 0,       -- monthly price in VND
  reports_limit INTEGER NOT NULL DEFAULT 1,     -- max AI reports per billing cycle
  expert_reviews_limit INTEGER NOT NULL DEFAULT 0,
  storage_days INTEGER,                         -- NULL = unlimited
  features    JSONB NOT NULL DEFAULT '[]',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed plan data
INSERT INTO public.subscription_plans (id, name, price_vnd, reports_limit, expert_reviews_limit, storage_days, features, sort_order)
VALUES
  ('free',       'Free Trial',  0,       1,          0,    7,    '["1 lượt AI/tháng","Xem trước báo cáo 7 ngày","Hỗ trợ email"]', 1),
  ('starter',    'Starter',     299000,  5,          0,    60,   '["5 lượt AI/tháng","Lưu báo cáo 60 ngày","Xuất PDF","Hỗ trợ ưu tiên"]', 2),
  ('pro',        'Pro',         899000,  20,         2,    NULL, '["20 lượt AI/tháng","2 Expert Review/tháng","Lưu vĩnh viễn","Xuất PDF + Excel","Hỗ trợ 24/7"]', 3),
  ('enterprise', 'Enterprise',  0,       -1,         -1,   NULL, '["Không giới hạn lượt","Không giới hạn Expert Review","Lưu vĩnh viễn","API access","SLA riêng"]', 4)
ON CONFLICT (id) DO UPDATE SET
  name                 = EXCLUDED.name,
  price_vnd            = EXCLUDED.price_vnd,
  reports_limit        = EXCLUDED.reports_limit,
  expert_reviews_limit = EXCLUDED.expert_reviews_limit,
  storage_days         = EXCLUDED.storage_days,
  features             = EXCLUDED.features,
  sort_order           = EXCLUDED.sort_order;

-- ============================================================
-- TABLE: user_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                 TEXT NOT NULL REFERENCES public.subscription_plans(id) DEFAULT 'free',
  status                  TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired', 'pending_payment')),

  -- Billing cycle
  current_period_start    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Usage tracking (reset each billing cycle)
  reports_used            INTEGER NOT NULL DEFAULT 0,
  expert_reviews_used     INTEGER NOT NULL DEFAULT 0,

  -- VNPay / manual payment tracking
  last_payment_at         TIMESTAMPTZ,
  last_payment_amount_vnd INTEGER,
  last_payment_ref        TEXT,                 -- VNPay transaction reference

  -- Metadata
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_subscriptions_user_unique UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id  ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id  ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status   ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period   ON public.user_subscriptions(current_period_end);

-- Auto-update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLE: payment_transactions (VNPay payment history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES public.user_subscriptions(id),
  plan_id             TEXT NOT NULL,
  amount_vnd          INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'expired')),

  -- VNPay specific fields
  vnpay_txn_ref       TEXT UNIQUE,             -- Our generated order code
  vnpay_transaction_no TEXT,                   -- VNPay transaction number
  vnpay_bank_code     TEXT,                    -- Bank code (e.g., "VCB", "TCB")
  vnpay_pay_date      TEXT,                    -- VNPay pay date string
  vnpay_response_code TEXT,                    -- VNPay response code ("00" = success)
  vnpay_secure_hash   TEXT,                    -- For verification

  -- QR / payment info
  qr_code_url         TEXT,                    -- Generated QR image URL
  payment_url         TEXT,                    -- VNPay redirect URL
  expires_at          TIMESTAMPTZ,             -- QR/session expiry

  description         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_user_id      ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_ref          ON public.payment_transactions(vnpay_txn_ref);
CREATE INDEX IF NOT EXISTS idx_payment_txn_status       ON public.payment_transactions(status);

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.subscription_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions  ENABLE ROW LEVEL SECURITY;

-- subscription_plans: everyone can read (public catalog)
CREATE POLICY "plans_select_all"
  ON public.subscription_plans FOR SELECT
  TO authenticated USING (TRUE);

-- user_subscriptions: users see only their own
CREATE POLICY "subscriptions_select_own"
  ON public.user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own"
  ON public.user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own"
  ON public.user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- payment_transactions: users see only their own
CREATE POLICY "payment_txn_select_own"
  ON public.payment_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "payment_txn_insert_own"
  ON public.payment_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: get_or_create_subscription
-- Auto-provisions a free-tier subscription for new users
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_subscription(p_user_id UUID)
RETURNS public.user_subscriptions
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sub public.user_subscriptions;
BEGIN
  SELECT * INTO v_sub
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status)
    VALUES (p_user_id, 'free', 'active')
    RETURNING * INTO v_sub;
  END IF;

  RETURN v_sub;
END;
$$;

-- ============================================================
-- FUNCTION: check_quota
-- Returns TRUE if user still has quota remaining this period
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sub   public.user_subscriptions;
  v_plan  public.subscription_plans;
  v_now   TIMESTAMPTZ := NOW();
BEGIN
  -- Get or create subscription
  v_sub := public.get_or_create_subscription(p_user_id);

  -- Auto-renew if period has expired and subscription is active
  IF v_sub.current_period_end < v_now AND v_sub.status = 'active' THEN
    UPDATE public.user_subscriptions
    SET current_period_start = v_now,
        current_period_end   = v_now + INTERVAL '30 days',
        reports_used         = 0,
        expert_reviews_used  = 0,
        updated_at           = v_now
    WHERE user_id = p_user_id
    RETURNING * INTO v_sub;
  END IF;

  -- Get plan limits
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_sub.plan_id;

  RETURN jsonb_build_object(
    'plan_id',              v_sub.plan_id,
    'plan_name',            v_plan.name,
    'status',               v_sub.status,
    'reports_used',         v_sub.reports_used,
    'reports_limit',        v_plan.reports_limit,
    'has_quota',            (v_plan.reports_limit = -1 OR v_sub.reports_used < v_plan.reports_limit),
    'expert_reviews_used',  v_sub.expert_reviews_used,
    'expert_reviews_limit', v_plan.expert_reviews_limit,
    'period_end',           v_sub.current_period_end
  );
END;
$$;

-- ============================================================
-- FUNCTION: increment_reports_used
-- Called after a successful analysis to track quota usage
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_reports_used(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET reports_used = reports_used + 1,
      updated_at   = NOW()
  WHERE user_id = p_user_id;
END;
$$;
