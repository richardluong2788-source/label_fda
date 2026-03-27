import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * API to clear all knowledge base data and prepare for re-import
 * This is used when switching to optimized chunk size (600 chars)
 */
export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    const supabase = await createClient()

    // Check authentication
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
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser || !['admin', 'superadmin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    if (action === 'get_stats') {
      // Get current statistics
      const { data: entries, error } = await supabase
        .from('compliance_knowledge')
        .select('id, metadata, created_at')

      if (error) throw error

      // Count unique sections
      const uniqueSections = new Set(
        entries?.map((e: any) => e.metadata?.section || e.metadata?.regulation_id) || []
      )

      // Calculate average chunk size
      const { data: contentData } = await supabase
        .from('compliance_knowledge')
        .select('content')
        .limit(100)

      const avgChunkSize = contentData
        ? Math.round(
            contentData.reduce((sum: number, item: any) => sum + (item.content?.length || 0), 0) /
              contentData.length
          )
        : 0

      return NextResponse.json({
        total_records: entries?.length || 0,
        unique_sections: uniqueSections.size,
        average_chunk_size: avgChunkSize,
        oldest_record: entries?.[entries.length - 1]?.created_at,
        newest_record: entries?.[0]?.created_at,
      })
    }

    if (action === 'clear_all') {
      console.log('[v0] Clearing all knowledge base data...')

      // Delete all records from compliance_knowledge table
      const { error } = await supabase
        .from('compliance_knowledge')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (PostgreSQL trick)

      if (error) {
        console.error('[v0] Error clearing data:', error)
        throw error
      }

      console.log('[v0] Knowledge base cleared successfully')

      return NextResponse.json({
        success: true,
        message: 'All knowledge base data has been cleared',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[v0] Re-import API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
