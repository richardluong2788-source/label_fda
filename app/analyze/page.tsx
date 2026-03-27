import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'
import { LabelAnalyzer } from '@/components/label-analyzer'

export default async function AnalyzePage() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <AppHeader email={user.email || ''} isAdmin={isAdmin} />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <LabelAnalyzer />
      </main>
    </div>
  )
}
