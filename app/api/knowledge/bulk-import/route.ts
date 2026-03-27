import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/embedding-utils'
import { buildCorrectMetadata, inferPartNumberFromFileName, chunkSectionWithTitle } from '@/lib/rag/cfr-metadata-mapper'

/**
 * Bulk import 21 CFR Part 101 regulations into Knowledge Base
 * Expects JSON with structure: { sections: [{ id, title, content, subsections }] }
 */
export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    
    console.log('[v0] ========== BULK IMPORT STARTING ==========')
    console.log('[v0] Request data:', requestData)

    let data = requestData

    // If fileUrl is provided, fetch JSON from storage
    if (requestData.fileUrl) {
      console.log('[v0] Fetching JSON from storage URL:', requestData.fileUrl)
      console.log('[v0] WARNING: Large file detected, using streaming if needed')
      
      const fileResponse = await fetch(requestData.fileUrl)
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file from storage')
      }
      
      // Check content length
      const contentLength = fileResponse.headers.get('content-length')
      const fileSizeMB = contentLength ? parseInt(contentLength) / 1024 / 1024 : 0
      console.log('[v0] File size:', fileSizeMB.toFixed(2), 'MB')
      
      // For files > 10MB, we should process in chunks to avoid memory issues
      // But for JSON, we need the full structure, so we parse it carefully
      const fileText = await fileResponse.text()
      console.log('[v0] File downloaded, parsing JSON...')
      
      // Parse JSON with error handling
      try {
        data = JSON.parse(fileText)
        console.log('[v0] JSON parsed successfully, size in memory: ~', (fileText.length / 1024 / 1024 * 2).toFixed(2), 'MB (estimated)')
      } catch (parseError: any) {
        throw new Error(`JSON parsing failed: ${parseError.message}. File may be corrupted or not valid JSON.`)
      }
    }
    
    console.log('[v0] Received data keys:', Object.keys(data))

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser || !['admin', 'superadmin'].includes(adminUser.role)) {
      return NextResponse.json({ 
        error: 'Forbidden - Only admins can bulk import regulations' 
      }, { status: 403 })
    }

    console.log('[v0] User authorized:', user.email, '- Role:', adminUser.role)

    // Parse 21 CFR Part 101 JSON structure
    let sections = []
    
    // Try different JSON structures
    if (data.sections) {
      sections = data.sections
    } else if (Array.isArray(data)) {
      sections = data
    } else if (data.regulations) {
      sections = data.regulations
    } else if (data.cfr) {
      sections = data.cfr
    } else {
      // If single object, wrap in array
      sections = [data]
    }

    // Infer CFR part number hint from the file name if provided
    // e.g. "21cfr701.json" → "701", helps buildCorrectMetadata pick the right mapping
    const fileNameHint = requestData.fileName || requestData.fileUrl || ''
    const partNumberHint = inferPartNumberFromFileName(fileNameHint)
    console.log('[v0] Part number hint from file name:', partNumberHint ?? '(none — will auto-detect per chunk)')

    // Extract version info from meta (set by fetch-ecfr-to-json.mjs v2+)
    const lastAmendedDate = data.meta?.lastAmendedDate || null
    if (lastAmendedDate) {
      console.log('[v0] Source amendment date:', lastAmendedDate)
    }

    console.log('[v0] Found', sections.length, 'top-level sections to import')

    if (sections.length === 0) {
      return NextResponse.json({ 
        error: 'No sections found in JSON. Expected structure: { sections: [...] }' 
      }, { status: 400 })
    }

    // ── STEP 1: Flatten JSON tree into complete § Sections ──────────────────
    // A "complete section" = one §-level item with all its sub-content merged.
    // This is the unit we store — one record per § section, chunked only when
    // that section exceeds MAX_SECTION_CHARS.
    const flatSections = flattenToCompleteSections(sections)
    console.log('[v0] After flattening: ', flatSections.length, 'complete § sections')

    const insertedRecords: any[] = []
    let totalChunks = 0
    let skippedSections = 0
    let garbageFiltered = 0

    const BATCH_SIZE = 20

    for (let batchStart = 0; batchStart < flatSections.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, flatSections.length)
      const batchSections = flatSections.slice(batchStart, batchEnd)

      const batchChunks: Array<{ content: string; metadata: any }> = []

      for (const sec of batchSections) {
        // ── STEP 2: Filter garbage records ──────────────────────────────────
        if (isGarbageSection(sec.id, sec.title, sec.content)) {
          garbageFiltered++
          continue
        }

        if (!sec.content || sec.content.trim().length < 50) {
          skippedSections++
          continue
        }

        // ── STEP 3: Chunk by section — preserve title at start of each chunk ─
        const chunks = chunkSectionWithTitle(sec.title, sec.content)

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunkContent = chunks[chunkIndex]

          const baseMetadata = {
            regulation_id: sec.id,
            title: sec.title,
            section: sec.id,
            // These defaults will be overridden by buildCorrectMetadata
            source: `21 CFR Part ${partNumberHint ?? '101'}`,
            document_type: 'FDA Regulation',
            industry: 'Food & Beverages',
            chunk_index: chunkIndex,
            total_chunks: chunks.length,
            imported_at: new Date().toISOString(),
            imported_by: user.email,
            // Versioning: track which FDA amendment this came from
            ...(lastAmendedDate ? { lastAmendedDate } : {}),
            // Table flag: helps AI know this chunk has tabular data
            ...(chunkContent.includes('| ') && chunkContent.includes(' | ') ? { contains_table: true } : {}),
          }

          const correctedMetadata = buildCorrectMetadata(chunkContent, partNumberHint, baseMetadata)

          batchChunks.push({ content: chunkContent, metadata: correctedMetadata })
        }
      }

      if (batchChunks.length === 0) continue

      const embeddings = await generateEmbeddingsBatch(batchChunks.map(c => c.content))

      const recordsToInsert = batchChunks.map((chunk, idx) => ({
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: embeddings[idx],
      }))

      const { data: inserted, error: batchError } = await supabase
        .from('compliance_knowledge')
        .insert(recordsToInsert)
        .select()

      if (batchError) {
        console.error('[v0] Batch insert error:', batchError)
        continue
      }

      insertedRecords.push(...(inserted || []))
      totalChunks += batchChunks.length

      if (batchEnd < flatSections.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'CFR Part imported successfully',
      stats: {
        sections_processed: flatSections.length,
        sections_skipped: skippedSections,
        garbage_filtered: garbageFiltered,
        chunks_created: totalChunks,
        records_inserted: insertedRecords.length,
      },
      sample_ids: insertedRecords.slice(0, 5).map((r: any) => r.id),
    })

  } catch (error: any) {
    console.error('[v0] Bulk import error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION FLATTENING
// Converts an arbitrary nested JSON tree (pages, rows, subsections…) into a
// flat list of complete § sections. One record in the DB = one § section.
// ─────────────────────────────────────────────────────────────────────────────

interface FlatSection {
  id: string
  title: string
  content: string
}

/**
 * Recursively walk the sections array and merge nested subsections into their
 * parent § section. The result is a flat list where each item represents one
 * complete regulatory section (e.g. § 740.10).
 */
function flattenToCompleteSections(sections: any[]): FlatSection[] {
  const result: FlatSection[] = []

  function walk(items: any[], parentTitle = '') {
    for (const item of items) {
      const id    = item.id || item.section || item.regulation_id || ''
      const title = item.title || item.name || item.heading || parentTitle || 'Untitled'
      let   body  = item.content || item.text || item.body || item.description || ''

      // Merge subsections / children into the body of this section
      const children = item.subsections || item.children || item.items || []
      if (Array.isArray(children) && children.length > 0) {
        // If children are themselves § sections (have their own ids), recurse
        const childrenHaveIds = children.some(
          (c: any) => (c.id || c.section || '').match(/^\d{2,3}\.\d/)
        )

        if (childrenHaveIds) {
          // This node is a container — emit its own body first (if any), then recurse
          if (body.trim().length >= 50) {
            result.push({ id, title, content: body.trim() })
          }
          walk(children, title)
          continue
        } else {
          // Children are sub-paragraphs of this § — merge them into the body
          for (const sub of children) {
            const subTitle   = sub.title || sub.name || sub.heading || ''
            const subContent = sub.content || sub.text || sub.body || ''
            if (subContent.trim()) {
              body += subTitle
                ? `\n\n${subTitle}\n${subContent}`
                : `\n\n${subContent}`
            }
          }
        }
      }

      if (body.trim().length >= 50) {
        result.push({ id, title, content: body.trim() })
      }
    }
  }

  walk(sections)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// GARBAGE FILTER
// Removes structural noise: page headers, table derivation rows, footers,
// pure index entries, and other content that has no regulatory value.
// ─────────────────────────────────────────────────────────────────────────────

const GARBAGE_ID_PATTERNS = [
  /^page_\d+_/i,               // page_12_section_title_…
  /table_\d+_row_\d+/i,        // table_2_row_3_derivation
  /^part_number_and_title$/i,  // structural index entry
  /^part_title$/i,
  /^regulation_title$/i,
  /^section_\d+_conditions_of_use$/i,
  /process_ph_determination/i, // AOAC method tables
  /^footnote/i,
]

const GARBAGE_CONTENT_PATTERNS = [
  /^\s*page\s+\d+\s*$/i,                        // "Page 42"
  /^\s*\d+\s*$/,                                 // bare page number
  /^(table of contents|index)$/i,
  /civet cats.*viverra/i,                        // known derivation-table noise
]

function isGarbageSection(id: string, title: string, content: string): boolean {
  for (const p of GARBAGE_ID_PATTERNS) {
    if (p.test(id)) return true
  }
  const trimmed = content?.trim() ?? ''
  for (const p of GARBAGE_CONTENT_PATTERNS) {
    if (p.test(trimmed)) return true
  }
  // Reject entries whose content is only the title repeated (no real text)
  if (trimmed.length < 80 && title && trimmed.startsWith(title.slice(0, 30))) return true
  return false
}

// chunkSectionWithTitle is imported from @/lib/rag/cfr-metadata-mapper
