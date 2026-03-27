import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generatePDFReportHTML } from '@/lib/pdf-report-generator'

const VEXIM_COMPANY_INFO = {
  name: 'Vexim',
  address: 'Ho Chi Minh City, Vietnam',
  phone: '+84 123 456 789',
  email: 'compliance@ailabelpro.com',
  website: 'ailabelpro.com',
  certificationId: 'VXM-FDA-2024-001',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the report
    const { data: report, error } = await supabase
      .from('audit_reports')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check access: either the report owner or an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const isOwner = report.user_id === user.id
    const isAdmin = adminUser?.can_review === true

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For non-admin users, check access via subscription model:
    // report_unlocked = true  → VNPay callback đã set sau khi subscription active
    // payment_status = 'paid' → backward-compatible với model cũ
    // Nếu cả 2 đều false, kiểm tra user có active subscription không (fail-safe)
    if (!isAdmin) {
      const isDirectlyUnlocked =
        report.report_unlocked === true || report.payment_status === 'paid'

      if (!isDirectlyUnlocked) {
        // Kiểm tra subscription active như một fallback
        const { data: activeSub } = await supabase
          .from('user_subscriptions')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('current_period_end', new Date().toISOString())
          .maybeSingle()

        if (!activeSub) {
          return NextResponse.json(
            { error: 'Báo cáo chưa được mở khóa. Vui lòng nâng cấp gói để tải PDF.' },
            { status: 402 }
          )
        }

        // User có subscription active — tự động unlock report và tiếp tục
        await supabase
          .from('audit_reports')
          .update({ report_unlocked: true, payment_status: 'paid' })
          .eq('id', id)
      }
    }

    const violations = report.findings || report.violations || []

    // Fetch expert review data if exists (field is audit_report_id, not report_id)
    const { data: expertReview } = await supabase
      .from('expert_review_requests')
      .select('*')
      .eq('audit_report_id', id)
      .eq('status', 'completed')
      .maybeSingle()

    // Determine language from query param (default: vi for backward compat)
    const langParam = request.nextUrl.searchParams.get('lang')
    const lang = (langParam === 'en' ? 'en' : 'vi') as 'vi' | 'en'

    // Determine who generated this
    let generatedBy = 'AI Label Pro – by Vexim'
    if (report.reviewed_by) {
      // Look up expert name
      const { data: reviewer } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', report.reviewed_by)
        .single()

      if (reviewer) {
        // Try to get the user's email for display
        generatedBy = `Expert Reviewer – AI Label Pro (Vexim)`
      }
    }
    if (report.status === 'verified') {
      generatedBy = `Vexim Expert Team – Verified`
    }

    // Generate dynamic cert code: VXM-FDA-[YEAR]-[6 chars of report ID]
    // This ensures no two reports share the same cert code and year is always current
    const certYear = new Date(report.created_at || Date.now()).getFullYear()
    const certSeq = report.id.slice(0, 6).toUpperCase()
    const dynamicCertId = `VXM-FDA-${certYear}-${certSeq}`

    // Generate PDF HTML
    const html = generatePDFReportHTML({
      report,
      violations,
      generatedAt: new Date().toISOString(),
      generatedBy,
      companyInfo: { ...VEXIM_COMPANY_INFO, certificationId: dynamicCertId },
      lang,
      expertReview: expertReview || null,
    })

    // Return as downloadable HTML file that opens as print-ready PDF layout
    // The client will use window.print() or a PDF conversion service
    const productName = (report.product_name || 'Label-Analysis')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .slice(0, 30)
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `AILabelPro-FDA-Report-${productName}-${dateStr}.html`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[v0] PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    )
  }
}
