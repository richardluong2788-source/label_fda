import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!adminUser || !adminUser.can_review) {
    redirect('/dashboard')
  }

  // Luồng 1 — AI Risk Monitor: report AI flag risk cao, chưa có expert_review_request nào
  const { data: riskReports } = await supabase
    .from('audit_reports')
    .select(`
      id,
      file_name,
      product_name,
      brand_name,
      status,
      overall_risk_score,
      needs_expert_review,
      expert_review_status,
      findings,
      citation_count,
      created_at,
      updated_at,
      user_id
    `)
    .eq('needs_expert_review', true)
    .is('expert_review_status', null)
    .order('overall_risk_score', { ascending: false })
    .limit(50)

  // Luồng 2 — Expert Queue count (client sẽ fetch chi tiết)
  const { count: expertQueueCount } = await supabase
    .from('expert_review_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: expertInReviewCount } = await supabase
    .from('expert_review_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_review')

  // Hoàn thành hôm nay
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: completedTodayCount } = await supabase
    .from('expert_review_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('sign_off_at', todayStart.toISOString())

  // Enrich risk reports with user emails
  const userIds = [...new Set((riskReports || []).map((r) => r.user_id).filter(Boolean))]
  let userEmailMap: Record<string, string> = {}

  if (userIds.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: usersData } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
    if (usersData?.users) {
      userEmailMap = usersData.users.reduce(
        (acc, u) => { acc[u.id] = u.email || 'Unknown'; return acc },
        {} as Record<string, string>
      )
    }
  }

  const enrichedRiskReports = (riskReports || []).map((r) => ({
    ...r,
    user_email: userEmailMap[r.user_id] || null,
  }))

  return (
    <AdminDashboard
      adminUser={adminUser}
      riskReports={enrichedRiskReports}
      expertQueueCount={expertQueueCount ?? 0}
      expertInReviewCount={expertInReviewCount ?? 0}
      completedTodayCount={completedTodayCount ?? 0}
      userEmail={user.email || ''}
    />
  )
}
