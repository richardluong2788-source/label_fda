/**
 * VNPay IPN (Instant Payment Notification) — server-to-server
 * VNPay calls this endpoint directly to confirm payment.
 * Must respond with JSON { RspCode, Message } within 5 seconds.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCallbackSignature, decodeResponseCode } from '@/lib/vnpay'

export async function GET(request: NextRequest) {
  return handleIPN(request)
}

export async function POST(request: NextRequest) {
  return handleIPN(request)
}

async function handleIPN(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query: Record<string, string> = {}
  searchParams.forEach((value, key) => { query[key] = value })

  // 1. Verify signature
  const isValid = verifyCallbackSignature(query)
  if (!isValid) {
    return NextResponse.json({ RspCode: '97', Message: 'Invalid signature' })
  }

  const txnRef       = query.vnp_TxnRef
  const responseCode = query.vnp_ResponseCode ?? '99'
  const amountRaw    = query.vnp_Amount ?? '0'
  const bankCode     = query.vnp_BankCode ?? ''
  const transactionNo = query.vnp_TransactionNo ?? ''

  const { success } = decodeResponseCode(responseCode)

  const supabase = await createClient()

  // 2. Find transaction
  const { data: txn, error: txnError } = await supabase
    .from('payment_transactions')
    .select('id, user_id, plan_id, amount_vnd, status, transaction_type, addon_audit_report_id, addon_metadata')
    .eq('vnpay_txn_ref', txnRef)
    .single()

  if (txnError || !txn) {
    return NextResponse.json({ RspCode: '01', Message: 'Order not found' })
  }

  // 3. Idempotency — don't process completed transactions twice
  if (txn.status === 'completed') {
    return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' })
  }

  // 4. Verify amount matches
  const expectedAmount = txn.amount_vnd * 100
  if (Number(amountRaw) !== expectedAmount) {
    return NextResponse.json({ RspCode: '04', Message: 'Invalid amount' })
  }

  // 5. Update transaction
  await supabase
    .from('payment_transactions')
    .update({
      status:               success ? 'completed' : 'failed',
      vnpay_response_code:  responseCode,
      vnpay_bank_code:      bankCode,
      vnpay_transaction_no: transactionNo,
      completed_at:         success ? new Date().toISOString() : null,
    })
    .eq('id', txn.id)

  // 6. Activate subscription on success OR create addon expert request
  if (success) {
    const isAddonPurchase = txn.transaction_type === 'addon_expert_review'
    
    if (isAddonPurchase) {
      // Handle addon Expert Review purchase
      const metadata = txn.addon_metadata as { 
        target_market?: string
        user_context?: string 
      } | null
      
      // Check if expert request already exists for this transaction (idempotency)
      const { data: existingRequest } = await supabase
        .from('expert_review_requests')
        .select('id')
        .eq('payment_transaction_id', txn.id)
        .single()
      
      if (!existingRequest) {
        await supabase
          .from('expert_review_requests')
          .insert({
            audit_report_id: txn.addon_audit_report_id,
            user_id: txn.user_id,
            target_market: metadata?.target_market || 'us',
            user_context: metadata?.user_context || '',
            status: 'pending',
            is_addon_purchase: true,
            payment_transaction_id: txn.id,
          })
      }
    } else {
      // Standard subscription activation
      const periodStart = new Date()
      const periodEnd   = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await supabase
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
            last_payment_amount_vnd:     txn.amount_vnd,
          },
          { onConflict: 'user_id' }
        )
    }
  }

  return NextResponse.json({ RspCode: '00', Message: 'Confirm success' })
}
