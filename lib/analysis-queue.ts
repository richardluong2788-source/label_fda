/**
 * lib/analysis-queue.ts
 * ─────────────────────
 * Helpers for the async analysis_queue table.
 *
 * Design decisions:
 * - All writes use the admin (service-role) client to bypass RLS.
 * - MAX_CONCURRENT controls how many jobs run in parallel across all
 *   serverless instances (prevents OpenAI rate-limit bursts).
 * - Priority 1 = highest (enterprise), 10 = lowest (free trial).
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ── Constants ────────────────────────────────────────────────
export const MAX_CONCURRENT = 10   // max simultaneous "processing" jobs

// ── Types ────────────────────────────────────────────────────
export type QueueStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface QueueJob {
  id: string
  report_id: string
  user_id: string
  status: QueueStatus
  priority: number
  attempts: number
  max_attempts: number
  payload: Record<string, unknown>
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  current_step: string | null
  progress: number | null
}

// ── Enqueue ──────────────────────────────────────────────────

/**
 * Insert a new job into the queue and return it.
 * If the report already has a queued/processing job, return the existing one
 * to avoid duplicate submissions.
 */
export async function enqueueJob(params: {
  reportId: string
  userId: string
  priority?: number
  payload?: Record<string, unknown>
}): Promise<QueueJob> {
  const supabase = createAdminClient()

  // Idempotency: return existing active job for the same report
  const { data: existing } = await supabase
    .from('analysis_queue')
    .select('*')
    .eq('report_id', params.reportId)
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing as QueueJob

  const { data, error } = await supabase
    .from('analysis_queue')
    .insert({
      report_id:    params.reportId,
      user_id:      params.userId,
      priority:     params.priority ?? 5,
      payload:      params.payload  ?? {},
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to enqueue job: ${error.message}`)
  return data as QueueJob
}

// ── Claim Specific Job ───────────────────────────────────────

/**
 * Atomically claim a specific job by ID.
 * Used when /submit fires-and-forgets with a known jobId to avoid race conditions.
 * Returns null if the job doesn't exist, isn't queued, or has exhausted attempts.
 */
export async function claimSpecificJob(jobId: string): Promise<QueueJob | null> {
  const supabase = createAdminClient()

  // Check current concurrency first
  const { count } = await supabase
    .from('analysis_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing')

  if ((count ?? 0) >= MAX_CONCURRENT) {
    console.log(`[queue] Concurrency cap reached (${count}/${MAX_CONCURRENT}). Cannot claim job ${jobId}.`)
    return null
  }

  // Fetch the specific job
  const { data: job } = await supabase
    .from('analysis_queue')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (!job) {
    console.log(`[queue] Job ${jobId} not found`)
    return null
  }

  // Check if already processing or completed
  if (job.status !== 'queued') {
    console.log(`[queue] Job ${jobId} is not queued (status: ${job.status})`)
    return null
  }

  // Check attempts
  if (job.attempts >= job.max_attempts) {
    console.log(`[queue] Job ${jobId} has exhausted attempts (${job.attempts}/${job.max_attempts})`)
    return null
  }

  // Atomically mark as processing
  const { data: updated, error } = await supabase
    .from('analysis_queue')
    .update({
      status:     'processing',
      started_at: new Date().toISOString(),
      attempts:   job.attempts + 1,
    })
    .eq('id', jobId)
    .eq('status', 'queued') // guard against race condition
    .select('*')
    .maybeSingle()

  if (error || !updated) {
    console.log(`[queue] Failed to claim job ${jobId} - race condition or error:`, error?.message)
    return null
  }

  console.log(`[queue] Successfully claimed specific job ${jobId}`)
  return updated as QueueJob
}

// ── Dequeue (for /api/analyze/process) ──────────────────────

/**
 * Atomically claim the next queued job that hasn't exceeded max_attempts.
 * Returns null when the queue is empty or the concurrency cap is reached.
 */
export async function dequeueNextJob(): Promise<QueueJob | null> {
  const supabase = createAdminClient()

  // Check current concurrency
  const { count } = await supabase
    .from('analysis_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing')

  if ((count ?? 0) >= MAX_CONCURRENT) {
    console.log(`[queue] Concurrency cap reached (${count}/${MAX_CONCURRENT}). Skipping dequeue.`)
    return null
  }

  // Pick the highest-priority (lowest number), oldest queued job
  const { data: candidates } = await supabase
    .from('analysis_queue')
    .select('*')
    .eq('status', 'queued')
    .lt('attempts', supabase.rpc ? 'max_attempts' : 999) // workaround: filter below
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(5) // fetch a small batch, then filter locally

  if (!candidates || candidates.length === 0) return null

  // Filter by attempts locally (supabase column comparison in filter)
  const eligible = (candidates as QueueJob[]).filter(j => j.attempts < j.max_attempts)
  if (eligible.length === 0) return null

  const job = eligible[0]

  // Atomically mark as processing
  const { data: updated, error } = await supabase
    .from('analysis_queue')
    .update({
      status:     'processing',
      started_at: new Date().toISOString(),
      attempts:   job.attempts + 1,
    })
    .eq('id', job.id)
    .eq('status', 'queued') // guard against race condition
    .select('*')
    .maybeSingle()

  if (error || !updated) {
    // Another instance grabbed it first — that's fine
    return null
  }

  return updated as QueueJob
}

// ── Progress update ──────────────────────────────────────────

export async function updateJobProgress(
  jobId: string,
  step: string,
  progress: number,
): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('analysis_queue')
    .update({ current_step: step, progress })
    .eq('id', jobId)
}

// ── Complete / Fail ──────────────────────────────────────────

export async function completeJob(jobId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('analysis_queue')
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
      progress:     100,
      current_step: 'Done',
    })
    .eq('id', jobId)
}

export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = createAdminClient()

  // Fetch current attempts to decide whether to re-queue or permanently fail
  const { data: job } = await supabase
    .from('analysis_queue')
    .select('attempts, max_attempts')
    .eq('id', jobId)
    .maybeSingle()

  const exhausted = !job || job.attempts >= job.max_attempts
  await supabase
    .from('analysis_queue')
    .update({
      status:        exhausted ? 'failed' : 'queued', // re-queue if retries remain
      error_message: errorMessage,
      current_step:  null,
      progress:      0,
    })
    .eq('id', jobId)
}

// ── Status lookup ─────────────────────────────────────────────

/**
 * Get the most recent queue job for a given report_id.
 * Used by GET /api/analyze/status.
 */
export async function getJobByReportId(reportId: string): Promise<QueueJob | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('analysis_queue')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as QueueJob | null
}
