import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { assessSAHCODHARisk } from '@/lib/fsvp-validator'
import { requiresSAHCODHAVerification } from '@/lib/fsvp-product-hazard-mapping'

/**
 * PUT /api/fsvp/hazard-analyses
 * Update an existing hazard analysis
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 })
    }
    
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
    if (body.known_hazards !== undefined) updateData.known_hazards = body.known_hazards
    if (body.biological_hazards !== undefined) updateData.biological_hazards = body.biological_hazards
    if (body.chemical_hazards !== undefined) updateData.chemical_hazards = body.chemical_hazards
    if (body.physical_hazards !== undefined) updateData.physical_hazards = body.physical_hazards
    if (body.radiological_hazards !== undefined) updateData.radiological_hazards = body.radiological_hazards
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
      .eq('id', body.id)
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
 * GET /api/fsvp/hazard-analyses
 * Retrieve all hazard analyses for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query params (optional)
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id')
    const linkedReportId = searchParams.get('linkedReportId')
    
    // Build query
    let query = supabase
      .from('fsvp_hazard_analyses')
      .select('*')
      .eq('importer_user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    
    // Filter by linked audit report ID
    if (linkedReportId) {
      query = query.eq('linked_audit_report_id', linkedReportId)
    }
    
    const { data: analyses, error } = await query
    
    // Return with wrapper for linked report queries
    if (linkedReportId) {
      return NextResponse.json({ analyses: analyses || [] })
    }
    
    if (error) {
      console.error('[FSVP] Error fetching hazard analyses:', error)
      return NextResponse.json({ error: 'Failed to fetch hazard analyses' }, { status: 500 })
    }
    
    return NextResponse.json(analyses || [])
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/hazard-analyses
 * Create a new hazard analysis
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
    if (!body.product_name || !body.supplier_id) {
      return NextResponse.json(
        { error: 'product_name and supplier_id are required' },
        { status: 400 }
      )
    }
    
    // Determine if SAHCODHA product based on hazards
    const hasSAHCODHAHazards = [
      ...(body.biological_hazards || []),
      ...(body.chemical_hazards || []),
      ...(body.allergen_hazards || [])
    ].some((h: { severity?: string }) => h.severity === 'sahcodha')
    
    // Also check via product name/category for auto-detection
    const productCategory = body.product_category || ''
    const productName = body.product_name || ''
    
    // Check using SAHCODHA_CATEGORIES
    const sahcodhaAssessment = assessSAHCODHARisk(productCategory, productName, '', '')
    
    // Check using product hazard mapping
    const sahcodhaMapping = requiresSAHCODHAVerification(productCategory, productName)
    
    // Auto-detect SAHCODHA for Pangasius/Cá tra and Cashew/Hạt điều
    const productLower = productName.toLowerCase()
    const isPangasius = productLower.includes('pangasius') || productLower.includes('cá tra') || 
                        productLower.includes('basa') || productLower.includes('catfish')
    const isCashew = productLower.includes('cashew') || productLower.includes('hạt điều') || 
                     productLower.includes('hat dieu')
    
    const isSAHCODHA = hasSAHCODHAHazards || sahcodhaAssessment.isHighRisk || 
                       sahcodhaMapping.requires || isPangasius || isCashew
    
    // Create hazard analysis record
    const analysisData = {
      importer_user_id: user.id,
      supplier_id: body.supplier_id,
      product_name: body.product_name,
      product_category: body.product_category || null,
      product_description: body.product_description || null,
      known_hazards: body.known_hazards || [],
      biological_hazards: body.biological_hazards || [],
      chemical_hazards: body.chemical_hazards || [],
      physical_hazards: body.physical_hazards || [],
      radiological_hazards: body.radiological_hazards || [],
      is_sahcodha_product: body.is_sahcodha_product || isSAHCODHA,
      sahcodha_justification: body.sahcodha_justification || null,
      control_measures: body.control_measures || [],
      supplier_controls: body.supplier_controls || {},
      analysis_date: body.analysis_date || new Date().toISOString(),
      analyzed_by: body.analyzed_by || user.email || 'Unknown',
      qualified_individual_credentials: body.qualified_individual_credentials || null,
      status: body.status || 'draft'
    }
    
    const { data: analysis, error } = await supabase
      .from('fsvp_hazard_analyses')
      .insert(analysisData)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP] Error creating hazard analysis:', error)
      return NextResponse.json({ error: 'Failed to create hazard analysis' }, { status: 500 })
    }
    
    // Update supplier's hazard_analysis field
    if (body.supplier_id) {
      await supabase
        .from('fsvp_suppliers')
        .update({
          hazard_analysis: {
            product_name: body.product_name,
            analysis_date: analysisData.analysis_date,
            is_sahcodha: analysisData.is_sahcodha_product,
            analyzed_by: analysisData.analyzed_by
          },
          is_sahcodha_risk: isSAHCODHA,
          sahcodha_assessment_date: isSAHCODHA ? new Date().toISOString() : null,
          requires_annual_audit: isSAHCODHA,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.supplier_id)
        .eq('importer_user_id', user.id)
    }
    
    return NextResponse.json(analysis, { status: 201 })
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
