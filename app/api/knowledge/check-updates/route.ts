import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/knowledge/check-updates
 *
 * Compares the `lastAmendedDate` stored in compliance_knowledge metadata
 * with the latest version from the eCFR Versioner API.
 *
 * Returns a list of Parts with their update status.
 */

const VEXIM_PARTS = [
  '1', '7', '101', '102', '111', '112', '117',
  '131', '145', '146', '161',
  '170', '172', '182', '184',
  '700', '701', '710', '720', '740',
  '801', '807', '820',
]

interface PartStatus {
  part: string
  dbDate: string | null
  ecfrDate: string | null
  needsUpdate: boolean
  reason: string
  dbChunkCount: number
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser || !['admin', 'superadmin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Step 1: Get existing data from DB — what's the latest lastAmendedDate per part?
    const { data: existingChunks, error: dbError } = await supabase
      .from('compliance_knowledge')
      .select('metadata')
      .not('metadata->regulation_id', 'is', null)

    if (dbError) throw dbError

    // Group by part number and find the latest amendment date
    const dbPartDates: Record<string, { date: string | null; count: number }> = {}
    for (const chunk of existingChunks || []) {
      const meta = chunk.metadata || {}
      const regId = meta.regulation_id || meta.section || ''
      const partMatch = regId.match(/^(\d+)\./)
      if (!partMatch) continue

      const part = partMatch[1]
      if (!dbPartDates[part]) {
        dbPartDates[part] = { date: null, count: 0 }
      }
      dbPartDates[part].count++

      const chunkDate = meta.lastAmendedDate || meta.last_amended_date || null
      if (chunkDate && (!dbPartDates[part].date || chunkDate > dbPartDates[part].date)) {
        dbPartDates[part].date = chunkDate
      }
    }

    // Step 2: Check eCFR Versioner API for each part
    const results: PartStatus[] = []

    for (const part of VEXIM_PARTS) {
      const dbInfo = dbPartDates[part] || { date: null, count: 0 }
      let ecfrDate: string | null = null

      try {
        const versionUrl = `https://www.ecfr.gov/api/versioner/v1/versions/title-21?part=${part}`
        const res = await fetch(versionUrl, {
          headers: { 'User-Agent': 'VeximGlobal-CFR-VersionCheck/1.0' },
          signal: AbortSignal.timeout(8000),
        })

        if (res.ok) {
          const vData = await res.json()
          if (vData.content_versions?.length > 0) {
            const dates = vData.content_versions
              .map((v: any) => v.date || v.amendment_date)
              .filter(Boolean)
              .sort()
            ecfrDate = dates[dates.length - 1] || null
          }
        }
      } catch {
        // Timeout or network error — skip this part
      }

      let needsUpdate = false
      let reason = ''

      if (dbInfo.count === 0) {
        needsUpdate = true
        reason = 'Not imported yet'
      } else if (!dbInfo.date && ecfrDate) {
        needsUpdate = true
        reason = 'No version info in DB'
      } else if (dbInfo.date && ecfrDate && ecfrDate > dbInfo.date) {
        needsUpdate = true
        reason = `FDA updated: ${dbInfo.date} -> ${ecfrDate}`
      } else if (!ecfrDate) {
        reason = 'Could not check eCFR'
      } else {
        reason = 'Up to date'
      }

      results.push({
        part,
        dbDate: dbInfo.date,
        ecfrDate,
        needsUpdate,
        reason,
        dbChunkCount: dbInfo.count,
      })

      // Rate limit: 200ms between eCFR API calls
      await new Promise(r => setTimeout(r, 200))
    }

    const needsUpdateCount = results.filter(r => r.needsUpdate).length

    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      total_parts: VEXIM_PARTS.length,
      needs_update: needsUpdateCount,
      up_to_date: VEXIM_PARTS.length - needsUpdateCount,
      parts: results,
    })
  } catch (error: any) {
    console.error('[v0] Check updates error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
