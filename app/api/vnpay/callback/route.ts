/**
 * VNPay Return URL (GET)
 * VNPay redirects the browser here after payment (success or failure).
 * We verify the signature, update the DB, then redirect the user to a result page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCallbackSignature, decodeResponseCode } from '@/lib/vnpay'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query: Record<string, string> = {}
  searchParams.forEach((value, key) => { query[key] = value })

  const txnRef      = query.vnp_TxnRef
  const responseCode = query.vnp_ResponseCode ?? '99'
  const bankCode    = query.vnp_BankCode ?? ''
  const transactionNo = query.vnp_TransactionNo ?? ''
  const amountRaw   = query.vnp_Amount ?? '0'

  // Verify signature
  const isValid = verifyCallbackSignature(query)
  if (!isValid) {
    return NextResponse.redirect(
      new URL(`/checkout/result?status=error&message=Invalid+signature`, request.url)
    )
  }

  const { success, message } = decodeResponseCode(responseCode)

  const supabase = await createClient()

  // Update transaction record
  const { data: txn, error: txnFetchError } = await supabase
    .from('payment_transactions')
    .select('id, user_id, plan_id, amount_vnd')
    .eq('vnpay_txn_ref', txnRef)
    .single()

  if (txnFetchError || !txn) {
    console.error('[vnpay-callback] Transaction not found for txnRef:', txnRef)
    return NextResponse.redirect(
      new URL(`/checkout/result?status=error&message=Transaction+not+found`, request.url)
    )
  }

  await supabase
    .from('payment_transactions')
    .update({
      status:                success ? 'completed' : 'failed',
      vnpay_response_code:   responseCode,
      vnpay_bank_code:       bankCode,
      vnpay_transaction_no:  transactionNo,
      completed_at:          success ? new Date().toISOString() : null,
    })
    .eq('vnpay_txn_ref', txnRef)

  if (success) {
    // 1. Activate or upgrade the user's subscription
    const periodStart = new Date()
    const periodEnd   = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert(
        {
          user_id:                     txn.user_id,
          plan_id:                     txn.plan_id,
          status:                      'active',
          current_period_start:        periodStart.toISOString(),
          current_period_end:          periodEnd.toISOString(),
          reports_used:                0,
          last_payment_at:             new Date().toISOString(),
          last_payment_amount_vnd:     Number(amountRaw) / 100, // VNPay gửi ×100
        },
        { onConflict: 'user_id' }
      )

    if (subError) {
      console.error('[vnpay-callback] Failed to activate subscription:', subError.message)
    }

    // 2. Unlock tất cả audit_reports pending của user này (nếu có)
    // Model subscription: user đã trả tiền cho gói => tất cả báo cáo đều được unlock
    const { error: unlockError } = await supabase
      .from('audit_reports')
      .update({
        report_unlocked: true,
        payment_status:  'paid',
      })
      .eq('user_id', txn.user_id)
      .in('status', ['pending', 'completed', 'needs_review', 'verified'])
      .eq('report_unlocked', false)

    if (unlockError) {
      console.error('[vnpay-callback] Failed to unlock reports:', unlockError.message)
    }
  }

  const params = new URLSearchParams({
    status:  success ? 'success' : 'failed',
    message: encodeURIComponent(message),
    txnRef,
    ...(bankCode ? { bank: bankCode } : {}),
  })

  return NextResponse.redirect(new URL(`/checkout/result?${params}`, request.url))
}
