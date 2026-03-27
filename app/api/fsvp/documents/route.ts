import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = supabase
      .from('fsvp_documents')
      .select('*')
      .eq('importer_user_id', user.id)
      .order('created_at', { ascending: false })

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (type && type !== 'all') {
      query = query.eq('document_type', type)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[v0] Documents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.document_name || !body.document_type) {
      return NextResponse.json(
        { error: 'Missing required fields: document_name, document_type' },
        { status: 400 }
      )
    }

    // Calculate status based on expiry date
    let status = 'valid'
    if (body.expiry_date) {
      const expiryDate = new Date(body.expiry_date)
      const now = new Date()
      if (expiryDate < now) {
        status = 'expired'
      }
    }
    if (body.requires_review) {
      status = 'pending_review'
    }

    console.log('[v0] Creating document:', { 
      document_name: body.document_name, 
      document_type: body.document_type,
      user_id: user.id 
    })

    const { data, error } = await supabase
      .from('fsvp_documents')
      .insert({
        importer_user_id: user.id,
        supplier_id: body.supplier_id || null,
        document_type: body.document_type,
        document_name: body.document_name,
        description: body.description || null,
        file_url: body.file_url || null,
        upload_date: new Date().toISOString(),
        expiry_date: body.expiry_date || null,
        status: status,
        version: body.version || '1.0',
        notes: body.notes || null
      })
      .select()
      .single()

    if (error) {
      console.log('[v0] Document insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('[v0] Document created:', data?.id)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
