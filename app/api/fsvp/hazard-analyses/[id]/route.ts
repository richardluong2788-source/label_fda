import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fsvp/hazard-analyses/[id]
 * Retrieve a specific hazard analysis by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch the hazard analysis
    const { data: analysis, error } = await supabase
      .from('fsvp_hazard_analyses')
      .select('*')
      .eq('id', id)
      .eq('importer_user_id', user.id)
      .single()
    
    if (error) {
      console.error('[FSVP] Error fetching hazard analysis:', error)
      return NextResponse.json({ error: 'Failed to fetch hazard analysis' }, { status: 500 })
    }
    
    if (!analysis) {
      return NextResponse.json({ error: 'Hazard analysis not found' }, { status: 404 })
    }
    
    return NextResponse.json(analysis)
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/fsvp/hazard-analyses/[id]
 * Update a specific hazard analysis
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Determine if SAHCODHA product based on hazards
    const hasSAHCODHAHazards = [
      ...(body.biological_hazards || []),
      ...(body.chemical_hazards || []),
      ...(body.allergen_hazards || [])
    ].some((h: { severity?: string }) => h.severity === 'sahcodha')
    
    // Update hazard analysis record
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    // Only update fields that are provided
    if (body.product_name !== undefined) updateData.product_name = body.product_name
    if (body.product_category !== undefined) updateData.product_category = body.product_category
    if (body.product_description !== undefined) updateData.product_description = body.product_description
    if (body.supplier_id !== undefined) updateData.supplier_id = body.supplier_id
    if (body.known_hazards !== undefined) updateData.known_hazards = body.known_hazards
    if (body.biological_hazards !== undefined) updateData.biological_hazards = body.biological_hazards
    if (body.chemical_hazards !== undefined) updateData.chemical_hazards = body.chemical_hazards
    if (body.physical_hazards !== undefined) updateData.physical_hazards = body.physical_hazards
    if (body.radiological_hazards !== undefined) updateData.radiological_hazards = body.radiological_hazards
    if (body.allergen_hazards !== undefined) updateData.allergen_hazards = body.allergen_hazards
    if (body.is_sahcodha_product !== undefined) updateData.is_sahcodha_product = body.is_sahcodha_product || hasSAHCODHAHazards
    if (body.sahcodha_justification !== undefined) updateData.sahcodha_justification = body.sahcodha_justification
    if (body.control_measures !== undefined) updateData.control_measures = body.control_measures
    if (body.supplier_controls !== undefined) updateData.supplier_controls = body.supplier_controls
    if (body.analyzed_by !== undefined) updateData.analyzed_by = body.analyzed_by
    if (body.qualified_individual_credentials !== undefined) updateData.qualified_individual_credentials = body.qualified_individual_credentials
    if (body.status !== undefined) updateData.status = body.status
    
    const { data: analysis, error } = await supabase
      .from('fsvp_hazard_analyses')
      .update(updateData)
      .eq('id', id)
      .eq('importer_user_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP] Error updating hazard analysis:', error)
      return NextResponse.json({ error: 'Failed to update hazard analysis' }, { status: 500 })
    }
    
    if (!analysis) {
      return NextResponse.json({ error: 'Hazard analysis not found' }, { status: 404 })
    }
    
    // Update supplier's hazard_analysis field if needed
    if (body.supplier_id) {
      await supabase
        .from('fsvp_suppliers')
        .update({
          hazard_analysis: {
            product_name: analysis.product_name,
            analysis_date: analysis.analysis_date,
            is_sahcodha: analysis.is_sahcodha_product,
            analyzed_by: analysis.analyzed_by
          },
          is_sahcodha_risk: analysis.is_sahcodha_product,
          sahcodha_assessment_date: analysis.is_sahcodha_product ? new Date().toISOString() : null,
          requires_annual_audit: analysis.is_sahcodha_product,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.supplier_id)
        .eq('importer_user_id', user.id)
    }
    
    return NextResponse.json(analysis)
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/fsvp/hazard-analyses/[id]
 * Delete a specific hazard analysis
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('fsvp_hazard_analyses')
      .delete()
      .eq('id', id)
      .eq('importer_user_id', user.id)
    
    if (error) {
      console.error('[FSVP] Error deleting hazard analysis:', error)
      return NextResponse.json({ error: 'Failed to delete hazard analysis' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
