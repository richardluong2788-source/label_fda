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

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!adminUser || !adminUser.can_review) {
    redirect('/dashboard')
  }

  // Get reports pending review
  const { data: pendingReports } = await supabase
    .from('audit_reports')
    .select(`
      id,
      file_name,
      product_name,
      brand_name,
      status,
      overall_risk_score,
      needs_expert_review,
      findings,
      citation_count,
      created_at,
      updated_at,
      user_id
    `)
    .eq('status', 'ai_completed')
    .order('created_at', { ascending: false })

  // Get reports needing attention
  const { data: attentionReports } = await supabase
    .from('audit_reports')
    .select(`
      id,
      file_name,
      product_name,
      brand_name,
      status,
      overall_risk_score,
      needs_expert_review,
      findings,
      citation_count,
      created_at,
      updated_at,
      user_id
    `)
    .eq('needs_expert_review', true)
    .order('created_at', { ascending: false })

  // Collect unique user IDs and fetch their emails using service role
  const allReports = [...(pendingReports || []), ...(attentionReports || [])]
  const userIds = [...new Set(allReports.map(r => r.user_id).filter(Boolean))]
  
  let userEmailMap: Record<string, string> = {}
  
  if (userIds.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Fetch users in batches
    const { data: usersData } = await serviceClient.auth.admin.listUsers({
      perPage: 1000,
    })
    
    if (usersData?.users) {
      userEmailMap = usersData.users.reduce((acc, u) => {
        acc[u.id] = u.email || 'Unknown'
        return acc
      }, {} as Record<string, string>)
    }
  }

  // Attach user email to reports
  const enrichedPendingReports = (pendingReports || []).map(r => ({
    ...r,
    user_email: userEmailMap[r.user_id] || null,
  }))
  
  const enrichedAttentionReports = (attentionReports || []).map(r => ({
    ...r,
    user_email: userEmailMap[r.user_id] || null,
  }))

  return (
    <AdminDashboard
      adminUser={adminUser}
      pendingReports={enrichedPendingReports}
      attentionReports={enrichedAttentionReports}
      userEmail={user.email || ''}
    />
  )
}
