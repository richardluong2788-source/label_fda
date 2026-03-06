/**
 * VNPay Return URL (GET)
 * VNPay redirects the browser here after payment (success or failure).
 * We verify the signature, update the DB, then redirect the user to a result page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCallbackSignature, decodeResponseCode, getVnpayConfig } from '@/lib/vnpay'
import { sendEmail, paymentSuccessTemplate } from '@/lib/email'

// Helper function to get user email from auth.users
async function getUserEmailFromAuth(userId: string): Promise<{ email: string | null; lang: 'vi' | 'en' }> {
  try {
    const adminClient = createAdminClient()
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
    
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .maybeSingle()
    
    return {
      email: authUser?.user?.email || null,
      lang: (profile?.language as 'vi' | 'en') || 'en',
    }
  } catch (error) {
    console.error('[vnpay-callback] getUserEmailFromAuth error:', error)
    return { email: null, lang: 'en' }
  }
}

export async function GET(request: NextRequest) {
  // Dùng baseUrl từ getVnpayConfig (ưu tiên NEXT_PUBLIC_APP_URL → VERCEL_URL → localhost)
  // KHÔNG dùng request.url vì VNPay redirect về returnUrl cũ (có thể là localhost)
  const { returnUrl } = getVnpayConfig()
  const baseUrl = returnUrl.replace('/api/vnpay/callback', '')

  const searchParams = request.nextUrl.searchParams
  const query: Record<string, string> = {}
  searchParams.forEach((value, key) => { query[key] = value })

  const txnRef       = query.vnp_TxnRef
  const responseCode = query.vnp_ResponseCode ?? '99'
  // Theo spec VNPay: giao dịch thành công khi cả vnp_ResponseCode='00' VÀ vnp_TransactionStatus='00'
  const transactionStatus = query.vnp_TransactionStatus ?? '99'
  const bankCode    = query.vnp_BankCode ?? ''
  const transactionNo = query.vnp_TransactionNo ?? ''
  const amountRaw   = query.vnp_Amount ?? '0'

  // Verify signature
  const isValid = verifyCallbackSignature(query)
  if (!isValid) {
    return NextResponse.redirect(
      new URL(`/checkout/result?status=error&message=Invalid+signature`, baseUrl)
    )
  }

  const isSuccess = responseCode === '00' && transactionStatus === '00'
  const { message } = decodeResponseCode(responseCode)

  const supabase = await createClient()

  // Update transaction record
  const { data: txn, error: txnFetchError } = await supabase
    .from('payment_transactions')
    .select('id, user_id, plan_id, amount_vnd, transaction_type, addon_audit_report_id, addon_metadata')
    .eq('vnpay_txn_ref', txnRef)
    .single()

  if (txnFetchError || !txn) {
    console.error('[vnpay-callback] Transaction not found for txnRef:', txnRef)
    return NextResponse.redirect(
      new URL(`/checkout/result?status=error&message=Transaction+not+found`, baseUrl)
    )
  }

  await supabase
    .from('payment_transactions')
    .update({
      status:                isSuccess ? 'completed' : 'failed',
      vnpay_response_code:   responseCode,
      vnpay_bank_code:       bankCode,
      vnpay_transaction_no:  transactionNo,
      completed_at:          isSuccess ? new Date().toISOString() : null,
    })
    .eq('vnpay_txn_ref', txnRef)

  if (isSuccess) {
    const isAddonPurchase = txn.transaction_type === 'addon_expert_review'
    const isSingleReport  = txn.transaction_type === 'single_report'

    if (isSingleReport) {
      // Mở khóa báo cáo kiểm tra đơn lẻ
      await supabase
        .from('audit_reports')
        .update({ report_unlocked: true, payment_status: 'paid' })
        .eq('id', txn.addon_audit_report_id)
        .eq('user_id', txn.user_id)
    } else if (isAddonPurchase) {
      // Handle addon Expert Review purchase
      // Create expert_review_request with is_addon_purchase = true
      const metadata = txn.addon_metadata as { 
        target_market?: string
        user_context?: string 
      } | null
      
      const { error: expertError } = await supabase
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

      if (expertError) {
        console.error('[vnpay-callback] Failed to create addon expert request:', expertError.message)
      }
    } else {
      // Standard subscription payment flow
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
  }

  // ── PAYMENT CONFIRMATION EMAIL ──────────────────────────────────────────
  if (isSuccess) {
    const { email: userEmail, lang } = await getUserEmailFromAuth(txn.user_id)

    if (userEmail) {
      const isAddonEmail = txn.transaction_type === 'addon_expert_review'

      // Lấy tên gói
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', txn.plan_id)
        .maybeSingle()

      // Lấy period_end từ subscription
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('current_period_end')
        .eq('user_id', txn.user_id)
        .eq('status', 'active')
        .maybeSingle()

      const paymentEmail = paymentSuccessTemplate({
        email: userEmail,
        planName: planData?.name || txn.plan_id,
        amountVnd: Number(amountRaw) / 100,
        txnRef,
        periodEnd: subData?.current_period_end,
        isAddon: isAddonEmail,
        lang,
      })
      sendEmail({ to: userEmail, subject: paymentEmail.subject, html: paymentEmail.html })
      console.log('[vnpay-callback] Sent payment success email to:', userEmail)
    } else {
      console.warn('[vnpay-callback] Could not find email for user_id:', txn.user_id)
    }
  }
  // ── END PAYMENT EMAIL ────────────────────────────────────────────────────

  const isAddonPurchase = txn.transaction_type === 'addon_expert_review'
  const isSingleReport  = txn.transaction_type === 'single_report'

  const params = new URLSearchParams({
    status:  isSuccess ? 'success' : 'failed',
    message: encodeURIComponent(message),
    txnRef,
    ...(bankCode ? { bank: bankCode } : {}),
    ...(isAddonPurchase ? { type: 'addon_expert_review' } : {}),
    ...(isAddonPurchase && txn.addon_audit_report_id ? { reportId: txn.addon_audit_report_id } : {}),
    ...(isSingleReport ? { type: 'single_report' } : {}),
    ...(isSingleReport && txn.addon_audit_report_id ? { reportId: txn.addon_audit_report_id } : {}),
  })

  return NextResponse.redirect(new URL(`/checkout/result?${params}`, baseUrl))
}
