import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Allow updating report status (e.g., resetting from kb_unavailable to pending for retry)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow specific status transitions
    const allowedStatuses = ['pending']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
    }

    const { error } = await supabase
      .from('audit_reports')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Patch audit error:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get report
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Get user's current subscription to pass plan info for Expert Review panel
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select(`
        plan_id,
        subscription_plans (
          name,
          expert_reviews_limit,
          expert_review_price_vnd,
          features
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    const plan = subscription?.subscription_plans as {
      name: string
      expert_reviews_limit: number
      expert_review_price_vnd: number
      features: string[]
    } | null

    // Enrich report with subscription info for UI
    const enrichedReport = {
      ...report,
      plan_name: plan?.name ?? 'Free Trial',
      expert_reviews_included: (plan?.expert_reviews_limit ?? 0) > 0,
      expert_review_price_vnd: plan?.expert_review_price_vnd ?? 499000,
      // Feature flags for gating
      can_export_pdf: plan ? true : false, // Free trial = no PDF export
      can_export_excel: plan?.features?.includes('Xuất Excel') ?? false,
    }

    return NextResponse.json(enrichedReport)
  } catch (error) {
    console.error('[v0] Get audit error:', error)
    return NextResponse.json(
      { error: 'Failed to get audit report' },
      { status: 500 }
    )
  }
}
