import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — Admin lấy danh sách requests
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, can_review')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const { data, error } = await supabase
      .from('expert_review_requests')
      .select(`
        id, status, created_at, updated_at,
        user_context, target_market, product_category,
        is_paid, plan_id, assigned_to, assigned_at,
        expert_summary, violation_reviews, recommended_actions,
        sign_off_name, sign_off_at,
        audit_report_id,
        audit_reports (
          id, product_name, file_name, overall_result, overall_risk_score,
          needs_expert_review, product_category, status,
          label_image_url, findings
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ requests: data ?? [] })
  } catch (error: any) {
    console.error('[v0] Expert queue GET error:', error)
    return NextResponse.json({ error: 'Không thể lấy danh sách' }, { status: 500 })
  }
}

// PATCH — Admin cập nhật request (assign, submit review, complete)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, can_review')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminUser || !adminUser.can_review) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      request_id, action,
      expertSummary, violationReviews, recommendedActions, signOffName,
    } = body

    if (!request_id || !action) {
      return NextResponse.json({ error: 'request_id and action required' }, { status: 400 })
    }

    // Lấy request hiện tại
    const { data: reviewReq, error: reqError } = await supabase
      .from('expert_review_requests')
      .select('id, audit_report_id, status')
      .eq('id', request_id)
      .single()

    if (reqError || !reviewReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (action === 'assign') {
      const { error } = await supabase
        .from('expert_review_requests')
        .update({
          status:      'in_review',
          assigned_to: user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', request_id)
      if (error) throw error

      await supabase
        .from('audit_reports')
        .update({ expert_review_status: 'in_review' })
        .eq('id', reviewReq.audit_report_id)

      return NextResponse.json({ success: true, action: 'assigned' })
    }

    if (action === 'complete') {
      if (!expertSummary || !signOffName) {
        return NextResponse.json(
          { error: 'expertSummary và signOffName là bắt buộc' },
          { status: 400 }
        )
      }

      const { error: updateError } = await supabase
        .from('expert_review_requests')
        .update({
          status:              'completed',
          expert_summary:      expertSummary,
          violation_reviews:   violationReviews ?? [],
          recommended_actions: recommendedActions ?? [],
          sign_off_name:       signOffName,
          sign_off_at:         new Date().toISOString(),
          sign_off_user_id:    user.id,
        })
        .eq('id', request_id)
      if (updateError) throw updateError

      await supabase
        .from('audit_reports')
        .update({
          status:               'verified',
          expert_review_status: 'completed',
          reviewed_by:          user.id,
          reviewed_at:          new Date().toISOString(),
          needs_expert_review:  false,
        })
        .eq('id', reviewReq.audit_report_id)

      return NextResponse.json({ success: true, action: 'completed' })
    }

    if (action === 'cancel') {
      const { error: updateError } = await supabase
        .from('expert_review_requests')
        .update({ status: 'cancelled' })
        .eq('id', request_id)
      if (updateError) throw updateError

      await supabase
        .from('audit_reports')
        .update({ expert_review_status: null })
        .eq('id', reviewReq.audit_report_id)

      return NextResponse.json({ success: true, action: 'cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[v0] Expert queue PATCH error:', error)
    return NextResponse.json({ error: 'Không thể cập nhật request' }, { status: 500 })
  }
}
