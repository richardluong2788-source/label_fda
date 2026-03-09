import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmail, quotaExhaustedTemplate, lowCreditsTemplate } from '@/lib/email'
import { updateJobProgress, completeJob } from '@/lib/analysis-queue'
import { NutritionValidator } from '@/lib/nutrition-validator'
import { VisualGeometryAnalyzer } from '@/lib/visual-geometry-analyzer'
import { DimensionConverter } from '@/lib/dimension-converter'
import { ContrastChecker } from '@/lib/contrast-checker'
import { ClaimsValidator } from '@/lib/claims-validator'
import { getRelevantContext, getImportAlertContext } from '@/lib/embedding-utils'
import { checkKnowledgeBaseStatus } from '@/lib/knowledge-base-check'
import { analyzeLabel } from '@/lib/ai-vision-analyzer'
import { ViolationToCFRMapper } from '@/lib/violation-to-cfr-mapper'
import { SmartCitationFormatter } from '@/lib/smart-citation-formatter'
import { getPackagingFormat, getResolvedRules, getExemptFields, buildPackagingFormatPrompt, canUseSimplifiedLabeling, getMinFontSize, mapProductTypeToDomain, type PackagingFormatId, type ProductDomain } from '@/lib/packaging-format-config'
import { detectPanelFormatType } from '@/lib/column-type-classifier'
import type { Citation } from '@/lib/types'

/**
 * POST /api/analyze/process/run
 * ──────────────────────────────
 * Internal-only endpoint: performs the full Vision + RAG + GPT analysis
 * for a queued job. Called exclusively by /api/analyze/process with a
 * trusted x-process-token header.
 *
 * This route contains the same heavy logic as the original /api/analyze,
 * but:
 *  - It uses the admin Supabase client (no user cookie required)
 *  - It reads job context from custom headers (user_id, report_id, job_id)
 *  - It updates analysis_queue.progress at each step
 */
export const maxDuration = 300

export async function POST(request: Request) {
  // ── Parse URL query params (survive redirects even when body/headers are stripped) ───
  const url = new URL(request.url)
  const queryToken = url.searchParams.get('_token') ?? ''

  // ── Parse body (may be empty if redirect stripped it) ───
  const body = await request.json().catch(() => ({}))
  
  // ── Internal auth guard ────────────────────────────────────
  // Priority: query param > body > header (query params always survive redirects)
  const processTokenHeader = request.headers.get('x-process-token') ?? ''
  const processTokenBody = (body._processToken as string) ?? ''
  const processToken = queryToken || processTokenBody || processTokenHeader
  const expectedToken = process.env.PROCESS_SECRET_TOKEN ?? ''
  
  if (expectedToken && processToken !== expectedToken) {
    console.error('[process/run] Auth failed: token mismatch', {
      hasQuery: !!queryToken,
      hasBody: !!processTokenBody,
      hasHeader: !!processTokenHeader,
      expectedLen: expectedToken.length,
    })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Read job context from headers OR body
  const jobId = request.headers.get('x-internal-job-id') || (body._internal_job_id as string) || ''
  const userId = request.headers.get('x-internal-user-id') || (body._internal_user_id as string) || ''
  const reportId = request.headers.get('x-internal-report-id') || (body.reportId as string) || ''

  console.log('[v0] run route started:', { jobId, userId: userId ? 'set' : 'empty', reportId })

  if (!jobId || !userId || !reportId) {
    return NextResponse.json({ error: 'Missing internal context' }, { status: 400 })
  }

  const { phase = 'full', visionDataConfirmed = false } = body

  const supabase = createAdminClient()

  try {
    // ── Fetch report ───────────────────────────────────────────
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // ── Fetch user language ────────────────────────────────────
    const { data: userLangProfile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .maybeSingle()
    const userLang = (userLangProfile?.language as 'vi' | 'en') || 'en'

    // ── Resolve packaging / domain ─────────────────────────────
    const packagingFormat = report.packaging_format as PackagingFormatId | undefined
    let productDomain: ProductDomain = mapProductTypeToDomain(report.product_type || report.product_category)

    // ── Step 1: Vision analysis ────────────────────────────────
    await updateJobProgress(jobId, 'Extracting text from image', 15)

    let visionResult: any
    let totalTokensUsed = 0
    const isManualEntry = report.label_image_url === 'manual-entry'

    if (isManualEntry) {
      visionResult = {
        nutritionFacts: report.nutrition_facts || [],
        textElements: {
          brandName:   { text: '', boundingBox: { confidence: 1.0 } },
          productName: { text: '', boundingBox: { confidence: 1.0 } },
          netQuantity: { text: '', boundingBox: { confidence: 1.0 } },
          allText: `${report.ingredient_list || ''} ${report.allergen_declaration || ''}`,
        },
        detectedClaims: [],
        ingredients: report.ingredient_list ? [report.ingredient_list] : [],
        allergens: report.allergen_declaration ? report.allergen_declaration.split(',').map((a: string) => a.trim()) : [],
        warnings: [],
        detectedLanguages: ['English'],
        tokensUsed: 0,
        overallConfidence: 1.0,
      }
    } else {
      try {
        const labelImages = report.label_images || [{ type: 'main', url: report.label_image_url }]
        const packagingFormatCtx = packagingFormat ? buildPackagingFormatPrompt(packagingFormat, productDomain) : undefined
        const totalImages = labelImages.length

        // PARALLEL Vision calls - process all images simultaneously for ~2-3x speedup
        // Using Promise.allSettled to handle partial failures gracefully - if one image
        // fails, we continue with the others instead of failing the entire analysis.
        await updateJobProgress(jobId, `Analyzing ${totalImages} images in parallel...`, 15)
        
        const visionStartTime = Date.now()
        const visionPromises = labelImages.map(async (img: { type: string; url: string }) => {
          console.log(`[v0] Starting parallel Vision analysis for: ${img.type}`)
          const result = await analyzeLabel(img.url, packagingFormatCtx)
          console.log(`[v0] Completed Vision analysis for: ${img.type} (${result.tokensUsed} tokens)`)
          return { type: img.type, result }
        })
        
        // Use allSettled so one failed image doesn't crash the entire analysis
        const visionSettled = await Promise.allSettled(visionPromises)
        const visionDuration = ((Date.now() - visionStartTime) / 1000).toFixed(1)
        
        // Extract successful results, log failures
        const visionResults: { type: string; result: any }[] = []
        const failedImages: string[] = []
        for (const settled of visionSettled) {
          if (settled.status === 'fulfilled') {
            visionResults.push(settled.value)
          } else {
            // Log the failure but continue with other images
            console.error('[v0] Vision analysis failed for one image:', settled.reason?.message || settled.reason)
            failedImages.push(settled.reason?.message || 'Unknown error')
          }
        }
        
        console.log(`[v0] Vision analyses: ${visionResults.length}/${totalImages} succeeded in ${visionDuration}s (parallel)`)
        if (failedImages.length > 0) {
          console.warn(`[v0] ${failedImages.length} image(s) failed:`, failedImages)
        }
        
        await updateJobProgress(jobId, `Vision analysis complete (${visionResults.length}/${totalImages} images)`, 27)

        const imageAnalyses: any = {}
        for (const { type, result } of visionResults) {
          imageAnalyses[type] = result
          totalTokensUsed += result.tokensUsed
        }

        const pdpData         = imageAnalyses.pdp || imageAnalyses.main || {}
        const nutritionData   = imageAnalyses.nutrition || imageAnalyses.supplementFacts || imageAnalyses.drugFacts || imageAnalyses.main || {}
        const ingredientsData = imageAnalyses.ingredients || imageAnalyses.inciIngredients || imageAnalyses.main || {}
        const supplementData  = imageAnalyses.supplementFacts || {}
        const drugData        = imageAnalyses.drugFacts || {}
        const inciData        = imageAnalyses.inciIngredients || {}

        visionResult = {
          nutritionFacts: nutritionData.nutritionFacts || pdpData.nutritionFacts || [],
          textElements: {
            brandName:   pdpData.textElements?.brandName   || { text: '', boundingBox: { confidence: 0 } },
            productName: pdpData.textElements?.productName || { text: '', boundingBox: { confidence: 0 } },
            netQuantity: pdpData.textElements?.netQuantity || { text: '', boundingBox: { confidence: 0 } },
            allText: [
              pdpData.textElements?.allText,
              nutritionData.textElements?.allText,
              ingredientsData.textElements?.allText,
              supplementData.textElements?.allText,
              drugData.textElements?.allText,
              inciData.textElements?.allText,
            ].filter(Boolean).join(' '),
          },
          detectedClaims:    [...(pdpData.detectedClaims || []), ...(nutritionData.detectedClaims || [])],
          ingredients:       ingredientsData.ingredients || inciData.ingredients || pdpData.ingredients || [],
          allergens:         ingredientsData.allergens || pdpData.allergens || [],
          warnings:          [...(pdpData.warnings || []), ...(nutritionData.warnings || []), ...(ingredientsData.warnings || []), ...(drugData.warnings || [])],
          detectedLanguages: pdpData.detectedLanguages || ['English'],
          tokensUsed:        totalTokensUsed,
          overallConfidence: Math.max(pdpData.overallConfidence || 0, nutritionData.overallConfidence || 0, ingredientsData.overallConfidence || 0),
          validationWarnings: [
            ...(pdpData.validationWarnings || []).map((w: string) => `[PDP] ${w}`),
            ...(nutritionData.validationWarnings || []).map((w: string) => `[Nutrition] ${w}`),
            ...(ingredientsData.validationWarnings || []).map((w: string) => `[Ingredients] ${w}`),
          ].filter(Boolean),
          // CRITICAL: Include multi-column nutrition facts data from nutrition image
          isMultiColumnNutrition: nutritionData.isMultiColumnNutrition || pdpData.isMultiColumnNutrition || false,
          nutritionFactsColumns: nutritionData.nutritionFactsColumns || pdpData.nutritionFactsColumns || [],
        }

        totalTokensUsed = visionResult.tokensUsed

        // Auto-detect product domain from vision
        const userChoseProductType = !!(report.product_type || report.product_category)
        const allTextLow = visionResult.textElements.allText?.toLowerCase() || ''
        if (!userChoseProductType) {
          const isInfantFormula = allTextLow.includes('infant formula') || (allTextLow.includes('infant') && allTextLow.includes('formula'))
          if (isInfantFormula) { (productDomain as any) = 'infant_formula' }
          else if (allTextLow.includes('drug facts') || allTextLow.includes('active ingredient')) { (productDomain as any) = 'drug_otc' }
          else if (allTextLow.includes('supplement facts')) { (productDomain as any) = 'supplement' }
          else if (!allTextLow.includes('nutrition facts') && !allTextLow.includes('calories') && allTextLow.includes('inci')) { (productDomain as any) = 'cosmetic' }
        }
      } catch (error: any) {
        const isValidationError = error.isValidationError === true
        await supabase
          .from('audit_reports')
          .update({ status: 'error', error_message: `AI analysis failed: ${error.message}` })
          .eq('id', reportId)
        return NextResponse.json({
          error: isValidationError ? 'vision_validation_failed' : 'vision_system_error',
          message: error.message,
        }, { status: isValidationError ? 422 : 503 })
      }
    }

    // ── Step 2: Knowledge base + RAG ───────────────────────────
    await updateJobProgress(jobId, 'Searching regulatory database (RAG)', 30)

    const kbStatus = await checkKnowledgeBaseStatus()
    if (!kbStatus.available) {
      await supabase.from('audit_reports').update({ status: 'kb_unavailable' }).eq('id', reportId)
      return NextResponse.json({ error: 'knowledge_base_empty' }, { status: 503 })
    }

    const productCategory = report.product_category || report.product_type || productDomain || 'food'
    const labelText = visionResult.textElements.allText
    
    // Merge manufacturerInfo from Vision extraction AND user-provided report data
    // Vision extraction takes priority for fields it can extract from the label
    const reportManufacturerInfo = report.manufacturer_info || {}
    const visionManufacturerInfo = visionResult.manufacturerInfo || {}
    const manufacturerInfo = {
      company_name: visionManufacturerInfo.companyName || reportManufacturerInfo.company_name || '',
      country_of_origin: visionManufacturerInfo.countryOfOrigin || reportManufacturerInfo.country_of_origin || '',
      address: visionManufacturerInfo.address || reportManufacturerInfo.address || ''
    }
    
    console.log('[v0] ManufacturerInfo for Import Alert matching:', {
      fromVision: visionManufacturerInfo,
      fromReport: reportManufacturerInfo,
      merged: manufacturerInfo
    })

    // OPTIMIZED: getRelevantContext already returns regulations + warnings + recalls
    // with a SINGLE shared embedding call. No need to call separate getWarningLetterContext
    // and getRecallContext which would generate duplicate embeddings.
    const [ragContext, importAlertContext] = await Promise.all([
      getRelevantContext(labelText, productCategory),
      getImportAlertContext(labelText, productCategory, manufacturerInfo.company_name, manufacturerInfo.country_of_origin),
    ])

    // Split RAG results by document_type for separate prompt injection
    const regulatoryContext = ragContext
    const warningLetterContext = ragContext.filter(ctx => 
      ctx.metadata?.document_type === 'FDA Warning Letter'
    )
    const recallContext = ragContext.filter(ctx => 
      ctx.metadata?.document_type === 'FDA Recall'
    )

    const regulationsOnly = regulatoryContext.filter(ctx => {
      const docType = (ctx.metadata?.document_type || '').toLowerCase()
      const cat     = (ctx.metadata?.category      || '').toLowerCase()
      const src     = (ctx.metadata?.source        || '').toLowerCase()
      const reg     = (ctx.metadata?.regulation    || '').toLowerCase()
      if (docType === 'fda warning letter') return false
      if (docType === 'fda recall')         return false
      if (docType === 'cbp regulation')     return false
      if (cat === 'import_compliance')      return false
      if (src.includes('19 cfr'))           return false
      if (reg.includes('19 cfr'))           return false
      return true
    })

    const realCitations: Citation[] = regulationsOnly.map(ctx => ({
      regulation_id: ctx.metadata?.regulation_id || ctx.section,
      section:       ctx.section,
      text:          ctx.content.substring(0, 200) + '...',
      source:        ctx.metadata?.source || 'FDA Regulations',
      relevance_score: ctx.similarity,
    }))

    // ── Step 2.5: Smart violation detection ───────────────────
    await updateJobProgress(jobId, 'Analyzing nutritional information', 45)

    // PDP area
    let panelAreaSquareInches = 20
    let resolvedWidthCm: number | null = null
    let resolvedHeightCm: number | null = null

    if (report.pdp_dimensions?.width && report.pdp_dimensions?.height) {
      const unit = report.pdp_dimensions.unit || 'in'
      const rawW = report.pdp_dimensions.width
      const rawH = report.pdp_dimensions.height
      if (unit === 'cm') {
        resolvedWidthCm = rawW; resolvedHeightCm = rawH
        panelAreaSquareInches = (rawW / 2.54) * (rawH / 2.54)
      } else {
        resolvedWidthCm = rawW * 2.54; resolvedHeightCm = rawH * 2.54
        panelAreaSquareInches = rawW * rawH
      }
    } else if (report.physical_width_cm && report.physical_height_cm) {
      resolvedWidthCm = report.physical_width_cm; resolvedHeightCm = report.physical_height_cm
      panelAreaSquareInches = (report.physical_width_cm / 2.54) * (report.physical_height_cm / 2.54)
    }

    const formatConfig     = packagingFormat ? getPackagingFormat(packagingFormat) : null
    const exemptFields     = packagingFormat ? getExemptFields(packagingFormat, productDomain) : []
    const isSimplifiedAllowed = packagingFormat ? canUseSimplifiedLabeling(packagingFormat, panelAreaSquareInches, productDomain) : false
    const minFontSize      = packagingFormat ? getMinFontSize(packagingFormat, panelAreaSquareInches, productDomain) : 6
    const packagingFormatPrompt = packagingFormat ? buildPackagingFormatPrompt(packagingFormat, productDomain) : ''

    const detectedViolations = ViolationToCFRMapper.detectViolations(
      visionResult, panelAreaSquareInches, regulationsOnly, packagingFormat, productDomain
    )

    // ── Step 3: Nutrition + geometry + claims ──────────────────
    await updateJobProgress(jobId, 'Validating FDA rounding rules', 60)

    const extractedNutritionFacts = visionResult.nutritionFacts
    const nutritionValidation = NutritionValidator.validateNutritionFacts(extractedNutritionFacts, productDomain)

    // Multi-column Nutrition Facts validation (21 CFR §101.9(b)(12))
    // CRITICAL: This validation was implemented but never called - now active
    const isMultiColumn = visionResult.isMultiColumnNutrition || (visionResult.nutritionFactsColumns?.length ?? 0) >= 2
    let multiColumnValidation: ReturnType<typeof NutritionValidator.validateMultiColumnNutritionFacts> | null = null
    
    // Detailed logging for multi-column detection debugging
    console.log('[v0] Multi-column detection check:', {
      isMultiColumnNutrition: visionResult.isMultiColumnNutrition,
      nutritionFactsColumnsLength: visionResult.nutritionFactsColumns?.length ?? 0,
      computedIsMultiColumn: isMultiColumn,
      columnNames: visionResult.nutritionFactsColumns?.map(c => c.columnName) ?? [],
    })
    
    if (isMultiColumn && visionResult.nutritionFactsColumns?.length >= 2) {
      console.log(`[v0] Multi-column Nutrition Facts CONFIRMED: ${visionResult.nutritionFactsColumns.length} columns detected`)
      console.log('[v0] Column details:', visionResult.nutritionFactsColumns.map(c => ({
        name: c.columnName,
        servingSize: c.servingSize,
        nutritionFactsCount: c.nutritionFacts?.length ?? 0,
      })))
      // Debug: Log full nutrient names per column to verify Riboflavin/Niacin extraction
      console.log('[v0] Column nutrients detail:', 
        visionResult.nutritionFactsColumns.map(c => ({
          name: c.columnName,
          nutrients: c.nutritionFacts?.map(n => n.name) ?? []
        }))
      )
      multiColumnValidation = NutritionValidator.validateMultiColumnNutritionFacts(
        visionResult.nutritionFactsColumns,
        productDomain
      )
      console.log(`[v0] Multi-column validation result: isValid=${multiColumnValidation.isValid}, errors=${multiColumnValidation.errors.length}, warnings=${multiColumnValidation.warnings.length}`)
    }

    const textElements = {
      brandName:           visionResult.textElements.brandName,
      productName:         visionResult.textElements.productName,
      netQuantity:         visionResult.textElements.netQuantity,
      panelAreaSquareInches,
    }
    const geometryViolations = VisualGeometryAnalyzer.analyzeLabel(textElements)

    let conversionResult
    let dimensionViolations: any[] = []
    if (resolvedWidthCm && resolvedHeightCm && report.pixel_width && report.pixel_height) {
      conversionResult = DimensionConverter.calculateConversionRatios(
        { width: resolvedWidthCm, height: resolvedHeightCm, unit: 'cm' },
        { width: report.pixel_width, height: report.pixel_height }
      )
      const netQtyVal = DimensionConverter.validateTextSize(25, conversionResult, 'net_quantity')
      if (!netQtyVal.isValid && netQtyVal.violation) {
        dimensionViolations.push({
          category: 'Dimension Compliance',
          severity: 'critical' as const,
          description: netQtyVal.violation,
          regulation_reference: netQtyVal.regulation,
          suggested_fix: `Increase font size to at least ${(netQtyVal.requiredInches * conversionResult.pixelsPerInch).toFixed(0)} pixels`,
          citations: [],
          confidence_score: 1.0,
        })
      }
    }

    // Contrast checks
    await updateJobProgress(jobId, 'Checking ingredient compliance', 75)

    const contrastViolations: any[] = []
    const elementsToCheck = [
      { name: 'Brand Name',   element: visionResult.textElements.brandName,   role: 'brand'       as const },
      { name: 'Product Name', element: visionResult.textElements.productName, role: 'brand'       as const },
      { name: 'Net Quantity', element: visionResult.textElements.netQuantity, role: 'regulatory'  as const },
    ]
    const seenColorPairs = new Set<string>()
    for (const { name, element, role } of elementsToCheck) {
      if (!element?.colors) continue
      const isDefaultFallback = element.colors.foreground?.toUpperCase() === '#000000' && element.colors.background?.toUpperCase() === '#FFFFFF'
      if (!element.text?.trim()) continue
      if (element.colors.isFallback || (isDefaultFallback && element.boundingBox?.confidence < 0.7)) continue
      const pairKey = `${element.colors.foreground}/${element.colors.background}`.toLowerCase()
      if (seenColorPairs.has(pairKey)) {
        const existing = contrastViolations.find(cv =>
          cv.colors?.foreground?.toLowerCase() === element.colors.foreground.toLowerCase() &&
          cv.colors?.background?.toLowerCase() === element.colors.background.toLowerCase()
        )
        if (existing) existing.description = existing.description.replace(/^([^:]+):/, `$1, ${name}:`)
        continue
      }
      seenColorPairs.add(pairKey)
      try {
        const foreground = ContrastChecker.hexToRgb(element.colors.foreground)
        const background = ContrastChecker.hexToRgb(element.colors.background)
        const fontSizePt = element.fontSize || 0
        const isBold = element.fontWeight === 'bold' || element.fontWeight === '700'
        const textSize: 'normal' | 'large' = (fontSizePt >= 24 || (isBold && fontSizePt >= 18)) ? 'large' : 'normal'
        const contrastResult = ContrastChecker.validateContrast(foreground, background, textSize, role)
        
        // FIX: Brand/decorative elements with large text and ratio >= 3:1 are COMPLIANT
        // WCAG AA for large text requires 3:1 minimum. Brand design elements with 
        // intentionally low contrast are acceptable as long as they meet this threshold.
        // 21 CFR does NOT specify exact contrast ratios - only "conspicuous/legible".
        // Only flag brand elements if ratio is critically low (< 2.5:1).
        const isBrandElement = role === 'brand'
        const isLargeText = textSize === 'large'
        const ratioMeetsLargeTextMin = contrastResult.ratio >= 3.0
        const ratioIsCriticallyLow = contrastResult.ratio < 2.5
        
        // Skip violation for brand elements that meet minimum large text threshold
        if (isBrandElement && isLargeText && ratioMeetsLargeTextMin) {
          // This is an intentional design choice - brand graphics are exempt from strict contrast
          continue
        }
        
        // Only create violation if truly problematic
        if (!contrastResult.isReadable || (isBrandElement && ratioIsCriticallyLow)) {
          // IMPORTANT: Contrast checks are DESIGN RECOMMENDATIONS, not FDA violations
          // FDA 21 CFR does NOT specify exact contrast ratios - only "conspicuous and legible"
          // WCAG 3:1 is a WEB ACCESSIBILITY standard, not an FDA standard
          // Therefore: always severity 'info', and mark as design recommendation (not CFR violation)
          const actualSeverity = 'info' as const // Never 'warning' - this is not a CFR violation
          
          contrastViolations.push({
            type: 'contrast',
            severity: actualSeverity,
            // Mark this as a design recommendation, NOT a CFR violation
            // This will be excluded from risk score calculation
            is_design_recommendation: true,
            exclude_from_risk_score: true,
            description: isBrandElement 
              ? `${name}: Tỷ lệ tương phản ${contrastResult.ratio.toFixed(2)}:1 thấp hơn khuyến nghị. Đây có thể là thiết kế có chủ đích của thương hiệu.`
              : `${name}: Tỷ lệ tương phản ${contrastResult.ratio.toFixed(2)}:1 thấp hơn khuyến nghị về độ dễ đọc.`,
            ratio: contrastResult.ratio,
            requiredMinRatio: textSize === 'large' ? 3 : 4.5,
            textSize,
            elementRole: role,
            // Vietnamese recommendation
            recommendation: `Tỷ lệ hiện tại ${contrastResult.ratio.toFixed(2)}:1 — khuyến nghị tăng lên ít nhất 3:1 để dễ đọc hơn`,
            colors: { foreground: element.colors.foreground, background: element.colors.background },
            // Clarify this is NOT an FDA requirement
            regulation_note: 'Khuyến nghị thiết kế — FDA không quy định tỷ lệ tương phản cụ thể',
          })
        }
      } catch {}
    }

    // Claims
    const claimViolations = ClaimsValidator.validateClaims(
      labelText + ' ' + visionResult.detectedClaims.join(' '),
      productDomain as import('@/lib/claims-validator').ProductDomain
    )

    // Multi-language
    let multiLanguageIssues = null
    const detectedLanguages = visionResult.detectedLanguages || []
    if (detectedLanguages.length > 1 || report.has_foreign_language) {
      const missingTranslations = detectedLanguages.length === 1 && report.has_foreign_language
        ? ['Required information may not be translated to all declared languages']
        : []
      if (missingTranslations.length > 0 || detectedLanguages.includes('Vietnamese')) {
        multiLanguageIssues = {
          hasIssue: missingTranslations.length > 0,
          description: missingTranslations.length > 0 ? 'Some mandatory information may be missing translations' : 'Multi-language label detected - verify all mandatory fields are translated',
          detectedLanguages,
          missingFields: missingTranslations,
        }
      }
    }

    const productType = report.product_category?.includes('supplement') ? 'supplement' : 'conventional'
    const hasClaims = claimViolations.length > 0
    const disclaimers = ClaimsValidator.generateRequiredDisclaimers(productType, hasClaims)

    // ── Step 4: Build violations ��──────────────────────────────
    await updateJobProgress(jobId, 'Validating allergen declarations', 85)

    let violations: any[] = []

    // Prepare ingredient context for enhanced analysis
    // Dedupe allergens using CANONICAL names to prevent "Soy" + "Soybeans" duplicates
    const rawAllergens = visionResult.allergens || []
    // Map all variants (Vietnamese, English, abbreviations) to canonical display names
    const allergenCanonicalMap: Record<string, string> = {
      // Soybeans - all variants map to "Soybeans"
      'hạt đậu nành': 'Soybeans', 'đậu nành': 'Soybeans', 'soy': 'Soybeans', 
      'soya': 'Soybeans', 'soybean': 'Soybeans', 'soybeans': 'Soybeans',
      // Milk
      'sữa': 'Milk', 'milk': 'Milk', 'dairy': 'Milk',
      // Wheat  
      'lúa mì': 'Wheat', 'lúa mỳ': 'Wheat', 'wheat': 'Wheat', 'gluten': 'Wheat',
      // Eggs
      'trứng': 'Eggs', 'egg': 'Eggs', 'eggs': 'Eggs',
      // Fish
      'cá': 'Fish', 'fish': 'Fish',
      // Shellfish
      'hải sản có vỏ': 'Shellfish', 'shellfish': 'Shellfish',
      // Tree Nuts
      'các loại hạt': 'Tree Nuts', 'tree nuts': 'Tree Nuts',
      // Peanuts
      'đậu phộng': 'Peanuts', 'lạc': 'Peanuts', 'peanut': 'Peanuts', 'peanuts': 'Peanuts',
      // Sesame
      'mè': 'Sesame', 'vừng': 'Sesame', 'sesame': 'Sesame',
    }
    // Use Set with canonical names to auto-dedupe
    const canonicalAllergenSet = new Set<string>()
    for (const allergen of rawAllergens) {
      const lower = allergen.toLowerCase().trim()
      const canonical = allergenCanonicalMap[lower] || (lower.charAt(0).toUpperCase() + lower.slice(1))
      canonicalAllergenSet.add(canonical)
    }
    const deduplicatedAllergens = Array.from(canonicalAllergenSet)
    
    const ingredientContext = {
      ingredients: visionResult.ingredients || [],
      ingredientListText: visionResult.ingredients?.join(', ') || '',
      detectedAllergens: deduplicatedAllergens
    }

    // Professional findings from smart mapper
    const professionalFindings = detectedViolations.map((violation, idx) => {
      const relevantReg = regulationsOnly.find(r => r.regulation_id === violation.regulationSection || (r.section && r.section.includes(violation.regulationSection)))
      // Pass ingredient context for enhanced ingredient_order violation analysis
      const finding = SmartCitationFormatter.formatProfessionalFinding(
        violation, 
        relevantReg || null, 
        userLang,
        violation.type === 'ingredient_order' ? ingredientContext : undefined
      )
      return { finding, originalViolation: violation }
    })
    for (const { finding, originalViolation } of professionalFindings) {
      const relevantCitations = realCitations.filter(c => {
        const findingRef = (finding?.cfr_reference || '').toLowerCase()
        const cSection = (c?.section || '').toLowerCase()
        const cRegId = c?.regulation_id || ''
        return findingRef.includes(cSection) || (cRegId + ' ' + cSection).toLowerCase().includes(findingRef.split(' ')[2]?.split('(')[0] || '')
      })
      
      // Determine raw text for "Currently on Label" display
      // Use RAW extracted data, NOT AI-rewritten description
      let rawTextOnLabel: string | undefined
      if (originalViolation?.type === 'ingredient_order') {
        // For ingredient violations, use the raw ingredient list from vision extraction
        rawTextOnLabel = (visionResult.ingredients || []).join(', ')
      } else if (originalViolation?.detectedValue) {
        // For other violations, use the detected value as raw text
        rawTextOnLabel = typeof originalViolation.detectedValue === 'string' 
          ? originalViolation.detectedValue 
          : JSON.stringify(originalViolation.detectedValue)
      }
      
      violations.push({
        category: finding.summary,
        severity: finding.severity,
        description: finding.expert_logic,
        regulation_reference: finding.cfr_reference,
        suggested_fix: finding.remediation,
        citations: relevantCitations.length > 0 ? relevantCitations : realCitations.slice(0, 3),
        confidence_score: finding.confidence_score,
        legal_basis: finding.legal_basis,
        raw_text_on_label: rawTextOnLabel,
      })
    }

    // Warning letter matches
    const labelTextLower = labelText.toLowerCase()
    for (const warning of warningLetterContext) {
      const meta = warning.metadata || {}
      const matchedKeywords = ((meta.problematic_keywords || []) as string[]).filter((kw: string) => labelTextLower.includes(kw.toLowerCase()))
      if (matchedKeywords.length > 0) {
        violations.push({
          category: `Warning Letter Pattern: ${meta.violation_type?.[0] || 'Risky Language'}`,
          severity: meta.severity === 'Critical' ? 'critical' : meta.severity === 'Major' ? 'warning' : 'info',
          description: `Label contains language similar to FDA Warning Letter ${meta.letter_id || ''}. Flagged phrases: "${matchedKeywords.join('", "')}". Original issue: ${meta.why_problematic || 'See warning letter details.'}`,
          regulation_reference: meta.regulation_violated?.[0] || 'See FDA Warning Letter',
          suggested_fix: meta.correction_required || 'Review and revise or remove flagged language to ensure FDA compliance.',
          citations: [{ regulation_id: meta.regulation_violated?.[0] || 'FDA Warning Letter', section: meta.violation_type?.[0] || 'Warning Letter Violation', text: `FDA Warning Letter ${meta.letter_id || ''}: "${meta.problematic_claim || ''}" - ${meta.why_problematic || warning.content.slice(0, 150)}`, source: `FDA Warning Letter ${meta.letter_id || ''} (${meta.issue_date || ''})`, relevance_score: warning.similarity }],
          confidence_score: Math.min(0.95, 0.5 + matchedKeywords.length * 0.15),
          source_type: 'warning_letter',
          warning_letter_id: meta.letter_id,
        })
      }
    }

    // Recall matches - with allergen declaration check to avoid false positives
    // FIX: If recall is about "undeclared allergen" but label HAS proper declaration,
    // this is NOT a violation - it's a false positive from keyword similarity.
    const allTextLower = visionResult.textElements.allText.toLowerCase()
    
    // Comprehensive allergen declaration detection - multiple formats
    const hasAllergenDeclaration = 
      // Standard "Contains:" statement (FALCPA)
      allTextLower.includes('contains:') || 
      allTextLower.includes('contains ') ||
      // Explicit allergen labeling
      allTextLower.includes('allergen') || 
      allTextLower.includes('allergy') ||
      // "May contain" precautionary statements
      allTextLower.includes('may contain') ||
      // Parenthetical allergen disclosure in ingredients
      /\(milk\)|\(egg\)|\(wheat\)|\(soy\)|\(peanut\)|\(tree nut\)|\(fish\)|\(shellfish\)/.test(allTextLower) ||
      // Bold allergen keywords in ingredients (common format)
      /milk,|egg,|wheat,|soy,|peanut,|contains milk|contains egg|contains wheat|contains soy/.test(allTextLower) ||
      // Multi-language support
      allTextLower.includes('contiene:') || // Spanish
      allTextLower.includes('chứa:') // Vietnamese
    
    // ══════════════════════════════════════════════════════════════════
    // RECALL CONTEXT - Market Intelligence (NOT violations)
    // Recalls are informational context, NOT confirmed violations.
    // They do NOT affect risk score. Displayed in separate "Tham khảo" section.
    // ══════════════════════════════════════════════════════════════════
    const recallIntelligence: Array<{
      recall_number: string
      classification: string
      recalling_firm: string
      issue_type: string
      why_recalled: string
      preventive_action: string
      matched_keywords: string[]
      similarity: number
    }> = []
    
    const addedRecallPatterns = new Set<string>()
    
    for (const recall of recallContext) {
      const meta = recall.metadata || {}
      const recallIssueType = (meta.recall_issue_type || '').toLowerCase()
      const whyRecalled = (meta.why_recalled || '').toLowerCase()
      
      // Skip allergen-related recalls if product already has proper allergen declaration
      const isAllergenRecall = recallIssueType.includes('allergen') || 
                               recallIssueType.includes('undeclared') ||
                               whyRecalled.includes('undeclared') ||
                               whyRecalled.includes('allergen')
      
      if (isAllergenRecall && hasAllergenDeclaration) {
        console.log('[v0] Skipping allergen recall - product has proper declaration:', meta.recall_number)
        continue
      }
      
      const matchedKeywords = ((meta.problematic_keywords || []) as string[]).filter((kw: string) => labelTextLower.includes(kw.toLowerCase()))
      if (matchedKeywords.length > 0) {
        // Deduplicate recalls with same issue type
        const patternKey = `${recallIssueType}:${matchedKeywords.sort().join(',')}`
        if (addedRecallPatterns.has(patternKey)) {
          console.log('[v0] Skipping duplicate recall pattern:', patternKey)
          continue
        }
        addedRecallPatterns.add(patternKey)
        
        // Store as market intelligence context, NOT as violation
        recallIntelligence.push({
          recall_number: meta.recall_number || 'N/A',
          classification: meta.recall_classification || 'N/A',
          recalling_firm: meta.recalling_firm || '',
          issue_type: meta.recall_issue_type || 'Risk Factor',
          why_recalled: meta.why_recalled || 'See recall details.',
          preventive_action: meta.preventive_action || 'Review and address flagged elements.',
          matched_keywords: matchedKeywords,
          similarity: recall.similarity,
        })
      }
    }
    
    console.log('[v0] Recall intelligence (market context, not violations):', recallIntelligence.length)

    // Import Alert signals - REAL violations when matching country + category
    // These are NOT just "reference" - they indicate real detention risk at US border
    for (const ia of importAlertContext) {
      const isEntityMatch = ia.match_method === 'entity'
      const activeEntities = (ia.red_list_entities || []).filter((e: any) => e.is_active)
      
      // Check if country matches the alert's scope
      const productCountry = manufacturerInfo.country_of_origin?.toLowerCase().trim() || ''
      const alertCountryScope: string[] = ia.country_scope || []
      const isCountryMatch = alertCountryScope.length === 0 || // Global alert = matches all countries
        (productCountry && alertCountryScope.some(c => 
          c.toLowerCase().trim() === productCountry || 
          productCountry.includes(c.toLowerCase().trim())
        ))
      
      // Severity logic:
      // - Entity match (company on Red List) = CRITICAL
      // - Country + Category match = CRITICAL (real detention risk)
      // - Category match only (no country info) = WARNING (potential risk)
      const isCritical = isEntityMatch || (isCountryMatch && productCountry)
      
      let description: string
      let suggestedFix: string
      
      if (isEntityMatch) {
        description = `DETENTION RISK: Company appears on FDA Import Alert ${ia.alert_number} Red List (${ia.action_type}). Reason: ${ia.reason_for_alert.slice(0, 250)}. ${activeEntities.length > 0 ? `${activeEntities.length} entities currently flagged for automatic detention.` : ''}`
        suggestedFix = 'Contact FDA DIOD (Division of Import Operations and Policy) to submit corrective action documents and request removal from the Red List before shipping.'
      } else if (isCountryMatch && productCountry) {
        description = `BORDER ALERT: Products from ${manufacturerInfo.country_of_origin} in category "${ia.industry_type}" are subject to FDA Import Alert ${ia.alert_number}. Reason: ${ia.reason_for_alert.slice(0, 250)}. This product may face automatic detention without physical examination (DWPE).`
        suggestedFix = `Prepare documentation proving compliance with Import Alert ${ia.alert_number} requirements before shipping. Consider obtaining third-party certification or FDA pre-clearance.`
      } else {
        description = `POTENTIAL RISK: FDA Import Alert ${ia.alert_number} targets ${ia.industry_type} products. Reason: ${ia.reason_for_alert.slice(0, 250)}. Verify your product's country of origin is not affected.`
        suggestedFix = `Review Import Alert ${ia.alert_number} requirements and confirm your product's country of origin is not on the alert's scope list.`
      }
      
      console.log('[v0] Import Alert violation created:', {
        alertNumber: ia.alert_number,
        matchMethod: ia.match_method,
        isEntityMatch,
        isCountryMatch,
        productCountry,
        alertCountryScope,
        severity: isCritical ? 'critical' : 'warning'
      })
      
      violations.push({
        category: `Import Alert: ${ia.action_type} Risk (${ia.alert_number})`,
        severity: isCritical ? 'critical' as const : 'warning' as const,
        description,
        regulation_reference: `FDA Import Alert ${ia.alert_number}`,
        suggested_fix: suggestedFix,
        citations: [],
        confidence_score: isEntityMatch ? 0.95 : (isCountryMatch && productCountry ? 0.85 : 0.60),
        source_type: 'import_alert',
        import_alert_number: ia.alert_number,
        // Additional metadata for UI display
        import_alert_metadata: {
          is_entity_match: isEntityMatch,
          is_country_match: isCountryMatch,
          product_country: productCountry || null,
          alert_country_scope: alertCountryScope,
          action_type: ia.action_type,
          active_entities_count: activeEntities.length
        }
      })
    }

    // Allergen check - use deduplicatedAllergens for clean output
    // Note: allTextLower and hasAllergenDeclaration already defined above in recall section
    if (deduplicatedAllergens.length > 0) {
      const allergenCitation = realCitations.find(c => (c.regulation_id && c.regulation_id.includes('FALCPA')) || (c.section && c.section.toLowerCase().includes('allergen')))
      if (!hasAllergenDeclaration) {
        violations.push({ 
          category: 'Allergen Declaration', 
          severity: 'critical' as const, 
          description: `Detected allergens: ${deduplicatedAllergens.map((a: string) => a.toUpperCase()).join(', ')}. No "Contains:" statement found.`, 
          regulation_reference: allergenCitation?.regulation_id || 'FALCPA Section 203', 
          suggested_fix: `Add "Contains: ${deduplicatedAllergens.join(', ')}" statement immediately after ingredient list.`, 
          citations: allergenCitation ? [allergenCitation] : [], 
          confidence_score: allergenCitation ? allergenCitation.relevance_score : 0.8 
        })
      }
    }

    // Ingredient list presence
    if (visionResult.ingredients.length === 0 && visionResult.textElements.allText.length > 200) {
      const allTextLow = visionResult.textElements.allText.toLowerCase()
      const inlinePattern = /ingredients:\s*[a-z0-9]|contains:\s*[a-z0-9]/i
      if (!inlinePattern.test(visionResult.textElements.allText)) {
        const headingIdx = allTextLow.indexOf('ingredients:') !== -1 ? allTextLow.indexOf('ingredients:') : allTextLow.indexOf('contains:')
        if (headingIdx !== -1) {
          const headingWord = allTextLow.indexOf('ingredients:') !== -1 ? 'ingredients:' : 'contains:'
          const afterHeading = allTextLow.slice(headingIdx + headingWord.length).trim()
          if (afterHeading.replace(/\s+/g, '').length < 3) {
            const ingredientCitation = realCitations.find(c => (c.regulation_id && c.regulation_id.includes('101.4')) || (c.section && c.section.toLowerCase().includes('ingredient')))
            violations.push({ category: 'Ingredient List', severity: 'critical' as const, description: 'Ingredient list heading detected but no ingredient text follows it.', regulation_reference: ingredientCitation?.regulation_id || '21 CFR 101.4', suggested_fix: 'Add a complete ingredient list in descending order by weight.', citations: ingredientCitation ? [ingredientCitation] : [], confidence_score: 0.8 })
          }
        }
      }
    }

    // Nutrition validation errors (CRITICAL - impossible values, missing mandatory nutrients)
    if (!nutritionValidation.isValid) {
      for (const error of nutritionValidation.errors) {
        violations.push({ category: 'Nutrition Facts Validation', severity: 'critical' as const, description: error, regulation_reference: '21 CFR 101.9(c)', suggested_fix: 'Correct the value according to FDA rounding rules', citations: [], confidence_score: 1.0 })
      }
    }
    
    // Nutrition validation warnings (WARNING - rounding errors, minor issues)
    // These don't typically cause detention but should be fixed
    if (nutritionValidation.warnings && nutritionValidation.warnings.length > 0) {
      for (const warning of nutritionValidation.warnings) {
        violations.push({ category: 'Nutrition Facts Validation', severity: 'warning' as const, description: warning, regulation_reference: '21 CFR 101.9(c)', suggested_fix: 'Correct the value according to FDA rounding rules', citations: [], confidence_score: 1.0 })
      }
    }

    // Multi-column Nutrition Facts violations (21 CFR §101.9(b)(12))
    if (multiColumnValidation) {
      for (const error of multiColumnValidation.errors) {
        violations.push({
          category: 'Multi-Column Nutrition Facts',
          severity: 'critical' as const,
          description: error,
          regulation_reference: '21 CFR 101.9(b)(12)',
          suggested_fix: 'Ensure all columns declare consistent mandatory nutrients or include "not a significant source of..." statement.',
          citations: [],
          confidence_score: 0.95,
        })
      }
      for (const warning of multiColumnValidation.warnings) {
        violations.push({
          category: 'Multi-Column Nutrition Facts',
          severity: 'warning' as const,
          description: warning,
          regulation_reference: '21 CFR 101.9(b)(12)',
          suggested_fix: 'Review nutrient declarations across all columns for consistency.',
          citations: [],
          confidence_score: 0.85,
        })
      }
    }

    violations.push(...dimensionViolations)

    for (const claimViolation of claimViolations) {
      violations.push({ category: 'Health Claims', severity: claimViolation.severity, description: claimViolation.description, regulation_reference: claimViolation.regulation, suggested_fix: claimViolation.recommendation, citations: [], confidence_score: 1.0 })
    }

    // Format-based filtering
    if (exemptFields.length > 0) {
      violations = violations.filter(v => {
        const desc = (v.description || '').toLowerCase()
        const cat  = (v.category || '').toLowerCase()
        if (exemptFields.includes('nutrition_facts') && (cat.includes('nutrition') || desc.includes('nutrition facts'))) return false
        if (exemptFields.includes('ingredient_list') && (cat.includes('ingredient') || desc.includes('ingredient list'))) return false
        if (exemptFields.includes('detailed_nutrition') && desc.includes('detailed nutrition')) return false
        return true
      })
    }

    // Format-specific additions
    if (formatConfig && packagingFormat) {
      const resolvedRules = getResolvedRules(packagingFormat, productDomain)
      if (resolvedRules.requiresTotalCount) {
        const allTextV = visionResult.textElements.allText.toLowerCase()
        const hasTotalCount = /\d+\s*(x|packets?|packs?|units?|count|pieces?|sachets?|bags?|pouches?)/i.test(allTextV)
        if (!hasTotalCount) {
          violations.push({ category: 'Multi-pack Declaration', severity: 'critical' as const, description: `This is a ${formatConfig.nameVi}. FDA requires total unit count declaration.`, regulation_reference: '21 CFR 101.105(g)', suggested_fix: 'Add total unit count on the outer packaging.', citations: [], confidence_score: 0.85 })
        }
      }
      if (packagingFormat === 'outer_carton' && !visionResult.textElements.productName?.text) {
        violations.push({ category: 'Outer Carton - Product Identity', severity: 'critical' as const, description: 'Outer carton must display the product name per 21 CFR 101.3.', regulation_reference: '21 CFR 101.3', suggested_fix: 'Add product name/identity statement on the outer carton.', citations: [], confidence_score: 0.9 })
      }
      if (packagingFormat === 'individual_unit' && isSimplifiedAllowed) {
        violations.push({ category: 'Small Package Format (Info)', severity: 'info' as const, description: `Small individual package. Per 21 CFR 101.9(j)(13), simplified Nutrition Facts format is acceptable for packages with < 40 sq in PDP area (current: ${panelAreaSquareInches.toFixed(1)} sq in).`, regulation_reference: '21 CFR 101.9(j)(13)', suggested_fix: 'Linear Nutrition Facts format is acceptable for this package size.', citations: [], confidence_score: 1.0 })
      }
    }

    // ── Step 5: Risk scoring ──────────────────���────────────────
    await updateJobProgress(jobId, 'Finalizing audit report', 90)

    const needsExpertReview = violations.some(v => (v.confidence_score ?? 1) < 0.8 || v.citations.length === 0)
    const citationCount = violations.reduce((sum: number, v: any) => sum + v.citations.length, 0)
    const extractionConfidence = isManualEntry ? 1.0 : visionResult.overallConfidence || 0
    const avgCitationSimilarity = citationCount > 0 ? violations.reduce((sum: number, v: any) => { const avg = v.citations.reduce((s: number, c: any) => s + c.relevance_score, 0) / (v.citations.length || 1); return sum + avg }, 0) / violations.length : 0
    const legalReasoningConfidence = citationCount > 0 ? Math.min(0.95, avgCitationSimilarity * 0.8 + 0.2) : 0.5

    const { calculateOverallRisk, generateRiskSummary } = await import('@/lib/risk-engine')
    const riskResult = calculateOverallRisk({ violations, warningLetterMatches: warningLetterContext, recallMatches: recallContext, importAlertMatches: importAlertContext, extractionConfidence, legalReasoningConfidence })
    violations = riskResult.violationsWithRisk

    const hasCritical = violations.some((v: any) => v.severity === 'critical')
    const hasWarning  = violations.some((v: any) => v.severity === 'warning')
    const overallResult = hasCritical ? 'fail' : hasWarning ? 'warning' : 'pass'
    const finalStatus = needsExpertReview ? 'ai_completed' : 'verified'

    // Commercial summary
    const additionalFindings = violations
      .filter((v: any) => !professionalFindings.some(pf => pf?.finding?.cfr_reference === v.regulation_reference || (pf?.finding?.summary && pf.finding.summary.includes(v.category || ''))))
      .map((v: any) => ({ summary: v.category, legal_basis: v.regulation_reference ? `Per ${v.regulation_reference}` : '', expert_logic: v.description, remediation: v.suggested_fix || 'See finding details', severity: v.severity, cfr_reference: v.regulation_reference || '', confidence_score: v.confidence_score ?? 0.8 }))
    const allFindingsForSummary = [...professionalFindings.map(pf => pf.finding), ...additionalFindings]
    const commercialSummary = SmartCitationFormatter.createReportSummary(allFindingsForSummary, userLang)
    const expertTips = SmartCitationFormatter.generateExpertTips(allFindingsForSummary, userLang)

    // ── Save results ──────────────────��────────────────────────
    const { error: updateError } = await supabase
      .from('audit_reports')
      .update({
        status:                  finalStatus,
        overall_result:          overallResult,
        findings:                violations,
        violations:              violations,
        geometry_violations:     geometryViolations,
        contrast_violations:     contrastViolations,
        claim_violations:        claimViolations,
        multilanguage_issues:    multiLanguageIssues ? [multiLanguageIssues] : [],
        needs_expert_review:     needsExpertReview,
        citation_count:          citationCount,
        required_disclaimers:    disclaimers,
        pixels_per_inch:         conversionResult?.pixelsPerInch,
        pdp_area_square_inches:  conversionResult?.pdpAreaSquareInches || (panelAreaSquareInches !== 20 ? panelAreaSquareInches : null),
        ai_tokens_used:          totalTokensUsed,
        ai_cost_usd:             (totalTokensUsed / 1000) * 0.005,
        commercial_summary:      commercialSummary,
        expert_tips:             expertTips,
        nutrition_facts:         visionResult.nutritionFacts || [],
        is_multi_column_nutrition: isMultiColumn,
        nutrition_facts_columns: isMultiColumn ? visionResult.nutritionFactsColumns : null,
        nutrition_column_format_type: isMultiColumn && visionResult.nutritionFactsColumns 
          ? detectPanelFormatType(visionResult.nutritionFactsColumns).formatType 
          : null,
        multi_column_validation: multiColumnValidation ? {
          isValid: multiColumnValidation.isValid,
          errors: multiColumnValidation.errors,
          warnings: multiColumnValidation.warnings,
          columnIssues: multiColumnValidation.columnIssues,
        } : null,
        ingredient_list:         visionResult.ingredients?.join(', ') || null,
        allergen_declaration:    visionResult.allergens?.join(', ') || null,
        health_claims:           visionResult.detectedClaims || [],
        detected_languages:      visionResult.detectedLanguages || ['English'],
        brand_name:              visionResult.textElements?.brandName?.text || null,
        product_name:            visionResult.textElements?.productName?.text || null,
        net_quantity:            visionResult.textElements?.netQuantity?.text || null,
        ocr_confidence:          visionResult.overallConfidence || null,
        overall_risk_score:      riskResult.overallRiskScore,
        projected_risk_score:    riskResult.projectedRiskScore,
        risk_assessment:         riskResult.riskAssessment,
        enforcement_risk_score:  riskResult.enforcementRiskScore,
        warning_letter_weight:   riskResult.warningLetterWeight,
        recall_heat_index:       riskResult.recallHeatIndex,
        import_alert_heat_index: riskResult.importAlertHeatIndex,
        report_unlocked:         true,
      })
      .eq('id', reportId)

    if (updateError) throw updateError

    // Increment usage counter, rồi check ngay xem có hết quota không
    if (phase !== 'vision_only' || visionDataConfirmed) {
      await supabase.rpc('increment_reports_used', { p_user_id: userId })

      // Sau khi increment, check quota để gửi email thông báo kịp thời
      // (không phải đợi user submit lần tiếp theo mới bi��t hết lượt)
      try {
        const { data: quotaAfter } = await supabase.rpc('check_quota', { p_user_id: userId })

        if (quotaAfter) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email, language')
            .eq('id', userId)
            .maybeSingle()

          if (userProfile?.email) {
            const lang = (userProfile.language as 'vi' | 'en') ?? 'en'

            if (!quotaAfter.has_quota) {
              // Hết lượt hoàn toàn → gửi email quota exhausted ngay lập tức
              const exhaustedEmail = quotaExhaustedTemplate({
                email: userProfile.email,
                reportsUsed:  quotaAfter.reports_used,
                reportsLimit: quotaAfter.reports_limit,
                planName:     quotaAfter.plan_name,
                periodEnd:    quotaAfter.period_end,
                lang,
              })
              sendEmail({ to: userProfile.email, subject: exhaustedEmail.subject, html: exhaustedEmail.html })
            } else {
              // Còn lượt nhưng sắp hết → gửi low credits warning
              const remaining = quotaAfter.reports_limit - quotaAfter.reports_used
              const shouldWarn = quotaAfter.reports_limit >= 5
                ? remaining === 2
                : remaining === 0
              if (shouldWarn) {
                const lowEmail = lowCreditsTemplate({
                  email: userProfile.email,
                  reportsUsed:  quotaAfter.reports_used,
                  reportsLimit: quotaAfter.reports_limit,
                  planName:     quotaAfter.plan_name,
                  periodEnd:    quotaAfter.period_end,
                  lang,
                })
                sendEmail({ to: userProfile.email, subject: lowEmail.subject, html: lowEmail.html })
              }
            }
          }
        }
      } catch (emailErr) {
        console.error('[process/run] Failed to send quota email after increment:', emailErr)
      }
    }

    await completeJob(jobId)

    return NextResponse.json({ success: true, overallResult, violations })
  } catch (error: any) {
    console.error('[process/run] Error:', error)
    await supabase
      .from('audit_reports')
      .update({ status: 'error', error_message: error?.message ?? 'Analysis failed' })
      .eq('id', reportId)
    return NextResponse.json({ error: 'Failed to analyze label', message: error?.message }, { status: 500 })
  }
}
