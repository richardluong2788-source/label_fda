import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fsvp/products/[id]
 * Get a single product by ID with label history
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
    
    // Fetch product with supplier info
    const { data: product, error } = await supabase
      .from('fsvp_products')
      .select(`
        *,
        fsvp_suppliers (
          id,
          supplier_name,
          supplier_country,
          supplier_contact_email,
          user_id
        )
      `)
      .eq('id', id)
      .single()
    
    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    // Fetch label history
    const { data: labels, error: labelsError } = await supabase
      .from('fsvp_product_labels')
      .select('*')
      .eq('product_id', id)
      .order('version', { ascending: false })
    
    if (labelsError) {
      console.error('[FSVP Products] Error fetching labels:', labelsError)
    }
    
    return NextResponse.json({
      ...product,
      supplier_name: product.fsvp_suppliers?.supplier_name,
      supplier_country: product.fsvp_suppliers?.supplier_country,
      labels: labels || []
    })
    
  } catch (error) {
    console.error('[FSVP Products] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/fsvp/products/[id]
 * Update a product
 */
export async function PATCH(
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
    
    // Remove fields that shouldn't be updated directly
    const { id: _, created_by, created_by_role, created_at, ...updateData } = body
    
    // Update product
    const { data: product, error } = await supabase
      .from('fsvp_products')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP Products] Error updating product:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A product with this name already exists for this supplier' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
    
    return NextResponse.json(product)
    
  } catch (error) {
    console.error('[FSVP Products] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/fsvp/products/[id]
 * Delete a product (or archive it)
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
    
    // Check if product is linked to any FSVP records
    const { data: linkedRecords, error: linkError } = await supabase
      .from('fsvp_records')
      .select('id')
      .eq('product_name', id) // Note: We'd need to match by actual product reference
      .limit(1)
    
    if (linkError) {
      console.error('[FSVP Products] Error checking links:', linkError)
    }
    
    // If linked, archive instead of delete
    if (linkedRecords && linkedRecords.length > 0) {
      const { error } = await supabase
        .from('fsvp_products')
        .update({ status: 'archived' })
        .eq('id', id)
      
      if (error) {
        return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 })
      }
      
      return NextResponse.json({ message: 'Product archived (linked to FSVP records)' })
    }
    
    // Delete product
    const { error } = await supabase
      .from('fsvp_products')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('[FSVP Products] Error deleting product:', error)
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }
    
    return NextResponse.json({ message: 'Product deleted' })
    
  } catch (error) {
    console.error('[FSVP Products] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
