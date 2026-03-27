import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KnowledgeManagement } from '@/components/knowledge-management'

export default async function AdminKnowledgePage() {
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
    .select('role, can_review')
    .eq('user_id', user.id)
    .single()

  if (!adminUser || !['admin', 'superadmin', 'expert'].includes(adminUser.role)) {
    redirect('/dashboard')
  }

  return (
    <KnowledgeManagement 
      userId={user.id} 
      userRole={adminUser.role} 
      userEmail={user.email || ''} 
    />
  )
}
