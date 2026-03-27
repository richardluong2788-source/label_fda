import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/fsvp/records/[id]/activities
 * Retrieve activities for an FSVP record
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
    
    // Get query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const activityType = searchParams.get('type')
    
    // Build query
    let query = supabase
      .from('fsvp_record_activities')
      .select('*')
      .eq('fsvp_record_id', id)
      .order('activity_date', { ascending: false })
      .limit(limit)
    
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }
    
    const { data: activities, error } = await query
    
    if (error) {
      console.error('[FSVP Records] Error fetching activities:', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }
    
    return NextResponse.json(activities || [])
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/records/[id]/activities
 * Add a new activity to an FSVP record
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.activity_type || !body.activity_title) {
      return NextResponse.json(
        { error: 'activity_type and activity_title are required' },
        { status: 400 }
      )
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
    
    // Determine role
    let role: 'importer' | 'qi' | 'supplier' = 'importer'
    if (record.primary_qi_user_id === user.id && record.importer_user_id !== user.id) {
      role = 'qi'
    }
    
    // Create activity
    const activityData = {
      fsvp_record_id: id,
      activity_type: body.activity_type,
      activity_title: body.activity_title,
      activity_description: body.activity_description || null,
      performed_by: user.id,
      performed_by_role: role,
      result: body.result || null,
      result_details: body.result_details || {},
      linked_document_ids: body.linked_document_ids || [],
      activity_date: body.activity_date || new Date().toISOString()
    }
    
    const { data: activity, error } = await supabase
      .from('fsvp_record_activities')
      .insert(activityData)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP Records] Error creating activity:', error)
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
    }
    
    // If this is a verification activity with 'pass' result, update last verification date
    if (body.activity_type === 'verification' && body.result === 'pass') {
      await supabase
        .from('fsvp_records')
        .update({
          last_verification_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    }
    
    return NextResponse.json(activity, { status: 201 })
    
  } catch (error) {
    console.error('[FSVP Records] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
