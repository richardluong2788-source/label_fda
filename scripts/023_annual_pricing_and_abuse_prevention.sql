-- 023_annual_pricing_and_abuse_prevention.sql
-- Purpose: 
-- 1. Add annual pricing columns to subscription_plans
-- 2. Create device fingerprint tracking to prevent free tier abuse
-- 3. Update pricing structure for FDA compliance services

-- ============================================================
-- PART 1: Add Annual Pricing to subscription_plans
-- ============================================================
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS annual_price_vnd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_discount_percent INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- PART 2: Device Fingerprint Tracking (Prevent Free Tier Abuse)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint     TEXT NOT NULL,           -- Browser fingerprint hash
  ip_address      TEXT,                    -- IP address at registration
  user_agent      TEXT,                    -- Browser user agent
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON public.device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fp ON public.device_fingerprints(fingerprint);

-- Track how many free accounts were created from same fingerprint/IP
CREATE TABLE IF NOT EXISTS public.free_tier_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint     TEXT NOT NULL,
  ip_address      TEXT,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at      TIMESTAMPTZ DEFAULT NOW(),
  blocked         BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_free_tier_claims_fp ON public.free_tier_claims(fingerprint);
CREATE INDEX IF NOT EXISTS idx_free_tier_claims_ip ON public.free_tier_claims(ip_address);

-- RLS for device_fingerprints
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_tier_claims ENABLE ROW LEVEL SECURITY;

-- Only allow server-side insert (via service role)
CREATE POLICY "device_fp_insert_service"
  ON public.device_fingerprints FOR INSERT
  TO service_role WITH CHECK (TRUE);

CREATE POLICY "free_claims_insert_service"
  ON public.free_tier_claims FOR INSERT  
  TO service_role WITH CHECK (TRUE);

CREATE POLICY "free_claims_select_service"
  ON public.free_tier_claims FOR SELECT
  TO service_role USING (TRUE);

-- ============================================================
-- PART 3: Function to check if free tier is allowed for device
-- Returns: { allowed: boolean, reason: string, existing_claims: number }
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_free_tier_eligibility(
  p_fingerprint TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_fp_count INTEGER;
  v_ip_count INTEGER;
  v_total_abuse_score INTEGER;
  v_max_allowed INTEGER := 2; -- Max 2 free accounts per device
BEGIN
  -- Count claims from same fingerprint
  SELECT COUNT(*) INTO v_fp_count
  FROM public.free_tier_claims
  WHERE fingerprint = p_fingerprint
    AND blocked = FALSE;
  
  -- Count claims from same IP (last 30 days)
  SELECT COUNT(*) INTO v_ip_count
  FROM public.free_tier_claims
  WHERE ip_address = p_ip_address
    AND claimed_at > NOW() - INTERVAL '30 days'
    AND blocked = FALSE;
  
  -- Calculate abuse score
  v_total_abuse_score := GREATEST(v_fp_count, v_ip_count);
  
  IF v_total_abuse_score >= v_max_allowed THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'Thiết bị này đã sử dụng hết lượt dùng thử miễn phí. Vui lòng nâng cấp gói để tiếp tục.',
      'fingerprint_claims', v_fp_count,
      'ip_claims', v_ip_count
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'reason', NULL,
    'fingerprint_claims', v_fp_count,
    'ip_claims', v_ip_count,
    'remaining', v_max_allowed - v_total_abuse_score
  );
END;
$$;

-- ============================================================
-- PART 4: Function to record free tier claim
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_free_tier_claim(
  p_user_id UUID,
  p_fingerprint TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_eligibility JSONB;
BEGIN
  -- First check eligibility
  v_eligibility := public.check_free_tier_eligibility(p_fingerprint, p_ip_address);
  
  IF NOT (v_eligibility->>'allowed')::boolean THEN
    RETURN v_eligibility;
  END IF;
  
  -- Record the claim
  INSERT INTO public.free_tier_claims (fingerprint, ip_address, user_id)
  VALUES (p_fingerprint, p_ip_address, p_user_id)
  ON CONFLICT DO NOTHING;
  
  -- Also record device fingerprint
  INSERT INTO public.device_fingerprints (user_id, fingerprint, ip_address)
  VALUES (p_user_id, p_fingerprint, p_ip_address)
  ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Free tier claim recorded'
  );
END;
$$;

-- ============================================================
-- PART 5: Update check_quota to verify free tier eligibility
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_quota(p_user_id UUID, p_fingerprint TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sub   public.user_subscriptions;
  v_plan  public.subscription_plans;
  v_now   TIMESTAMPTZ := NOW();
  v_free_check JSONB;
BEGIN
  -- Get or create subscription
  v_sub := public.get_or_create_subscription(p_user_id);

  -- Get plan limits
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_sub.plan_id;

  -- If on free plan and fingerprint provided, check abuse
  IF v_sub.plan_id = 'free' AND p_fingerprint IS NOT NULL THEN
    v_free_check := public.check_free_tier_eligibility(p_fingerprint, NULL);
    IF NOT (v_free_check->>'allowed')::boolean THEN
      RETURN jsonb_build_object(
        'plan_id',              v_sub.plan_id,
        'plan_name',            v_plan.name,
        'status',               'blocked',
        'has_quota',            FALSE,
        'blocked_reason',       v_free_check->>'reason',
        'reports_used',         v_sub.reports_used,
        'reports_limit',        v_plan.reports_limit
      );
    END IF;
  END IF;

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
