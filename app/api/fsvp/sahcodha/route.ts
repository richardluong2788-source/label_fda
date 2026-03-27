import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get SAHCODHA products from hazard analyses for this user
    const { data: sahcodhaProducts, error } = await supabase
      .from('fsvp_hazard_analyses')
      .select(`
        id,
        supplier_id,
        product_name,
        product_category,
        biological_hazards,
        chemical_hazards,
        known_hazards,
        is_sahcodha_product,
        sahcodha_justification,
        analysis_date,
        status,
        fsvp_suppliers!inner (
          supplier_name,
          is_sahcodha_risk,
          sahcodha_hazards,
          requires_annual_audit,
          last_onsite_audit_date,
          next_onsite_audit_due
        )
      `)
      .eq('importer_user_id', user.id)
      .eq('is_sahcodha_product', true)
      .order('analysis_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching SAHCODHA products:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Calculate risk score for each product
    const productsWithRisk = (sahcodhaProducts || []).map(product => {
      const biologicalHazards = Array.isArray(product.biological_hazards) 
        ? product.biological_hazards.length 
        : 0
      const chemicalHazards = Array.isArray(product.chemical_hazards) 
        ? product.chemical_hazards.length 
        : 0
      const allergenHazards = Array.isArray(product.known_hazards) 
        ? product.known_hazards.length 
        : 0
      
      // Simple risk calculation (can be made more sophisticated)
      const hazardCount = biologicalHazards + chemicalHazards + allergenHazards
      const baseRisk = Math.min(hazardCount * 15, 60)
      const sahcodhaBonus = product.is_sahcodha_product ? 25 : 0
      const riskScore = Math.min(baseRisk + sahcodhaBonus, 100)
      
      return {
        ...product,
        risk_score: riskScore,
        hazard_count: hazardCount,
        verification_frequency: riskScore >= 70 ? 'Annual' : 'Biennial'
      }
    })
    
    return NextResponse.json(productsWithRisk)
  } catch (error) {
    console.error('Error in SAHCODHA API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update SAHCODHA assessment
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, is_sahcodha_product, sahcodha_justification } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('fsvp_hazard_analyses')
      .update({
        is_sahcodha_product,
        sahcodha_justification,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating SAHCODHA assessment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in SAHCODHA PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
