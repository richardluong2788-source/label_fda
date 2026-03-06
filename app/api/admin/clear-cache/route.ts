/**
 * POST /api/admin/clear-cache
 *
 * Clears ALL vision analysis cache entries from Redis (prefix: vision:v1:*)
 * and optionally deletes audit_reports from Supabase.
 *
 * Usage:
 *   curl -X POST /api/admin/clear-cache \
 *     -H "Content-Type: application/json" \
 *     -d '{"clearReports": true}'
 *
 * Query params:
 *   ?reports=true  → also delete all audit_reports from Supabase
 */

import { NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/cache/redis'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const clearReports = body.clearReports === true

  const results: Record<string, unknown> = {}

  // ── 1. Clear Redis vision cache ──────────────────────────────────────────
  const redis = getRedisClient()
  if (!redis) {
    results.redis = { status: 'skipped', reason: 'Redis not configured' }
  } else {
    try {
      // Use SCAN to find all vision:v1:* keys and delete them
      let cursor = 0
      let deletedCount = 0
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: 'vision:v1:*',
          count: 100,
        })
        cursor = Number(nextCursor)
        if (keys.length > 0) {
          await redis.del(...keys)
          deletedCount += keys.length
        }
      } while (cursor !== 0)

      results.redis = { status: 'cleared', deletedKeys: deletedCount }
    } catch (err) {
      results.redis = { status: 'error', error: String(err) }
    }
  }

  // ── 2. Optionally clear Supabase audit_reports ───────────────────────────
  if (clearReports) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { count: before } = await supabase
        .from('audit_reports')
        .select('*', { count: 'exact', head: true })

      const { error } = await supabase
        .from('audit_reports')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows

      if (error) throw error

      results.supabase = { status: 'cleared', deletedReports: before ?? 'unknown' }
    } catch (err) {
      results.supabase = { status: 'error', error: String(err) }
    }
  } else {
    results.supabase = { status: 'skipped', reason: 'Pass clearReports:true to also clear DB' }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  })
}
