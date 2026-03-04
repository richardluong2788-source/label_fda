import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  sendEmail,
  ADMIN_EMAIL,
  expertRequestConfirmTemplate,
  adminNewExpertRequestTemplate,
} from '@/lib/email'

// GET: Lấy trạng thái request của 1 báo cáo
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('expert_review_requests')
      .select('*')
      .eq('audit_report_id', reportId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ request: data })
  } catch (error: any) {
    console.error('[v0] GET expert-request error:', error)
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 })
  }
}

// POST: Tạo mới expert review request
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reportId, userContext, targetMarket, productCategory } = body

    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Kiểm tra đã có request đang pending/in_review chưa
    const { data: existing } = await supabase
      .from('expert_review_requests')
      .select('id, status')
      .eq('audit_report_id', reportId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_review'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'already_requested', existingId: existing.id, status: existing.status },
        { status: 409 }
      )
    }

    // Kiểm tra quota via DB function
    const { data: quotaData, error: quotaError } = await supabase
      .rpc('check_expert_review_quota', { p_user_id: user.id })

    if (quotaError) {
      console.error('[v0] Quota check error:', quotaError.message)
      // Fail open nếu quota function lỗi
    } else if (quotaData && !quotaData.can_request) {
      return NextResponse.json(
        {
          error: 'quota_exceeded',
          reason: quotaData.reason,
          reviews_used: quotaData.reviews_used,
          reviews_limit: quotaData.reviews_limit,
          plan_name: quotaData.plan_name,
        },
        { status: 402 }
      )
    }

    // Lấy thông tin subscription hiện tại
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('plan_id, subscription_plans(expert_reviews_limit)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    const planId = sub?.plan_id ?? 'free'
    const reviewsLimit = (sub?.subscription_plans as any)?.expert_reviews_limit ?? 0
    const isPaid = reviewsLimit !== 0 // Free = 0 reviews included

    // Tạo request
    const { data: newRequest, error: insertError } = await supabase
      .from('expert_review_requests')
      .insert({
        audit_report_id: reportId,
        user_id:         user.id,
        status:          'pending',
        user_context:    userContext || null,
        target_market:   targetMarket || 'US',
        product_category: productCategory || null,
        is_paid:         isPaid,
        plan_id:         planId,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Cập nhật expert_review_status trên audit_report
    await supabase
      .from('audit_reports')
      .update({ expert_review_status: 'requested' })
      .eq('id', reportId)

    // Tăng expert_reviews_used nếu dùng quota gói
    if (isPaid && quotaData?.reason !== 'admin_bypass') {
      await supabase
        .from('user_subscriptions')
        .update({ expert_reviews_used: (quotaData?.reviews_used ?? 0) + 1 })
        .eq('user_id', user.id)
        .eq('status', 'active')
    }

    // ── EMAIL NOTIFICATIONS (fire-and-forget) ──────────────────────────────
    // Lấy thêm thông tin cần thiết cho email
    const { data: reportData } = await supabase
      .from('audit_reports')
      .select('product_name')
      .eq('id', reportId)
      .maybeSingle()

    const productName = reportData?.product_name || 'Unknown Product'
    const userLang = (body.lang as 'vi' | 'en') || 'en'

    // 1. Xác nhận cho user
    const confirmEmail = expertRequestConfirmTemplate({
      email: user.email!,
      productName,
      requestId: newRequest.id,
      isPaid,
      lang: userLang,
    })
    sendEmail({ to: user.email!, subject: confirmEmail.subject, html: confirmEmail.html })

    // 2. Alert cho admin
    if (ADMIN_EMAIL) {
      const adminEmail = adminNewExpertRequestTemplate({
        userEmail: user.email!,
        productName,
        requestId: newRequest.id,
        isPaid,
        planId,
      })
      sendEmail({ to: ADMIN_EMAIL, subject: adminEmail.subject, html: adminEmail.html })
    }
    // ── END EMAIL NOTIFICATIONS ─────────────────────────────────────────────

    return NextResponse.json({ success: true, request: newRequest }, { status: 201 })
  } catch (error: any) {
    console.error('[v0] POST expert-request error:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}
