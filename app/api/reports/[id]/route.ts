import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership - user can only delete their own reports
    const { data: report } = await supabase
      .from('audit_reports')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete related queue jobs first (if any)
    await supabase
      .from('analysis_queue')
      .delete()
      .eq('report_id', id)

    // Delete related vision cache entries
    await supabase
      .from('vision_analysis_cache')
      .delete()
      .eq('report_id', id)

    // Delete the report
    const { error } = await supabase
      .from('audit_reports')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[delete-report] Error:', error)
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[delete-report] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
