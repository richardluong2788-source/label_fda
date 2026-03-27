import { FDAPipelineClient } from "@/components/fda-pipeline-client"
import { AppHeader } from "@/components/app-header"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: "FDA Data Pipeline - Admin",
  description: "Automated FDA Warning Letter and Recall fetching, review, and import pipeline",
}

export default async function FDAPipelinePage() {
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
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = adminUser?.role === 'admin' || adminUser?.role === 'superadmin' || adminUser?.role === 'expert'

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={user.email || ''} isAdmin={isAdmin} />
      <FDAPipelineClient />
    </div>
  )
}
