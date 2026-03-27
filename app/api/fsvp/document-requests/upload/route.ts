import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/fsvp/document-requests/upload
 * Upload a document for a specific request item
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const requestId = formData.get('request_id') as string
    const itemId = formData.get('item_id') as string
    const documentType = formData.get('document_type') as string
    const documentName = formData.get('document_name') as string

    // AI verification fields
    const aiVerified = formData.get('ai_verified') === 'true'
    const aiConfidence = formData.get('ai_confidence') as string | null
    const aiDocumentTypeMatch = formData.get('ai_document_type_match') === 'true'

    if (!file || !requestId || !itemId) {
      return NextResponse.json(
        { error: 'File, request_id, and item_id are required' },
        { status: 400 }
      )
    }

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must not exceed 10MB' },
        { status: 400 }
      )
    }

    // Verify user has access to this request (as supplier)
    const { data: requestData, error: requestError } = await supabase
      .from('fsvp_document_requests')
      .select('id, supplier_id, supplier_email, status')
      .eq('id', requestId)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check if user is the supplier
    const isSupplier = 
      requestData.supplier_email === user.email ||
      await isUserSupplier(supabase, user.id, requestData.supplier_id)

    if (!isSupplier) {
      return NextResponse.json({ error: 'Not authorized to upload to this request' }, { status: 403 })
    }

    // Upload file to Vercel Blob
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const pathname = `fsvp-requests/${requestId}/${itemId}/${timestamp}-${sanitizedFileName}`

    const blob = await put(pathname, file, {
      access: 'private',
    })

    // Create document record in fsvp_documents
    const { data: document, error: docError } = await supabase
      .from('fsvp_documents')
      .insert({
        importer_user_id: user.id,
        document_type: documentType,
        document_name: documentName || file.name,
        file_url: blob.pathname,
        file_size_bytes: file.size,
        mime_type: file.type,
        upload_date: new Date().toISOString(),
        status: 'active',
        version: '1.0',
        ai_suggested_type: aiVerified ? documentType : null,
        ai_confidence: aiConfidence ? parseFloat(aiConfidence) : null,
        classification_method: aiVerified ? 'ai_vision' : 'manual',
        is_fsvp_relevant: true,
      })
      .select()
      .single()

    if (docError) {
      console.error('Error creating document record:', docError)
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 })
    }

    // Update the request item
    const { error: itemError } = await supabase
      .from('fsvp_document_request_items')
      .update({
        status: 'uploaded',
        uploaded_document_id: document.id,
        uploaded_at: new Date().toISOString(),
        ai_verified: aiVerified,
        ai_confidence: aiConfidence ? parseFloat(aiConfidence) : null,
        ai_document_type_match: aiDocumentTypeMatch,
      })
      .eq('id', itemId)

    if (itemError) {
      console.error('Error updating request item:', itemError)
      return NextResponse.json({ error: 'Failed to update request item' }, { status: 500 })
    }

    // Update request status to in_progress if it was just 'sent'
    if (requestData.status === 'sent') {
      await supabase
        .from('fsvp_document_requests')
        .update({ status: 'in_progress' })
        .eq('id', requestId)
    }

    // Check if all items are now uploaded
    const { data: allItems } = await supabase
      .from('fsvp_document_request_items')
      .select('status')
      .eq('request_id', requestId)

    const allUploaded = allItems?.every(item => 
      ['uploaded', 'approved', 'waived'].includes(item.status)
    )

    if (allUploaded) {
      // Update request status to under_review
      await supabase
        .from('fsvp_document_requests')
        .update({ status: 'under_review' })
        .eq('id', requestId)

      // Notify importer
      const { data: req } = await supabase
        .from('fsvp_document_requests')
        .select('importer_user_id, product_name')
        .eq('id', requestId)
        .single()

      if (req) {
        const { data: importer } = await supabase.auth.admin.getUserById(req.importer_user_id)
        if (importer?.user?.email) {
          await supabase.from('fsvp_document_request_notifications').insert({
            request_id: requestId,
            notification_type: 'document_approved',
            recipient_email: importer.user.email,
            recipient_user_id: req.importer_user_id,
            subject: `Documents Ready for Review: ${req.product_name}`,
            message: `All documents have been uploaded for ${req.product_name}. Please review them.`,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      all_uploaded: allUploaded,
    })
  } catch (error) {
    console.error('Error in POST /api/fsvp/document-requests/upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to check if user owns a supplier
async function isUserSupplier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  supplierId: string | null
): Promise<boolean> {
  if (!supplierId) return false

  const { data } = await supabase
    .from('fsvp_suppliers')
    .select('id')
    .eq('id', supplierId)
    .eq('user_id', userId)
    .single()

  return !!data
}
