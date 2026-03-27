import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbeddingsBatch } from '@/lib/embedding-utils'
import { openai, retryWithBackoff } from '@/lib/openai-client'
import { NextResponse } from 'next/server'

/**
 * Import approved pending Recalls into the compliance knowledge base
 *
 * Flow:
 *   1. Build rich context from all structured recall fields + extracted_content
 *   2. Parse recall with AI to extract compliance lessons
 *   3. Format each lesson as an embedding chunk (with correct category + source)
 *   4. Generate embeddings in batch
 *   5. Insert into compliance_knowledge (with top-level source column)
 *   6. Update pending_recalls status to 'imported'
 *
 * POST body:
 *   { recall_id: string }       -- import a single recall by pending_recalls.id
 *   { recall_ids: string[] }    -- import multiple recalls
 */

export const maxDuration = 300

// ====== AI Recall Parser ======

interface ParsedRecallLesson {
  type: string
  issue: string
  reason: string
  regulation: string
  keywords: string[]
  severity: 'Critical' | 'Major' | 'Minor'
  preventive_action: string
}

interface RecallRow {
  id: string
  recall_number: string
  recalling_firm: string
  classification: string
  product_type: string
  product_description: string | null
  reason_for_recall: string | null
  distribution_pattern: string | null
  voluntary_mandated: string | null
  recall_initiation_date: string | null
  extracted_content: string | null
  content_length: number
}

/**
 * Build a rich text context for AI parsing by combining all structured fields.
 * This is critical for short-content recalls (avg 477–1458 chars) where
 * extracted_content alone doesn't provide enough signal for the AI.
 */
function buildRecallContext(recall: RecallRow): string {
  const parts: string[] = []

  parts.push(`RECALL NUMBER: ${recall.recall_number}`)
  parts.push(`CLASSIFICATION: ${recall.classification}`)
  parts.push(`RECALLING FIRM: ${recall.recalling_firm}`)
  parts.push(`PRODUCT TYPE: ${recall.product_type}`)

  if (recall.recall_initiation_date) {
    parts.push(`INITIATION DATE: ${recall.recall_initiation_date}`)
  }
  if (recall.voluntary_mandated) {
    parts.push(`VOLUNTARY/MANDATED: ${recall.voluntary_mandated}`)
  }
  if (recall.product_description) {
    parts.push(`\nPRODUCT DESCRIPTION:\n${recall.product_description}`)
  }
  if (recall.reason_for_recall) {
    parts.push(`\nREASON FOR RECALL:\n${recall.reason_for_recall}`)
  }
  if (recall.distribution_pattern) {
    parts.push(`\nDISTRIBUTION PATTERN:\n${recall.distribution_pattern}`)
  }
  if (recall.extracted_content && recall.extracted_content.length > 50) {
    parts.push(`\nADDITIONAL DETAILS:\n${recall.extracted_content.slice(0, 8000)}`)
  }

  return parts.join('\n')
}

async function parseRecallWithAI(
  recallContext: string,
  meta: { recall_number: string; recalling_firm: string; classification: string; product_type: string }
): Promise<{ lessons: ParsedRecallLesson[]; product_category?: string }> {
  const response = await retryWithBackoff(() =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an FDA regulatory expert. Parse FDA Enforcement Reports (Recalls) into compliance lessons.

For each compliance lesson from the recall, extract:
- type: Category (e.g., "Allergen Undeclared", "Contamination", "Labeling Error", "CGMP Violation", "Adulteration", "Misbranding", "Foreign Object Contamination", "Undeclared Ingredient")
- issue: What specific problem caused the recall (1-2 concise sentences)
- reason: Why this is a compliance risk and what regulation it violates
- regulation: The specific CFR section or FD&C Act section (e.g., "21 CFR 101.100", "Section 402(a)(1) of FD&C Act")
- keywords: Array of 3-8 key terms that are "red flags" for this type of violation
- severity: Map from classification — Class I = "Critical", Class II = "Major", Class III = "Minor"
- preventive_action: Concrete steps to prevent this type of recall

Return JSON: { "lessons": [...], "product_category": "food|drug|cosmetic|device|veterinary|biologics" }

Always return at least 1 lesson. If the recall reason is short, still extract meaningful compliance lessons.`
        },
        {
          role: 'user',
          content: `Parse this FDA Recall (${meta.recall_number}, ${meta.classification}, ${meta.product_type}, ${meta.recalling_firm}):\n\n${recallContext}`
        }
      ]
    })
  )

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{"lessons":[]}')
  return {
    lessons: parsed.lessons || [],
    product_category: parsed.product_category,
  }
}

// ====== Chunk Formatter ======

function formatRecallChunk(
  lesson: ParsedRecallLesson,
  meta: {
    recall_number: string
    recalling_firm: string
    classification: string
    product_type: string
    product_category?: string
    recall_initiation_date?: string | null
    reason_for_recall?: string | null
  },
  index: number,
  total: number
): { content: string; metadata: Record<string, any> } {
  const dateStr = meta.recall_initiation_date || 'N/A'

  const content = `RECALL: ${lesson.type}

Issue: ${lesson.issue}

Regulation: ${lesson.regulation}. ${lesson.reason}

Why recalled: ${lesson.reason}

Preventive action: ${lesson.preventive_action}

Red-flag keywords: ${lesson.keywords.join(', ')}
Source: FDA Recall ${meta.recall_number} (${meta.classification}, ${dateStr}) - ${meta.recalling_firm} [${meta.product_type}]`

  // Derive RAG category: prefer AI-parsed product_category, fall back to product_type
  const category = (meta.product_category && meta.product_category !== 'unknown')
    ? meta.product_category.toLowerCase()
    : (meta.product_type || 'food').toLowerCase()

  const metadata: Record<string, any> = {
    document_type: 'FDA Recall',
    recall_number: meta.recall_number,
    recall_classification: meta.classification,
    recalling_firm: meta.recalling_firm,
    product_type: meta.product_type,
    product_category: meta.product_category,
    recall_issue_type: lesson.type,
    issue_description: lesson.issue,
    why_recalled: lesson.reason,
    preventive_action: lesson.preventive_action,
    regulation_related: lesson.regulation,
    severity: lesson.severity,
    // ── critical RAG filter fields ─────────────────────────────────────────────
    category,                      // enables searchKnowledge() category filter
    source: 'FDA Recall',          // enables idx_ck_source index
    // ──────────────────────────────────────────────────────────────────────────
    is_example_of_violation: true,
    problematic_keywords: lesson.keywords,
    keywords: [...lesson.keywords, lesson.type.toLowerCase(), (meta.product_type || '').toLowerCase()],
    chunk_index: index,
    total_chunks: total,
    is_negative_example: true,
  }

  return { content, metadata }
}

// ====== Process a single recall ======

async function processRecall(
  supabase: ReturnType<typeof createAdminClient>,
  recall: RecallRow
): Promise<{ success: boolean; lessons_count: number; error?: string }> {
  try {
    // Mark as processing
    await supabase
      .from('pending_recalls')
      .update({ status: 'processing' })
      .eq('id', recall.id)

    // Check for duplicates in knowledge base
    const { data: existing } = await supabase
      .from('compliance_knowledge')
      .select('id')
      .eq('metadata->>recall_number', recall.recall_number)
      .eq('metadata->>document_type', 'FDA Recall')
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from('pending_recalls')
        .update({
          status: 'imported',
          import_result: { skipped: true, reason: 'Already exists in knowledge base' },
          imported_at: new Date().toISOString(),
        })
        .eq('id', recall.id)
      return { success: true, lessons_count: 0 }
    }

    // Step 1: Build rich context from all structured fields
    const fullContext = buildRecallContext(recall)
    console.log(`[Recall Import] Parsing recall ${recall.recall_number} (context: ${fullContext.length} chars)...`)

    // Step 2: AI parses recall lessons
    const { lessons, product_category } = await parseRecallWithAI(fullContext, {
      recall_number: recall.recall_number,
      recalling_firm: recall.recalling_firm,
      classification: recall.classification,
      product_type: recall.product_type,
    })

    if (lessons.length === 0) {
      await supabase
        .from('pending_recalls')
        .update({
          status: 'imported',
          violations_count: 0,
          import_result: { lessons_found: 0, note: 'No compliance lessons extracted by AI' },
          imported_at: new Date().toISOString(),
        })
        .eq('id', recall.id)
      return { success: true, lessons_count: 0 }
    }

    // Step 3: Format chunks with correct category + source
    const chunks = lessons.map((l, i) =>
      formatRecallChunk(
        l,
        {
          recall_number: recall.recall_number,
          recalling_firm: recall.recalling_firm,
          classification: recall.classification,
          product_type: recall.product_type,
          product_category,
          recall_initiation_date: recall.recall_initiation_date,
          reason_for_recall: recall.reason_for_recall,
        },
        i,
        lessons.length
      )
    )

    // Step 4: Generate embeddings
    console.log(`[Recall Import] Generating ${chunks.length} embeddings for ${recall.recall_number}...`)
    const contents = chunks.map(c => c.content)
    const embeddings = await generateEmbeddingsBatch(contents)

    // Step 5: Insert into knowledge base with top-level source column
    const insertedIds: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      const { data, error } = await supabase
        .from('compliance_knowledge')
        .insert({
          content: chunks[i].content,
          metadata: chunks[i].metadata,
          embedding: embeddings[i],
          source: 'FDA Recall',
          // Temporal validity: recall enforcement window = 3 years from initiation date
          is_active:      true,
          temporal_scope: 'enforcement',
          valid_from:     recall.recall_initiation_date || null,
          valid_until:    recall.recall_initiation_date
            ? new Date(new Date(recall.recall_initiation_date).getTime() + 3 * 365.25 * 24 * 3600 * 1000)
                .toISOString().split('T')[0]
            : null,
        })
        .select('id')
        .single()

      if (error) {
        console.error(`[Recall Import] Error inserting chunk ${i} for ${recall.recall_number}:`, error)
        throw error
      }
      insertedIds.push(data.id)
    }

    // Step 6: Update pending recall status
    await supabase
      .from('pending_recalls')
      .update({
        status: 'imported',
        violations_count: lessons.length,
        import_result: {
          lessons_found: lessons.length,
          chunks_created: insertedIds.length,
          chunk_ids: insertedIds,
          product_category,
          context_length: fullContext.length,
          lessons_summary: lessons.map(l => ({
            type: l.type,
            severity: l.severity,
            regulation: l.regulation,
          })),
        },
        imported_at: new Date().toISOString(),
      })
      .eq('id', recall.id)

    console.log(`[Recall Import] Successfully imported ${recall.recall_number}: ${lessons.length} lessons`)
    return { success: true, lessons_count: lessons.length }
  } catch (error: any) {
    console.error(`[Recall Import] Failed to process ${recall.recall_number}:`, error)

    await supabase
      .from('pending_recalls')
      .update({
        status: 'approved',
        import_result: { error: error.message },
      })
      .eq('id', recall.id)

    return { success: false, lessons_count: 0, error: error.message }
  }
}

// ====== POST: Import recall(s) into knowledge base ======

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { recall_id, recall_ids } = body

    const ids = recall_ids || (recall_id ? [recall_id] : [])

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing recall_id or recall_ids' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch all structured fields — not just extracted_content — for richer AI context
    const { data: recalls, error: fetchError } = await supabase
      .from('pending_recalls')
      .select(`
        id, recall_number, recalling_firm, classification, product_type,
        product_description, reason_for_recall, distribution_pattern,
        voluntary_mandated, recall_initiation_date,
        extracted_content, content_length
      `)
      .in('id', ids)
      .in('status', ['approved', 'processing'])

    if (fetchError) throw fetchError

    if (!recalls || recalls.length === 0) {
      return NextResponse.json(
        { error: 'No approved recalls found with the given IDs' },
        { status: 404 }
      )
    }

    // Accept recalls even if extracted_content is short — structured fields compensate
    const validRecalls = recalls.filter(r => {
      const hasStructured = r.reason_for_recall || r.product_description
      const hasContent = r.extracted_content && r.extracted_content.length >= 50
      return hasStructured || hasContent
    })

    if (validRecalls.length === 0) {
      return NextResponse.json(
        { error: 'None of the selected recalls have sufficient data for import' },
        { status: 422 }
      )
    }

    let imported = 0
    let totalLessons = 0
    const results: any[] = []

    for (const recall of validRecalls) {
      const result = await processRecall(supabase, recall as RecallRow)
      results.push({
        recall_number: recall.recall_number,
        recalling_firm: recall.recalling_firm,
        ...result,
      })
      if (result.success) {
        imported++
        totalLessons += result.lessons_count
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed: validRecalls.length - imported,
      total_lessons: totalLessons,
      results,
    })
  } catch (error: any) {
    console.error('[Recall Import] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    )
  }
}
