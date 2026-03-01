import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateEmbedding, generateEmbeddingsBatch } from '@/lib/embedding-utils'
import { openai, retryWithBackoff } from '@/lib/openai-client'
import type { WarningLetterMetadata, ParsedWarningLetterViolation } from '@/lib/types'

/**
 * FDA WARNING LETTER IMPORT API
 * 
 * Strategy: Parse Warning Letters into violation-based chunks (not paragraph-based).
 * Each violation becomes a separate knowledge chunk with rich metadata for:
 * - Negative example learning ("DON'T do this")
 * - Red-flag keyword extraction
 * - Dual-query RAG (regulations + warnings)
 */

// ====== AI-Powered Violation Parser ======

async function parseViolationsWithAI(
  letterText: string,
  letterMeta: { letter_id: string; issue_date: string; company_name: string }
): Promise<ParsedWarningLetterViolation[]> {
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

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{"violations":[]}')
  return parsed.violations || []
}

// ====== Violation Chunk Formatter ======

function formatViolationChunk(
  violation: ParsedWarningLetterViolation,
  meta: { letter_id: string; issue_date: string; company_name: string; product_name?: string; industry: string; product_category?: string },
  index: number,
  total: number
): { content: string; metadata: WarningLetterMetadata & { chunk_index: number; total_chunks: number; is_negative_example: true } } {
  const content = `VIOLATION: ${violation.type}

Company claimed: "${violation.claim}"

FDA's finding: This claim violates ${violation.regulation}. ${violation.reason}

Why problematic: ${violation.reason}

Correction required: ${violation.correction}

Red-flag keywords: ${violation.keywords.join(', ')}
Source: FDA Warning Letter ${meta.letter_id} (${meta.issue_date}) to ${meta.company_name}`

  const metadata: WarningLetterMetadata & { chunk_index: number; total_chunks: number; is_negative_example: true } = {
    document_type: 'FDA Warning Letter',
    letter_id: meta.letter_id,
    issue_date: meta.issue_date,
    company_name: meta.company_name,
    product_name: meta.product_name,
    violation_type: [violation.type],
    severity: violation.severity,
    regulation_violated: [violation.regulation],
    problematic_claim: violation.claim,
    why_problematic: violation.reason,
    correction_required: violation.correction,
    industry: meta.industry as 'Drug' | 'Food' | 'Cosmetic' | 'Device',
    product_category: meta.product_category,
    is_example_of_violation: true,
    problematic_keywords: violation.keywords,
    keywords: [...violation.keywords, violation.type.toLowerCase(), meta.industry.toLowerCase()],
    chunk_index: index,
    total_chunks: total,
    is_negative_example: true,
  }

  return { content, metadata }
}

// ====== POST: Import Warning Letter ======

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      content,
      letter_id,
      issue_date,
      company_name,
      product_name,
    } = body

    if (!content || !letter_id || !issue_date || !company_name) {
      return NextResponse.json(
        { error: 'Missing required fields: content, letter_id, issue_date, company_name' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser || !['admin', 'superadmin', 'expert'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('compliance_knowledge')
      .select('id')
      .eq('metadata->>letter_id', letter_id)
      .eq('metadata->>document_type', 'FDA Warning Letter')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `Warning Letter ${letter_id} already imported. Delete existing entries first.` },
        { status: 409 }
      )
    }

    console.log(`[v0] Parsing Warning Letter ${letter_id} with AI...`)

    // Step 1: AI parses violations
    const violations = await parseViolationsWithAI(content, { letter_id, issue_date, company_name })

    if (violations.length === 0) {
      return NextResponse.json(
        { error: 'No violations could be extracted from this Warning Letter' },
        { status: 422 }
      )
    }

    console.log(`[v0] Extracted ${violations.length} violations from Warning Letter`)

    // Detect industry from AI parsing (fallback to Food)
    const industryGuess = 'Food'

    // Step 2: Format each violation as a chunk
    const chunks = violations.map((v, i) =>
      formatViolationChunk(
        v,
        { letter_id, issue_date, company_name, product_name, industry: industryGuess, product_category: undefined },
        i,
        violations.length
      )
    )

    // Step 3: Generate embeddings in batch
    console.log(`[v0] Generating embeddings for ${chunks.length} violation chunks...`)
    const contents = chunks.map(c => c.content)
    const embeddings = await generateEmbeddingsBatch(contents)

    // Step 4: Insert all chunks
    const insertedIds: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      const { data, error } = await supabase
        .from('compliance_knowledge')
        .insert({
          content: chunks[i].content,
          metadata: chunks[i].metadata,
          embedding: embeddings[i],
        })
        .select('id')
        .single()

      if (error) {
        console.error(`[v0] Error inserting chunk ${i}:`, error)
        throw error
      }
      insertedIds.push(data.id)
    }

    console.log(`[v0] Successfully imported Warning Letter ${letter_id}: ${insertedIds.length} violation chunks`)

    return NextResponse.json({
      success: true,
      letter_id,
      violations_found: violations.length,
      chunks_created: insertedIds.length,
      ids: insertedIds,
      violations_summary: violations.map(v => ({
        type: v.type,
        severity: v.severity,
        regulation: v.regulation,
        keywords: v.keywords,
      })),
    })
  } catch (error: any) {
    console.error('[v0] Warning Letter import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import Warning Letter' },
      { status: 500 }
    )
  }
}

// ====== GET: List imported Warning Letters ======

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')
    const severity = searchParams.get('severity')

    let query = supabase
      .from('compliance_knowledge')
      .select('id, content, metadata, created_at')
      .eq('metadata->>document_type', 'FDA Warning Letter')
      .order('created_at', { ascending: false })

    if (industry) {
      query = query.eq('metadata->>industry', industry)
    }
    if (severity) {
      query = query.eq('metadata->>severity', severity)
    }

    const { data, error } = await query.limit(100)

    if (error) throw error

    // Group by letter_id
    const letterMap = new Map<string, { letter_id: string; company_name: string; issue_date: string; industry: string; violations: any[]; chunk_count: number }>()

    for (const row of data || []) {
      const meta = row.metadata as any
      const lid = meta?.letter_id || 'unknown'
      if (!letterMap.has(lid)) {
        letterMap.set(lid, {
          letter_id: lid,
          company_name: meta?.company_name || '',
          issue_date: meta?.issue_date || '',
          industry: meta?.industry || '',
          violations: [],
          chunk_count: 0,
        })
      }
      const entry = letterMap.get(lid)!
      entry.chunk_count++
      entry.violations.push({
        id: row.id,
        type: meta?.violation_type?.[0] || 'Unknown',
        severity: meta?.severity || 'Major',
        claim: meta?.problematic_claim || '',
        keywords: meta?.problematic_keywords || [],
      })
    }

    return NextResponse.json({
      letters: Array.from(letterMap.values()),
      total_letters: letterMap.size,
      total_chunks: data?.length || 0,
    })
  } catch (error: any) {
    console.error('[v0] Warning Letter list error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list Warning Letters' },
      { status: 500 }
    )
  }
}
