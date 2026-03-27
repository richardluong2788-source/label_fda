import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/knowledge/diff?part=101
 *
 * Fetches the latest eCFR content for a given Part and returns it alongside
 * the existing DB content so the client can render a side-by-side diff.
 *
 * Returns:
 * {
 *   part: "101",
 *   dbSections:   [{ id, title, content }],  // what's currently in DB
 *   ecfrSections: [{ id, title, content }],  // latest from eCFR
 *   dbDate:   "2024-01-15",
 *   ecfrDate: "2024-11-20",
 * }
 */

export async function GET(req: NextRequest) {
  try {
    const part = req.nextUrl.searchParams.get('part')
    if (!part || !/^\d{1,3}$/.test(part)) {
      return NextResponse.json({ error: 'Invalid part number' }, { status: 400 })
    }

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

    if (!adminUser || !['admin', 'superadmin', 'expert'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Get existing DB sections for this part
    const { data: dbChunks, error: dbError } = await supabase
      .from('compliance_knowledge')
      .select('content, metadata')
      .or(`metadata->>source.ilike.%Part ${part}%,metadata->>regulation.ilike.%Part ${part}%,metadata->>regulation_id.like.${part}.%`)
      .order('metadata->regulation_id', { ascending: true })

    if (dbError) throw dbError

    // Group DB chunks by section, reconstruct full section text
    const dbSectionMap: Record<string, { title: string; content: string; date: string | null }> = {}
    let latestDbDate: string | null = null

    for (const chunk of dbChunks || []) {
      const meta = chunk.metadata || {}
      const sectionId = meta.regulation_id || meta.section || 'unknown'

      // Extract part number from section id to filter accurately
      const chunkPartMatch = sectionId.match(/^(\d+)\./)
      if (chunkPartMatch && chunkPartMatch[1] !== part) continue

      if (!dbSectionMap[sectionId]) {
        dbSectionMap[sectionId] = {
          title: meta.title || sectionId,
          content: '',
          date: meta.lastAmendedDate || null,
        }
      }

      // Append chunk content (remove title prefix to avoid duplication)
      let content = chunk.content || ''
      const titleLine = (meta.title || '') + '\n\n'
      if (content.startsWith(titleLine)) {
        content = content.slice(titleLine.length)
      }
      // Remove [continued] overlap markers
      content = content.replace(/\[continued\]\n[\s\S]{0,250}\n\n/, '')

      dbSectionMap[sectionId].content += (dbSectionMap[sectionId].content ? '\n\n' : '') + content

      const chunkDate = meta.lastAmendedDate || null
      if (chunkDate && (!latestDbDate || chunkDate > latestDbDate)) {
        latestDbDate = chunkDate
      }
    }

    const dbSections = Object.entries(dbSectionMap)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([id, data]) => ({
        id,
        title: data.title,
        content: data.content.trim(),
      }))

    // 2. Fetch latest eCFR content
    const ecfrUrl = `https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-21?part=${part}`
    const ecfrRes = await fetch(ecfrUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'VeximGlobal-CFR-DiffTool/1.0',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!ecfrRes.ok) {
      return NextResponse.json({
        error: `eCFR API returned ${ecfrRes.status}`,
        dbSections,
        ecfrSections: [],
        dbDate: latestDbDate,
        ecfrDate: null,
        part,
      }, { status: 200 }) // Still return DB data even if eCFR fails
    }

    const html = await ecfrRes.text()

    // 3. Get eCFR version date
    let ecfrDate: string | null = null
    try {
      const vRes = await fetch(
        `https://www.ecfr.gov/api/versioner/v1/versions/title-21?part=${part}`,
        {
          headers: { 'User-Agent': 'VeximGlobal-CFR-DiffTool/1.0' },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (vRes.ok) {
        const vData = await vRes.json()
        const dates = (vData.content_versions || [])
          .map((v: any) => v.date || v.amendment_date)
          .filter(Boolean)
          .sort()
        ecfrDate = dates[dates.length - 1] || null
      }
    } catch { /* ignore */ }

    // 4. Parse eCFR HTML into sections (simplified version of script logic)
    const ecfrSections = parseEcfrHtml(html, part)

    return NextResponse.json({
      success: true,
      part,
      dbSections,
      ecfrSections,
      dbDate: latestDbDate,
      ecfrDate,
      dbChunkCount: dbChunks?.length || 0,
      ecfrSectionCount: ecfrSections.length,
    })
  } catch (error: any) {
    console.error('[diff] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── Parsing helpers (server-side, subset of the script logic) ─────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2019;/g, '\u2019')
    .replace(/&#xA7;/g, '\u00A7')
    .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1))))
    .trim()
}

function htmlTableToMarkdown(tableHtml: string): string {
  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  if (rowMatches.length === 0) return stripHtml(tableHtml)

  const rows: { cells: string[]; isHeader: boolean }[] = []
  let isFirstRow = true
  const hasExplicitHeader = tableHtml.includes('<thead') || tableHtml.includes('<th')

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1]
    const cellMatches = [...rowHtml.matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi)]
    const cells = cellMatches.map(m => stripHtml(m[2]).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim())
    if (cells.length === 0) continue
    const isHeader = cellMatches.some(m => m[1].toLowerCase() === 'th') || (isFirstRow && hasExplicitHeader)
    rows.push({ cells, isHeader })
    isFirstRow = false
  }

  if (rows.length === 0) return stripHtml(tableHtml)
  const numCols = Math.max(...rows.map(r => r.cells.length))
  const lines: string[] = []
  let headerEmitted = false

  for (const row of rows) {
    const paddedCells = [...row.cells]
    while (paddedCells.length < numCols) paddedCells.push('')
    lines.push('| ' + paddedCells.join(' | ') + ' |')
    if (row.isHeader && !headerEmitted) {
      lines.push('| ' + paddedCells.map(() => '---').join(' | ') + ' |')
      headerEmitted = true
    }
  }

  if (!headerEmitted && lines.length > 0) {
    lines.splice(1, 0, '| ' + Array(numCols).fill('---').join(' | ') + ' |')
  }

  return '\n\n' + lines.join('\n') + '\n\n'
}

function htmlToText(html: string, partNumber: string): string {
  let text = html
  text = text.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, match => htmlTableToMarkdown(match))
  text = text.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
    const altMatch = attrs.match(/alt\s*=\s*["']([^"']+)["']/i)
    return altMatch ? `\n[FIGURE: ${altMatch[1]}]\n` : '\n[FIGURE: FDA regulatory illustration]\n'
  })
  text = text.replace(/<\/?(p|div|br|li|h[1-6]|blockquote|pre|section|article)[^>]*>/gi, '\n\n')
  text = text.replace(/<li[^>]*>/gi, '\n- ')
  text = text.replace(/<[^>]+>/g, '')
  text = text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x2019;/g, '\u2019').replace(/&#xA7;/g, '\u00A7')
    .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1))))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

function parseEcfrHtml(html: string, partNumber: string): { id: string; title: string; content: string }[] {
  const fullText = htmlToText(html, partNumber)

  const sectionPattern = new RegExp(
    `(\\u00A7\\s*${partNumber}\\.\\d+[a-z]?(?:\\s*[-\\u2013\\u2014]\\s*${partNumber}\\.\\d+[a-z]?)?\\s+[^\\n]+)`,
    'g'
  )

  let sectionHeaders = [...fullText.matchAll(sectionPattern)]

  if (sectionHeaders.length === 0) {
    const fallback = /(\u00A7\s*\d+\.\d+[a-z]?\s+[^\n]+)/g
    sectionHeaders = [...fullText.matchAll(fallback)]
  }

  if (sectionHeaders.length === 0) {
    return [{ id: `${partNumber}.0`, title: `Part ${partNumber} - Full Text`, content: fullText }]
  }

  const sections: { id: string; title: string; content: string }[] = []
  const seen = new Set<string>()

  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i]
    const title = header[1].trim()
    const idMatch = title.match(/\u00A7\s*(\d+\.\d+[a-z]?)/)
    const id = idMatch ? idMatch[1] : `${partNumber}.unknown_${i}`

    if (seen.has(id)) continue
    seen.add(id)

    const startIdx = header.index! + header[0].length
    const endIdx = i + 1 < sectionHeaders.length ? sectionHeaders[i + 1].index! : fullText.length

    let content = fullText.slice(startIdx, endIdx).trim()
    content = content
      .replace(/\n\s*Authority:[\s\S]*$/i, '')
      .replace(/\n\s*Source:[\s\S]*$/i, '')
      .trim()

    sections.push({ id, title, content })
  }

  return sections
}
