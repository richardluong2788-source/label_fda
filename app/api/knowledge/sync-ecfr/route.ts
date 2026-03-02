import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateEmbeddingsBatch } from '@/lib/embedding-utils'
import {
  buildCorrectMetadata,
  chunkSectionWithTitle,
} from '@/lib/rag/cfr-metadata-mapper'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/knowledge/sync-ecfr
//
// Fetches one or more 21 CFR Parts directly from the public eCFR API,
// parses HTML → structured sections (with Markdown tables + image alt-text),
// generates embeddings, and upserts into Supabase.
//
// Body: { parts: ["101", "701", ...], mode: "skip_existing" | "replace_all" }
//   - skip_existing (default): skip Parts that already have chunks in DB
//   - replace_all: delete existing chunks first, then re-import
// ─────────────────────────────────────────────────────────────────────────────

const ECFR_RENDERER_BASE = 'https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-21'
const ECFR_VERSIONER_BASE = 'https://www.ecfr.gov/api/versioner/v1/versions/title-21'

// Vercel functions time out at 60s on hobby / 300s on pro.
// We process one part at a time and stream progress via JSON lines.
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { parts = [], mode = 'skip_existing' } = body as {
      parts: string[]
      mode: 'skip_existing' | 'replace_all'
    }

    if (!parts.length) {
      return NextResponse.json({ error: 'parts array is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: adminUser } = await supabase
      .from('admin_users').select('role').eq('user_id', user.id).single()
    if (!adminUser || !['admin', 'superadmin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Stream results via ReadableStream so the UI can show live progress
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'))
        }

        const results: any[] = []

        for (const part of parts) {
          send({ type: 'start', part, message: `Dang xu ly Part ${part}...` })

          try {
            // ── 1. Check eCFR versioner for lastAmendedDate ───────────────
            let lastAmendedDate: string | null = null
            try {
              const vRes = await fetch(`${ECFR_VERSIONER_BASE}?part=${part}`)
              if (vRes.ok) {
                const vData = await vRes.json()
                const versions = vData.content_versions ?? vData.versions ?? []
                if (versions.length > 0) {
                  lastAmendedDate = versions[0].date ?? versions[0].amendment_date ?? null
                }
              }
            } catch {
              // versioner is optional — continue without it
            }

            // ── 2. Skip if already up-to-date (skip_existing mode) ───────
            if (mode === 'skip_existing') {
              const { count } = await supabase
                .from('compliance_knowledge')
                .select('*', { count: 'exact', head: true })
                .filter('metadata->>part_number', 'eq', part)
              if ((count ?? 0) > 0) {
                send({ type: 'skip', part, message: `Part ${part} da co trong DB (${count} chunks), bo qua.` })
                results.push({ part, status: 'skipped', chunks: count })
                continue
              }
            }

            // ── 3. Delete existing chunks if replace_all ──────────────────
            if (mode === 'replace_all') {
              const { error: delErr } = await supabase
                .from('compliance_knowledge')
                .delete()
                .filter('metadata->>part_number', 'eq', part)
              if (delErr) throw new Error(`Khong the xoa du lieu cu: ${delErr.message}`)
              send({ type: 'info', part, message: `Da xoa chunks cu cua Part ${part}.` })
            }

            // ── 4. Fetch HTML from eCFR ───────────────────────────────────
            send({ type: 'info', part, message: `Dang fetch eCFR API cho Part ${part}...` })
            const url = `${ECFR_RENDERER_BASE}?part=${part}`
            const res = await fetch(url, {
              headers: { 'Accept': 'text/html', 'User-Agent': 'VeximGlobal/1.0' },
              signal: AbortSignal.timeout(30000),
            })
            if (!res.ok) throw new Error(`eCFR API tra ve ${res.status} cho Part ${part}`)
            const html = await res.text()
            send({ type: 'info', part, message: `Da nhan HTML (${Math.round(html.length / 1024)}KB). Dang parse...` })

            // ── 5. Parse HTML → sections ──────────────────────────────────
            const sections = parseEcfrHtml(html, part)
            send({ type: 'info', part, message: `Parse xong: ${sections.length} sections. Dang tao embeddings...` })

            if (sections.length === 0) {
              send({ type: 'warn', part, message: `Khong tim thay section nao trong Part ${part}.` })
              results.push({ part, status: 'empty', chunks: 0 })
              continue
            }

            // ── 6. Chunk → embed → insert in batches ─────────────────────
            const BATCH = 20
            let totalInserted = 0

            const allChunks: Array<{ content: string; metadata: any }> = []

            for (const sec of sections) {
              if (!sec.content || sec.content.trim().length < 50) continue
              const chunks = chunkSectionWithTitle(sec.title, sec.content)
              for (let i = 0; i < chunks.length; i++) {
                const base = {
                  regulation_id: sec.id,
                  title: sec.title,
                  section: sec.id,
                  chunk_index: i,
                  total_chunks: chunks.length,
                  imported_at: new Date().toISOString(),
                  imported_by: user.email,
                  sync_source: 'ecfr_api',
                  ...(lastAmendedDate ? { lastAmendedDate } : {}),
                  ...(chunks[i].includes('| ') ? { contains_table: true } : {}),
                  ...(sec.hasImage ? { has_image_ref: true } : {}),
                }
                allChunks.push({
                  content: chunks[i],
                  metadata: buildCorrectMetadata(chunks[i], part, base),
                })
              }
            }

            for (let s = 0; s < allChunks.length; s += BATCH) {
              const batch = allChunks.slice(s, s + BATCH)
              const embeddings = await generateEmbeddingsBatch(batch.map(c => c.content))
              const records = batch.map((c, idx) => ({
                content: c.content,
                metadata: c.metadata,
                embedding: embeddings[idx],
              }))
              const { data: inserted, error: insErr } = await supabase
                .from('compliance_knowledge')
                .insert(records)
                .select('id')
              if (insErr) throw new Error(`Insert error: ${insErr.message}`)
              totalInserted += inserted?.length ?? 0
              send({ type: 'progress', part, inserted: totalInserted, total: allChunks.length })
              // small delay to avoid rate limiting
              if (s + BATCH < allChunks.length) await sleep(800)
            }

            send({
              type: 'done', part,
              message: `Part ${part} hoan tat: ${totalInserted} chunks da luu.`,
              chunks: totalInserted,
              lastAmendedDate,
            })
            results.push({ part, status: 'success', chunks: totalInserted, lastAmendedDate })

          } catch (err: any) {
            send({ type: 'error', part, message: err.message })
            results.push({ part, status: 'error', error: err.message })
          }
        }

        // Final summary
        send({ type: 'summary', results })
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/knowledge/sync-ecfr?parts=101,701
// Quick status check: returns chunk counts for given parts in DB
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const partsParam = searchParams.get('parts') ?? ''
  const parts = partsParam.split(',').map(p => p.trim()).filter(Boolean)

  if (!parts.length) {
    return NextResponse.json({ error: 'parts query param required, e.g. ?parts=101,701' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const statuses = await Promise.all(parts.map(async (part) => {
    const { count } = await supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })
      .filter('metadata->>part_number', 'eq', part)
    return { part, dbChunkCount: count ?? 0 }
  }))

  return NextResponse.json({ statuses })
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML PARSER
// Converts eCFR HTML into structured sections with:
//   - HTML tables → Markdown tables
//   - <img> → [FIGURE: alt-text description]
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedSection {
  id: string
  title: string
  content: string
  hasImage: boolean
}

function parseEcfrHtml(html: string, partNumber: string): ParsedSection[] {
  // We run in Node.js (no DOM). Use regex-based parsing — good enough for eCFR's
  // well-structured HTML which follows a consistent heading/section pattern.

  // Step 1: convert tables to Markdown BEFORE stripping tags
  html = convertTablesToMarkdown(html)

  // Step 2: convert images to [FIGURE: ...] alt-text
  html = convertImagesToAltText(html, partNumber)

  // Step 3: normalise whitespace / line breaks
  html = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')         // strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&sect;/g, '§')
    .replace(/&#167;/g, '§')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Step 4: split on § section boundaries
  // eCFR sections start with "§ 101.9" or "§ 740.10" etc.
  const sectionPattern = /(?=§\s*\d{1,3}\.\d+[a-z]?\s)/g
  const rawSections = html.split(sectionPattern).filter(s => s.trim().length > 50)

  const sections: ParsedSection[] = []

  for (const raw of rawSections) {
    const lines = raw.trim().split('\n')
    const firstLine = lines[0].trim()

    // Extract section id from "§ 101.9" etc.
    const idMatch = firstLine.match(/§\s*(\d{1,3}\.\d+[a-z]?)/)
    if (!idMatch) {
      // No § id — could be a preamble / part title block, keep as a general section
      const hasImage = raw.includes('[FIGURE:')
      sections.push({
        id: `part_${partNumber}_intro`,
        title: `21 CFR Part ${partNumber}`,
        content: raw.trim(),
        hasImage,
      })
      continue
    }

    const id = idMatch[1]
    // Title = first line (the § heading)
    const title = firstLine.replace(/\s+/g, ' ').trim()
    // Content = everything after the first line
    const content = lines.slice(1).join('\n').trim()
    const hasImage = content.includes('[FIGURE:')

    if (content.length < 50) continue

    sections.push({ id, title, content, hasImage })
  }

  return sections
}

// ── Table → Markdown ─────────────────────────────────────────────────────────
function convertTablesToMarkdown(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner) => {
    const rows: string[][] = []

    const rowMatches = tableInner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
    for (const rowMatch of rowMatches) {
      const cells: string[] = []
      const cellMatches = rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)
      for (const cell of cellMatches) {
        const cellText = cell[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        cells.push(cellText)
      }
      if (cells.length > 0) rows.push(cells)
    }

    if (rows.length === 0) return ''

    const colCount = Math.max(...rows.map(r => r.length))
    const padRow = (row: string[]) => {
      while (row.length < colCount) row.push('')
      return '| ' + row.map(c => c.replace(/\|/g, '\\|')).join(' | ') + ' |'
    }

    const header = padRow(rows[0])
    const divider = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
    const body = rows.slice(1).map(padRow).join('\n')

    return '\n\n' + header + '\n' + divider + (body ? '\n' + body : '') + '\n\n'
  })
}

// ── Image → Alt-text ─────────────────────────────────────────────────────────
function convertImagesToAltText(html: string, partNumber: string): string {
  const figureDescriptions: Record<string, string> = {
    '101': 'Nutrition Facts label layout showing required format, font sizes, and field placement',
    '701': 'Cosmetic product label layout showing required statement of identity and net quantity placement',
    '801': 'Medical device label layout showing required manufacturer information and directions for use placement',
    '820': 'Quality Management System documentation flow diagram',
  }
  const defaultDesc = figureDescriptions[partNumber] ?? `Regulatory diagram for 21 CFR Part ${partNumber}`

  return html.replace(/<img[^>]*>/gi, (imgTag) => {
    const altMatch = imgTag.match(/alt\s*=\s*["']([^"']*)["']/i)
    const altText = altMatch?.[1]?.trim()
    const desc = altText && altText.length > 5
      ? altText
      : defaultDesc
    return `\n\n[FIGURE: ${desc}. See official eCFR at ecfr.gov for the full visual reference.]\n\n`
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
