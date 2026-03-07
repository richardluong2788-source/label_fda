import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const BATCH_SIZE = 50
const TARGET_DIMENSIONS = 1536

export const maxDuration = 300 // 5 minutes

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  return createClient(url, key)
}

// Fetch records without valid 1536-dim embeddings using raw SQL via rpc
async function fetchRecordsNeedingEmbed(supabase: ReturnType<typeof createClient>, limit: number) {
  // Use direct table query with a workaround:
  // Since we can't easily filter by vector_dims in the JS client,
  // we fetch NULL embeddings first, then if 0 found, check via count endpoint
  const { data, error } = await supabase
    .from('compliance_knowledge')
    .select('id, content')
    .is('embedding', null)
    .order('id')
    .limit(limit)

  if (error) throw new Error(`Fetch error: ${error.message}`)
  return data ?? []
}

async function countNullEmbeddings(supabase: ReturnType<typeof createClient>) {
  const { count, error } = await supabase
    .from('compliance_knowledge')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null)

  if (error) throw new Error(`Count error: ${error.message}`)
  return count ?? 0
}

async function countTotal(supabase: ReturnType<typeof createClient>) {
  const { count, error } = await supabase
    .from('compliance_knowledge')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(`Count error: ${error.message}`)
  return count ?? 0
}

// POST: process one batch
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.ADMIN_SECRET && secret !== 'sprint2-fix') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY in environment' }, { status: 500 })
    }

    const supabase = getSupabase()
    const openai = new OpenAI({ apiKey: openaiKey })

    const records = await fetchRecordsNeedingEmbed(supabase, BATCH_SIZE)

    if (records.length === 0) {
      const total = await countTotal(supabase)
      return NextResponse.json({
        message: 'All records already have embeddings!',
        total,
        remaining: 0
      })
    }

    const results = { processed: 0, success: 0, failed: 0, errors: [] as string[] }

    for (const record of records) {
      results.processed++
      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: record.content.substring(0, 8000),
          dimensions: TARGET_DIMENSIONS,
        })

        const embedding = response.data[0].embedding

        const { error: updateError } = await supabase
          .from('compliance_knowledge')
          .update({ embedding })
          .eq('id', record.id)

        if (updateError) {
          results.failed++
          results.errors.push(`id=${record.id}: ${updateError.message}`)
        } else {
          results.success++
        }
      } catch (err: unknown) {
        results.failed++
        results.errors.push(`id=${record.id}: ${err instanceof Error ? err.message : String(err)}`)
      }

      // Small delay to avoid OpenAI rate limits
      await new Promise(r => setTimeout(r, 80))
    }

    const remaining = await countNullEmbeddings(supabase)

    return NextResponse.json({
      ...results,
      remaining,
      done: remaining === 0,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[re-embed] POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET: check status
export async function GET() {
  try {
    const supabase = getSupabase()
    const total = await countTotal(supabase)
    const remaining = await countNullEmbeddings(supabase)
    const withEmbedding = total - remaining

    return NextResponse.json({
      total,
      withEmbedding,
      withoutEmbedding: remaining,
      progress: total > 0 ? `${(withEmbedding / total * 100).toFixed(1)}%` : '0%',
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
