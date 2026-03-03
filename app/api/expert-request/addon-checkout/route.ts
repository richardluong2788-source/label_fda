import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentUrl, generateTxnRef } from '@/lib/vnpay'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { auditReportId, targetMarket, userContext } = body as {
      auditReportId: string
      targetMarket: string
      userContext?: string
    }

    if (!auditReportId || !targetMarket) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify audit report exists and belongs to user
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('id, user_id')
      .eq('id', auditReportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Audit report not found' }, { status: 404 })
    }

    if (report.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to report' }, { status: 403 })
    }

    // Get user's current subscription to fetch expert_review_price
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        plan_id,
        subscription_plans (
          id,
          name,
          expert_review_price_vnd,
          expert_reviews_limit
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ 
        error: 'No active subscription',
        message: 'You need an active subscription to purchase addon Expert Review'
      }, { status: 400 })
    }

    const plan = subscription.subscription_plans as {
      id: string
      name: string
      expert_review_price_vnd: number
      expert_reviews_limit: number
    }

    // Check if user's plan has quota (Pro has limit > 0, Enterprise has -1)
    // Only allow addon purchase for plans with limited quota (not unlimited)
    if (plan.expert_reviews_limit === -1) {
      return NextResponse.json({ 
        error: 'Not needed',
        message: 'Your plan includes unlimited Expert Reviews'
      }, { status: 400 })
    }

    // Get the addon price (should be > 0)
    const addonPrice = plan.expert_review_price_vnd
    if (!addonPrice || addonPrice <= 0) {
      return NextResponse.json({ 
        error: 'Addon not available',
        message: 'Expert Review addon is not available for your plan'
      }, { status: 400 })
    }

    // Generate unique transaction reference for addon
    const txnRef = generateTxnRef('ADDON')

    // Get client IP
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddr = forwardedFor?.split(',')[0].trim() ?? '127.0.0.1'

    // Record pending transaction in DB with addon metadata
    const { data: txn, error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_vnd: addonPrice,
        status: 'pending',
        vnpay_txn_ref: txnRef,
        description: `Mua lẻ Expert Review - ${txnRef}`,
        transaction_type: 'addon_expert_review',
        addon_audit_report_id: auditReportId,
        addon_metadata: {
          target_market: targetMarket,
          user_context: userContext || '',
          requested_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single()

    if (txnError || !txn) {
      console.error('[addon-checkout] Failed to insert transaction:', txnError?.message)
      return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 })
    }

    // Build VNPay payment URL
    const result = createPaymentUrl({
      txnRef,
      amount: addonPrice,
      orderInfo: `Expert Review addon - ${auditReportId.slice(0, 8)}`,
      ipAddr,
      orderType: 'other',
    })

    return NextResponse.json({
      payUrl: result.payUrl,
      txnRef: result.txnRef,
      txnId: txn.id,
      isDemoMode: result.isDemoMode,
      amount: addonPrice,
    })
  } catch (error) {
    console.error('[addon-checkout] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
