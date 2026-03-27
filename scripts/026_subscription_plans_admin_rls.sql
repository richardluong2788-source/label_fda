-- Migration 026: Add admin UPDATE/INSERT/DELETE RLS policies to subscription_plans
-- Root cause: subscription_plans only had plans_select_all policy
-- Admin PUT /api/admin/plans was returning 0 rows -> .single() threw "Cannot coerce the result to a single JSON object"

-- Allow admins to update any plan
DROP POLICY IF EXISTS "plans_admin_update" ON public.subscription_plans;
CREATE POLICY "plans_admin_update"
  ON public.subscription_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Allow admins to insert new plans
DROP POLICY IF EXISTS "plans_admin_insert" ON public.subscription_plans;
CREATE POLICY "plans_admin_insert"
  ON public.subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Allow admins to delete plans
DROP POLICY IF EXISTS "plans_admin_delete" ON public.subscription_plans;
CREATE POLICY "plans_admin_delete"
  ON public.subscription_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Service role bypass (for server-side admin client)
DROP POLICY IF EXISTS "plans_service_role_all" ON public.subscription_plans;
CREATE POLICY "plans_service_role_all"
  ON public.subscription_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
