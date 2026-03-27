import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/fsvp/records/[id]/checklist
 * Retrieve compliance checklist for an FSVP record
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
    
    // Verify ownership
    const { data: record } = await supabase
      .from('fsvp_records')
      .select('importer_user_id, primary_qi_user_id')
      .eq('id', id)
      .single()
    
    if (!record || (record.importer_user_id !== user.id && record.primary_qi_user_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Fetch checklist items
    const { data: checklist, error } = await supabase
      .from('fsvp_compliance_checklist')
      .select('*')
      .eq('fsvp_record_id', id)
      .order('category', { ascending: true })
      .order('requirement_code', { ascending: true })
    
    if (error) {
      console.error('[FSVP Records] Error fetching checklist:', error)
      return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
    }
    
    return NextResponse.json(checklist || [])
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/fsvp/records/[id]/checklist
 * Update a checklist item (mark as completed, add evidence, etc.)
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
    
    if (!body.checklist_item_id) {
      return NextResponse.json({ error: 'checklist_item_id is required' }, { status: 400 })
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    if (body.is_completed !== undefined) {
      updateData.is_completed = body.is_completed
      if (body.is_completed) {
        updateData.completed_date = new Date().toISOString()
        updateData.completed_by = user.id
      } else {
        updateData.completed_date = null
        updateData.completed_by = null
      }
    }
    
    if (body.is_applicable !== undefined) updateData.is_applicable = body.is_applicable
    if (body.evidence_notes !== undefined) updateData.evidence_notes = body.evidence_notes
    if (body.evidence_document_ids !== undefined) updateData.evidence_document_ids = body.evidence_document_ids
    
    const { data: item, error } = await supabase
      .from('fsvp_compliance_checklist')
      .update(updateData)
      .eq('id', body.checklist_item_id)
      .eq('fsvp_record_id', id)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP Records] Error updating checklist item:', error)
      return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
    }
    
    // Recalculate compliance score
    const { data: newScore } = await supabase.rpc('calculate_fsvp_compliance_score', {
      record_id: id
    })
    
    // Log activity
    if (body.is_completed !== undefined) {
      await supabase.from('fsvp_record_activities').insert({
        fsvp_record_id: id,
        activity_type: 'verification',
        activity_title: body.is_completed 
          ? `Completed: ${item?.requirement_title}` 
          : `Uncompleted: ${item?.requirement_title}`,
        activity_description: body.evidence_notes || null,
        performed_by: user.id,
        performed_by_role: 'importer',
        result: body.is_completed ? 'pass' : 'pending'
      })
    }
    
    return NextResponse.json({ 
      item, 
      compliance_score: newScore 
    })
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
