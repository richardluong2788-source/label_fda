import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { assessSAHCODHARisk } from '@/lib/fsvp-validator'
import { requiresSAHCODHAVerification, getMandatoryHazardsForProduct } from '@/lib/fsvp-product-hazard-mapping'

/**
 * GET /api/fsvp/suppliers
 * Retrieve all FSVP suppliers for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch suppliers for this user
    const { data: suppliers, error } = await supabase
      .from('fsvp_suppliers')
      .select('*')
      .eq('importer_user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[FSVP] Error fetching suppliers:', error)
      return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }
    
    return NextResponse.json(suppliers || [])
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/suppliers
 * Create a new FSVP supplier
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
    if (!body.supplier_name || !body.supplier_country) {
      return NextResponse.json(
        { error: 'supplier_name and supplier_country are required' },
        { status: 400 }
      )
    }
    
    // Check for SAHCODHA risk based on product categories and product names
    let is_sahcodha_risk = false
    let sahcodha_hazards: string[] = []
    let requires_annual_audit = false
    let suggested_hazards: string[] = []
    
    // Check product categories using both SAHCODHA_CATEGORIES and product hazard mapping
    if (body.product_categories && Array.isArray(body.product_categories)) {
      for (const category of body.product_categories) {
        // Check via SAHCODHA_CATEGORIES (fsvp-validator)
        const assessment = assessSAHCODHARisk(category, '', '', body.supplier_country)
        if (assessment.isHighRisk) {
          is_sahcodha_risk = true
          requires_annual_audit = true
          sahcodha_hazards = [...new Set([...sahcodha_hazards, ...assessment.hazards])]
        }
        
        // Check via product hazard mapping (fsvp-product-hazard-mapping)
        const sahcodhaCheck = requiresSAHCODHAVerification(category, '')
        if (sahcodhaCheck.requires) {
          is_sahcodha_risk = true
          requires_annual_audit = true
          sahcodha_hazards = [...new Set([...sahcodha_hazards, ...sahcodhaCheck.hazards])]
        }
        
        // Get suggested mandatory hazards for the category
        const { suggestedHazards } = getMandatoryHazardsForProduct(category, '')
        suggested_hazards = [...new Set([...suggested_hazards, ...suggestedHazards.map(h => h.hazard_name)])]
      }
    }
    
    // Also check primary products for SAHCODHA patterns
    // This catches cases like "Pangasius fillet", "Roasted cashews", etc.
    if (body.primary_products && Array.isArray(body.primary_products)) {
      for (const product of body.primary_products) {
        const productLower = product.toLowerCase()
        
        // Check for Pangasius/Cá tra (Vietnamese catfish)
        if (productLower.includes('pangasius') || productLower.includes('cá tra') || 
            productLower.includes('basa') || productLower.includes('catfish')) {
          is_sahcodha_risk = true
          requires_annual_audit = true
          sahcodha_hazards = [...new Set([...sahcodha_hazards, 'Salmonella', 'Veterinary drug residues', 'Listeria monocytogenes'])]
        }
        
        // Check for Cashew/Hạt điều
        if (productLower.includes('cashew') || productLower.includes('hạt điều') || productLower.includes('hat dieu')) {
          is_sahcodha_risk = true
          requires_annual_audit = true
          sahcodha_hazards = [...new Set([...sahcodha_hazards, 'Salmonella', 'Tree nut allergen'])]
        }
        
        // Check via product hazard mapping
        const sahcodhaCheck = requiresSAHCODHAVerification('', product)
        if (sahcodhaCheck.requires) {
          is_sahcodha_risk = true
          requires_annual_audit = true
          sahcodha_hazards = [...new Set([...sahcodha_hazards, ...sahcodhaCheck.hazards])]
        }
      }
    }
    
    // Create supplier record
    const supplierData = {
      importer_user_id: user.id,
      supplier_name: body.supplier_name,
      supplier_country: body.supplier_country,
      supplier_address: body.supplier_address || null,
      supplier_fei: body.supplier_fei || null,
      supplier_duns: body.supplier_duns || null,
      supplier_contact_name: body.supplier_contact_name || null,
      supplier_contact_email: body.supplier_contact_email || null,
      supplier_contact_phone: body.supplier_contact_phone || null,
      product_categories: body.product_categories || [],
      primary_products: body.primary_products || [],
      is_sahcodha_risk,
      sahcodha_hazards,
      requires_annual_audit,
      status: 'pending_review',
      created_by: user.id
    }
    
    const { data: supplier, error } = await supabase
      .from('fsvp_suppliers')
      .insert(supplierData)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP] Error creating supplier:', error)
      return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
    }
    
    return NextResponse.json(supplier, { status: 201 })
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
