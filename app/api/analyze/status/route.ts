import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getJobByReportId } from '@/lib/analysis-queue'

/**
 * GET /api/analyze/status?id=<reportId>
 * ──────────────────────────────────────
 * Lightweight polling endpoint used by the frontend every 2 s.
 * Returns queue job state + the audit_report status so the UI can
 * decide when to display the final results.
 *
 * Response shape:
 * {
 *   status:       'queued' | 'processing' | 'completed' | 'failed'
 *   progress:     0-100
 *   currentStep:  string | null
 *   reportStatus: string          ← from audit_reports.status
 *   error:        string | null
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('id')

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth check — users may only poll their own reports
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('id, status, overall_result')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Fetch queue job (admin client bypasses RLS, no dependency on user's JWT)
    const job = await getJobByReportId(reportId)

    // If no queue record exists yet (legacy flow or direct analyze call),
    // fall back to the report status itself.
    if (!job) {
      const isTerminal = ['verified', 'ai_completed', 'error', 'kb_unavailable'].includes(report.status)
      return NextResponse.json({
        status:       isTerminal ? 'completed' : 'queued',
        progress:     isTerminal ? 100 : 0,
        currentStep:  null,
        reportStatus: report.status,
        overallResult: report.overall_result ?? null,
        error:        null,
      })
    }

    // Map queue job → response
    const isCompleted = job.status === 'completed' ||
      ['verified', 'ai_completed'].includes(report.status)

    const isFailed = job.status === 'failed' ||
      ['error', 'kb_unavailable'].includes(report.status)

    return NextResponse.json({
      jobId:        job.id,
      status:       isFailed ? 'failed' : isCompleted ? 'completed' : job.status,
      progress:     isCompleted ? 100 : (job.progress ?? 0),
      currentStep:  job.current_step ?? null,
      reportStatus: report.status,
      overallResult: report.overall_result ?? null,
      error:        isFailed ? (job.error_message ?? 'Analysis failed') : null,
      attempts:     job.attempts,
      maxAttempts:  job.max_attempts,
    })
  } catch (error) {
    console.error('[status] Error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
