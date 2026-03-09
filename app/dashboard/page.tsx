import { createClient } from '@/lib/supabase/server'
import type { AuditReport } from '@/lib/types'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch reports
  const { data: reports } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as { data: AuditReport[] | null }

  const allReports = reports || []

  // Subscription / quota
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(name, reports_limit)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  // Check admin role
  const { data: adminRecord } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin =
    adminRecord?.role === 'admin' ||
    adminRecord?.role === 'superadmin' ||
    adminRecord?.role === 'expert'

  // Get plan info from subscription or fallback to actual free plan from database
  let planName = (subscription?.subscription_plans as any)?.name
  let reportsLimit = (subscription?.subscription_plans as any)?.reports_limit
  const reportsUsed = subscription?.reports_used ?? 0
  const planId = subscription?.plan_id ?? 'free'

  // If no subscription or join failed, fetch the actual plan from database
  // This ensures admin changes to plans are reflected immediately
  if (planName === undefined || reportsLimit === undefined) {
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('name, reports_limit')
      .eq('id', planId)
      .single()
    
    planName = freePlan?.name ?? 'Free Trial'
    reportsLimit = freePlan?.reports_limit ?? 1
  }

  return (
    <DashboardClient
      allReports={allReports}
      planName={planName}
      reportsLimit={reportsLimit}
      reportsUsed={reportsUsed}
      planId={planId}
      isAdmin={isAdmin}
    />
  )
}
