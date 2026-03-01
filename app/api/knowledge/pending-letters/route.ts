import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * API for managing pending FDA Warning Letters
 * 
 * GET: List pending letters with filters
 * PATCH: Update letter status (approve/reject)
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending_review'
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0
    const productType = searchParams.get('product_type') || null

    const supabase = createAdminClient()

    let query = supabase
      .from('pending_warning_letters')
      .select('*', { count: 'exact' })
      .order('issue_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (productType) {
      query = query.eq('product_type', productType)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Also fetch summary stats
    const { data: stats } = await supabase
      .from('pending_warning_letters')
      .select('status')

    const statusCounts: Record<string, number> = {}
    for (const row of stats || []) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
    }

    return NextResponse.json({
      letters: data || [],
      total: count || 0,
      offset,
      limit,
      status_counts: statusCounts,
    })
  } catch (error: any) {
    console.error('[Pending Letters] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending letters' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { ids, action, review_notes } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or empty ids array' }, { status: 400 })
    }

    if (!['approve', 'reject', 'retry_fetch', 're_approve', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, retry_fetch, re_approve, or delete' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    if (action === 'approve') {
      const { data, error } = await supabase
        .from('pending_warning_letters')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .in('status', ['pending_review', 'fetch_failed'])
        .select('id, letter_id, company_name')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'approved',
        updated: data?.length || 0,
        letters: data,
      })
    }

    if (action === 'reject') {
      const { data, error } = await supabase
        .from('pending_warning_letters')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .in('status', ['pending_review', 'fetch_failed'])
        .select('id, letter_id')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'rejected',
        updated: data?.length || 0,
      })
    }

    if (action === 'retry_fetch') {
      // Re-fetch content for failed letters
      const { fetchLetterContent, classifyProductCategory } = await import('@/lib/fda-scraper')

      const { data: letters, error: fetchError } = await supabase
        .from('pending_warning_letters')
        .select('id, fda_url, letter_id, issuing_office, subject')
        .in('id', ids)
        .eq('status', 'fetch_failed')

      if (fetchError) throw fetchError

      let retried = 0
      for (const letter of letters || []) {
        try {
          const content = await fetchLetterContent(letter.fda_url)
          const productType = classifyProductCategory(letter.issuing_office, letter.subject, content)
          await supabase
            .from('pending_warning_letters')
            .update({
              extracted_content: content,
              content_length: content.length,
              product_type: productType,
              status: content.length >= 100 ? 'pending_review' : 'fetch_failed',
              fetch_error: content.length < 100 ? 'Content still too short after retry' : null,
            })
            .eq('id', letter.id)
          retried++
        } catch (err: any) {
          await supabase
            .from('pending_warning_letters')
            .update({
              fetch_error: `Retry failed: ${err.message}`,
            })
            .eq('id', letter.id)
        }
      }

      return NextResponse.json({
        success: true,
        action: 'retry_fetch',
        retried,
        total: letters?.length || 0,
      })
    }

    if (action === 're_approve') {
      // Re-approve rejected letters back to approved status
      const { data, error } = await supabase
        .from('pending_warning_letters')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .eq('status', 'rejected')
        .select('id, letter_id, company_name')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 're_approved',
        updated: data?.length || 0,
        letters: data,
      })
    }

    if (action === 'delete') {
      // Permanently delete rejected letters
      const { data, error } = await supabase
        .from('pending_warning_letters')
        .delete()
        .in('id', ids)
        .eq('status', 'rejected')
        .select('id, letter_id, company_name')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'deleted',
        deleted: data?.length || 0,
        letters: data,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Pending Letters] PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update pending letters' },
      { status: 500 }
    )
  }
}
