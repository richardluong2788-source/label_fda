import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateEmbeddingsBatch } from '@/lib/embedding-utils'
import {
  buildCorrectMetadata,
  inferPartNumberFromFileName,
  chunkSectionWithTitle,
} from '@/lib/rag/cfr-metadata-mapper'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Support two call patterns:
    //   1. Legacy plain text: { content, metadata }
    //   2. Section-aware:     { title, content, metadata, fileName? }
    const {
      content,
      title = 'Untitled',
      metadata = {},
      fileName,
    } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const supabase = await createClient()

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

    // Detect CFR Part number: fileName hint > metadata hint > auto-detect from content
    const partNumberHint =
      (fileName ? inferPartNumberFromFileName(fileName) : null) ??
      (metadata.part_number as string | undefined) ??
      null

    // Chunk by section (preserves title at head of every chunk)
    const chunks = chunkSectionWithTitle(title, content)

    // Build correct metadata for every chunk using the authoritative mapper
    const chunkPayloads = chunks.map((chunk, i) => {
      const base = {
        ...metadata,
        title,
        chunk_index: i,
        total_chunks: chunks.length,
        imported_at: new Date().toISOString(),
        imported_by: user.email,
      }
      return {
        content: chunk,
        metadata: buildCorrectMetadata(chunk, partNumberHint, base),
      }
    })

    // Batch-generate embeddings (single OpenAI call instead of N serial calls)
    const embeddings = await generateEmbeddingsBatch(chunkPayloads.map(c => c.content))

    const records = chunkPayloads.map((c, i) => ({
      content:   c.content,
      metadata:  c.metadata,
      embedding: embeddings[i],
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('compliance_knowledge')
      .insert(records)
      .select()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      chunks_created: inserted?.length ?? 0,
      industry: chunkPayloads[0]?.metadata?.industry ?? 'Unknown',
      category: chunkPayloads[0]?.metadata?.category ?? 'Unknown',
      ids: inserted?.map((r: any) => r.id) ?? [],
    })
  } catch (error: any) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
