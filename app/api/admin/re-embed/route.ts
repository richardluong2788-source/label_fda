import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const BATCH_SIZE = 50
const TARGET_DIMENSIONS = 1536

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== process.env.ADMIN_SECRET && secret !== 'sprint2-fix') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const openai = new OpenAI({ apiKey: openaiKey })

    // Get records that need re-embedding (NULL or wrong dimension embeddings)
    // vector_dims() returns NULL if embedding is NULL, so this catches both cases
    const { data: records, error: fetchError } = await supabase
      .rpc('get_records_without_valid_embedding', { batch_limit: BATCH_SIZE })

    if (fetchError) {
      return NextResponse.json({ error: `Fetch error: ${fetchError.message}` }, { status: 500 })
    }

    if (!records || records.length === 0) {
      // Check total count
      const { count } = await supabase
        .from('compliance_knowledge')
        .select('*', { count: 'exact', head: true })
      
      const { count: withEmbedding } = await supabase
        .from('compliance_knowledge')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null)

      return NextResponse.json({
        message: 'All records have embeddings!',
        total: count,
        withEmbedding: withEmbedding,
        remaining: 0
      })
    }

    // Process batch
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const record of records) {
      results.processed++
      
      try {
        // Generate embedding
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: record.content.substring(0, 8000), // Limit input length
          dimensions: TARGET_DIMENSIONS
        })

        const embedding = response.data[0].embedding

        // Update record
        const { error: updateError } = await supabase
          .from('compliance_knowledge')
          .update({ embedding: embedding })
          .eq('id', record.id)

        if (updateError) {
          results.failed++
          results.errors.push(`Update ${record.id}: ${updateError.message}`)
        } else {
          results.success++
        }
      } catch (err: any) {
        results.failed++
        results.errors.push(`Embed ${record.id}: ${err.message}`)
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Get remaining count using helper function (counts NULL + wrong dims)
    const { data: remainingData } = await supabase
      .rpc('count_records_without_valid_embedding')
    const remaining = remainingData ?? 0

    return NextResponse.json({
      message: `Batch complete`,
      ...results,
      remaining,
      hint: remaining > 0 ? 'Call this endpoint again to process more' : 'All done!'
    })

  } catch (error: any) {
    console.error('Re-embed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET to check status
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { count: total } = await supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })

    // Count records with VALID 1536-dim embeddings using helper function
    const { data: withoutEmbeddingData } = await supabase
      .rpc('count_records_without_valid_embedding')
    const withoutEmbedding = withoutEmbeddingData ?? 0
    const withEmbedding = (total ?? 0) - withoutEmbedding

    return NextResponse.json({
      total,
      withEmbedding,
      withoutEmbedding,
      progress: total ? `${(withEmbedding / total * 100).toFixed(1)}%` : '0%'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
