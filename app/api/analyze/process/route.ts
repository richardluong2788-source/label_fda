import { NextResponse } from 'next/server'
import { dequeueNextJob, updateJobProgress, completeJob, failJob } from '@/lib/analysis-queue'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/analyze/process
 * ──────────────────────────
 * Worker endpoint: dequeues one job from analysis_queue, calls the existing
 * /api/analyze handler (which contains all the heavy Vision + RAG + GPT logic),
 * then marks the job as completed or failed.
 *
 * Invocation paths:
 *   1. Fire-and-forget from /api/analyze/submit (immediate dispatch)
 *   2. Vercel Cron (every 30 s) — add to vercel.json:
 *      { "crons": [{ "path": "/api/analyze/process", "schedule": "every 30 seconds" }] }
 *
 * Security: requests must include the x-process-token header matching
 * PROCESS_SECRET_TOKEN env var (or come from cron which sets x-vercel-cron-signature).
 *
 * maxDuration: 300 s — inherits the same Vercel Pro limit as the original analyze route.
 */
export const maxDuration = 300

export async function POST(request: Request) {
  // ── Parse URL query params first (survive all redirects) ───
  const requestUrlObj = new URL(request.url)
  const queryToken = requestUrlObj.searchParams.get('_token') ?? ''
  const queryServiceKey = requestUrlObj.searchParams.get('_skey') ?? ''

  // ── Parse body to get auth tokens (fallback if query params missing) ───
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    // Body may be empty for cron calls or after redirect
  }

  // ── Auth guard ─────────────────────────────────────────────
  // Priority: query param > body > header (query params survive redirects)
  const processTokenHeader = request.headers.get('x-process-token') ?? ''
  const processTokenBody = (body._processToken as string) ?? ''
  const processToken = queryToken || processTokenBody || processTokenHeader
  
  const cronSig = request.headers.get('x-vercel-cron-signature') ?? ''
  const expectedToken = process.env.PROCESS_SECRET_TOKEN ?? ''
  
  // Check for internal service call
  const internalServiceKeyHeader = request.headers.get('x-internal-service-key') ?? ''
  const internalServiceKeyBody = (body._internalServiceKey as string) ?? ''
  const internalServiceKey = queryServiceKey || internalServiceKeyBody || internalServiceKeyHeader
  const expectedServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-32) ?? ''

  // Allow: correct process token, cron call, internal service key, or dev mode
  const isAuthorized =
    (expectedToken && processToken === expectedToken) ||
    cronSig !== '' ||
    (expectedServiceKey && internalServiceKey === expectedServiceKey) ||
    (!expectedToken && process.env.NODE_ENV === 'development')

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Extract jobId from body (already parsed above)
  const jobId = body.jobId as string | undefined

  // ── Dequeue ────────────────────────────────────────────────
  const job = await dequeueNextJob()

  if (!job) {
    return NextResponse.json({ message: 'No jobs to process' })
  }

  const supabaseAdmin = createAdminClient()

  try {
    // Notify the frontend we've started
    await updateJobProgress(job.id, 'Extracting text from image', 10)

    // Mark report as processing so the existing audit page also reflects progress
    await supabaseAdmin
      .from('audit_reports')
      .update({ status: 'processing' })
      .eq('id', job.report_id)

    const payload = job.payload as Record<string, unknown>

    // ── Call the existing analyze handler directly ─────────────
    // We build an internal Request object so we reuse 100% of the
    // existing Vision + RAG + GPT + violation logic without duplication.
    // The admin client is used to fetch the user's session cookie — instead
    // we pass the user_id via a custom header that the analyze route can
    // trust because this call is internal (process token was validated above).
    //
    // APPROACH: construct a synthetic Request and call the original POST handler.
    const { POST: analyzePost } = await import('@/app/api/analyze/route')

    // Build a synthetic cookies-bearing request using the original route's
    // expected body format.
    const syntheticBody = JSON.stringify({
      reportId:            job.report_id,
      phase:               payload.phase ?? 'full',
      visionDataConfirmed: payload.visionDataConfirmed ?? false,
      // Pass internal flag so the analyze route can skip quota re-check
      // (quota was already validated in /submit).
      _internal_job_id:   job.id,
      _internal_user_id:  job.user_id,
    })

    // We need to forward the user's auth context. Since the process route
    // runs with the service role, we temporarily set the user context via
    // admin auth before calling the analyze handler.
    // The analyze route reads auth.getUser() from cookies; for internal calls
    // we bypass this by impersonating via the admin client's sign-in by user_id.
    // However, Supabase server client reads cookies, which we don't have here.
    //
    // Best practice for server-to-server calls: the analyze route already
    // has all the real logic. We call it via fetch to a full URL so it
    // properly reads the user session from the request.
    //
    // For jobs dispatched via the service role we need to pass the service
    // key so the analyze route trusts this call. We use a dedicated
    // internal-auth header to allow the route to look up the user_id directly.
    // Use request origin to ensure we call the same deployment
    const requestUrl = new URL(request.url)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL 
      || `${requestUrl.protocol}//${requestUrl.host}`



    // Update progress before the long-running call
    await updateJobProgress(job.id, 'Running AI Vision analysis', 20)

    // Send auth token as query param AND in body — query params survive
    // all HTTP redirects (301/302/307/308) even when body+headers are stripped.
    const runUrl = new URL(`${appUrl}/api/analyze/process/run`)
    runUrl.searchParams.set('_token', expectedToken)

    const runBody = {
      reportId:            job.report_id,
      phase:               payload.phase ?? 'full',
      visionDataConfirmed: payload.visionDataConfirmed ?? false,
      _internal_job_id:    job.id,
      _internal_user_id:   job.user_id,
      _processToken:       expectedToken,
    }

    const analyzeRes = await fetch(runUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runBody),
    })

    if (!analyzeRes.ok) {
      const errText = await analyzeRes.text().catch(() => 'unknown error')
      throw new Error(`analyze/process/run responded ${analyzeRes.status}: ${errText}`)
    }

    await completeJob(job.id)

    return NextResponse.json({ success: true, jobId: job.id, reportId: job.report_id })
  } catch (error: any) {
    console.error(`[process] Job ${job.id} failed:`, error)
    await failJob(job.id, error?.message ?? 'Unknown error')

    // Also mark the report as error if we've exhausted retries
    const { data: failedJob } = await supabaseAdmin
      .from('analysis_queue')
      .select('attempts, max_attempts, status')
      .eq('id', job.id)
      .maybeSingle()

    if (failedJob?.status === 'failed') {
      await supabaseAdmin
        .from('audit_reports')
        .update({ status: 'error', error_message: error?.message ?? 'Analysis failed' })
        .eq('id', job.report_id)
    }

    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

// ── Cron: GET is used by Vercel Cron ──────────────────────────
export async function GET(request: Request) {
  // Vercel Cron calls with GET + x-vercel-cron-signature
  return POST(request)
}
