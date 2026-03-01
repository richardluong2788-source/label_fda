import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpertReviewInterface } from '@/components/expert-review-interface'

export default async function ExpertReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // Get report
  const { data: report, error: reportError } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    redirect('/admin')
  }

  return <ExpertReviewInterface report={report} adminUser={adminUser} />
}
