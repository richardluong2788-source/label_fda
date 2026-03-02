import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { fetchPriorityAlerts } from '@/lib/fda-import-alert-scraper'
import { NextResponse } from 'next/server'

/**
 * Cron job: Fetch/update FDA Import Alerts via HTML scraping / JSON endpoint
 *
 * Flow:
 *   1. Fetch priority Import Alerts from FDA (JSON endpoints)
 *   2. Check which alerts already exist in pending_import_alerts (dedup by alert_number)
 *   3. Insert new alerts / update existing alerts with fresh data
 *   4. Log the fetch run in fda_import_alert_fetch_log
 *
 * vercel.json cron config:
 * { "path": "/api/cron/fetch-import-alerts", "schedule": "0 8 * * *" }
 *
 * Frequency: 24h (per spec)
 */

const DELAY_BETWEEN_FETCHES_MS = 800  // Reduced: 404s now fail-fast, no retry needed
const MAX_ALERTS_PER_RUN = 60         // Process at most 60 alerts per cron run to stay within 5-min limit

export const maxDuration = 300 // 5 min timeout (max for hobby plan)

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    // Verify auth: accept either CRON_SECRET (Vercel scheduler) or admin session (manual trigger)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isCronAuth) {
      // Fall back to Supabase admin session check
      const supabaseUser = await createClient()
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser()

      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: adminUser } = await supabaseUser
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'superadmin', 'expert'])
        .single()

      if (!adminUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    console.log('[IA Cron] ========== FETCH IMPORT ALERTS STARTING ==========')

    const supabase = createAdminClient()

    // Step 1: Fetch priority alerts from FDA
    const { alerts, errors: fetchErrors } = await fetchPriorityAlerts(DELAY_BETWEEN_FETCHES_MS, MAX_ALERTS_PER_RUN)

    console.log(`[IA Cron] Fetched ${alerts.length} alerts, ${fetchErrors.length} errors`)

    if (alerts.length === 0 && fetchErrors.length > 0) {
      const errorMsg = fetchErrors.map(e => `${e.alert_number}: ${e.error}`).join('; ')
      await supabase.from('fda_import_alert_fetch_log').insert({
        alerts_found: 0,
        alerts_new: 0,
        alerts_updated: 0,
        alerts_failed: fetchErrors.length,
        fetch_source: 'fda_import_alerts_scraper',
        duration_ms: Date.now() - startTime,
        error: errorMsg,
      })
      return NextResponse.json({ success: false, error: errorMsg }, { status: 502 })
    }

    // Step 2: Check which alerts already exist
    const alertNumbers = alerts.map(a => a.alert_number)
    const { data: existing } = await supabase
      .from('pending_import_alerts')
      .select('alert_number, updated_at')
      .in('alert_number', alertNumbers)

    const existingMap = new Map(
      (existing || []).map(e => [e.alert_number, e.updated_at])
    )

    let newCount = 0
    let updatedCount = 0
    let failedCount = 0
    const details: any[] = []

    // Step 3: Upsert alerts
    for (const alert of alerts) {
      try {
        const isExisting = existingMap.has(alert.alert_number)

        if (isExisting) {
          // Update existing: always overwrite title/industry/reason from curated list
          // (fixes stale seed data that had wrong industry_type / alert_title)
          const { error: updateError } = await supabase
            .from('pending_import_alerts')
            .update({
              alert_title: alert.alert_title,
              industry_type: alert.industry_type,
              reason_for_alert: alert.reason_for_alert,
              action_type: alert.action_type,
              red_list_entities: alert.red_list_entities,
              effective_date: alert.effective_date || null,
              last_updated_date: alert.last_updated_date || null,
              extracted_content: alert.extracted_content,
              source_url: alert.source_url,
              country_scope: alert.country_scope ?? [],
            })
            .eq('alert_number', alert.alert_number)

          if (updateError) throw updateError

          updatedCount++
          details.push({
            alert_number: alert.alert_number,
            status: 'updated',
            entities_count: alert.red_list_entities.length,
          })
        } else {
          // Insert new alert
          const { error: insertError } = await supabase
            .from('pending_import_alerts')
            .insert({
              alert_number: alert.alert_number,
              alert_title: alert.alert_title,
              industry_type: alert.industry_type,
              reason_for_alert: alert.reason_for_alert,
              action_type: alert.action_type,
              red_list_entities: alert.red_list_entities,
              effective_date: alert.effective_date || null,
              last_updated_date: alert.last_updated_date || null,
              extracted_content: alert.extracted_content,
              source_url: alert.source_url,
              country_scope: alert.country_scope ?? [],
              status: 'pending_review',
              fetch_method: 'html_scraping',
            })

          if (insertError) {
            if (insertError.code === '23505') {
              // Duplicate (race condition)
              console.log(`[IA Cron] Duplicate ${alert.alert_number}, skipping`)
              details.push({ alert_number: alert.alert_number, status: 'duplicate' })
            } else {
              throw insertError
            }
          } else {
            newCount++
            details.push({
              alert_number: alert.alert_number,
              alert_title: alert.alert_title,
              status: 'new',
              industry_type: alert.industry_type,
              entities_count: alert.red_list_entities.length,
            })
            console.log(`[IA Cron] New alert: ${alert.alert_number} - ${alert.alert_title}`)
          }
        }
      } catch (err: any) {
        console.error(`[IA Cron] Failed to process ${alert.alert_number}:`, err.message)
        failedCount++
        details.push({
          alert_number: alert.alert_number,
          status: 'error',
          error: err.message,
        })
      }
    }

    const durationMs = Date.now() - startTime

    // Step 4: Run TTL cleanup — deactivate stale/expired alerts (migration 025)
    try {
      const { data: cleanupResult } = await supabase.rpc('cleanup_stale_import_alerts', {
        p_stale_days: 180,
        p_expire_years: 7,
      })
      if (cleanupResult?.[0]) {
        const { deactivated_count, expired_count, healthy_count } = cleanupResult[0]
        console.log(`[IA Cron] Cleanup: ${deactivated_count} stale flagged, ${expired_count} expired, ${healthy_count} healthy`)
      }
    } catch (cleanupErr: any) {
      console.warn('[IA Cron] Cleanup function error (non-fatal):', cleanupErr.message)
    }

    // Step 5: Log the fetch run
    await supabase.from('fda_import_alert_fetch_log').insert({
      alerts_found: alerts.length,
      alerts_new: newCount,
      alerts_updated: updatedCount,
      alerts_failed: failedCount,
      fetch_source: 'fda_import_alerts_scraper',
      duration_ms: durationMs,
      details,
      error: fetchErrors.length > 0
        ? fetchErrors.map(e => `${e.alert_number}: ${e.error}`).join('; ')
        : null,
    })

    console.log('[IA Cron] ========== FETCH COMPLETE ==========')
    console.log(`[IA Cron] Found: ${alerts.length}, New: ${newCount}, Updated: ${updatedCount}, Failed: ${failedCount}`)

    return NextResponse.json({
      success: true,
      alerts_found: alerts.length,
      alerts_new: newCount,
      alerts_updated: updatedCount,
      alerts_failed: failedCount,
      duration_ms: durationMs,
      fetch_errors: fetchErrors,
      details,
    })
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    console.error('[IA Cron] Fatal error:', error)

    try {
      const supabase = createAdminClient()
      await supabase.from('fda_import_alert_fetch_log').insert({
        alerts_found: 0,
        alerts_new: 0,
        alerts_updated: 0,
        alerts_failed: 0,
        fetch_source: 'fda_import_alerts_scraper',
        duration_ms: durationMs,
        error: error.message,
      })
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error.message || 'Import Alert fetch failed' },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggering from Admin Dashboard
export async function POST(request: Request) {
  return GET(request)
}
