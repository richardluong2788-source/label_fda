import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
import type { FSVPDocumentRequest, FSVPDocumentRequestItem } from '@/lib/fsvp-document-request-types'

// Generate a secure random token
function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * GET /api/fsvp/document-requests
 * List document requests for the current importer
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('fsvp_document_requests')
      .select(`
        *,
        items:fsvp_document_request_items(*)
      `)
      .eq('importer_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching document requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/fsvp/document-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/document-requests
 * Create a new document request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { request: requestData, items } = body as {
      request: Partial<FSVPDocumentRequest>
      items: Partial<FSVPDocumentRequestItem>[]
    }

    if (!requestData.product_name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Product name and at least one document item are required' },
        { status: 400 }
      )
    }

    // Generate request number
    const { data: requestNumber } = await supabase.rpc('generate_fsvp_request_number')

    // Create the request
    const { data: newRequest, error: requestError } = await supabase
      .from('fsvp_document_requests')
      .insert({
        request_number: requestNumber || `FSVP-${Date.now()}`,
        importer_user_id: user.id,
        supplier_id: requestData.supplier_id || null,
        supplier_email: requestData.supplier_email || null,
        product_name: requestData.product_name,
        product_category: requestData.product_category || null,
        is_sahcodha: requestData.is_sahcodha || false,
        fda_product_code: requestData.fda_product_code || null,
        status: requestData.status || 'sent',
        deadline: requestData.deadline || null,
        importer_notes: requestData.importer_notes || null,
        applicable_cfr_sections: requestData.applicable_cfr_sections || null,
        ai_suggestion_used: requestData.ai_suggestion_used || false,
        ai_confidence_score: requestData.ai_confidence_score || null,
        sent_at: requestData.status === 'sent' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating document request:', requestError)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }

    // Create the items
    const itemsToInsert = items.map((item, index) => ({
      request_id: newRequest.id,
      document_type: item.document_type,
      document_name: item.document_name,
      description: item.description || null,
      is_required: item.is_required ?? true,
      cfr_reference: item.cfr_reference || null,
      status: 'pending',
      sort_order: item.sort_order ?? index,
    }))

    const { error: itemsError } = await supabase
      .from('fsvp_document_request_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating document request items:', itemsError)
      // Rollback: delete the request
      await supabase.from('fsvp_document_requests').delete().eq('id', newRequest.id)
      return NextResponse.json({ error: 'Failed to create request items' }, { status: 500 })
    }

    // Create secure portal token for supplier
    let portalToken: string | null = null
    let portalUrl: string | null = null
    
    if (requestData.supplier_email || requestData.supplier_id) {
      const supplierEmail = requestData.supplier_email || await getSupplierEmail(supabase, requestData.supplier_id!)
      const supplierName = requestData.supplier_name || await getSupplierName(supabase, requestData.supplier_id!)
      
      if (supplierEmail) {
        const adminClient = createAdminClient()
        portalToken = generateSecureToken()
        
        // Token expires in 30 days
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)
        
        // Create the secure portal token
        const { error: tokenError } = await adminClient
          .from('fsvp_supplier_portal_tokens')
          .insert({
            document_request_id: newRequest.id,
            token: portalToken,
            supplier_email: supplierEmail,
            supplier_name: supplierName,
            expires_at: expiresAt.toISOString(),
            created_by: user.id
          })
        
        if (tokenError) {
          console.error('Error creating portal token:', tokenError)
          // Don't fail the request, just log
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vexim.vercel.app'
          portalUrl = `${baseUrl}/supplier-portal/${portalToken}`
        }
        
        // Create notification for supplier with portal link
        await supabase.from('fsvp_document_request_notifications').insert({
          request_id: newRequest.id,
          notification_type: 'initial_request',
          recipient_email: supplierEmail,
          subject: `Document Request: ${requestData.product_name}`,
          message: `You have received a new document request for ${requestData.product_name}. Please upload the required documents.`,
          portal_url: portalUrl
        })
      }
    }

    // Store AI pattern for learning
    if (requestData.ai_suggestion_used && requestData.product_category) {
      await supabase.from('fsvp_ai_document_patterns').upsert({
        product_category: requestData.product_category,
        is_sahcodha: requestData.is_sahcodha || false,
        suggested_document_types: items.map(i => i.document_type),
        suggested_required_docs: items.filter(i => i.is_required).map(i => i.document_type),
        source_request_id: newRequest.id,
      }, {
        onConflict: 'product_category,country_of_origin,is_sahcodha',
      })
    }

    return NextResponse.json({
      ...newRequest,
      portal_token: portalToken,
      portal_url: portalUrl
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/fsvp/document-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to get supplier email
async function getSupplierEmail(supabase: Awaited<ReturnType<typeof createClient>>, supplierId: string): Promise<string | null> {
  const { data } = await supabase
    .from('fsvp_suppliers')
    .select('contact_email')
    .eq('id', supplierId)
    .single()
  
  return data?.contact_email || null
}

// Helper function to get supplier name
async function getSupplierName(supabase: Awaited<ReturnType<typeof createClient>>, supplierId?: string): Promise<string | null> {
  if (!supplierId) return null
  const { data } = await supabase
    .from('fsvp_suppliers')
    .select('company_name')
    .eq('id', supplierId)
    .single()
  
  return data?.company_name || null
}
