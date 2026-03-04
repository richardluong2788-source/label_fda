-- Migration 031: Fix quota functions to be atomic/race-condition-safe
-- Root cause: get_or_create_subscription used plain INSERT without ON CONFLICT,
-- causing silent failures under concurrent requests or transaction conflicts.
-- Result: increment_reports_used UPDATE had 0 rows to update, quota was never tracked.

-- ============================================================
-- FIX 1: get_or_create_subscription — use INSERT ON CONFLICT DO NOTHING
-- Atomic upsert ensures exactly one row per user even under concurrency
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_subscription(p_user_id UUID)
RETURNS public.user_subscriptions
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sub public.user_subscriptions;
BEGIN
  -- Atomic insert: if row already exists, do nothing (no error, no duplicate)
  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (p_user_id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  -- Always SELECT after to get the definitive row (whether inserted or pre-existing)
  SELECT * INTO v_sub
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  RETURN v_sub;
END;
$$;

-- ============================================================
-- FIX 2: increment_reports_used — add UPSERT fallback
-- If UPDATE affects 0 rows (row somehow missing), INSERT with reports_used=1
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_reports_used(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Try UPDATE first (normal path)
  UPDATE public.user_subscriptions
  SET reports_used = reports_used + 1,
      updated_at   = NOW()
  WHERE user_id = p_user_id;

  -- Fallback: if no row existed, insert a new free subscription with reports_used=1
  IF NOT FOUND THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, reports_used)
    VALUES (p_user_id, 'free', 'active', 1)
    ON CONFLICT (user_id) DO UPDATE
      SET reports_used = public.user_subscriptions.reports_used + 1,
          updated_at   = NOW();
  END IF;
END;
$$;

-- ============================================================
-- FIX 3: check_quota — also use the new atomic get_or_create_subscription
-- (no logic change needed, just re-deploys to pick up the fixed helper)
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
  -- Get or create subscription (now atomic)
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
-- FIX 4: check_quota with fingerprint signature (for anonymous/abuse check)
-- Replicate the same atomic fix for the overloaded version if it exists
-- ============================================================
DO $$
BEGIN
  -- Only recreate if the fingerprint version exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_quota'
    AND pronargs = 2
    AND pronamespace = 'public'::regnamespace
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.check_quota(p_user_id UUID, p_fingerprint TEXT)
      RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER
      AS $inner$
      DECLARE
        v_sub   public.user_subscriptions;
        v_plan  public.subscription_plans;
        v_now   TIMESTAMPTZ := NOW();
      BEGIN
        v_sub := public.get_or_create_subscription(p_user_id);

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
      $inner$
    $func$;
  END IF;
END;
$$;

-- ============================================================
-- GRANT: ensure service_role can call these functions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_or_create_subscription(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_reports_used(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_quota(UUID) TO service_role;

-- ============================================================
-- DATA FIX: Reset reports_used for the affected user so the
-- counter reflects reality (2 reports already done = 2 used)
-- ============================================================
UPDATE public.user_subscriptions
SET reports_used = (
  SELECT COUNT(*) 
  FROM public.audit_reports ar
  WHERE ar.user_id = user_subscriptions.user_id
    AND ar.created_at >= user_subscriptions.current_period_start
    AND ar.analysis_phase = 'full'
)
WHERE plan_id = 'free' AND reports_used = 0;
