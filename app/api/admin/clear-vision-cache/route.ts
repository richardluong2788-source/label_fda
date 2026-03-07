import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteVisionCache } from '@/lib/cache/vision-cache'

/**
 * Admin endpoint: Clear vision analysis cache for a report
 * POST /api/admin/clear-vision-cache
 * Body: { reportId: string }
 *
 * This forces a re-analysis on the next processing.
 * Useful after code updates to analysis logic.
 */
export async function POST(req: Request) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Verify token is admin
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { reportId, imageUrl } = body

    if (!reportId && !imageUrl) {
      return NextResponse.json(
        { error: 'Either reportId or imageUrl is required' },
        { status: 400 }
      )
    }

    let imageUrlToDelete = imageUrl

    // If reportId provided, fetch the image URL from database
    if (reportId && !imageUrl) {
      const { data: report } = await supabase
        .from('audit_reports')
        .select('image_url')
        .eq('id', reportId)
        .maybeSingle()

      if (!report?.image_url) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }

      imageUrlToDelete = report.image_url
    }

    // Clear the cache
    const deleted = await deleteVisionCache(imageUrlToDelete)

    return NextResponse.json({
      success: true,
      message: 'Vision cache cleared',
      reportId,
      imageUrl: imageUrlToDelete,
      deleted,
    })
  } catch (error) {
    console.error('[clear-vision-cache] Error:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache', details: String(error) },
      { status: 500 }
    )
  }
}
