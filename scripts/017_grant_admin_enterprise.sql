-- Migration 017: Grant Enterprise plan to all admin users
-- Admins should have unlimited access — no quota restrictions.
-- This upserts an active enterprise subscription for every existing admin user.
-- Re-runnable: safe to execute multiple times (ON CONFLICT DO UPDATE).

-- 1. Upsert enterprise subscription for all current admin users
INSERT INTO public.user_subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  reports_used,
  expert_reviews_used,
  notes
)
SELECT
  au.user_id,
  'enterprise',
  'active',
  NOW(),
  NOW() + INTERVAL '100 years',  -- effectively never expires
  0,
  0,
  'Auto-granted: admin user'
FROM public.admin_users au
ON CONFLICT (user_id) DO UPDATE SET
  plan_id              = 'enterprise',
  status               = 'active',
  current_period_end   = NOW() + INTERVAL '100 years',
  reports_used         = 0,
  notes                = 'Auto-granted: admin user',
  updated_at           = NOW();

-- 2. Also unlock all their existing audit_reports (in case any were locked)
UPDATE public.audit_reports ar
SET
  report_unlocked = TRUE,
  payment_status  = 'paid'
FROM public.admin_users au
WHERE ar.user_id = au.user_id
  AND ar.report_unlocked = FALSE;
