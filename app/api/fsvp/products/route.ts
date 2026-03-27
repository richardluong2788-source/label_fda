import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { FSVPProductFormData } from '@/lib/types'

/**
 * GET /api/fsvp/products
 * Retrieve all FSVP products accessible to the authenticated user
 * Query params:
 *   - supplier_id: Filter by supplier
 *   - status: Filter by status (draft, active, discontinued, archived)
 *   - role: Filter by created_by_role (importer, supplier)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status')
    const role = searchParams.get('role')
    
    // Build query - using view for supplier info
    let query = supabase
      .from('fsvp_products_with_labels')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (role) {
      query = query.eq('created_by_role', role)
    }
    
    const { data: products, error } = await query
    
    if (error) {
      console.error('[FSVP Products] Error fetching products:', error)
      // Fallback to base table if view doesn't exist
      const { data: fallbackProducts, error: fallbackError } = await supabase
        .from('fsvp_products')
        .select(`
          *,
          fsvp_suppliers (
            supplier_name,
            supplier_country
          )
        `)
        .order('created_at', { ascending: false })
      
      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
      }
      
      // Transform fallback data
      const transformedProducts = (fallbackProducts || []).map(p => ({
        ...p,
        supplier_name: p.fsvp_suppliers?.supplier_name,
        supplier_country: p.fsvp_suppliers?.supplier_country,
        total_label_versions: 0
      }))
      
      return NextResponse.json(transformedProducts)
    }
    
    return NextResponse.json(products || [])
    
  } catch (error) {
    console.error('[FSVP Products] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/products
 * Create a new FSVP product
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body: FSVPProductFormData & { created_by_role?: string } = await request.json()
    
    // Validate required fields
    if (!body.supplier_id || !body.product_name) {
      return NextResponse.json(
        { error: 'supplier_id and product_name are required' },
        { status: 400 }
      )
    }
    
    // Check if supplier exists
    const { data: supplier, error: supplierError } = await supabase
      .from('fsvp_suppliers')
      .select('id, user_id')
      .eq('id', body.supplier_id)
      .single()
    
    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    
    // Determine role - if user is the supplier's user_id, they're a supplier
    const createdByRole = supplier.user_id === user.id ? 'supplier' : 'importer'
    
    // Check for SAHCODHA based on product category
    const isSahcodha = body.default_risk_level === 'sahcodha' || body.is_sahcodha
    
    // Create product record
    const productData = {
      supplier_id: body.supplier_id,
      created_by: user.id,
      created_by_role: body.created_by_role || createdByRole,
      
      product_name: body.product_name,
      product_name_local: body.product_name_local || null,
      brand_name: body.brand_name || null,
      sku: body.sku || null,
      upc: body.upc || null,
      
      product_description: body.product_description || null,
      product_category: body.product_category || null,
      fda_product_code: body.fda_product_code || null,
      hs_code: body.hs_code || null,
      
      packaging_format: body.packaging_format || null,
      net_weight: body.net_weight || null,
      units_per_case: body.units_per_case || null,
      shelf_life_days: body.shelf_life_days || null,
      storage_requirements: body.storage_requirements || null,
      
      ingredient_list: body.ingredient_list || null,
      allergens: body.allergens || [],
      contains_major_allergen: (body.allergens || []).length > 0,
      
      country_of_origin: body.country_of_origin || null,
      manufacturing_facility: body.manufacturing_facility || null,
      facility_fda_registration: body.facility_fda_registration || null,
      
      default_risk_level: body.default_risk_level || 'medium',
      is_sahcodha: isSahcodha,
      known_hazards: body.known_hazards || [],
      
      certifications: body.certifications || [],
      
      status: 'active',
      notes: body.notes || null,
      tags: body.tags || []
    }
    
    const { data: product, error } = await supabase
      .from('fsvp_products')
      .insert(productData)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP Products] Error creating product:', error)
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A product with this name already exists for this supplier' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }
    
    // If importer created the product, grant them access
    if (createdByRole === 'importer') {
      await supabase
        .from('fsvp_product_importer_access')
        .insert({
          product_id: product.id,
          importer_user_id: user.id,
          can_edit: true,
          can_request_updates: true,
          granted_by: user.id
        })
    }
    
    return NextResponse.json(product, { status: 201 })
    
  } catch (error) {
    console.error('[FSVP Products] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
