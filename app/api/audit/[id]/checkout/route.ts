import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentUrl, generateTxnRef } from '@/lib/vnpay'

/**
 * POST /api/audit/[id]/checkout
 * Tạo VNPay payment URL để mở khóa báo cáo kiểm tra đơn lẻ.
 * Dành cho trường hợp người dùng muốn mua lẻ report mà không đăng ký gói.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Lấy thông tin báo cáo
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('id, user_id, payment_status, report_unlocked')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Kiểm tra xem đã thanh toán chưa
    if (report.payment_status === 'paid' || report.report_unlocked) {
      return NextResponse.json(
        { error: 'Report already unlocked' },
        { status: 400 }
      )
    }

    // Đơn giá mặc định cho mua lẻ report (VND)
    const SINGLE_REPORT_PRICE_VND = 99_000

    // Tạo mã tham chiếu giao dịch duy nhất
    const txnRef = generateTxnRef('RPT')

    // Lấy IP người dùng
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddr = forwardedFor?.split(',')[0].trim() ?? '127.0.0.1'

    // Ghi nhận giao dịch pending vào DB
    const { data: txn, error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id:       user.id,
        plan_id:       null,  // Mua lẻ, không gắn với gói
        amount_vnd:    SINGLE_REPORT_PRICE_VND,
        status:        'pending',
        vnpay_txn_ref: txnRef,
        description:   `Mo khoa bao cao kiem tra - ${params.id.slice(0, 8)}`,
        transaction_type: 'single_report',
        addon_audit_report_id: params.id,
      })
      .select('id')
      .single()

    if (txnError || !txn) {
      console.error('[audit-checkout] Failed to insert transaction:', txnError?.message)
      return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 })
    }

    // Tạo URL thanh toán VNPay
    const result = createPaymentUrl({
      txnRef,
      amount: SINGLE_REPORT_PRICE_VND,
      orderInfo: `Mo khoa bao cao ${params.id.slice(0, 8)}`,
      ipAddr,
      orderType: 'other',
    })

    return NextResponse.json({
      checkoutUrl: result.payUrl,
      txnRef:      result.txnRef,
      txnId:       txn.id,
      isDemoMode:  result.isDemoMode,
      amount:      SINGLE_REPORT_PRICE_VND,
    })
  } catch (error) {
    console.error('[audit-checkout] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

