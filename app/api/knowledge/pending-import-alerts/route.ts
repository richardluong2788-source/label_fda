import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * API for managing pending FDA Import Alerts
 *
 * GET: List pending import alerts with filters
 * PATCH: Update alert status (approve/reject/delete)
 *
 * Follows the same pattern as pending-recalls and pending-letters routes.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending_review'
    const industryType = searchParams.get('industry_type') || 'all'
    const actionType = searchParams.get('action_type') || 'all'
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0

    const supabase = createAdminClient()

    let query = supabase
      .from('pending_import_alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (industryType !== 'all') {
      query = query.eq('industry_type', industryType)
    }
    if (actionType !== 'all') {
      query = query.eq('action_type', actionType)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Fetch summary stats
    const { data: stats } = await supabase
      .from('pending_import_alerts')
      .select('status, industry_type, action_type')

    const statusCounts: Record<string, number> = {}
    const industryCounts: Record<string, number> = {}
    const actionCounts: Record<string, number> = {}
    for (const row of stats || []) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
      industryCounts[row.industry_type] = (industryCounts[row.industry_type] || 0) + 1
      if (row.action_type) {
        actionCounts[row.action_type] = (actionCounts[row.action_type] || 0) + 1
      }
    }

    return NextResponse.json({
      alerts: data || [],
      total: count || 0,
      offset,
      limit,
      status_counts: statusCounts,
      industry_counts: industryCounts,
      action_counts: actionCounts,
    })
  } catch (error: any) {
    console.error('[Pending Import Alerts] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending import alerts' },
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
        .from('pending_import_alerts')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .in('status', ['pending_review', 'failed'])
        .select('id, alert_number, alert_title')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'approved',
        updated: data?.length || 0,
        alerts: data,
      })
    }

    if (action === 'reject') {
      const { data, error } = await supabase
        .from('pending_import_alerts')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .in('status', ['pending_review', 'failed'])
        .select('id, alert_number')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'rejected',
        updated: data?.length || 0,
      })
    }

    if (action === 're_approve') {
      const { data, error } = await supabase
        .from('pending_import_alerts')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
        })
        .in('id', ids)
        .eq('status', 'rejected')
        .select('id, alert_number, alert_title')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 're_approved',
        updated: data?.length || 0,
        alerts: data,
      })
    }

    if (action === 'delete') {
      const { data, error } = await supabase
        .from('pending_import_alerts')
        .delete()
        .in('id', ids)
        .eq('status', 'rejected')
        .select('id, alert_number, alert_title')

      if (error) throw error

      return NextResponse.json({
        success: true,
        action: 'deleted',
        deleted: data?.length || 0,
        alerts: data,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Pending Import Alerts] PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update pending import alerts' },
      { status: 500 }
    )
  }
}
