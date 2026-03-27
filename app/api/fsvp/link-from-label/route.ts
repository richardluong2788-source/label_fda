import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { requiresSAHCODHAVerification, getMandatoryHazardsForProduct, requiresFceSid } from '@/lib/fsvp-product-hazard-mapping'
import { sendEmail } from '@/lib/email'
import { fsvpLinkedFromLabelTemplate } from '@/lib/email/fsvp-templates'

/**
 * POST /api/fsvp/link-from-label
 * ──────────────────────────────
 * Creates DRAFT FSVP hazard analysis records when AI label scan
 * detects imported products/ingredients.
 * 
 * IMPORTANT WORKFLOW:
 * ────────────────────
 * 1. Label scan → Extract product info (name, ingredients, allergens, country)
 * 2. Create DRAFT hazard analysis với supplier_id = NULL
 * 3. Auto-suggest hazards dựa trên product category và ingredients
 * 4. User PHẢI assign supplier THỦ CÔNG sau khi review
 * 5. Khi assign supplier → tự động tạo product và label version
 * 
 * WHY NO AUTO SUPPLIER MAPPING:
 * ─────────────────────────────
 * - Label chỉ chứa country of origin, KHÔNG phải supplier info
 * - Không thể biết supplier nào từ label (công ty A hay B?)
 * - Mặc định supplier chính là nhà sản xuất ghi trên label
 * - Người scan có thể là importer HOẶC supplier - logic khác nhau
 * 
 * Per 21 CFR Part 1 Subpart L:
 * - SAHCODHA products: Require annual onsite audit (21 CFR 1.506(d)(2))
 * - Non-SAHCODHA products: More flexible verification options
 * 
 * Creates:
 * - Draft hazard analysis (supplier_id = NULL, pending assignment)
 * - Auto-suggested hazards based on product category
 * - Sends notification email to user
 * 
 * DOES NOT CREATE:
 * - fsvp_products (requires supplier_id)
 * - fsvp_product_labels (requires product_id)
 * 
 * See also: /api/fsvp/hazard-analyses/[id]/assign-supplier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      reportId,
      productName,
      detectedIngredients,
      originCountry,
      userId,
      auditReportData, // Additional data from audit report for better mapping
    } = body

    if (!reportId || !productName || !detectedIngredients || !Array.isArray(detectedIngredients)) {
      return NextResponse.json(
        { error: 'Missing required fields: reportId, productName, detectedIngredients' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // ── Verify user ─────────────────────────────────────────────
    let currentUserId = userId
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      currentUserId = user.id
    }

    const results = {
      hazardAnalysesCreated: [] as string[],
      // REMOVED: suppliersLinked - không còn auto-link supplier
      sahcodhaDetected: false,
      hazards: [] as string[],
      emailSent: false,
      // NEW: Flag để UI biết cần assign supplier
      pendingSupplierAssignment: true,
    }

    // ── FIXED: First pass - collect all SAHCODHA hazards from ALL ingredients ────
    let allSuggestedHazards: any[] = []
    let bestProfile: any = null
    
    for (const ingredient of detectedIngredients) {
      const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.name
      if (!ingredientName) continue

      // Check if this ingredient is a SAHCODHA product
      const sahcodhaCheck = requiresSAHCODHAVerification('', ingredientName)
      const { profile, suggestedHazards } = getMandatoryHazardsForProduct('', ingredientName)

      if (sahcodhaCheck.requires) {
        results.sahcodhaDetected = true
        results.hazards = [...new Set([...results.hazards, ...sahcodhaCheck.hazards])]
      }
      
      // Collect hazards from all ingredients
      allSuggestedHazards = [...allSuggestedHazards, ...suggestedHazards]
      
      // Use the first matching profile (usually the main product name)
      if (!bestProfile && profile) {
        bestProfile = profile
      }
    }
    
    // Deduplicate hazards by name
    allSuggestedHazards = allSuggestedHazards.filter((h, i, arr) => 
      arr.findIndex(x => x.hazard_name === h.hazard_name) === i
    )

    // ── FIXED: Use productName from request as the actual product name ────
    // productName is the actual product (e.g., "Cashews") from PDP
    // detectedIngredients are the ingredient list (e.g., ["Cashews", "Peanut Oil", "Sea Salt"])
    const actualProductName = productName
    const profile = bestProfile || getMandatoryHazardsForProduct('', actualProductName).profile
    const suggestedHazards = allSuggestedHazards.length > 0 
      ? allSuggestedHazards 
      : getMandatoryHazardsForProduct('', actualProductName).suggestedHazards

    // Check SAHCODHA for the main product name as well
    const mainProductSahcodha = requiresSAHCODHAVerification('', actualProductName)
    if (mainProductSahcodha.requires) {
      results.sahcodhaDetected = true
      results.hazards = [...new Set([...results.hazards, ...mainProductSahcodha.hazards])]
    }
    
    const isSAHCODHA = results.sahcodhaDetected
    
    // ── CHECK FCE/SID REQUIREMENT ────────────────────────────────
    // Detect if product requires FCE (Food Canning Establishment) registration
    // and SID (Submission Identifier) for LACF/Acidified Foods per 21 CFR 108
    const fceSidCheck = requiresFceSid(
      reportProductCategory || profile?.category || '', 
      actualProductName
    )

    // ── Determine verification type based on product risk ───────
    // SAHCODHA: Annual onsite audit required
    // Non-SAHCODHA: Flexible verification (sampling, records review, etc.)
    const verificationType = isSAHCODHA ? 'annual_onsite_audit' : 'risk_based_verification'
    const verificationFrequency = isSAHCODHA ? 'annually' : 'as_needed_based_on_risk'

    // ── REMOVED: Auto supplier mapping ─────────────────────────────
    // Logic cũ sai: Không thể auto-map supplier từ label scan vì:
    // 1. Label chỉ chứa country of origin, KHÔNG phải supplier info
    // 2. Người scan có thể là importer HOẶC supplier - logic cũ giả định luôn là importer
    // 3. Supplier phải được assign thủ công sau khi có đầy đủ thông tin
    // 
    // Workflow đúng:
    // - Label scan → Tạo hazard analysis DRAFT (không có supplier)
    // - User chọn/tạo supplier thủ công sau
    // - Hoặc supplier tự claim sản phẩm của mình
    let supplierId: string | null = null
    // supplierId sẽ được set thủ công bởi user sau khi review

    // ── Extract additional data from audit report ────────────────
    const brandName = auditReportData?.brandName || ''
    const ingredientList = auditReportData?.ingredientList || ''
    const allergenDeclaration = auditReportData?.allergenDeclaration || ''
    const labelImageUrl = auditReportData?.labelImageUrl || ''
    const netWeight = auditReportData?.netWeight || ''
    const reportProductCategory = auditReportData?.productCategory || ''
    
    // Parse allergens from declaration if available
    const declaredAllergens = allergenDeclaration 
      ? allergenDeclaration.toLowerCase().split(/[,;]/).map((a: string) => a.trim()).filter(Boolean)
      : []
      
    // Build enhanced product description with ingredient summary
    const buildProductDescription = (): string => {
      // Primary: Brand - Product Name (Net Weight)
      let primary = ''
      if (brandName) {
        primary = `${brandName} - ${actualProductName}`
      } else {
        primary = actualProductName
      }
        
      // Append net weight inline with primary if available
      if (netWeight) {
        primary += ` (${netWeight})`
      }
      
      const parts: string[] = [primary]
      
      // Add truncated ingredient list (first 3 ingredients) if available
      if (ingredientList) {
        const ingredients = ingredientList.split(/[,;]/).map((i: string) => i.trim()).filter(Boolean)
        if (ingredients.length > 0) {
          const preview = ingredients.slice(0, 3).join(', ')
          const suffix = ingredients.length > 3 ? '...' : ''
          parts.push(`Ingredients: ${preview}${suffix}`)
        }
      }
      
      parts.push('Auto-detected from label scan.')
      return parts.join('. ')
    }
      
    // Add allergen hazards from declaration
    const allergenHazardsFromDeclaration = declaredAllergens.map((allergen: string) => ({
      hazard_name: allergen.charAt(0).toUpperCase() + allergen.slice(1),
      description: `Declared allergen from label: ${allergen}`,
      severity: 'high',
      likelihood: 'certain',
      is_reasonably_foreseeable: true,
      control_measure: 'Supplier allergen control program, segregation, cleaning validation',
      justification: `Declared on product label allergen statement`,
    }))
    
    // ── Create draft hazard analysis ────────────────────────────
    // FIXED: Use actualProductName (from PDP) not ingredientName (from ingredient list)
    // FIXED: supplier_id = null - sẽ được assign thủ công sau
    const hazardAnalysisData = {
      importer_user_id: currentUserId,
      analyzed_by: currentUserId, // Required NOT NULL field
      supplier_id: null, // FIXED: Không auto-map supplier - phải assign thủ công
      product_name: actualProductName,
      product_category: reportProductCategory || profile?.category || 'other',
      product_description: buildProductDescription(),
      fda_product_code: null,
      intended_use: 'food_ingredient',
      
      // Additional mapped data from audit report
      brand_name: brandName || null,
      ingredient_list: ingredientList || null,
      allergen_declaration: allergenDeclaration || null,
      net_weight: netWeight || null,
      label_image_url: labelImageUrl || null,
      
      // Hazards - with full evidence data
      biological_hazards: suggestedHazards
        .filter(h => h.hazard_type === 'biological')
        .map(h => ({
          hazard_name: h.hazard_name,
          description: h.description,
          severity: h.severity,
          likelihood: 'likely',
          is_reasonably_foreseeable: h.is_reasonably_foreseeable,
          control_measure: h.control_measure,
          verification_method: h.verification_method,
          monitoring_frequency: h.monitoring_frequency,
          justification: `Auto-suggested based on product category: ${profile?.category || 'detected ingredient'}`,
          // Evidence fields
          cfr_reference: h.cfr_reference,
          fda_import_alert: h.fda_import_alert,
          fda_import_alert_url: h.fda_import_alert_url,
          warning_letters: h.warning_letters,
          outbreak_history: h.outbreak_history,
          scientific_references: h.scientific_references,
          fda_guidance_url: h.fda_guidance_url,
          country_risk_note: h.country_risk_note,
          source: h.source,
        })),
      chemical_hazards: suggestedHazards
        .filter(h => h.hazard_type === 'chemical')
        .map(h => ({
          hazard_name: h.hazard_name,
          description: h.description,
          severity: h.severity,
          likelihood: 'likely',
          is_reasonably_foreseeable: h.is_reasonably_foreseeable,
          control_measure: h.control_measure,
          justification: `Auto-suggested based on product category: ${profile?.category || 'detected ingredient'}`,
        })),
      allergen_hazards: [
        // Allergens from product hazard profile
        ...suggestedHazards
          .filter(h => h.hazard_type === 'allergen')
          .map(h => ({
            hazard_name: h.hazard_name,
            description: h.description,
            severity: h.severity,
            likelihood: 'likely',
            is_reasonably_foreseeable: h.is_reasonably_foreseeable,
            control_measure: h.control_measure,
            justification: `Auto-suggested for allergen: ${h.hazard_name}`,
          })),
        // Allergens declared on the label
        ...allergenHazardsFromDeclaration,
      ],
      physical_hazards: suggestedHazards
        .filter(h => h.hazard_type === 'physical')
        .map(h => ({
          hazard_name: h.hazard_name,
          description: h.description,
          severity: h.severity,
          likelihood: 'likely',
          is_reasonably_foreseeable: h.is_reasonably_foreseeable,
          control_measure: h.control_measure,
          justification: 'Auto-suggested physical hazard',
        })),
      
      // SAHCODHA & Verification Requirements
      is_sahcodha_product: isSAHCODHA,
      sahcodha_category: isSAHCODHA ? mainProductSahcodha.category : null,
      requires_annual_audit: isSAHCODHA,
      
      // FCE/SID Requirements (LACF/Acidified Foods per 21 CFR 108)
      requires_fce_sid: fceSidCheck.required,
      fce_sid_regulation: fceSidCheck.required ? fceSidCheck.regulation : null,
      fce_sid_reason: fceSidCheck.required ? fceSidCheck.reason : null,
      fce_sid_category: fceSidCheck.category,
      
      // Verification type (applies to ALL imported products per 21 CFR 1.506)
      verification_type: verificationType,
      verification_frequency: verificationFrequency,
      verification_options: isSAHCODHA 
        ? ['annual_onsite_audit'] // SAHCODHA - only option
        : ['sampling_testing', 'records_review', 'onsite_audit', 'other_appropriate'], // Non-SAHCODHA - flexible
      fsvp_required: true, // ALL imported products require FSVP
      
      // Metadata
      status: 'draft',
      linked_audit_report_id: reportId,
      auto_generated: true,
      auto_generated_from: 'label_scan',
      analysis_date: new Date().toISOString(),
    }
    
    const { data: hazardAnalysis, error: haError } = await supabase
      .from('fsvp_hazard_analyses')
      .insert(hazardAnalysisData)
      .select('id')
      .single()

    if (haError) {
      console.error('[link-from-label] Failed to create hazard analysis:', haError)
      // Return error to client instead of silently continuing
      return NextResponse.json(
        { 
          error: 'Failed to create hazard analysis', 
          details: haError.message,
          code: haError.code,
          hint: haError.hint 
        },
        { status: 500 }
      )
    }

    results.hazardAnalysesCreated.push(hazardAnalysis.id)

    // ── REMOVED: AUTO-CREATE PRODUCT IN CATALOG ───────────────────────────
    // Logic cũ sai vì:
    // 1. Không thể tạo product mà không biết supplier là ai
    // 2. fsvp_products yêu cầu supplier_id - không thể là null
    // 3. Product + Label sẽ được tạo SAU khi user assign supplier thủ công
    //
    // Workflow đúng:
    // - Label scan → Tạo hazard analysis DRAFT (chứa thông tin trích xuất từ label)
    // - User review và chọn/tạo supplier
    // - Khi assign supplier → tự động tạo product và label version
    let productId: string | null = null
    let labelId: string | null = null
    
    // Product và label sẽ được tạo khi user assign supplier thủ công
    // Xem: /api/fsvp/hazard-analyses/[id]/assign-supplier

    // ── REMOVED: Update supplier with SAHCODHA flag ────────────
    // supplierId luôn null ở đây - SAHCODHA flag sẽ được set khi assign supplier
    // Xem: /api/fsvp/hazard-analyses/[id]/assign-supplier

    // ── Send notification email ─────────────────────────────────
    if (results.hazardAnalysesCreated.length > 0) {
      try {
        const { data: authUser } = await adminClient.auth.admin.getUserById(currentUserId)
        
        if (authUser?.user?.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', currentUserId)
            .maybeSingle()

          const lang = (profile?.language as 'vi' | 'en') || 'en'

          const emailContent = fsvpLinkedFromLabelTemplate({
            email: authUser.user.email,
            productName,
            reportId,
            supplierId: null, // FIXED: Không có supplier được auto-link
            hazardAnalysisId: results.hazardAnalysesCreated[0],
            detectedProducts: detectedIngredients.map((i: any) => typeof i === 'string' ? i : i.name),
            isSAHCODHA: results.sahcodhaDetected,
            hazards: results.hazards,
            lang,
          })

          await sendEmail({
            to: authUser.user.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })

          results.emailSent = true
        }
      } catch (emailErr) {
        console.error('[link-from-label] Failed to send email:', emailErr)
      }
    }

    // ── Link to audit report ────────────────────────────────────
    if (results.hazardAnalysesCreated.length > 0) {
      // Update audit report with FSVP link - ignore errors if columns don't exist
      const { error: updateError } = await supabase
        .from('audit_reports')
        .update({
          fsvp_hazard_analyses: results.hazardAnalysesCreated,
          has_fsvp_link: true,
          fsvp_sahcodha_detected: results.sahcodhaDetected,
        })
        .eq('id', reportId)
      
      if (updateError) {
        console.log('[link-from-label] Could not update audit_reports (columns may not exist):', updateError.message)
      }
    }

return NextResponse.json({
      success: true,
      message: results.sahcodhaDetected 
        ? 'SAHCODHA product detected. Draft hazard analysis created. Please assign a supplier to complete the record.'
        : fceSidCheck.required
        ? `${fceSidCheck.regulation} product detected. FCE/SID registration required. Please assign a supplier with valid FCE number.`
        : 'Imported product detected. Draft hazard analysis created. Please assign a supplier to complete the FSVP record.',
      fsvpRequired: true, // Always true for imported products
      verificationType: results.sahcodhaDetected ? 'annual_onsite_audit' : 'risk_based',
      requiresSupplierAssignment: true, // FIXED: Luon yeu cau assign supplier thu cong
      // FCE/SID requirement info
      requiresFceSid: fceSidCheck.required,
      fceSidRegulation: fceSidCheck.regulation,
      fceSidReason: fceSidCheck.reason,
      fceSidRegistrationInfo: fceSidCheck.required ? fceSidCheck.registrationInfo : null,
      results: {
        ...results,
        productId: null, // FIXED: Product chua duoc tao - can assign supplier truoc
        labelId: null,   // FIXED: Label chua duoc tao - can assign supplier truoc
        productCreated: false,
        labelVersionCreated: false,
        fceSidRequired: fceSidCheck.required,
        fceSidCategory: fceSidCheck.category,
      },
    })

  } catch (error: any) {
    console.error('[link-from-label] Error:', error)
    return NextResponse.json(
      { error: 'Failed to link FSVP records', details: error.message },
      { status: 500 }
    )
  }
}
