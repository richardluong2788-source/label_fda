import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllRecalls, buildRecallContent, isValidRecallContent } from '@/lib/openfda-recall-fetcher'
import { NextResponse } from 'next/server'

/**
 * Cron job: Fetch new FDA Enforcement Reports (Recalls) from openFDA API
 *
 * Flow:
 *   1. Fetch recent recalls from openFDA food/drug/device enforcement endpoints
 *   2. Check which recalls are already in pending_recalls (dedup by recall_number + product_type)
 *   3. Build extracted_content for new recalls
 *   4. Insert into pending_recalls with status 'pending_review'
 *   5. Log the fetch run in fda_recall_fetch_log
 *
 * vercel.json cron config:
 * { "path": "/api/cron/fetch-recalls", "schedule": "0 7 * * *" }
 */

const DAYS_BACK = 60
const LIMIT_PER_TYPE = 25

export const maxDuration = 300

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    // Verify cron secret (MANDATORY — blocks requests when CRON_SECRET is unset)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Recall Cron] ========== FETCH RECALLS STARTING ==========')
    console.log(`[Recall Cron] Looking back ${DAYS_BACK} days, limit ${LIMIT_PER_TYPE} per type`)

    const supabase = createAdminClient()

    // Step 1: Fetch from openFDA
    const { recalls, errors: fetchErrors } = await fetchAllRecalls(DAYS_BACK, LIMIT_PER_TYPE)

    console.log(`[Recall Cron] Fetched ${recalls.length} recalls total`)

    if (recalls.length === 0 && fetchErrors.length > 0) {
      const errorMsg = fetchErrors.map(e => `${e.type}: ${e.error}`).join('; ')
      await supabase.from('fda_recall_fetch_log').insert({
        product_type: 'all',
        recalls_found: 0,
        recalls_new: 0,
        recalls_skipped: 0,
        recalls_failed: 0,
        fetch_source: 'openfda_api',
        duration_ms: Date.now() - startTime,
        error: errorMsg,
      })
      return NextResponse.json({ success: false, error: errorMsg }, { status: 502 })
    }

    // Step 2: Check which recalls already exist
    const recallKeys = recalls.map(r => r.recall_number)
    const { data: existing } = await supabase
      .from('pending_recalls')
      .select('recall_number, product_type')
      .in('recall_number', recallKeys)

    const existingSet = new Set(
      (existing || []).map(e => `${e.recall_number}::${e.product_type}`)
    )

    const newRecalls = recalls.filter(
      r => !existingSet.has(`${r.recall_number}::${r.product_type}`)
    )

    console.log(`[Recall Cron] ${existingSet.size} already exist, ${newRecalls.length} are new`)

    const skippedCount = recalls.length - newRecalls.length
    let newCount = 0
    let failedCount = 0
    const details: any[] = []

    // Step 3: Insert new recalls
    for (const recall of newRecalls) {
      try {
        if (!isValidRecallContent(recall)) {
          console.warn(`[Recall Cron] Invalid content for ${recall.recall_number}, skipping`)
          failedCount++
          details.push({
            recall_number: recall.recall_number,
            status: 'invalid_content',
          })
          continue
        }

        const content = buildRecallContent(recall)

        const { error: insertError } = await supabase.from('pending_recalls').insert({
          recall_number: recall.recall_number,
          product_description: recall.product_description,
          recalling_firm: recall.recalling_firm,
          reason_for_recall: recall.reason_for_recall,
          recall_initiation_date: recall.recall_initiation_date || null,
          termination_date: recall.termination_date || null,
          recall_type: recall.recall_type || null,
          voluntary_mandated: recall.voluntary_mandated || null,
          classification: recall.classification,
          product_type: recall.product_type,
          product_quantity: recall.product_quantity || null,
          distribution_pattern: recall.distribution_pattern || null,
          state: recall.state || null,
          country: recall.country || 'US',
          openfda_url: recall.openfda_url || null,
          extracted_content: content,
          status: 'pending_review',
          fetch_method: 'openfda_api',
        })

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`[Recall Cron] Duplicate ${recall.recall_number}, skipping`)
            details.push({ recall_number: recall.recall_number, status: 'duplicate' })
          } else {
            throw insertError
          }
        } else {
          newCount++
          details.push({
            recall_number: recall.recall_number,
            recalling_firm: recall.recalling_firm,
            classification: recall.classification,
            product_type: recall.product_type,
            status: 'pending_review',
          })
          console.log(`[Recall Cron] Saved: ${recall.recalling_firm} - ${recall.recall_number} (${recall.classification})`)
        }
      } catch (err: any) {
        console.error(`[Recall Cron] Failed to insert ${recall.recall_number}:`, err.message)
        failedCount++
        details.push({
          recall_number: recall.recall_number,
          status: 'error',
          error: err.message,
        })
      }
    }

    const durationMs = Date.now() - startTime

    // Step 4: Log the fetch run
    await supabase.from('fda_recall_fetch_log').insert({
      product_type: 'all',
      recalls_found: recalls.length,
      recalls_new: newCount,
      recalls_skipped: skippedCount,
      recalls_failed: failedCount,
      fetch_source: 'openfda_api',
      duration_ms: durationMs,
      details,
      error: fetchErrors.length > 0
        ? fetchErrors.map(e => `${e.type}: ${e.error}`).join('; ')
        : null,
    })

    console.log('[Recall Cron] ========== FETCH COMPLETE ==========')
    console.log(`[Recall Cron] Found: ${recalls.length}, New: ${newCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`)

    return NextResponse.json({
      success: true,
      recalls_found: recalls.length,
      recalls_new: newCount,
      recalls_skipped: skippedCount,
      recalls_failed: failedCount,
      duration_ms: durationMs,
      fetch_errors: fetchErrors,
      details,
    })
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    console.error('[Recall Cron] Fatal error:', error)

    try {
      const supabase = createAdminClient()
      await supabase.from('fda_recall_fetch_log').insert({
        product_type: 'all',
        recalls_found: 0,
        recalls_new: 0,
        recalls_skipped: 0,
        recalls_failed: 0,
        fetch_source: 'openfda_api',
        duration_ms: durationMs,
        error: error.message,
      })
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error.message || 'Recall fetch failed' },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggering from Admin Dashboard
export async function POST(request: Request) {
  return GET(request)
}
