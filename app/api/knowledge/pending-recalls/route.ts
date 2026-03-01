import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * API for managing pending FDA Recalls
 *
 * GET: List pending recalls with filters
 * PATCH: Update recall status (approve/reject/delete)
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending_review'
    const productType = searchParams.get('product_type') || 'all'
    const classification = searchParams.get('classification') || 'all'
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0

    const supabase = createAdminClient()

    let query = supabase
      .from('pending_recalls')
      .select('*', { count: 'exact' })
      .order('recall_initiation_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (productType !== 'all') {
      query = query.eq('product_type', productType)
    }
    if (classification !== 'all') {
      query = query.eq('classification', classification)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Fetch summary stats
    const { data: stats } = await supabase
      .from('pending_recalls')
      .select('status, product_type, classification')

    const statusCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    const classCounts: Record<string, number> = {}
    for (const row of stats || []) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
      typeCounts[row.product_type] = (typeCounts[row.product_type] || 0) + 1
      if (row.classification) {
        classCounts[row.classification] = (classCounts[row.classification] || 0) + 1
      }
    }

    return NextResponse.json({
      recalls: data || [],
      total: count || 0,
      offset,
      limit,
      status_counts: statusCounts,
      type_counts: typeCounts,
      class_counts: classCounts,
    })
  } catch (error: any) {
    console.error('[Pending Recalls] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending recalls' },
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

    if (!['approve', 'reject', 're_approve', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, re_approve, or delete' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    if (action === 'approve') {
      const { data, error } = await supabase
        .from('pending_recalls')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .in('status', ['pending_review', 'failed'])
        .select('id, recall_number, recalling_firm')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'approved',
        updated: data?.length || 0,
        recalls: data,
      })
    }

    if (action === 'reject') {
      const { data, error } = await supabase
        .from('pending_recalls')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .in('status', ['pending_review', 'failed'])
        .select('id, recall_number')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'rejected',
        updated: data?.length || 0,
      })
    }

    if (action === 're_approve') {
      const { data, error } = await supabase
        .from('pending_recalls')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .eq('status', 'rejected')
        .select('id, recall_number, recalling_firm')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 're_approved',
        updated: data?.length || 0,
        recalls: data,
      })
    }

    if (action === 'delete') {
      const { data, error } = await supabase
        .from('pending_recalls')
        .delete()
        .in('id', ids)
        .eq('status', 'rejected')
        .select('id, recall_number, recalling_firm')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'deleted',
        deleted: data?.length || 0,
        recalls: data,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Pending Recalls] PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update pending recalls' },
      { status: 500 }
    )
  }
}
