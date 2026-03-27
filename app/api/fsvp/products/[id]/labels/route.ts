import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { FSVPLabelUploadData } from '@/lib/types'

/**
 * GET /api/fsvp/products/[id]/labels
 * Get all label versions for a product
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
    
    // Fetch all labels for this product
    const { data: labels, error } = await supabase
      .from('fsvp_product_labels')
      .select('*')
      .eq('product_id', id)
      .order('version', { ascending: false })
    
    if (error) {
      console.error('[FSVP Labels] Error fetching labels:', error)
      return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
    }
    
    return NextResponse.json(labels || [])
    
  } catch (error) {
    console.error('[FSVP Labels] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/fsvp/products/[id]/labels
 * Upload a new label version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body: FSVPLabelUploadData = await request.json()
    
    // Validate required fields
    if (!body.label_image_url) {
      return NextResponse.json(
        { error: 'label_image_url is required' },
        { status: 400 }
      )
    }
    
    // Check if product exists and get supplier info
    const { data: product, error: productError } = await supabase
      .from('fsvp_products')
      .select(`
        id,
        supplier_id,
        fsvp_suppliers (
          user_id
        )
      `)
      .eq('id', productId)
      .single()
    
    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    // Determine role
    const uploadedByRole = product.fsvp_suppliers?.user_id === user.id ? 'supplier' : 'importer'
    
    // Get next version number
    const { data: maxVersionResult } = await supabase
      .from('fsvp_product_labels')
      .select('version')
      .eq('product_id', productId)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    const nextVersion = (maxVersionResult?.version || 0) + 1
    
    // Get current label info for change tracking
    const { data: currentLabel } = await supabase
      .from('fsvp_product_labels')
      .select('*')
      .eq('product_id', productId)
      .eq('is_current', true)
      .single()
    
    // Mark old labels as not current
    if (currentLabel) {
      await supabase
        .from('fsvp_product_labels')
        .update({ 
          is_current: false,
          effective_until: new Date().toISOString()
        })
        .eq('product_id', productId)
        .eq('is_current', true)
    }
    
    // Create new label
    const labelData = {
      product_id: productId,
      version: nextVersion,
      is_current: true,
      label_image_url: body.label_image_url,
      label_image_urls: body.label_image_urls || [body.label_image_url],
      status: 'approved' as const,
      uploaded_by: user.id,
      uploaded_by_role: uploadedByRole,
      product_name_on_label: body.product_name_on_label || null,
      brand_name_on_label: body.brand_name_on_label || null,
      ingredient_list: body.ingredient_list || null,
      allergen_statement: body.allergen_statement || null,
      nutrition_facts: body.nutrition_facts || {},
      net_weight: body.net_weight || null,
      country_of_origin: body.country_of_origin || null,
      manufacturer_info: body.manufacturer_info || null,
      change_reason: body.change_reason || (nextVersion === 1 ? 'Initial label' : 'Label update'),
      changes_from_previous: currentLabel ? {
        previous_version: currentLabel.version,
        previous_label_url: currentLabel.label_image_url
      } : {}
    }
    
    const { data: label, error } = await supabase
      .from('fsvp_product_labels')
      .insert(labelData)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP Labels] Error creating label:', error)
      return NextResponse.json({ error: 'Failed to create label' }, { status: 500 })
    }
    
    // Update product with current label reference
    await supabase
      .from('fsvp_products')
      .update({
        current_label_id: label.id,
        current_label_version: nextVersion,
        // Also update product info from label if provided
        ...(body.ingredient_list && { ingredient_list: body.ingredient_list }),
        ...(body.net_weight && { net_weight: body.net_weight }),
        ...(body.country_of_origin && { country_of_origin: body.country_of_origin })
      })
      .eq('id', productId)
    
    return NextResponse.json(label, { status: 201 })
    
  } catch (error) {
    console.error('[FSVP Labels] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
