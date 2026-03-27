import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * Cron job: cleanup-expired-reports
 * Runs daily at 03:00 UTC.
 *
 * Logic per plan:
 *  - free      → storage_days = 7   → xóa ảnh + report sau 7 ngày
 *  - starter   → storage_days = 60  → xóa ảnh + report sau 60 ngày
 *  - pro       → storage_days = NULL → giữ vĩnh viễn (không xóa)
 *  - enterprise→ storage_days = NULL → giữ vĩnh viễn (không xóa)
 *
 * Quá trình:
 *  1. Join audit_reports × user_subscriptions × subscription_plans
 *  2. Lấy các report đã quá hạn (created_at + storage_days < NOW)
 *  3. Parse image URLs từ label_images JSONB + label_image_url
 *  4. Xóa files khỏi Supabase Storage
 *  5. Xóa rows: analysis_queue, vision_analysis_cache, audit_reports
 */

interface ImageEntry {
  url: string
  type?: string
}

function extractStoragePaths(report: {
  label_image_url: string | null
  label_images: ImageEntry[] | null
}): string[] {
  const paths: string[] = []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/label-images/`

  const addPath = (url: string) => {
    if (!url || url === 'manual-entry') return
    if (url.startsWith(storagePrefix)) {
      paths.push(url.replace(storagePrefix, ''))
    } else if (url.includes('/label-images/')) {
      const idx = url.indexOf('/label-images/')
      paths.push(url.slice(idx + '/label-images/'.length))
    }
  }

  if (report.label_image_url) addPath(report.label_image_url)
  if (Array.isArray(report.label_images)) {
    for (const img of report.label_images) {
      if (img?.url) addPath(img.url)
    }
  }

  // Deduplicate
  return [...new Set(paths)]
}

export async function GET(request: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()

    console.log('[cleanup-reports] Starting at', now.toISOString())

    // ── Fetch expired reports ────────────────────────────────
    // Join: audit_reports → user_subscriptions → subscription_plans
    // Filter: storage_days IS NOT NULL (pro/enterprise excluded)
    //         AND created_at + storage_days days < now
    const { data: expiredReports, error: fetchError } = await supabase
      .from('audit_reports')
      .select(`
        id,
        user_id,
        label_image_url,
        label_images,
        created_at,
        user_subscriptions!inner (
          plan_id,
          subscription_plans!inner (
            storage_days
          )
        )
      `)
      .not('user_subscriptions.subscription_plans.storage_days', 'is', null)
      .lt('created_at', new Date(0).toISOString()) // placeholder, overridden below

    // The Supabase JS client doesn't support computed comparisons (created_at + interval)
    // so we fetch all non-null storage_days reports and filter in JS.
    const { data: candidateReports, error: candidateError } = await supabase
      .from('audit_reports')
      .select(`
        id,
        user_id,
        label_image_url,
        label_images,
        created_at,
        user_subscriptions (
          plan_id,
          subscription_plans (
            storage_days
          )
        )
      `)

    if (candidateError) {
      throw new Error(`Failed to fetch reports: ${candidateError.message}`)
    }

    if (!candidateReports || candidateReports.length === 0) {
      console.log('[cleanup-reports] No reports found')
      return NextResponse.json({ success: true, deleted_reports: 0, deleted_files: 0 })
    }

    // Filter: only reports whose plan has storage_days AND has expired
    const toDelete = candidateReports.filter((report: any) => {
      const sub = report.user_subscriptions
      if (!sub) return false

      const plan = sub.subscription_plans
      if (!plan) return false

      const storageDays: number | null = plan.storage_days
      if (storageDays === null || storageDays === undefined) return false // vĩnh viễn

      const expireAt = new Date(report.created_at)
      expireAt.setDate(expireAt.getDate() + storageDays)
      return expireAt < now
    })

    console.log(`[cleanup-reports] Found ${toDelete.length} expired reports (of ${candidateReports.length} total)`)

    if (toDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired reports to cleanup',
        total_checked: candidateReports.length,
        deleted_reports: 0,
        deleted_files: 0,
      })
    }

    const reportIds = toDelete.map((r: any) => r.id)

    // ── Collect storage paths ────────────────────────────────
    const allStoragePaths: string[] = []
    for (const report of toDelete) {
      const paths = extractStoragePaths({
        label_image_url: (report as any).label_image_url,
        label_images: (report as any).label_images,
      })
      allStoragePaths.push(...paths)
    }

    console.log(`[cleanup-reports] Storage paths to delete: ${allStoragePaths.length}`)

    // ── Delete from Storage (batch 100) ─────────────────────
    let deletedFiles = 0
    if (allStoragePaths.length > 0) {
      const BATCH = 100
      for (let i = 0; i < allStoragePaths.length; i += BATCH) {
        const batch = allStoragePaths.slice(i, i + BATCH)
        const { error: storageError } = await supabase.storage
          .from('label-images')
          .remove(batch)

        if (storageError) {
          console.error(`[cleanup-reports] Storage delete error (batch ${i / BATCH + 1}):`, storageError.message)
        } else {
          deletedFiles += batch.length
        }
      }
    }

    // ── Delete DB rows (cascade-safe order) ──────────────────

    // 1. analysis_queue rows
    const { error: queueError } = await supabase
      .from('analysis_queue')
      .delete()
      .in('report_id', reportIds)

    if (queueError) {
      console.error('[cleanup-reports] Failed to delete queue rows:', queueError.message)
    }

    // 2. vision_analysis_cache rows keyed by report_id (if column exists)
    const { error: cacheError } = await supabase
      .from('vision_analysis_cache')
      .delete()
      .in('report_id', reportIds)

    if (cacheError) {
      // Cache table may not have report_id — non-fatal
      console.warn('[cleanup-reports] Cache cleanup skipped or failed:', cacheError.message)
    }

    // 3. audit_reports rows (deletes cascade to child tables via FK)
    const { error: reportError } = await supabase
      .from('audit_reports')
      .delete()
      .in('id', reportIds)

    if (reportError) {
      throw new Error(`Failed to delete audit_reports: ${reportError.message}`)
    }

    // ── Build summary ────────────────────────────────────────
    const summary = toDelete.map((r: any) => ({
      id: r.id,
      plan: r.user_subscriptions?.subscription_plans?.storage_days
        ? `${r.user_subscriptions.subscription_plans.storage_days}d`
        : 'unknown',
      created_at: r.created_at,
    }))

    console.log(`[cleanup-reports] Done. Deleted ${toDelete.length} reports, ${deletedFiles} files.`)

    return NextResponse.json({
      success: true,
      message: `Cleanup complete`,
      total_checked: candidateReports.length,
      deleted_reports: toDelete.length,
      deleted_files: deletedFiles,
      deleted_report_ids: reportIds,
      summary,
    })
  } catch (error: any) {
    console.error('[cleanup-reports] Fatal error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Cleanup failed' },
      { status: 500 }
    )
  }
}

// Allow POST for manual trigger
export { GET as POST }
