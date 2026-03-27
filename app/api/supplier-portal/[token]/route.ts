import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TokenValidationResult, DocumentRequestWithDetails } from '@/lib/supplier-portal-types'

// GET: Validate token and get document request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    if (!token || token.length < 32) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        error: 'Invalid token format',
        errorCode: 'INVALID_TOKEN'
      }, { status: 400 })
    }

    const adminClient = createAdminClient()
    
    // Validate token
    const { data: tokenData, error: tokenError } = await adminClient
      .from('fsvp_supplier_portal_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        error: 'Token not found',
        errorCode: 'INVALID_TOKEN'
      }, { status: 404 })
    }

    // Check if token is revoked
    if (tokenData.is_revoked) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        error: 'This link has been revoked',
        errorCode: 'REVOKED_TOKEN'
      }, { status: 403 })
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        error: 'This link has expired',
        errorCode: 'EXPIRED_TOKEN'
      }, { status: 410 })
    }

    // Get document request with related data
    const { data: requestData, error: requestError } = await adminClient
      .from('fsvp_document_requests')
      .select(`
        *,
        fsvp_suppliers!fsvp_document_requests_supplier_id_fkey (
          id,
          company_name,
          country,
          contact_email
        ),
        fsvp_hazard_analyses (
          id,
          product_name,
          product_category
        )
      `)
      .eq('id', tokenData.document_request_id)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        error: 'Document request not found',
        errorCode: 'REQUEST_NOT_FOUND'
      }, { status: 404 })
    }

    // Get importer info
    const { data: importerData } = await adminClient
      .from('profiles')
      .select('email, company_name')
      .eq('id', requestData.importer_id)
      .single()

    // Get uploaded documents
    const { data: uploadedDocs } = await adminClient
      .from('fsvp_document_request_uploads')
      .select('*')
      .eq('document_request_id', requestData.id)
      .order('uploaded_at', { ascending: false })

    // Update access count
    await adminClient
      .from('fsvp_supplier_portal_tokens')
      .update({
        access_count: (tokenData.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    // Build response
    const documentRequest: DocumentRequestWithDetails = {
      id: requestData.id,
      supplier_id: requestData.supplier_id,
      importer_id: requestData.importer_id,
      hazard_analysis_id: requestData.hazard_analysis_id,
      request_type: requestData.request_type,
      status: requestData.status,
      requested_documents: requestData.requested_documents || [],
      notes: requestData.notes,
      due_date: requestData.due_date,
      priority: requestData.priority || 'normal',
      created_at: requestData.created_at,
      updated_at: requestData.updated_at,
      supplier: requestData.fsvp_suppliers,
      importer: importerData || undefined,
      hazard_analysis: requestData.fsvp_hazard_analyses,
      uploaded_documents: uploadedDocs || []
    }

    return NextResponse.json<TokenValidationResult>({
      valid: true,
      token: tokenData,
      request: documentRequest
    })

  } catch (error) {
    console.error('Error validating supplier portal token:', error)
    return NextResponse.json<TokenValidationResult>({
      valid: false,
      error: 'Internal server error',
      errorCode: 'INVALID_TOKEN'
    }, { status: 500 })
  }
}

// POST: Create or verify session for supplier
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action, email, name, verificationCode } = body

    const adminClient = createAdminClient()
    const supabase = await createClient()

    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Validate token first
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

    // Get IP and user agent for session
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    if (action === 'start_guest_session') {
      // Start a guest session with email verification
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 })
      }

      // Check if email matches the expected supplier email
      const emailMatches = email.toLowerCase() === tokenData.supplier_email?.toLowerCase()

      // Generate verification code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      const codeExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Create session
      const { data: session, error: sessionError } = await adminClient
        .from('fsvp_supplier_portal_sessions')
        .insert({
          token_id: tokenData.id,
          session_type: 'guest',
          guest_email: email,
          guest_name: name,
          email_verified: false,
          verification_code: code,
          verification_expires_at: codeExpiry.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating session:', sessionError)
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
      }

      // TODO: Send verification email
      // For now, we'll return the code in development (remove in production)
      const isDev = process.env.NODE_ENV === 'development'

      return NextResponse.json({
        sessionId: session.id,
        emailMatches,
        requiresVerification: true,
        ...(isDev && { devCode: code }) // Only in dev
      })
    }

    if (action === 'verify_email') {
      // Verify email code
      const { sessionId } = body

      if (!sessionId || !verificationCode) {
        return NextResponse.json({ error: 'Session ID and verification code required' }, { status: 400 })
      }

      const { data: session, error: sessionError } = await adminClient
        .from('fsvp_supplier_portal_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      if (session.verification_code !== verificationCode.toUpperCase()) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
      }

      if (new Date(session.verification_expires_at) < new Date()) {
        return NextResponse.json({ error: 'Verification code expired' }, { status: 400 })
      }

      // Update session as verified
      await adminClient
        .from('fsvp_supplier_portal_sessions')
        .update({
          email_verified: true,
          verification_code: null
        })
        .eq('id', sessionId)

      // Log action
      await adminClient
        .from('fsvp_supplier_portal_actions')
        .insert({
          session_id: sessionId,
          action_type: 'view',
          action_details: { event: 'email_verified' }
        })

      return NextResponse.json({ verified: true })
    }

    if (action === 'authenticated_session') {
      // Create session for authenticated user
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const { data: session, error: sessionError } = await adminClient
        .from('fsvp_supplier_portal_sessions')
        .insert({
          token_id: tokenData.id,
          user_id: user.id,
          session_type: 'authenticated',
          email_verified: true,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating authenticated session:', sessionError)
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
      }

      // Log action
      await adminClient
        .from('fsvp_supplier_portal_actions')
        .insert({
          session_id: session.id,
          action_type: 'view',
          action_details: { event: 'authenticated_access', user_id: user.id }
        })

      return NextResponse.json({
        sessionId: session.id,
        authenticated: true
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in supplier portal session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
