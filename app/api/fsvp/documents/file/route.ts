import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pathname = request.nextUrl.searchParams.get('pathname')
    const documentId = request.nextUrl.searchParams.get('id')

    if (!pathname && !documentId) {
      return NextResponse.json({ error: 'Missing pathname or document id' }, { status: 400 })
    }

    let filePathname = pathname

    // If document ID provided, fetch pathname from database
    if (documentId && !pathname) {
      const { data: doc, error } = await supabase
        .from('fsvp_documents')
        .select('file_url, importer_user_id')
        .eq('id', documentId)
        .single()

      if (error || !doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      // Verify user owns this document
      if (doc.importer_user_id !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      filePathname = doc.file_url
    }

    if (!filePathname) {
      return NextResponse.json({ error: 'No file associated with this document' }, { status: 404 })
    }

    const result = await get(filePathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Blob hasn't changed — tell the browser to use its cached copy
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Content-Disposition': `inline; filename="${result.blob.pathname.split('/').pop()}"`,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
