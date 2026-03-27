import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/fsvp/records/[id]
 * Retrieve a specific FSVP record with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch record with supplier info
    const { data: record, error } = await supabase
      .from('fsvp_records_with_supplier')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !record) {
      return NextResponse.json({ error: 'FSVP record not found' }, { status: 404 })
    }
    
    // Check ownership
    if (record.importer_user_id !== user.id && record.primary_qi_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Fetch checklist items
    const { data: checklist } = await supabase
      .from('fsvp_compliance_checklist')
      .select('*')
      .eq('fsvp_record_id', id)
      .order('requirement_code', { ascending: true })
    
    // Fetch activities
    const { data: activities } = await supabase
      .from('fsvp_record_activities')
      .select('*')
      .eq('fsvp_record_id', id)
      .order('activity_date', { ascending: false })
      .limit(50)
    
    return NextResponse.json({
      ...record,
      checklist: checklist || [],
      activities: activities || []
    })
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/fsvp/records/[id]
 * Update an existing FSVP record
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Build update data - only update provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    // Product info
    if (body.product_name !== undefined) updateData.product_name = body.product_name
    if (body.product_description !== undefined) updateData.product_description = body.product_description
    if (body.product_category !== undefined) updateData.product_category = body.product_category
    if (body.fda_product_code !== undefined) updateData.fda_product_code = body.fda_product_code
    if (body.hs_code !== undefined) updateData.hs_code = body.hs_code
    if (body.country_of_origin !== undefined) updateData.country_of_origin = body.country_of_origin
    
    // Risk assessment
    if (body.risk_level !== undefined) updateData.risk_level = body.risk_level
    if (body.is_sahcodha !== undefined) updateData.is_sahcodha = body.is_sahcodha
    if (body.hazard_types !== undefined) updateData.hazard_types = body.hazard_types
    
    // Compliance
    if (body.compliance_status !== undefined) updateData.compliance_status = body.compliance_status
    if (body.compliance_score !== undefined) updateData.compliance_score = body.compliance_score
    
    // Linked records
    if (body.hazard_analysis_id !== undefined) updateData.hazard_analysis_id = body.hazard_analysis_id
    if (body.primary_qi_user_id !== undefined) updateData.primary_qi_user_id = body.primary_qi_user_id
    if (body.linked_audit_report_id !== undefined) updateData.linked_audit_report_id = body.linked_audit_report_id
    
    // Verification
    if (body.verification_frequency !== undefined) updateData.verification_frequency = body.verification_frequency
    if (body.last_verification_date !== undefined) updateData.last_verification_date = body.last_verification_date
    if (body.next_verification_due !== undefined) updateData.next_verification_due = body.next_verification_due
    
    // Notes
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.tags !== undefined) updateData.tags = body.tags
    
    const { data: record, error } = await supabase
      .from('fsvp_records')
      .update(updateData)
      .eq('id', id)
      .or(`importer_user_id.eq.${user.id},primary_qi_user_id.eq.${user.id}`)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP Records] Error updating record:', error)
      return NextResponse.json({ error: 'Failed to update FSVP record' }, { status: 500 })
    }
    
    if (!record) {
      return NextResponse.json({ error: 'FSVP record not found or unauthorized' }, { status: 404 })
    }
    
    // Log status change if applicable
    if (body.compliance_status) {
      await supabase.from('fsvp_record_activities').insert({
        fsvp_record_id: id,
        activity_type: 'status_change',
        activity_title: `Status changed to ${body.compliance_status}`,
        activity_description: body.status_change_reason || null,
        performed_by: user.id,
        performed_by_role: 'importer'
      })
    }
    
    return NextResponse.json(record)
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/fsvp/records/[id]
 * Delete an FSVP record
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only owner can delete
    const { error } = await supabase
      .from('fsvp_records')
      .delete()
      .eq('id', id)
      .eq('importer_user_id', user.id)
    
    if (error) {
      console.error('[FSVP Records] Error deleting record:', error)
      return NextResponse.json({ error: 'Failed to delete FSVP record' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
