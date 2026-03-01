import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpertReviewWorkspace } from '@/components/expert-review-workspace'

export default async function ExpertReviewPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminUser || !['admin', 'superadmin', 'expert'].includes(adminUser.role)) {
    redirect('/dashboard')
  }

  // Lấy expert request + audit report
  const { data: request, error } = await supabase
    .from('expert_review_requests')
    .select(`
      *,
      audit_reports (
        id, product_name, file_name, overall_result, overall_risk_score,
        findings, needs_expert_review, product_category, status,
        label_image_url, ingredient_list, health_claims,
        allergen_declaration, brand_name, net_quantity,
        commercial_summary, expert_tips, form_data
      )
    `)
    .eq('id', requestId)
    .single()

  if (error || !request) redirect('/admin')

  return (
    <ExpertReviewWorkspace
      request={request}
      report={request.audit_reports}
      adminUser={adminUser}
    />
  )
}
