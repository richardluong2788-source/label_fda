import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/fsvp/document-requests/supplier
 * List document requests for the current supplier
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status')

    // Get the user's email for matching
    const userEmail = user.email

    // Build query - match by supplier_id OR supplier_email
    let query = supabase
      .from('fsvp_document_requests')
      .select(`
        *,
        items:fsvp_document_request_items(*)
      `)
      .or(`supplier_email.eq.${userEmail},supplier_id.in.(${await getSupplierIds(supabase, user.id)})`)
      .in('status', ['sent', 'in_progress', 'under_review', 'approved', 'rejected'])
      .order('created_at', { ascending: false })

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching supplier requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Sort items by sort_order
    const sortedData = data?.map(req => ({
      ...req,
      items: req.items?.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order) || []
    }))

    return NextResponse.json(sortedData || [])
  } catch (error) {
    console.error('Error in GET /api/fsvp/document-requests/supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to get supplier IDs owned by user
async function getSupplierIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data } = await supabase
    .from('fsvp_suppliers')
    .select('id')
    .eq('user_id', userId)

  if (!data || data.length === 0) {
    return "''"  // Return empty string that won't match anything
  }

  return data.map(s => `'${s.id}'`).join(',')
}
