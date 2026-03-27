import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { reportId, action, findings, reviewNotes } = await request.json()

    if (!reportId || !action) {
      return NextResponse.json(
        { error: 'Report ID and action are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!adminUser || !adminUser.can_review) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get report
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // Update report to verified status
      const { error: updateError } = await supabase
        .from('audit_reports')
        .update({
          status: 'verified',
          findings: findings,
          review_notes: reviewNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          needs_expert_review: false,
        })
        .eq('id', reportId)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        message: 'Report approved and published',
      })
    } else if (action === 'reject') {
      // Update report to rejected status
      const { error: updateError } = await supabase
        .from('audit_reports')
        .update({
          status: 'rejected',
          review_notes: reviewNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        message: 'Report rejected',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[v0] Review error:', error)
    return NextResponse.json({ error: 'Failed to process review' }, { status: 500 })
  }
}
