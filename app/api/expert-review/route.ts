import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST — User tạo yêu cầu tư vấn chuyên gia
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { report_id, user_context, priority } = await request.json()

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 })
    }

    // Verify report belongs to this user
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('id, product_name, overall_result, needs_expert_review, violations, status')
      .eq('id', report_id)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Báo cáo không tồn tại' }, { status: 404 })
    }

    // Check if request already exists for this report
    const { data: existing } = await supabase
      .from('expert_review_requests')
      .select('id, status')
      .eq('report_id', report_id)
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Báo cáo này đã có yêu cầu tư vấn đang xử lý.', existing_id: existing.id },
        { status: 409 }
      )
    }

    // Check quota via subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan_id, expert_reviews_used, subscription_plans(expert_reviews_limit, name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    // Check if admin (bypass quota)
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = !!adminRecord

    if (!isAdmin && subscription) {
      const plan = subscription.subscription_plans as any
      const limit = plan?.expert_reviews_limit ?? 0
      const used  = subscription.expert_reviews_used ?? 0
      // limit = -1 means unlimited
      if (limit !== -1 && used >= limit) {
        return NextResponse.json(
          {
            error: 'quota_exceeded',
            message: `Gói ${plan?.name} đã hết lượt tư vấn chuyên gia (${used}/${limit}). Nâng cấp gói để tiếp tục.`,
            used,
            limit,
          },
          { status: 402 }
        )
      }
    }

    // Determine priority: auto-elevate to urgent if critical violations exist
    const violations = (report.violations as any[]) || []
    const hasCritical = violations.some(v => v.severity === 'critical')
    const finalPriority = priority || (hasCritical ? 'urgent' : report.needs_expert_review ? 'high' : 'normal')

    // Create the request
    const { data: reviewRequest, error: insertError } = await supabase
      .from('expert_review_requests')
      .insert({
        report_id,
        user_id: user.id,
        status: 'pending',
        priority: finalPriority,
        user_context: user_context || null,
        violation_count: violations.length,
        critical_count: violations.filter(v => v.severity === 'critical').length,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[v0] Expert review insert error:', insertError.message)
      throw insertError
    }

    // Update audit_report.expert_review_status
    await supabase
      .from('audit_reports')
      .update({ expert_review_status: 'requested' })
      .eq('id', report_id)

    // Increment expert_reviews_used if user has subscription
    if (!isAdmin && subscription) {
      await supabase
        .from('user_subscriptions')
        .update({ expert_reviews_used: (subscription.expert_reviews_used ?? 0) + 1 })
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true, request: reviewRequest })
  } catch (error: any) {
    console.error('[v0] Expert review route error:', error)
    return NextResponse.json({ error: 'Không thể tạo yêu cầu tư vấn' }, { status: 500 })
  }
}

// GET — User lấy trạng thái request của báo cáo
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('report_id')
    if (!reportId) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('expert_review_requests')
      .select(`
        id, status, priority, created_at, updated_at,
        user_context, admin_notes, wording_suggestions,
        expert_summary, assigned_at, completed_at,
        admin_users!assigned_to (user_id)
      `)
      .eq('report_id', reportId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ request: data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Không thể lấy trạng thái yêu cầu' }, { status: 500 })
  }
}
