import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * GET: Fetch recent FDA recall fetch logs for the admin dashboard
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('fda_recall_fetch_log')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ logs: data || [] })
  } catch (error: any) {
    console.error('[Recall Fetch Logs] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recall logs' },
      { status: 500 }
    )
  }
}
