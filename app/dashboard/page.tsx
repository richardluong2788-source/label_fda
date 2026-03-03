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

  const planName = (subscription?.subscription_plans as any)?.name ?? 'Free Trial'
  const reportsLimit = (subscription?.subscription_plans as any)?.reports_limit ?? 1
  const reportsUsed = subscription?.reports_used ?? 0
  const planId = subscription?.plan_id ?? 'free'

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
