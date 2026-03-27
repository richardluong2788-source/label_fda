import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/knowledge/bulk-delete
 * Xóa toàn bộ knowledge base (tất cả records)
 */
export async function DELETE() {
  try {
    const supabase = await createClient()

    // Get total count before deletion
    const { count: totalCount, error: countError } = await supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw countError
    }

    console.log(`[v0] Deleting all ${totalCount} records from compliance_knowledge...`)

    // Delete all records
    const { error: deleteError } = await supabase
      .from('compliance_knowledge')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all except impossible UUID

    if (deleteError) {
      throw deleteError
    }

    // Verify deletion
    const { count: remainingCount } = await supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })

    console.log(`[v0] Deleted ${totalCount} records. Remaining: ${remainingCount || 0}`)

    return NextResponse.json({
      success: true,
      deleted_count: totalCount,
      remaining_count: remainingCount || 0,
      message: `Successfully deleted ${totalCount} records from knowledge base`,
    })
  } catch (error: any) {
    console.error('[v0] Error deleting all knowledge:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete knowledge base' },
      { status: 500 }
    )
  }
}
