import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { assessSAHCODHARisk } from '@/lib/fsvp-validator'

/**
 * GET /api/fsvp/suppliers/[id]
 * Get a specific supplier
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: supplier, error } = await supabase
      .from('fsvp_suppliers')
      .select('*')
      .eq('id', id)
      .eq('importer_user_id', user.id)
      .single()
    
    if (error || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    
    return NextResponse.json(supplier)
    
  } catch (error) {
    console.error('[FSVP] Error fetching supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/fsvp/suppliers/[id]
 * Update a supplier
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Check SAHCODHA risk based on product categories
    let is_sahcodha_risk = false
    let sahcodha_hazards: string[] = []
    let requires_annual_audit = false
    
    if (body.product_categories && Array.isArray(body.product_categories)) {
      for (const category of body.product_categories) {
        const assessment = assessSAHCODHARisk(category, '', '', body.supplier_country)
        if (assessment.isHighRisk) {
          is_sahcodha_risk = true
          requires_annual_audit = true
          sahcodha_hazards = [...new Set([...sahcodha_hazards, ...assessment.hazards])]
        }
      }
    }
    
    const updateData = {
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
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }
    
    const { data: supplier, error } = await supabase
      .from('fsvp_suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('importer_user_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP] Error updating supplier:', error)
      return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
    }
    
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    
    return NextResponse.json(supplier)
    
  } catch (error) {
    console.error('[FSVP] Error updating supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/fsvp/suppliers/[id]
 * Delete (soft delete) a supplier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Soft delete by setting status to 'removed'
    const { data, error } = await supabase
      .from('fsvp_suppliers')
      .update({ 
        status: 'removed',
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('importer_user_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('[FSVP] Error deleting supplier:', error)
      return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[FSVP] Error deleting supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
