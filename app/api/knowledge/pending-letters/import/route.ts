import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbeddingsBatch } from '@/lib/embedding-utils'
import { openai, retryWithBackoff } from '@/lib/openai-client'
import { NextResponse } from 'next/server'
import type { ParsedWarningLetterViolation, WarningLetterMetadata } from '@/lib/types'

/**
 * Import approved pending Warning Letters into the knowledge base
 * 
 * This reuses the same AI parsing logic as the manual import route:
 *   1. Parse violations with AI (parseViolationsWithAI)
 *   2. Format each violation as a chunk
 *   3. Generate embeddings in batch
 *   4. Insert into compliance_knowledge
 *   5. Update pending_warning_letters status to 'imported'
 * 
 * POST body:
 *   { letter_id: string }       -- import a single letter by pending_warning_letters.id
 *   { letter_ids: string[] }    -- import multiple letters by pending_warning_letters.id
 */

export const maxDuration = 300 // 5 min for AI processing

// ====== AI Violation Parser (same as existing warning-letters route) ======

async function parseViolationsWithAI(
  letterText: string,
  letterMeta: { letter_id: string; issue_date: string; company_name: string }
): Promise<{ violations: ParsedWarningLetterViolation[]; industry: string; product_category?: string }> {
  const response = await retryWithBackoff(() =>
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an FDA regulatory expert. Parse FDA Warning Letters into individual violations.

For each violation found, extract:
- type: Category of violation (e.g., "Unapproved Drug Claim", "Misleading Labeling", "Missing Allergen Declaration", "Incorrect Nutrition Facts", "Unauthorized Health Claim")
- claim: The exact problematic claim or practice quoted from the letter
- reason: Why FDA considers this a violation (concise explanation)
- regulation: The specific CFR section violated (e.g., "21 CFR 101.9", "Section 403(r) of FD&C Act")
- keywords: Array of 3-8 "red flag" words/phrases from the claim that triggered the violation
- severity: "Critical" (public safety risk), "Major" (significant non-compliance), or "Minor" (technical/labeling issue)
- correction: What FDA requires the company to do

Return JSON: { "violations": [...], "industry": "Drug|Food|Cosmetic|Device", "product_category": "string" }`
        },
        {
          role: 'user',
          content: `Parse this FDA Warning Letter (${letterMeta.letter_id}, ${letterMeta.issue_date}, ${letterMeta.company_name}):\n\n${letterText.slice(0, 12000)}`
        }
      ]
    })
  )

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{"violations":[],"industry":"Food"}')
  return {
    violations: parsed.violations || [],
    industry: parsed.industry || 'Food',
    product_category: parsed.product_category,
  }
}

// ====== Violation Chunk Formatter ======

function formatViolationChunk(
  violation: ParsedWarningLetterViolation,
  meta: {
    letter_id: string
    issue_date: string
    company_name: string
    industry: string
    product_category?: string
    product_type?: string   // from classifyProductCategory (food/drug/cosmetic/device/…)
  },
  index: number,
  total: number
): { content: string; metadata: Record<string, any> } {
  const content = `VIOLATION: ${violation.type}

Company claimed: "${violation.claim}"

FDA's finding: This claim violates ${violation.regulation}. ${violation.reason}

Why problematic: ${violation.reason}

Correction required: ${violation.correction}

Red-flag keywords: ${violation.keywords.join(', ')}
Source: FDA Warning Letter ${meta.letter_id} (${meta.issue_date}) to ${meta.company_name}`

  // Derive RAG category: prefer classifyProductCategory result, fall back to AI-parsed industry
  const category = (meta.product_type && meta.product_type !== 'unknown')
    ? meta.product_type
    : (meta.industry || 'food').toLowerCase()

  const metadata: Record<string, any> = {
    document_type: 'FDA Warning Letter',
    letter_id: meta.letter_id,
    issue_date: meta.issue_date,
    company_name: meta.company_name,
    violation_type: [violation.type],
    severity: violation.severity,
    regulation_violated: [violation.regulation],
    problematic_claim: violation.claim,
    why_problematic: violation.reason,
    correction_required: violation.correction,
    industry: meta.industry,
    product_category: meta.product_category,
    // ── critical RAG filter fields ─────────────────────────────────────────────
    category,                          // enables searchKnowledge() category filter
    source: 'FDA Warning Letter',      // enables idx_ck_source index
    // ──────────────────────────────────────────────────────────────────────────
    is_example_of_violation: true,
    problematic_keywords: violation.keywords,
    keywords: [...violation.keywords, violation.type.toLowerCase(), meta.industry.toLowerCase()],
    chunk_index: index,
    total_chunks: total,
    is_negative_example: true,
  }

  return { content, metadata }
}

// ====== Process a single letter through the AI pipeline ======

async function processLetter(
  supabase: ReturnType<typeof createAdminClient>,
  letter: {
    id: string
    letter_id: string
    company_name: string
    issue_date: string
    extracted_content: string
    product_type?: string   // from classifyProductCategory
  }
): Promise<{ success: boolean; violations_count: number; error?: string }> {
  try {
    // Mark as processing
    await supabase
      .from('pending_warning_letters')
      .update({ status: 'processing' })
      .eq('id', letter.id)

    // Check for duplicates in knowledge base
    const { data: existing } = await supabase
      .from('compliance_knowledge')
      .select('id')
      .eq('metadata->>letter_id', letter.letter_id)
      .eq('metadata->>document_type', 'FDA Warning Letter')
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from('pending_warning_letters')
        .update({
          status: 'imported',
          import_result: { skipped: true, reason: 'Already exists in knowledge base' },
          imported_at: new Date().toISOString(),
        })
        .eq('id', letter.id)
      return { success: true, violations_count: 0 }
    }

    // Step 1: AI parses violations
    console.log(`[Import] Parsing letter ${letter.letter_id} with AI...`)
    const { violations, industry, product_category } = await parseViolationsWithAI(
      letter.extracted_content,
      {
        letter_id: letter.letter_id,
        issue_date: letter.issue_date,
        company_name: letter.company_name,
      }
    )

    if (violations.length === 0) {
      await supabase
        .from('pending_warning_letters')
        .update({
          status: 'imported',
          violations_count: 0,
          import_result: { violations_found: 0, note: 'No violations extracted by AI' },
          imported_at: new Date().toISOString(),
        })
        .eq('id', letter.id)
      return { success: true, violations_count: 0 }
    }

    // Step 2: Format chunks — pass product_type for correct category tagging
    const chunks = violations.map((v, i) =>
      formatViolationChunk(
        v,
        {
          letter_id: letter.letter_id,
          issue_date: letter.issue_date,
          company_name: letter.company_name,
          industry,
          product_category,
          product_type: letter.product_type,
        },
        i,
        violations.length
      )
    )

    // Step 3: Generate embeddings
    console.log(`[Import] Generating ${chunks.length} embeddings for ${letter.letter_id}...`)
    const contents = chunks.map(c => c.content)
    const embeddings = await generateEmbeddingsBatch(contents)

    // Step 4: Insert into knowledge base
    const insertedIds: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      const { data, error } = await supabase
        .from('compliance_knowledge')
        .insert({
          content: chunks[i].content,
          metadata: chunks[i].metadata,
          embedding: embeddings[i],
          source: 'FDA Warning Letter',
          // Temporal validity: WL enforcement window = 5 years from issue date
          is_active:      true,
          temporal_scope: 'enforcement',
          valid_from:     letter.issue_date || null,
          valid_until:    letter.issue_date
            ? new Date(new Date(letter.issue_date).getTime() + 5 * 365.25 * 24 * 3600 * 1000)
                .toISOString().split('T')[0]
            : null,
        })
        .select('id')
        .single()

      if (error) {
        console.error(`[Import] Error inserting chunk ${i} for ${letter.letter_id}:`, error)
        throw error
      }
      insertedIds.push(data.id)
    }

    // Step 5: Update pending letter status
    await supabase
      .from('pending_warning_letters')
      .update({
        status: 'imported',
        violations_count: violations.length,
        import_result: {
          violations_found: violations.length,
          chunks_created: insertedIds.length,
          chunk_ids: insertedIds,
          industry,
          product_category,
          violations_summary: violations.map(v => ({
            type: v.type,
            severity: v.severity,
            regulation: v.regulation,
          })),
        },
        imported_at: new Date().toISOString(),
      })
      .eq('id', letter.id)

    console.log(`[Import] Successfully imported ${letter.letter_id}: ${violations.length} violations`)
    return { success: true, violations_count: violations.length }
  } catch (error: any) {
    console.error(`[Import] Failed to process ${letter.letter_id}:`, error)

    // Revert status to approved so admin can retry
    await supabase
      .from('pending_warning_letters')
      .update({
        status: 'approved',
        import_result: { error: error.message },
      })
      .eq('id', letter.id)

    return { success: false, violations_count: 0, error: error.message }
  }
}

// ====== POST: Import letter(s) into knowledge base ======

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { letter_id, letter_ids } = body

    // Support both single and batch import
    const ids = letter_ids || (letter_id ? [letter_id] : [])

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing letter_id or letter_ids' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch the approved letters — include product_type for category tagging
    const { data: letters, error: fetchError } = await supabase
      .from('pending_warning_letters')
      .select('id, letter_id, company_name, issue_date, extracted_content, product_type')
      .in('id', ids)
      .in('status', ['approved', 'processing'])

    if (fetchError) throw fetchError

    if (!letters || letters.length === 0) {
      return NextResponse.json(
        { error: 'No approved letters found with the given IDs' },
        { status: 404 }
      )
    }

    // Filter out letters without content
    const validLetters = letters.filter(l => l.extracted_content && l.extracted_content.length >= 100)
    if (validLetters.length === 0) {
      return NextResponse.json(
        { error: 'None of the selected letters have sufficient content for import' },
        { status: 422 }
      )
    }

    // Process each letter through the AI pipeline
    let imported = 0
    let totalViolations = 0
    const results: any[] = []

    for (const letter of validLetters) {
      const result = await processLetter(supabase, letter)
      results.push({
        letter_id: letter.letter_id,
        company_name: letter.company_name,
        ...result,
      })
      if (result.success) {
        imported++
        totalViolations += result.violations_count
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed: validLetters.length - imported,
      total_violations: totalViolations,
      results,
    })
  } catch (error: any) {
    console.error('[Import] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    )
  }
}
