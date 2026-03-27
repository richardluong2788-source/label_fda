import { NextResponse } from 'next/server'
import { deleteVisionCache } from '@/lib/cache/vision-cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { reportId } = body

    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 })
    }

    // Get the report to retrieve image URLs
    const supabase = createClient()
    const { data, error } = await supabase
      .from('audit_reports')
      .select('label_image_urls')
      .eq('id', reportId)
      .single()

    if (error || !data) {
      // Report not found - just return success (already deleted or never existed)
      console.log('[v0] Report not found, but returning success anyway')
      return NextResponse.json({
        success: true,
        message: 'Report not found (already deleted?), but you can upload a new image to re-analyze',
        reportId,
      })
    }

    // Delete cache for each image URL
    const imageUrls = data.label_image_urls || []
    let deletedCount = 0

    for (const url of imageUrls) {
      const deleted = await deleteVisionCache(url)
      if (deleted) deletedCount++
    }

    console.log(`[v0] Deleted cache for ${deletedCount}/${imageUrls.length} images`)

    return NextResponse.json({
      success: true,
      message: `Cache deleted for ${deletedCount} image(s). Upload a new image to re-analyze.`,
      reportId,
      cachedImagesDeleted: deletedCount,
    })
  } catch (error) {
    console.error('[v0] Error in delete-vision-cache:', error)
    return NextResponse.json({
      error: String(error),
      success: false,
    }, { status: 500 })
  }
}
