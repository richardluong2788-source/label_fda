import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/fsvp/hazard-analyses/[id]/assign-supplier
 * ────────────────────────────────────────────────────
 * Assigns a supplier to a draft hazard analysis and creates the associated
 * product and label records.
 * 
 * WORKFLOW:
 * 1. User scans label → Creates DRAFT hazard analysis (supplier_id = NULL)
 * 2. User reviews and selects/creates supplier
 * 3. This API assigns supplier and creates product + label
 * 
 * REQUEST BODY:
 * {
 *   supplierId: string,           // Required - existing supplier ID
 *   createProduct?: boolean,      // Optional - create product in catalog (default: true)
 * }
 * 
 * CREATES:
 * - Updates hazard analysis with supplier_id
 * - Creates fsvp_products record (if createProduct = true)
 * - Creates fsvp_product_labels record (if label_image_url exists)
 * - Updates supplier with SAHCODHA flag if applicable
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hazardAnalysisId } = await params
    const body = await request.json()
    const { supplierId, createProduct = true } = body

    if (!supplierId) {
      return NextResponse.json(
        { error: 'supplierId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get hazard analysis
    const { data: hazardAnalysis, error: haError } = await supabase
      .from('fsvp_hazard_analyses')
      .select('*')
      .eq('id', hazardAnalysisId)
      .single()

    if (haError || !hazardAnalysis) {
      return NextResponse.json(
        { error: 'Hazard analysis not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (hazardAnalysis.importer_user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this hazard analysis' },
        { status: 403 }
      )
    }

    // Verify supplier exists and belongs to user
    const { data: supplier, error: supplierError } = await supabase
      .from('fsvp_suppliers')
      .select('id, supplier_name, supplier_country')
      .eq('id', supplierId)
      .eq('importer_user_id', user.id)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Supplier not found or you do not have access' },
        { status: 404 }
      )
    }

    const results = {
      hazardAnalysisUpdated: false,
      productCreated: false,
      labelCreated: false,
      supplierUpdated: false,
      productId: null as string | null,
      labelId: null as string | null,
    }

    // Update hazard analysis with supplier
    const { error: updateHaError } = await supabase
      .from('fsvp_hazard_analyses')
      .update({
        supplier_id: supplierId,
        status: hazardAnalysis.status === 'draft' ? 'pending_review' : hazardAnalysis.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hazardAnalysisId)

    if (updateHaError) {
      console.error('[assign-supplier] Failed to update hazard analysis:', updateHaError)
      return NextResponse.json(
        { error: 'Failed to update hazard analysis', details: updateHaError.message },
        { status: 500 }
      )
    }

    results.hazardAnalysisUpdated = true

    // Create product if requested
    if (createProduct && hazardAnalysis.product_name) {
      // Check if product already exists
      const { data: existingProduct } = await supabase
        .from('fsvp_products')
        .select('id')
        .eq('supplier_id', supplierId)
        .ilike('product_name', hazardAnalysis.product_name)
        .maybeSingle()

      if (!existingProduct) {
        // Parse allergens from declaration
        const declaredAllergens = hazardAnalysis.allergen_declaration
          ? hazardAnalysis.allergen_declaration.toLowerCase().split(/[,;]/).map((a: string) => a.trim()).filter(Boolean)
          : []

        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('fsvp_products')
          .insert({
            supplier_id: supplierId,
            created_by: user.id,
            created_by_role: 'importer',
            product_name: hazardAnalysis.product_name,
            brand_name: hazardAnalysis.brand_name || null,
            product_description: hazardAnalysis.product_description || null,
            product_category: hazardAnalysis.product_category || null,
            ingredient_list: hazardAnalysis.ingredient_list || null,
            allergens: declaredAllergens.length > 0 ? declaredAllergens : [],
            contains_major_allergen: declaredAllergens.length > 0,
            country_of_origin: supplier.supplier_country || null,
            net_weight: hazardAnalysis.net_weight || null,
            default_risk_level: hazardAnalysis.is_sahcodha_product ? 'sahcodha' : 'medium',
            is_sahcodha: hazardAnalysis.is_sahcodha_product || false,
            known_hazards: [
              ...(hazardAnalysis.biological_hazards || []).map((h: any) => h.hazard_name),
              ...(hazardAnalysis.chemical_hazards || []).map((h: any) => h.hazard_name),
              ...(hazardAnalysis.allergen_hazards || []).map((h: any) => h.hazard_name),
            ],
            status: 'active',
            linked_audit_report_id: hazardAnalysis.linked_audit_report_id,
            auto_generated: true,
            auto_generated_from: 'label_scan_supplier_assigned',
          })
          .select('id')
          .single()

        if (!productError && newProduct) {
          results.productCreated = true
          results.productId = newProduct.id

          // Grant importer access
          await supabase
            .from('fsvp_product_importer_access')
            .insert({
              product_id: newProduct.id,
              importer_user_id: user.id,
              can_edit: true,
              can_request_updates: true,
              granted_by: user.id,
            })

          // Create label version if image exists
          if (hazardAnalysis.label_image_url) {
            const { data: newLabel, error: labelError } = await supabase
              .from('fsvp_product_labels')
              .insert({
                product_id: newProduct.id,
                version: 1,
                is_current: true,
                label_image_url: hazardAnalysis.label_image_url,
                label_image_urls: [hazardAnalysis.label_image_url],
                status: 'approved',
                uploaded_by: user.id,
                uploaded_by_role: 'importer',
                product_name_on_label: hazardAnalysis.product_name,
                brand_name_on_label: hazardAnalysis.brand_name || null,
                ingredient_list: hazardAnalysis.ingredient_list || null,
                allergen_statement: hazardAnalysis.allergen_declaration || null,
                country_of_origin: supplier.supplier_country || null,
                ai_analysis_id: hazardAnalysis.linked_audit_report_id,
                change_reason: 'Initial label from AI analysis - supplier assigned',
              })
              .select('id')
              .single()

            if (!labelError && newLabel) {
              results.labelCreated = true
              results.labelId = newLabel.id

              // Update product with label reference
              await supabase
                .from('fsvp_products')
                .update({
                  current_label_id: newLabel.id,
                  current_label_version: 1,
                })
                .eq('id', newProduct.id)
            }
          }
        } else if (productError) {
          console.log('[assign-supplier] Could not create product:', productError.message)
        }
      } else {
        // Product already exists
        results.productId = existingProduct.id
      }
    }

    // Update supplier with SAHCODHA flag if needed
    if (hazardAnalysis.is_sahcodha_product) {
      const sahcodhaHazards = [
        ...(hazardAnalysis.biological_hazards || []).map((h: any) => h.hazard_name),
      ]

      const { error: supplierUpdateError } = await supabase
        .from('fsvp_suppliers')
        .update({
          is_sahcodha_risk: true,
          requires_annual_audit: true,
          sahcodha_hazards: sahcodhaHazards,
          sahcodha_assessment_date: new Date().toISOString(),
        })
        .eq('id', supplierId)

      if (!supplierUpdateError) {
        results.supplierUpdated = true
      }
    }

    return NextResponse.json({
      success: true,
      message: `Supplier "${supplier.supplier_name}" assigned successfully.`,
      results,
    })

  } catch (error: any) {
    console.error('[assign-supplier] Error:', error)
    return NextResponse.json(
      { error: 'Failed to assign supplier', details: error.message },
      { status: 500 }
    )
  }
}
