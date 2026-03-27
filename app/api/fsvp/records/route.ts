import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fsvp/records
 * Retrieve all FSVP records for the authenticated user
 * Supports filtering by supplier_id, status, risk_level
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query params
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status')
    const riskLevel = searchParams.get('risk_level')
    const linkedReportId = searchParams.get('linked_audit_report_id')
    
    // Use view to get records with supplier info
    let query = supabase
      .from('fsvp_records_with_supplier')
      .select('*')
      .eq('importer_user_id', user.id)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    if (status) {
      query = query.eq('compliance_status', status)
    }
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel)
    }
    if (linkedReportId) {
      query = query.eq('linked_audit_report_id', linkedReportId)
    }
    
    const { data: records, error } = await query
    
    if (error) {
      console.error('[FSVP Records] Error fetching records:', error)
      return NextResponse.json({ error: 'Failed to fetch FSVP records' }, { status: 500 })
    }
    
    return NextResponse.json(records || [])
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/records
 * Create a new FSVP record for a product-supplier combination
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.supplier_id || !body.product_name) {
      return NextResponse.json(
        { error: 'supplier_id and product_name are required' },
        { status: 400 }
      )
    }
    
    // Check if record already exists for this product-supplier combination
    const { data: existing } = await supabase
      .from('fsvp_records')
      .select('id')
      .eq('importer_user_id', user.id)
      .eq('supplier_id', body.supplier_id)
      .eq('product_name', body.product_name)
      .single()
    
    if (existing) {
      return NextResponse.json(
        { error: 'An FSVP record already exists for this product-supplier combination' },
        { status: 409 }
      )
    }
    
    // Get supplier info to determine country of origin
    const { data: supplier } = await supabase
      .from('fsvp_suppliers')
      .select('supplier_country, is_sahcodha_risk')
      .eq('id', body.supplier_id)
      .single()
    
    // Determine risk level and SAHCODHA status
    const isHighRiskProduct = body.hazard_types?.some((h: string) => 
      ['salmonella', 'listeria', 'e.coli', 'pathogen'].some(p => h.toLowerCase().includes(p))
    )
    const isSAHCODHA = body.is_sahcodha ?? supplier?.is_sahcodha_risk ?? isHighRiskProduct
    const riskLevel = isSAHCODHA ? 'sahcodha' : (body.risk_level || 'medium')
    
    // Calculate next verification due date based on risk level
    const now = new Date()
    let nextVerificationDue: Date
    switch (riskLevel) {
      case 'sahcodha':
        nextVerificationDue = new Date(now.setFullYear(now.getFullYear() + 1)) // Annual
        break
      case 'high':
        nextVerificationDue = new Date(now.setMonth(now.getMonth() + 6)) // Semi-annual
        break
      default:
        nextVerificationDue = new Date(now.setFullYear(now.getFullYear() + 1)) // Annual
    }
    
    // Create FSVP record
    const recordData: Record<string, unknown> = {
      importer_user_id: user.id,
      supplier_id: body.supplier_id,
      product_name: body.product_name,
      product_description: body.product_description || null,
      product_category: body.product_category || null,
      fda_product_code: body.fda_product_code || null,
      hs_code: body.hs_code || null,
      country_of_origin: body.country_of_origin || supplier?.supplier_country || null,
      risk_level: riskLevel,
      is_sahcodha: isSAHCODHA,
      hazard_types: body.hazard_types || [],
      compliance_status: 'draft',
      compliance_score: 0,
      hazard_analysis_id: body.hazard_analysis_id || null,
      primary_qi_user_id: body.primary_qi_user_id || null,
      linked_audit_report_id: body.linked_audit_report_id || null,
      verification_frequency: isSAHCODHA ? 'annual' : (body.verification_frequency || 'annual'),
      next_verification_due: nextVerificationDue.toISOString(),
      notes: body.notes || null,
      tags: body.tags || []
    }
    
    // Link to product in catalog if provided
    if (body.product_id) {
      recordData.product_id = body.product_id
    }
    
    const { data: record, error } = await supabase
      .from('fsvp_records')
      .insert(recordData)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP Records] Error creating record:', error)
      return NextResponse.json({ error: 'Failed to create FSVP record' }, { status: 500 })
    }
    
    // Create initial activity entry
    await supabase.from('fsvp_record_activities').insert({
      fsvp_record_id: record.id,
      activity_type: 'status_change',
      activity_title: 'FSVP Record Created',
      activity_description: `FSVP record created for ${body.product_name}`,
      performed_by: user.id,
      performed_by_role: 'importer',
      result: 'pass'
    })
    
    return NextResponse.json(record, { status: 201 })
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
