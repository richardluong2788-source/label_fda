import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fsvp/verification-activities
 * Retrieve all verification activities for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get supplier_id from query params (optional)
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id')
    
    // Build query
    let query = supabase
      .from('fsvp_verification_activities')
      .select('*')
      .eq('importer_user_id', user.id)
      .order('activity_date', { ascending: false })
    
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    
    const { data: activities, error } = await query
    
    if (error) {
      console.error('[FSVP] Error fetching verification activities:', error)
      return NextResponse.json({ error: 'Failed to fetch verification activities' }, { status: 500 })
    }
    
    return NextResponse.json(activities || [])
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/verification-activities
 * Create a new verification activity
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
    if (!body.supplier_id || !body.activity_type || !body.activity_date || !body.conducted_by) {
      return NextResponse.json(
        { error: 'supplier_id, activity_type, activity_date, and conducted_by are required' },
        { status: 400 }
      )
    }
    
    // Validate activity type
    const validActivityTypes = [
      'onsite_audit',
      'third_party_audit',
      'sampling_testing',
      'document_review',
      'annual_onsite_audit',
      'corrective_action_followup'
    ]
    
    if (!validActivityTypes.includes(body.activity_type)) {
      return NextResponse.json(
        { error: `Invalid activity_type. Must be one of: ${validActivityTypes.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Create verification activity record
    const activityData = {
      importer_user_id: user.id,
      supplier_id: body.supplier_id,
      activity_type: body.activity_type,
      activity_date: body.activity_date,
      conducted_by: body.conducted_by,
      findings: body.findings || {},
      result: body.result || 'pending_review',
      documents: body.documents || [],
      notes: body.notes || null,
      requires_followup: body.requires_followup || false,
      followup_due_date: body.followup_due_date || null,
      followup_completed: body.followup_completed || false,
      created_by: user.id
    }
    
    const { data: activity, error } = await supabase
      .from('fsvp_verification_activities')
      .insert(activityData)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP] Error creating verification activity:', error)
      return NextResponse.json({ error: 'Failed to create verification activity' }, { status: 500 })
    }
    
    // Update supplier's last_verification_date
    const updateData: Record<string, unknown> = {
      last_verification_date: body.activity_date,
      verification_activities: supabase.rpc('array_append_json', {
        arr: [],
        new_item: {
          id: activity.id,
          type: body.activity_type,
          date: body.activity_date,
          result: body.result
        }
      }),
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }
    
    // If it's an onsite audit, update the onsite audit date
    if (body.activity_type === 'onsite_audit' || body.activity_type === 'annual_onsite_audit') {
      updateData.last_onsite_audit_date = body.activity_date
    }
    
    await supabase
      .from('fsvp_suppliers')
      .update({
        last_verification_date: body.activity_date,
        ...(body.activity_type === 'onsite_audit' || body.activity_type === 'annual_onsite_audit' 
          ? { last_onsite_audit_date: body.activity_date }
          : {}),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.supplier_id)
      .eq('importer_user_id', user.id)
    
    return NextResponse.json(activity, { status: 201 })
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
