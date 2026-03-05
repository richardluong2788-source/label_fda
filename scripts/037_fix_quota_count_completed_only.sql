-- Migration 037: Fix quota to only count successfully completed analyses
-- ============================================================
-- PROBLEM:
--   reports_used is incremented the moment a job is submitted (via submit route).
--   This means failed/stuck jobs (kb_unavailable, queued forever) eat quota.
--   Users who delete broken reports should not lose quota for those.
--
-- SOLUTION:
--   1. increment_reports_used() stays as-is (called at submit time - intentional)
--      → We still charge quota upfront to prevent abuse (check → read → delete → re-check free)
--
--   2. Add decrement_reports_used() — called ONLY when a job genuinely failed
--      (not when user deletes a completed report)
--
--   3. Sync reports_used for all users to reflect current reality:
--      count only reports where status IN ('ai_completed', 'verified', 'completed')
--      within the current billing period.
-- ============================================================

-- ── FUNCTION: decrement_reports_used ────────────────────────
-- Called when a job fails with a system error (kb_unavailable, timeout, etc.)
-- so the user is not penalized for infrastructure failures.
-- NOTE: Will NOT go below 0.
CREATE OR REPLACE FUNCTION public.decrement_reports_used(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET reports_used = GREATEST(0, reports_used - 1),
      updated_at   = NOW()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_reports_used(UUID) TO service_role;

-- ── SYNC: recalculate reports_used for all users ─────────────
-- Only count reports that actually completed successfully.
-- Statuses that count as "used quota": ai_completed, verified, compliant, warning, critical
-- Statuses that do NOT count: queued, processing, failed, kb_unavailable, error
UPDATE public.user_subscriptions us
SET reports_used = (
  SELECT COUNT(*)
  FROM public.audit_reports ar
  WHERE ar.user_id = us.user_id
    AND ar.created_at >= us.current_period_start
    AND ar.created_at <  us.current_period_end
    AND ar.status IN ('ai_completed', 'verified', 'compliant', 'warning', 'critical', 'completed')
),
updated_at = NOW();

-- ── LOG: show updated counts for verification ─────────────────
-- (run manually via Supabase SQL editor to verify)
-- SELECT us.user_id, us.plan_id, us.reports_used, sp.reports_limit,
--        us.current_period_start, us.current_period_end
-- FROM user_subscriptions us
-- JOIN subscription_plans sp ON sp.id = us.plan_id
-- ORDER BY us.updated_at DESC;
