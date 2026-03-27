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

  // For internal system: unlimited reports, no subscription needed
  const planName = 'Vexim Standard'
  const reportsLimit = 999
  const reportsUsed = allReports.length
  const planId = 'vexim-internal'

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

