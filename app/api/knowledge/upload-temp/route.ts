import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Temporary upload endpoint for large JSON files
 * Uploads file to Supabase Storage first, then returns URL
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[v0] Uploading file to storage:', file.name, file.size, 'bytes')

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage (temp bucket for imports)
    const fileName = `temp-imports/${user.id}/${Date.now()}-${file.name}`
    
    const { data, error } = await supabase.storage
      .from('label-images') // Reuse existing bucket
      .upload(fileName, buffer, {
        contentType: 'application/json',
        upsert: false,
      })

    if (error) {
      console.error('[v0] Storage upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload to storage: ' + error.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('label-images')
      .getPublicUrl(fileName)

    console.log('[v0] File uploaded successfully:', urlData.publicUrl)

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: fileName,
    })

  } catch (error: any) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
