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
    const { planId, amount } = body as { planId: string; amount: number }

    if (!planId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid plan or amount' }, { status: 400 })
    }

    // Verify plan exists
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name, price_vnd, is_active')
      .eq('id', planId)
      .single()

    if (planError || !plan || !plan.is_active) {
      return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 404 })
    }

    if (plan.price_vnd === 0) {
      return NextResponse.json({ error: 'Free plan does not require payment' }, { status: 400 })
    }

    // Generate unique transaction reference
    const txnRef = generateTxnRef('SUB')

    // Get client IP
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddr = forwardedFor?.split(',')[0].trim() ?? '127.0.0.1'

    // Record pending transaction in DB
    const { data: txn, error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id:       user.id,
        plan_id:       planId,
        amount_vnd:    amount,
        status:        'pending',
        vnpay_txn_ref: txnRef,
        description:   `Thanh toán gói ${plan.name} - ${txnRef}`,
      })
      .select('id')
      .single()

    if (txnError || !txn) {
      console.error('[vnpay] Failed to insert transaction:', txnError?.message)
      return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 })
    }

    // Build VNPay payment URL
    // sanitizeOrderInfo() sẽ tự loại bỏ dấu & ký tự đặc biệt bên trong createPaymentUrl
    const result = createPaymentUrl({
      txnRef,
      amount,
      orderInfo: `Thanh toan goi ${plan.name} ${txnRef}`,
      ipAddr,
      orderType: 'other',
    })

    return NextResponse.json({
      payUrl:      result.payUrl,
      txnRef:      result.txnRef,
      txnId:       txn.id,
      isDemoMode:  result.isDemoMode,
    })
  } catch (error) {
    console.error('[vnpay] Create payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
