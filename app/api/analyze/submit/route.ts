import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimit, AUTH_RATE_LIMITS } from '@/lib/rate-limit'
import { sendEmail, lowCreditsTemplate, quotaExhaustedTemplate } from '@/lib/email'
import { enqueueJob } from '@/lib/analysis-queue'

/**
 * POST /api/analyze/submit
 * ────────────────────────
 * Fast endpoint: validates the request, checks quota, inserts an
 * analysis_queue row, and returns immediately with { jobId, reportId }.
 *
 * The heavy Vision + RAG + GPT work is done by /api/analyze/process
 * (triggered by Vercel Cron every 30 s or called directly after submit).
 * The frontend polls /api/analyze/status?id=<reportId> for progress.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reportId, phase = 'full', visionDataConfirmed = false } = body

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // ── Auth ────────────────────────────────────────────────────
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Rate limiting ───────────────────────────────────────────
    const rl = await rateLimit(`analyze:${user.id}`, AUTH_RATE_LIMITS.analyze)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many analysis requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
      )
    }

    // ── Admin bypass check ──────────────────────────────────────
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin =
      adminRecord?.role === 'admin' ||
      adminRecord?.role === 'superadmin' ||
      adminRecord?.role === 'expert'

    // ── Quota enforcement ───────────────────────────────────────
    if (!isAdmin) {
      const { data: quotaData, error: quotaError } = await supabase
        .rpc('check_quota', { p_user_id: user.id })

      if (quotaError) {
        return NextResponse.json(
          { error: 'quota_check_failed', message: 'Unable to verify quota. Please try again.' },
          { status: 503 }
        )
      }

      if (quotaData && !quotaData.has_quota) {
        // Fire-and-forget quota exhausted email
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email, language')
            .eq('id', user.id)
            .maybeSingle()

          if (userProfile?.email) {
            const lang = (userProfile.language as 'vi' | 'en') || 'en'
            const exhaustedEmail = quotaExhaustedTemplate({
              email: userProfile.email,
              reportsUsed: quotaData.reports_used,
              reportsLimit: quotaData.reports_limit,
              planName: quotaData.plan_name,
              periodEnd: quotaData.period_end,
              lang,
            })
            sendEmail({ to: userProfile.email, subject: exhaustedEmail.subject, html: exhaustedEmail.html })
          }
        } catch (emailErr) {
          console.error('[submit] Failed to send quota exhausted email:', emailErr)
        }

        return NextResponse.json(
          {
            error: 'quota_exceeded',
            message: `You have used ${quotaData.reports_used}/${quotaData.reports_limit} analyses this month. Please upgrade your plan.`,
            quota: {
              plan_id:       quotaData.plan_id,
              plan_name:     quotaData.plan_name,
              reports_used:  quotaData.reports_used,
              reports_limit: quotaData.reports_limit,
              period_end:    quotaData.period_end,
            },
          },
          { status: 402 }
        )
      }

      // Fire-and-forget low credits warning
      if (quotaData?.has_quota) {
        const remainingAfterThis = (quotaData.reports_limit - quotaData.reports_used) - 1
        const shouldSendLowCredits = quotaData.reports_limit >= 5
          ? remainingAfterThis === 2
          : remainingAfterThis === 0

        if (shouldSendLowCredits) {
          try {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('email, language')
              .eq('id', user.id)
              .maybeSingle()

            if (userProfile?.email) {
              const lang = (userProfile.language as 'vi' | 'en') || 'en'
              const lowEmail = lowCreditsTemplate({
                email: userProfile.email,
                reportsUsed: quotaData.reports_used + 1,
                reportsLimit: quotaData.reports_limit,
                planName: quotaData.plan_name,
                periodEnd: quotaData.period_end,
                lang,
              })
              sendEmail({ to: userProfile.email, subject: lowEmail.subject, html: lowEmail.html })
            }
          } catch (emailErr) {
            console.error('[submit] Failed to send low credits email:', emailErr)
          }
        }
      }
    }

    // ── Verify report ownership ─────────────────────────────────
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('id, status, packaging_format, product_type, product_category')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // ── Determine queue priority by plan ────────────────────────
    const { data: planData } = await supabase
      .from('profiles')
      .select('plan_id')
      .eq('id', user.id)
      .maybeSingle()

    const planPriorityMap: Record<string, number> = {
      enterprise: 1,
      pro:        2,
      starter:    3,
      free:       5,
      free_trial: 5,
    }
    const priority = isAdmin
      ? 1
      : planPriorityMap[planData?.plan_id ?? 'free'] ?? 5

    // ── Enqueue job ─────────────────────────────────────────────
    const job = await enqueueJob({
      reportId,
      userId: user.id,
      priority,
      payload: { phase, visionDataConfirmed },
    })

    // Mark report as queued
    await supabase
      .from('audit_reports')
      .update({ status: 'queued' })
      .eq('id', reportId)

    // ── Fire-and-forget: trigger process endpoint immediately ───
    // This avoids waiting for the next cron tick in dev / low-traffic.
    // Uses an absolute URL so it works in both edge and Node.js runtimes.
    // Priority: NEXT_PUBLIC_APP_URL > request origin > VERCEL_URL > localhost
    const requestUrl = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
      || `${requestUrl.protocol}//${requestUrl.host}`

    // Send auth tokens as query params (survive redirects) AND in body (fallback)
    const processToken = process.env.PROCESS_SECRET_TOKEN ?? ''
    const internalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-32) ?? ''
    
    const processUrl = new URL(`${baseUrl}/api/analyze/process`)
    processUrl.searchParams.set('_token', processToken)
    processUrl.searchParams.set('_skey', internalServiceKey)
    
    fetch(processUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        jobId: job.id,
        _processToken: processToken,
        _internalServiceKey: internalServiceKey,
      }),
    }).catch(err => console.error('[submit] Failed to trigger process:', err))

    return NextResponse.json({
      success:  true,
      jobId:    job.id,
      reportId: job.report_id,
      status:   job.status,
      message:  'Analysis queued. Poll /api/analyze/status?id=<reportId> for progress.',
    })
  } catch (error) {
    console.error('[submit] Error:', error)
    return NextResponse.json({ error: 'Failed to submit analysis' }, { status: 500 })
  }
}
