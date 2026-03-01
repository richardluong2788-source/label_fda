import { createClient } from '@/lib/supabase/server'
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
    .select('*')
    .eq('status', 'ai_completed')
    .order('created_at', { ascending: false })

  // Get reports needing attention
  const { data: attentionReports } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('needs_expert_review', true)
    .order('created_at', { ascending: false })

  return (
    <AdminDashboard
      adminUser={adminUser}
      pendingReports={pendingReports || []}
      attentionReports={attentionReports || []}
      userEmail={user.email || ''}
    />
  )
}
