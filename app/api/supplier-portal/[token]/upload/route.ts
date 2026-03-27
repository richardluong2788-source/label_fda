import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const documentType = formData.get('document_type') as string
    const notes = formData.get('notes') as string
    const requestId = formData.get('request_id') as string
    const sessionId = formData.get('session_id') as string

    if (!file || !documentType || !requestId || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Validate token
    const { data: tokenData, error: tokenError } = await adminClient
      .from('fsvp_supplier_portal_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    if (tokenData.is_revoked || new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired or revoked' }, { status: 403 })
    }

    // Validate session
    const { data: session, error: sessionError } = await adminClient
      .from('fsvp_supplier_portal_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('token_id', tokenData.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }

    // Check session is verified and not expired
    if (!session.email_verified) {
      return NextResponse.json({ error: 'Session not verified' }, { status: 403 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 403 })
    }

    // Validate request ID matches token
    if (tokenData.document_request_id !== requestId) {
      return NextResponse.json({ error: 'Request ID mismatch' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generate unique file path
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `fsvp-documents/${requestId}/${documentType}/${timestamp}_${safeFileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('fsvp-documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Create upload record
    const { data: uploadRecord, error: recordError } = await adminClient
      .from('fsvp_document_request_uploads')
      .insert({
        document_request_id: requestId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by_session: sessionId,
        uploaded_by_user: session.user_id || null,
        uploaded_by_email: session.guest_email || null,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single()

    if (recordError) {
      console.error('Record error:', recordError)
      // Try to clean up uploaded file
      await adminClient.storage.from('fsvp-documents').remove([filePath])
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
    }

    // Log the action
    await adminClient
      .from('fsvp_supplier_portal_actions')
      .insert({
        session_id: sessionId,
        action_type: 'upload',
        action_details: {
          document_type: documentType,
          file_name: file.name,
          file_size: file.size,
          upload_id: uploadRecord.id
        }
      })

    // Update document request status to in_progress if it was pending
    await adminClient
      .from('fsvp_document_requests')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending')

    return NextResponse.json({
      success: true,
      upload: {
        id: uploadRecord.id,
        document_type: documentType,
        file_name: file.name,
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('Error in supplier portal upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
