import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Cron job to cleanup old bulk-import files from storage
 * Should be triggered daily via Vercel Cron or external scheduler
 * 
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-bulk-imports",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret (MANDATORY — blocks requests when CRON_SECRET is unset)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[v0] ========== BULK IMPORTS CLEANUP STARTING ==========')
    console.log('[v0] Cleaning up files older than 24 hours...')

    const supabase = await createClient()

    // List all files in bulk-imports folder
    const { data: files, error: listError } = await supabase.storage
      .from('label-images')
      .list('bulk-imports', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      })

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`)
    }

    if (!files || files.length === 0) {
      console.log('[v0] No files found in bulk-imports folder')
      return NextResponse.json({
        success: true,
        message: 'No files to cleanup',
        deleted_count: 0,
      })
    }

    console.log('[v0] Found', files.length, 'files in bulk-imports folder')

    // Filter files older than 24 hours
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const oldFiles = files.filter(file => {
      const createdAt = new Date(file.created_at)
      return createdAt < twentyFourHoursAgo
    })

    console.log('[v0] Files older than 24h:', oldFiles.length)

    if (oldFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No old files to cleanup',
        deleted_count: 0,
        total_files: files.length,
      })
    }

    // Delete old files
    const filePaths = oldFiles.map(file => `bulk-imports/${file.name}`)
    
    console.log('[v0] Deleting files:', filePaths)

    const { data: deleteResult, error: deleteError } = await supabase.storage
      .from('label-images')
      .remove(filePaths)

    if (deleteError) {
      throw new Error(`Failed to delete files: ${deleteError.message}`)
    }

    console.log('[v0] ========== CLEANUP COMPLETE ==========')
    console.log('[v0] Deleted', filePaths.length, 'files')

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${filePaths.length} files deleted`,
      deleted_count: filePaths.length,
      deleted_files: filePaths,
      total_files: files.length,
    })

  } catch (error: any) {
    console.error('[v0] Cleanup error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Cleanup failed',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for manual triggering
export async function POST(request: Request) {
  return GET(request)
}
