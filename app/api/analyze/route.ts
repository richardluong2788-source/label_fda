import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, lowCreditsTemplate } from '@/lib/email'
import { NutritionValidator } from '@/lib/nutrition-validator'
import { VisualGeometryAnalyzer } from '@/lib/visual-geometry-analyzer'
import { DimensionConverter } from '@/lib/dimension-converter'
import { ContrastChecker } from '@/lib/contrast-checker'
import { ClaimsValidator } from '@/lib/claims-validator'
import { getRelevantRegulations } from '@/lib/product-categories'
import { getRelevantContext, getWarningLetterContext, getRecallContext, getImportAlertContext } from '@/lib/embedding-utils'
import { checkKnowledgeBaseStatus } from '@/lib/knowledge-base-check'
import { analyzeLabel } from '@/lib/ai-vision-analyzer'
import { ViolationToCFRMapper } from '@/lib/violation-to-cfr-mapper'
import { SmartCitationFormatter } from '@/lib/smart-citation-formatter'
import { getPackagingFormat, getExemptFields, buildPackagingFormatPrompt, canUseSimplifiedLabeling, getMinFontSize, mapProductTypeToDomain, type PackagingFormatId, type ProductDomain } from '@/lib/packaging-format-config'
import type { Citation, NutritionFact, TextElement } from '@/lib/types'

/**
 * RAG-ENHANCED FDA COMPLIANCE ANALYSIS
 * 
 * This system uses Retrieval-Augmented Generation (RAG) to ensure accuracy:
 * 1. Real color extraction from images (not mock data)
 * 2. Actual PDP dimensions from user input (not hardcoded)
 * 3. Knowledge Base citations with similarity scores
 * 4. Multi-language detection via GPT-4o Vision
 * 5. FDA rounding rules validation for nutrition facts
 * 
 * All findings are backed by regulatory citations from the vector database.
 */

export async function POST(request: Request) {
  try {
    const { reportId, phase = 'full', visionDataConfirmed = false } = await request.json()

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }
    
    console.log(`[v0] Analysis requested - Phase: ${phase}, Vision confirmed: ${visionDataConfirmed}`)

    const supabase = await createClient()

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── QUOTA ENFORCEMENT ──────────────────────────────────────────────────────
    // Admin users (có record trong admin_users) được bypass hoàn toàn — không giới hạn lượt.
    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin =
      adminRecord?.role === 'admin' ||
      adminRecord?.role === 'superadmin' ||
      adminRecord?.role === 'expert'

    if (!isAdmin) {
      // Chỉ enforce quota với user thường
      const { data: quotaData, error: quotaError } = await supabase
        .rpc('check_quota', { p_user_id: user.id })

      if (quotaError) {
        console.error('Quota check failed:', quotaError.message)
        // Fail closed — block user nếu quota check lỗi để tránh bypass
        return NextResponse.json(
          { error: 'quota_check_failed', message: 'Không thể kiểm tra quota. Vui lòng thử lại.' },
          { status: 503 }
        )
      } else if (quotaData && !quotaData.has_quota) {
        return NextResponse.json(
          {
            error: 'quota_exceeded',
            message: `Bạn đã dùng hết ${quotaData.reports_used}/${quotaData.reports_limit} lượt phân tích trong tháng này. Nâng cấp gói để tiếp tục.`,
            quota: {
              plan_id:       quotaData.plan_id,
              plan_name:     quotaData.plan_name,
              reports_used:  quotaData.reports_used,
              reports_limit: quotaData.reports_limit,
              period_end:    quotaData.period_end,
            },
          },
          { status: 402 }
        )
      } else if (quotaData?.has_quota) {
        // Gửi cảnh báo khi còn đúng 2 lượt (chỉ gửi 1 lần tại ngưỡng này)
        const remaining = (quotaData.reports_limit - quotaData.reports_used) - 1 // -1 vì lượt này sắp dùng
        if (remaining === 2) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email, language')
            .eq('id', user.id)
            .maybeSingle()

          if (userProfile?.email) {
            const lang = (userProfile.language as 'vi' | 'en') || 'en'
            const lowEmail = lowCreditsTemplate({
              email: userProfile.email,
              reportsUsed: quotaData.reports_used + 1,
              reportsLimit: quotaData.reports_limit,
              planName: quotaData.plan_name,
              periodEnd: quotaData.period_end,
              lang,
            })
            sendEmail({ to: userProfile.email, subject: lowEmail.subject, html: lowEmail.html })
          }
        }
      }
    }
    // ── END QUOTA ENFORCEMENT ───────────────────────────────────────────────────

    // Get report
    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Update status to processing
    await supabase
      .from('audit_reports')
      .update({ status: 'processing' })
      .eq('id', reportId)

    // Resolve packaging format + product domain early (needed for Vision prompt + violation detection)
    // NOTE: productDomain is initially set from user selection; after Vision runs it may be
    // upgraded via auto-detection if the user left product_type blank.
    const packagingFormat = report.packaging_format as PackagingFormatId | undefined
    let productDomain: ProductDomain = mapProductTypeToDomain(report.product_type || report.product_category)

    // Step 1: Analyze label images with GPT-4o Vision (or use manual entry data)
    console.log('[v0] Step 1: Analyzing label images...')
    let visionResult
    let totalTokensUsed = 0
    const isManualEntry = report.label_image_url === 'manual-entry'
    
    if (isManualEntry) {
      // Manual entry: construct vision result from form data
      console.log('[v0] Manual entry detected. Using form data instead of vision analysis.')
      visionResult = {
        nutritionFacts: report.nutrition_facts || [],
        textElements: {
          brandName: { text: '', boundingBox: { confidence: 1.0 } },
          productName: { text: '', boundingBox: { confidence: 1.0 } },
          netQuantity: { text: '', boundingBox: { confidence: 1.0 } },
          allText: `${report.ingredient_list || ''} ${report.allergen_declaration || ''}`
        },
        detectedClaims: [],
        ingredients: report.ingredient_list ? [report.ingredient_list] : [],
        allergens: report.allergen_declaration ? report.allergen_declaration.split(',').map((a: string) => a.trim()) : [],
        warnings: [],
        detectedLanguages: ['English'],
        tokensUsed: 0,
        overallConfidence: 1.0
      }
      console.log('[v0] Manual entry loaded:', {
        nutritionFactsCount: visionResult.nutritionFacts.length,
        hasIngredients: visionResult.ingredients.length > 0,
        hasAllergens: visionResult.allergens.length > 0
      })
    } else {
      // Image upload: run GPT-4o Vision analysis on all images
      try {
        console.log('[v0] Running GPT-4o Vision analysis on multiple images...')
        const labelImages = report.label_images || [{ type: 'main', url: report.label_image_url }]
        console.log('[v0] Images to analyze:', labelImages.length)
        
        // Analyze each image type separately
        const imageAnalyses: any = {}
        // Build packaging format context for AI vision if format is specified (domain-aware)
        const packagingFormatCtx = packagingFormat ? buildPackagingFormatPrompt(packagingFormat, productDomain) : undefined
        
        for (const img of labelImages) {
          console.log(`[v0] Analyzing ${img.type} image...`)
          const result = await analyzeLabel(img.url, packagingFormatCtx)
          imageAnalyses[img.type] = result
          totalTokensUsed += result.tokensUsed
        }
        
        // Merge results from all images intelligently
        // PDP image for: brand name, product name, net weight
        // Nutrition image for: nutrition facts
        // Ingredients image for: ingredients, allergens
        const pdpData = imageAnalyses.pdp || imageAnalyses.main || {}
        const nutritionData = imageAnalyses.nutrition || imageAnalyses.main || {}
        const ingredientsData = imageAnalyses.ingredients || imageAnalyses.main || {}
        
        visionResult = {
          nutritionFacts: nutritionData.nutritionFacts || pdpData.nutritionFacts || [],
          textElements: {
            brandName: pdpData.textElements?.brandName || { text: '', boundingBox: { confidence: 0 } },
            productName: pdpData.textElements?.productName || { text: '', boundingBox: { confidence: 0 } },
            netQuantity: pdpData.textElements?.netQuantity || { text: '', boundingBox: { confidence: 0 } },
            allText: [pdpData.textElements?.allText, nutritionData.textElements?.allText, ingredientsData.textElements?.allText].filter(Boolean).join(' ')
          },
          detectedClaims: [...(pdpData.detectedClaims || []), ...(nutritionData.detectedClaims || [])],
          ingredients: ingredientsData.ingredients || pdpData.ingredients || [],
          allergens: ingredientsData.allergens || pdpData.allergens || [],
          warnings: [...(pdpData.warnings || []), ...(nutritionData.warnings || []), ...(ingredientsData.warnings || [])],
          detectedLanguages: pdpData.detectedLanguages || ['English'],
          tokensUsed: totalTokensUsed,
          overallConfidence: Math.max(pdpData.overallConfidence || 0, nutritionData.overallConfidence || 0, ingredientsData.overallConfidence || 0)
        }
        
        totalTokensUsed = visionResult.tokensUsed
        console.log('[v0] Vision analysis complete. Extracted:', {
          nutritionFactsCount: visionResult.nutritionFacts.length,
          claimsCount: visionResult.detectedClaims.length,
          tokensUsed: visionResult.tokensUsed,
          overallConfidence: visionResult.overallConfidence,
          detectedProductType: visionResult.detectedProductType,
        })

        // ── AUTO-DETECT PRODUCT DOMAIN FROM VISION ───────────────────────────
        // When user hasn't selected a product type, upgrade productDomain from
        // Vision AI's label analysis instead of defaulting blindly to 'food'.
        const userChoseProductType = !!(report.product_type || report.product_category)
        if (!userChoseProductType && visionResult.detectedProductType && visionResult.detectedProductType !== 'unknown') {
          const autoDetectedDomain = mapProductTypeToDomain(visionResult.detectedProductType)
          if (autoDetectedDomain !== 'food') {
            // Only override default 'food' if Vision detected something more specific
            ;(productDomain as any) = autoDetectedDomain
          } else {
            // Vision also says food — but refine via content signals if possible
            const allText = visionResult.textElements.allText?.toLowerCase() || ''
            if (allText.includes('drug facts') || allText.includes('active ingredient')) {
              ;(productDomain as any) = 'drug_otc'
            } else if (allText.includes('supplement facts')) {
              ;(productDomain as any) = 'supplement'
            } else if (allText.includes('inci') || (allText.includes('ingredients') && !allText.includes('nutrition facts') && !allText.includes('calories'))) {
              ;(productDomain as any) = 'cosmetic'
            }
          }
          console.log('[v0] AUTO-DETECT: productDomain resolved to', productDomain, 'from Vision detectedProductType:', visionResult.detectedProductType)
        } else if (userChoseProductType) {
          console.log('[v0] User-selected productDomain:', productDomain)
        } else {
          console.log('[v0] No product type detected — defaulting to food domain')
        }
        // ── END AUTO-DETECT ───────────────────────────────────────────────────
      } catch (error: any) {
        console.error('[v0] Vision analysis failed:', error)
        // Update report with error status
        await supabase
          .from('audit_reports')
          .update({ 
            status: 'error',
            error_message: `AI analysis failed: ${error.message}`
          })
          .eq('id', reportId)
        
        return NextResponse.json({ 
          error: 'AI analysis temporarily unavailable. Please try again.' 
        }, { status: 503 })
      }
    }
    
    // PHASE 1: If only vision extraction requested, return data for human verification
    if (phase === 'vision_only' && !visionDataConfirmed) {
      console.log('[v0] PHASE 1: Returning vision data for human verification...')
      
      // Determine if double-pass OCR is needed
      const needsDoublePass = visionResult.overallConfidence < 0.8 ||
                             visionResult.textElements.brandName?.boundingBox?.confidence < 0.7 ||
                             visionResult.textElements.productName?.boundingBox?.confidence < 0.7
      
      // Update report with phase 1 data
      await supabase
        .from('audit_reports')
        .update({
          status: 'ai_completed',
          analysis_phase: 'vision_extraction',
          vision_data_verified: false,
          double_pass_needed: needsDoublePass,
          ocr_confidence: visionResult.overallConfidence,
          ai_tokens_used: totalTokensUsed,
          ai_cost_usd: (totalTokensUsed / 1000) * 0.005,
        })
        .eq('id', reportId)
      
      return NextResponse.json({
        success: true,
        phase: 'vision_extraction',
        visionData: {
          textElements: visionResult.textElements,
          nutritionFacts: visionResult.nutritionFacts,
          ingredients: visionResult.ingredients,
          allergens: visionResult.allergens,
          detectedClaims: visionResult.detectedClaims,
          detectedLanguages: visionResult.detectedLanguages,
          overallConfidence: visionResult.overallConfidence,
        },
        needsDoublePass,
        needsVerification: true,
        message: needsDoublePass 
          ? 'Low confidence detected. Please verify the extracted data before proceeding to compliance analysis.'
          : 'Please verify the extracted data is accurate before running compliance checks.'
      })
    }

    // ── KNOWLEDGE BASE AVAILABILITY CHECK ──────────────────────────────────
    // Block analysis entirely if KB has no documents loaded.
    // This prevents returning low-quality results based only on hardcoded rules.
    console.log('[v0] Checking Knowledge Base availability...')
    const kbStatus = await checkKnowledgeBaseStatus()
    console.log('[v0] KB Status:', JSON.stringify(kbStatus))

    if (!kbStatus.available) {
      await supabase
        .from('audit_reports')
        .update({ status: 'kb_unavailable' })
        .eq('id', reportId)

      return NextResponse.json({
        error: 'knowledge_base_empty',
        message: 'Hệ thống Knowledge Base chưa có dữ liệu. Vui lòng liên hệ Admin để nạp tài liệu FDA (regulations, warning letters, recalls) trước khi chạy phân tích.',
        kbStatus,
      }, { status: 503 })
    }

    // Warn when secondary RAG layers are missing — analysis continues but with reduced accuracy
    if (!kbStatus.fullCoverageReady) {
      const missing = []
      if (kbStatus.warningLetterCount === 0) missing.push('Warning Letters (L2)')
      if (kbStatus.recallCount === 0) missing.push('Recalls (L3)')
      if (kbStatus.importAlertCount === 0) missing.push('Import Alerts (L4)')
      console.warn(
        `[v0] REDUCED RAG COVERAGE: Missing ${missing.join(', ')}. ` +
        `Analysis will proceed using 21 CFR only — approve pending items in Admin > Knowledge to enable full coverage.`
      )
    } else {
      console.log('[v0] Full RAG coverage confirmed: CFR + Warning Letters + Recalls + Import Alerts loaded.')
    }
    // ── END KB CHECK ─────────────────────────────────────────────────────────

    // Step 2: Retrieve relevant regulations AND warning letters from Knowledge Base using DUAL-QUERY RAG
    console.log('[v0] Step 2: Retrieving regulatory context + warning letters from Knowledge Base...')
    // productCategory: prefer explicit user selection, fall back to auto-detected domain
    // This ensures RAG filters correctly even when user doesn't fill in the advanced form
    const productCategory = report.product_category || report.product_type || productDomain || 'food'
    const labelText = visionResult.textElements.allText
    console.log('[v0] RAG productCategory:', productCategory, '| productDomain:', productDomain)

    // Extract company name and country of origin from user-provided manufacturer info
    // These come from the Advanced Settings form → stored in report.manufacturer_info
    const manufacturerInfo = report.manufacturer_info || {}
    const explicitCompanyName = manufacturerInfo.company_name || undefined
    // country_of_origin used for Import Alert country-scope filtering
    // Example: "Vietnam" → skips alerts scoped to ["China", "Hong Kong"] only
    const countryOfOrigin = manufacturerInfo.country_of_origin || undefined
    console.log('[v0] Import Alert context params — company:', explicitCompanyName || 'auto-detect', '| country:', countryOfOrigin || 'not specified')

    // QUAD QUERY: Regulations (L1) + Warning Letters (L2) + Recalls (L3) + Import Alerts (L4) in parallel
    const [regulatoryContext, warningLetterContext, recallContext, importAlertContext] = await Promise.all([
      getRelevantContext(labelText, productCategory),
      getWarningLetterContext(labelText, productCategory),
      getRecallContext(labelText, productCategory),
      // Pass explicit company name (normalized in embedding-utils) + country for precision filtering
      getImportAlertContext(labelText, productCategory, explicitCompanyName, countryOfOrigin),
    ])

    console.log('[v0] Retrieved', regulatoryContext.length, 'relevant regulations from Knowledge Base')
    console.log('[v0] Retrieved', warningLetterContext.length, 'warning letter violations as negative examples')
    console.log('[v0] Retrieved', recallContext.length, 'recall enforcement examples')
    console.log('[v0] Retrieved', importAlertContext.length, 'import alert risk signals (Layer 4)')

    // Build citations from regulatory context.
    // Exclude: Warning Letters, Recalls, and any 19 CFR / CBP records
    // (label compliance is 21 CFR FDA only — CBP/customs is out of scope).
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
      section: ctx.section,
      text: ctx.content.substring(0, 200) + '...',
      source: ctx.metadata?.source || 'FDA Regulations',
      relevance_score: ctx.similarity,
    }))

    // Build warning letter context for negative example injection
    const warningLetterPromptSection = warningLetterContext.length > 0
      ? `\n\nCOMMON VIOLATIONS TO AVOID (from real FDA Warning Letters):\n${warningLetterContext.map((w, i) => {
          const meta = w.metadata || {}
          return `\n[Warning ${i + 1}] ${meta.violation_type?.[0] || 'Violation'}
  Problem: "${meta.problematic_claim || 'N/A'}"
  Why wrong: ${meta.why_problematic || w.content.slice(0, 200)}
  Regulation: ${meta.regulation_violated?.[0] || 'N/A'}
  Red-flag phrases to watch for: ${(meta.problematic_keywords || []).join(', ')}
  Source: FDA Warning Letter ${meta.letter_id || ''} (${meta.issue_date || ''})`
        }).join('\n')}`
      : ''

    // Build recall context for enforcement pattern injection
    const recallPromptSection = recallContext.length > 0
      ? `\n\nFDA RECALL ENFORCEMENT PATTERNS (from openFDA database):\n${recallContext.map((r, i) => {
          const meta = r.metadata || {}
          return `\n[Recall ${i + 1}] ${meta.recall_number || 'N/A'} - Class ${meta.recall_classification || 'N/A'}
  Product Type: ${meta.product_type || 'N/A'}
  Issue: ${meta.recall_issue_type || 'N/A'}
  Why recalled: ${meta.why_recalled || r.content.slice(0, 200)}
  Regulation: ${meta.regulation_related || 'N/A'}
  Preventive Action: ${meta.preventive_action || 'N/A'}
  Red-flag keywords: ${(meta.problematic_keywords || []).join(', ')}`
        }).join('\n')}`
      : ''

    // Build import alert context for border enforcement risk injection (Layer 4)
    // Token budget: max 2 alerts × ~120 tokens = ~240 tokens. Compact format.
    // NOT included in citations — risk context only.
    const importAlertPromptSection = importAlertContext.length > 0
      ? `\n\n### IMPORT ALERTS (Risk Context — do NOT cite, do NOT count as CFR violations):\n${importAlertContext.map((ia, i) => {
          const activeEntities = (ia.red_list_entities || []).filter((e: any) => e.is_active)
          const entityNote = activeEntities.length > 0
            ? `Red List: ${activeEntities.slice(0, 3).map((e: any) => e.name).join(', ')}${activeEntities.length > 3 ? ` +${activeEntities.length - 3}` : ''}`
            : 'Category-wide alert'
          return `[IA${i + 1}] ${ia.alert_number} ${ia.action_type} (${ia.industry_type}) | ${entityNote}
  Reason: ${ia.reason_for_alert.slice(0, 180)} | Match: ${ia.match_method}`
        }).join('\n')}\nWarn user of DWPE border detention risk. Flag as 'Import Alert Risk', not a CFR violation.`
      : ''

    // Add packaging format context to prompt (domain-aware)
    const packagingFormatPrompt = packagingFormat ? buildPackagingFormatPrompt(packagingFormat, productDomain) : ''
    console.log('[v0] Packaging format prompt length:', packagingFormatPrompt.length, 'chars')
    console.log('[v0] Warning letter prompt section length:', warningLetterPromptSection.length, 'chars')
    console.log('[v0] Import alert prompt section length:', importAlertPromptSection.length, 'chars')

    // Calculate actual PDP area from user-provided dimensions
    // Supports TWO input paths:
    //   1. Legacy: physical_width_cm / physical_height_cm (from label-upload / label-multi-upload)
    //   2. New:    pdp_dimensions { width, height, unit } (from label-analyzer advanced settings)
    // CRITICAL FIX: Default should be SMALL (<40 sq in) to avoid false font size violations
    // when dimensions are not provided. Users with large labels MUST provide dimensions.
    let panelAreaSquareInches = 20 // Conservative default (<40 sq in threshold)
    let pdpAreaSource = 'default_conservative'
    let resolvedWidthCm: number | null = null
    let resolvedHeightCm: number | null = null

    if (report.pdp_dimensions?.width && report.pdp_dimensions?.height) {
      // New path: pdp_dimensions from advanced settings (unit may be 'in' or 'cm')
      const unit: string = report.pdp_dimensions.unit || 'in'
      const rawWidth: number = report.pdp_dimensions.width
      const rawHeight: number = report.pdp_dimensions.height

      if (unit === 'cm') {
        resolvedWidthCm = rawWidth
        resolvedHeightCm = rawHeight
        panelAreaSquareInches = (rawWidth / 2.54) * (rawHeight / 2.54)
      } else {
        // Default: inches
        resolvedWidthCm = rawWidth * 2.54
        resolvedHeightCm = rawHeight * 2.54
        panelAreaSquareInches = rawWidth * rawHeight
      }
      pdpAreaSource = 'pdp_dimensions'
      console.log(`[v0] PDP area from pdp_dimensions: ${panelAreaSquareInches.toFixed(2)} sq in (${rawWidth}x${rawHeight} ${unit})`)
    } else if (report.physical_width_cm && report.physical_height_cm) {
      // Legacy path: direct cm values from old upload components
      resolvedWidthCm = report.physical_width_cm
      resolvedHeightCm = report.physical_height_cm
      const widthInches = report.physical_width_cm / 2.54
      const heightInches = report.physical_height_cm / 2.54
      panelAreaSquareInches = widthInches * heightInches
      pdpAreaSource = 'physical_cm_legacy'
      console.log('[v0] PDP area from physical_width/height_cm:', panelAreaSquareInches.toFixed(2), 'sq in')
    } else {
      console.log('[v0] WARNING: Using conservative default PDP area (20 sq in) - no physical dimensions provided')
      console.log('[v0] For accurate font size checks, user should provide actual label dimensions')
    }

    // Packaging Format-Aware Analysis (domain-aware)
    const formatConfig = packagingFormat ? getPackagingFormat(packagingFormat) : null
    const exemptFields = packagingFormat ? getExemptFields(packagingFormat, productDomain) : []
    const isSimplifiedAllowed = packagingFormat ? canUseSimplifiedLabeling(packagingFormat, panelAreaSquareInches, productDomain) : false
    const minFontSize = packagingFormat ? getMinFontSize(packagingFormat, panelAreaSquareInches, productDomain) : 6

    if (formatConfig) {
      console.log('[v0] Packaging Format:', formatConfig.name, '| Domain:', productDomain)
      console.log('[v0] Exempt fields:', exemptFields)
      console.log('[v0] Simplified labeling allowed:', isSimplifiedAllowed)
      console.log('[v0] Min font size for format:', minFontSize, 'pt')
    } else {
      console.log('[v0] No packaging format specified - using default rules | Domain:', productDomain)
    }

    // NEW: Auto-detect violations using smart mapper (regulations only, not warnings)
    console.log('[v0] Step 2.5: Running smart violation detection...')
    const detectedViolations = ViolationToCFRMapper.detectViolations(
      visionResult,
      panelAreaSquareInches,
      regulationsOnly,
      packagingFormat,
      productDomain
    )
    console.log('[v0] Detected', detectedViolations.length, 'violations via smart mapper')

    // Analysis progress steps
    const steps = [
      { step: 'Extracting text from image', progress: 15 },
      { step: 'Searching regulatory database (RAG)', progress: 30 },
      { step: 'Analyzing nutritional information', progress: 45 },
      { step: 'Validating FDA rounding rules', progress: 60 },
      { step: 'Checking ingredient compliance', progress: 75 },
      { step: 'Validating allergen declarations', progress: 90 },
      { step: 'Finalizing audit report', progress: 100 },
    ]

    // Use extracted nutrition facts from AI
    const extractedNutritionFacts = visionResult.nutritionFacts

    // Apply FDA rounding rules validation
    const nutritionValidation = NutritionValidator.validateNutritionFacts(
      extractedNutritionFacts
    )

    // Step 3: Visual geometry analysis using AI-extracted text elements and REAL dimensions
    console.log('[v0] Step 3: Analyzing visual geometry with actual panel size...')
    
    const textElements = {
      brandName: visionResult.textElements.brandName,
      productName: visionResult.textElements.productName,
      netQuantity: visionResult.textElements.netQuantity,
      panelAreaSquareInches: panelAreaSquareInches,
    }

    // Run geometry analysis with actual dimensions
    const geometryViolations = VisualGeometryAnalyzer.analyzeLabel(textElements)

    // Dimension conversion if physical dimensions provided (resolved from either path)
    let conversionResult
    let dimensionViolations = []
    if (resolvedWidthCm && resolvedHeightCm && report.pixel_width && report.pixel_height) {
      conversionResult = DimensionConverter.calculateConversionRatios(
        {
          width: resolvedWidthCm,
          height: resolvedHeightCm,
          unit: 'cm'
        },
        {
          width: report.pixel_width,
          height: report.pixel_height
        }
      )

      // Validate text sizes with actual measurements
      const netQuantityValidation = DimensionConverter.validateTextSize(
        25, // simulated pixel height
        conversionResult,
        'net_quantity'
      )

      if (!netQuantityValidation.isValid && netQuantityValidation.violation) {
        dimensionViolations.push({
          category: 'Dimension Compliance',
          severity: 'critical' as const,
          description: netQuantityValidation.violation,
          regulation_reference: netQuantityValidation.regulation,
          suggested_fix: `Increase font size to at least ${(netQuantityValidation.requiredInches * conversionResult.pixelsPerInch).toFixed(0)} pixels`,
          citations: [],
          confidence_score: 1.0
        })
      }
    }

    // Contrast checking with REAL colors from AI vision
    console.log('[v0] Step 5: Checking color contrast with extracted colors...')
    const contrastViolations = []
    
    // Check contrast for each text element with extracted colors
    const elementsToCheck = [
      { name: 'Brand Name', element: visionResult.textElements.brandName },
      { name: 'Product Name', element: visionResult.textElements.productName },
      { name: 'Net Quantity', element: visionResult.textElements.netQuantity }
    ]
    
    for (const { name, element } of elementsToCheck) {
      if (element?.colors) {
        try {
          const foreground = ContrastChecker.hexToRgb(element.colors.foreground)
          const background = ContrastChecker.hexToRgb(element.colors.background)
          const contrastResult = ContrastChecker.validateContrast(foreground, background, 'normal')
          
          if (!contrastResult.isReadable) {
            contrastViolations.push({
              type: 'contrast',
              severity: 'warning' as const,
              description: `${name}: ${contrastResult.warning || 'Poor color contrast detected'}`,
              ratio: contrastResult.ratio,
              recommendation: contrastResult.recommendation,
              colors: {
                foreground: element.colors.foreground,
                background: element.colors.background
              }
            })
          }
        } catch (error) {
          console.error(`[v0] Error checking contrast for ${name}:`, error)
        }
      }
    }

    // Step 4: Claims validation using AI-detected claims
    // DOMAIN-AWARE: pass productDomain so the correct ruleset is applied.
    //   cosmetic  → "prevents blisters/chafing" is a LEGAL cosmetic action claim
    //   food/supplement → "prevent" triggers prohibited disease claim check
    console.log('[v0] Step 4: Validating health claims (domain:', productDomain, ')...')
    const detectedClaimsText = visionResult.detectedClaims.join(' ')
    const claimViolations = ClaimsValidator.validateClaims(
      labelText + ' ' + detectedClaimsText,
      productDomain as import('@/lib/claims-validator').ProductDomain
    )

    // Multi-language validation using DETECTED languages from AI
    console.log('[v0] Step 6: Validating multi-language requirements...')
    let multiLanguageIssues = null
    const detectedLanguages = visionResult.detectedLanguages || []
    
    if (detectedLanguages.length > 1 || report.has_foreign_language) {
      console.log('[v0] Multiple languages detected:', detectedLanguages.join(', '))
      
      // Check if mandatory information is present in both languages
      const mandatoryFields = ['product name', 'net quantity', 'ingredients', 'allergens']
      const missingTranslations = []
      
      // This is a simplified check - in production, AI would verify each field has translations
      if (detectedLanguages.length === 1 && report.has_foreign_language) {
        missingTranslations.push('Required information may not be translated to all declared languages')
      }
      
      if (missingTranslations.length > 0 || detectedLanguages.includes('Vietnamese')) {
        multiLanguageIssues = {
          hasIssue: missingTranslations.length > 0,
          description: missingTranslations.length > 0 
            ? 'Some mandatory information may be missing translations' 
            : 'Multi-language label detected - verify all mandatory fields are translated',
          detectedLanguages: detectedLanguages,
          missingFields: missingTranslations
        }
      }
    }

    // Generate required disclaimers
    const productType = report.product_category?.includes('supplement') ? 'supplement' : 'conventional'
    const hasClaims = claimViolations.length > 0
    const disclaimers = ClaimsValidator.generateRequiredDisclaimers(productType, hasClaims)

    // Citations now come from REAL regulatory context (RAG) retrieved above
    console.log('[v0] Using', realCitations.length, 'citations from Knowledge Base')

    // Build violations based on ACTUAL findings from AI analysis and regulatory context
    let violations = []

    // NEW: Convert detected violations to professional findings
    console.log('[v0] Formatting violations into professional findings...')
    const professionalFindings = detectedViolations.map(violation => {
      const relevantReg = regulationsOnly.find(r => 
        r.regulation_id === violation.regulationSection ||
        r.section.includes(violation.regulationSection)
      )
      return SmartCitationFormatter.formatProfessionalFinding(violation, relevantReg || null)
    })
    
    // Add formatted findings to violations array
    for (const finding of professionalFindings) {
      // Find relevant citations by matching regulation sections
      const relevantCitations = realCitations.filter(c => {
        const findingRef = finding.cfr_reference.toLowerCase()
        const citationRef = (c.regulation_id + ' ' + c.section).toLowerCase()
        // Match any part of the regulation reference
        return findingRef.includes(c.section.toLowerCase()) || 
               citationRef.includes(finding.cfr_reference.split(' ')[2]?.split('(')[0] || '')
      })
      
      violations.push({
        category: finding.summary,
        severity: finding.severity,
        description: finding.expert_logic,
        regulation_reference: finding.cfr_reference,
        suggested_fix: finding.remediation,
        citations: relevantCitations.length > 0 ? relevantCitations : realCitations.slice(0, 3), // Fallback to top 3
        confidence_score: finding.confidence_score,
        legal_basis: finding.legal_basis,
      })
    }
    
    // WARNING LETTER CHECKS: Flag issues found in real FDA Warning Letters
    if (warningLetterContext.length > 0) {
      console.log('[v0] Checking label against', warningLetterContext.length, 'warning letter patterns...')

      const labelTextLower = labelText.toLowerCase()
      for (const warning of warningLetterContext) {
        const meta = warning.metadata || {}
        const redFlags = (meta.problematic_keywords || []) as string[]

        // Check if any red-flag keywords appear in the label
        const matchedKeywords = redFlags.filter((kw: string) =>
          labelTextLower.includes(kw.toLowerCase())
        )

        if (matchedKeywords.length > 0) {
          const warningCitation: Citation = {
            regulation_id: meta.regulation_violated?.[0] || 'FDA Warning Letter',
            section: meta.violation_type?.[0] || 'Warning Letter Violation',
            text: `FDA Warning Letter ${meta.letter_id || ''}: "${meta.problematic_claim || ''}" - ${meta.why_problematic || warning.content.slice(0, 150)}`,
            source: `FDA Warning Letter ${meta.letter_id || ''} (${meta.issue_date || ''})`,
            relevance_score: warning.similarity,
          }

          violations.push({
            category: `Mẫu Warning Letter: ${meta.violation_type?.[0] || 'Ngôn ngữ tiềm ẩn rủi ro'}`,
            severity: meta.severity === 'Critical' ? 'critical' : meta.severity === 'Major' ? 'warning' : 'info',
            description: `Nhãn này chứa ngôn ngữ tương đồng với nội dung mà FDA đã gửi Warning Letter ${meta.letter_id || ''} đến ${meta.company_name || 'một doanh nghi��p'}. Cụm từ bị nhận diện: "${matchedKeywords.join('", "')}". Vi phạm gốc: ${meta.why_problematic || 'Xem chi tiết trong Warning Letter.'}`,
            regulation_reference: meta.regulation_violated?.[0] || 'Xem FDA Warning Letter',
            suggested_fix: meta.correction_required || 'Xem xét và sửa đổi hoặc xóa ngôn ngữ bị gắn cờ để đảm bảo tuân thủ FDA.',
            citations: [warningCitation],
            confidence_score: Math.min(0.95, 0.5 + (matchedKeywords.length * 0.15)),
            source_type: 'warning_letter',
            warning_letter_id: meta.letter_id,
          })
        }
      }

      console.log('[v0] Warning letter pattern matches added to violations')
    }

    // FDA RECALL CHECKS: Flag issues matching real FDA Recall patterns
    if (recallContext.length > 0) {
      console.log('[v0] Checking label against', recallContext.length, 'recall enforcement patterns...')

      const labelTextLower = labelText.toLowerCase()
      for (const recall of recallContext) {
        const meta = recall.metadata || {}
        const redFlags = (meta.problematic_keywords || []) as string[]

        // Check if any red-flag keywords appear in the label
        const matchedKeywords = redFlags.filter((kw: string) =>
          labelTextLower.includes(kw.toLowerCase())
        )

        if (matchedKeywords.length > 0) {
          const recallCitation: Citation = {
            regulation_id: meta.regulation_related || 'FDA Recall Enforcement',
            section: meta.recall_issue_type || 'Recall Pattern',
            text: `FDA Recall ${meta.recall_number || ''} (Class ${meta.recall_classification || 'N/A'}): "${meta.why_recalled || recall.content.slice(0, 150)}"`,
            source: `FDA Recall ${meta.recall_number || ''} - ${meta.recalling_firm || ''}`,
            relevance_score: recall.similarity,
          }

          violations.push({
            category: `Mẫu Thu hồi: ${meta.recall_issue_type || 'Yếu tố tiềm ẩn rủi ro'}`,
            severity: meta.recall_classification === 'Class I' ? 'critical' : meta.recall_classification === 'Class II' ? 'warning' : 'info',
            description: `Nhãn này chứa các yếu tố tương đồng với sản phẩm đã bị FDA thu hồi. Recall ${meta.recall_number || 'N/A'} (${meta.recalling_firm || 'một doanh nghiệp'}): ${meta.why_recalled || 'Xem chi tiết sự kiện thu hồi.'}. Từ khóa nhận diện: "${matchedKeywords.join('", "')}".`,
            regulation_reference: meta.regulation_related || 'Xem Cơ sở dữ liệu FDA Recall',
            suggested_fix: meta.preventive_action || 'Xem xét và khắc phục các yếu tố bị gắn cờ để tránh nguy cơ thu hồi tiềm ẩn.',
            citations: [recallCitation],
            confidence_score: Math.min(0.95, 0.5 + (matchedKeywords.length * 0.15)),
            source_type: 'recall',
          })
        }
      }

      console.log('[v0] Recall pattern matches added to violations')
    }

    // IMPORT ALERT CHECKS: Flag potential DWPE risk based on FDA Import Alerts (Layer 4)
    // Per spec: Priority 1 = notify DWPE status at top of report
    // These are risk signals only — not hard violations — so severity is 'warning' or 'info'
    if (importAlertContext.length > 0) {
      console.log('[v0] Checking against', importAlertContext.length, 'import alert risk signals...')

      for (const ia of importAlertContext) {
        // Entity-matched alerts are strong signals (company is on the red list)
        const isEntityMatch = ia.match_method === 'entity'
        const activeEntities = (ia.red_list_entities || []).filter((e: any) => e.is_active)

        violations.push({
          category: `Import Alert: Rủi ro ${ia.action_type} (${ia.alert_number})`,
          severity: isEntityMatch ? 'critical' as const : 'warning' as const,
          description: isEntityMatch
            ? `CẢNH BÁO BIÊN GIỚI: Sản phẩm hoặc nhà sản xuất có thể thuộc diện FDA Import Alert ${ia.alert_number} (${ia.action_type}). Lý do: ${ia.reason_for_alert.slice(0, 300)}. ${activeEntities.length > 0 ? `${activeEntities.length} tổ chức hiện đang trong Danh sách Đỏ (Red List).` : ''} Hàng hóa từ các doanh nghiệp trong Danh sách Đỏ có thể bị giữ tại cảng Mỹ mà không cần kiểm tra thực tế (DWPE).`
            : `FDA Import Alert ${ia.alert_number} nhắm vào các sản phẩm trong ngành ${ia.industry_type} với lý do: ${ia.reason_for_alert.slice(0, 300)}. Mặc dù doanh nghiệp của bạn có thể chưa có trong Danh sách Đỏ, cảnh báo này cho thấy FDA đang tăng cường giám sát đối với loại sản phẩm này.`,
          regulation_reference: `FDA Import Alert ${ia.alert_number}`,
          suggested_fix: isEntityMatch
            ? `Để được xóa khỏi Danh sách Đỏ: (1) Nộp tài liệu hành động khắc phục cho FDA, (2) Yêu cầu kiểm tra tái xác nhận, (3) Cung cấp kết quả kiểm nghiệm phòng thí nghiệm chứng minh tuân thủ. Liên hệ FDA DIOD để biết yêu cầu cụ thể.`
            : `Đảm bảo tuân thủ đầy đủ các yêu cầu nêu trong Import Alert ${ia.alert_number} để tránh nguy cơ bị giữ hàng. Xem lại tài liệu CGMP và cân nhắc thực hiện kiểm nghiệm chủ động.`,
          citations: [], // Import Alerts không được đưa vào citations theo spec
          confidence_score: isEntityMatch ? 0.90 : 0.60,
          source_type: 'import_alert',
          import_alert_number: ia.alert_number,
        })
      }

      console.log('[v0] Import alert risk signals added to violations')
    }

    // ── END COUNTRY OF ORIGIN CHECK ────────────────────────────────────────

    // Check allergen declarations
    // FIX: Detecting allergens on the label means the label IS declaring them (which is good).
    // Only flag a violation if the declaration FORMAT is wrong (missing "Contains:" prefix)
    // or if allergens are NOT properly declared despite being present in ingredients.
    if (visionResult.allergens.length > 0) {
      const allergenCitation = realCitations.find(c => 
        c.regulation_id.includes('FALCPA') || c.section.toLowerCase().includes('allergen')
      )
      const allTextLower = visionResult.textElements.allText.toLowerCase()
      
      // Check if the label has a proper "Contains:" declaration
      const hasContainsStatement = allTextLower.includes('contains:') || allTextLower.includes('contains ')
      const hasAllergenSection = allTextLower.includes('allergen') || allTextLower.includes('allergy')
      const hasProperDeclaration = hasContainsStatement || hasAllergenSection

      if (!hasProperDeclaration) {
        // Allergens found in ingredients but no "Contains:" statement - this IS a real violation
        violations.push({
          category: 'Allergen Declaration',
          severity: 'critical' as const,
          description: `Detected allergens: ${visionResult.allergens.join(', ')}. No "Contains:" statement found - allergens must be declared separately per FALCPA.`,
          regulation_reference: allergenCitation?.regulation_id || 'FALCPA Section 203',
          suggested_fix: 'Add "Contains: [allergens]" statement immediately after ingredient list in plain language',
          citations: allergenCitation ? [allergenCitation] : [],
          confidence_score: allergenCitation ? allergenCitation.relevance_score : 0.8,
        })
      } else {
        // Allergens properly declared - log as informational, NOT a violation
        console.log(`[v0] Allergen declaration appears proper: found "Contains:" or allergen section for: ${visionResult.allergens.join(', ')}`)
      }
    }
    
    // Check ingredient list presence.
    //
    // Guards before flagging a violation:
    //   1. visionResult.ingredients must be empty (Vision didn't parse a list)
    //   2. The label must have substantial text (> 200 chars) — avoids cropped images
    //   3. An "Ingredients:" heading must be visible in allText
    //   4. BUT: if the heading is followed by actual ingredient text in allText
    //      (i.e. there is content after "Ingredients:"), then OCR captured the
    //      ingredients inside allText even if the structured array is empty.
    //      In that case the label IS compliant — skip the violation.
    //
    // This prevents the false-positive caused by Vision populating allText with
    // "Ingredients: Pistachios, sea salt." but not filling the structured array.
    if (visionResult.ingredients.length === 0 && visionResult.textElements.allText.length > 200) {
      const allTextLowerForIngredients = visionResult.textElements.allText.toLowerCase()
      const ingredientsHeadingIdx = allTextLowerForIngredients.indexOf('ingredients:')
      const containsHeadingIdx   = allTextLowerForIngredients.indexOf('contains:')
      const hasIngredientHeading = ingredientsHeadingIdx !== -1 || containsHeadingIdx !== -1

      if (hasIngredientHeading) {
        // Check whether there is meaningful text immediately after the heading.
        // "Meaningful" = at least 3 non-whitespace characters following the colon.
        const headingIdx = ingredientsHeadingIdx !== -1 ? ingredientsHeadingIdx : containsHeadingIdx
        const afterHeading = visionResult.textElements.allText.slice(headingIdx + 'ingredients:'.length).trim()
        const hasIngredientsAfterHeading = afterHeading.length >= 3

        if (!hasIngredientsAfterHeading) {
          // Heading visible but nothing follows — genuine missing ingredient list
          const ingredientCitation = realCitations.find(c =>
            c.regulation_id.includes('101.4') || c.section.toLowerCase().includes('ingredient')
          )
          violations.push({
            category: 'Ingredient List',
            severity: 'critical' as const,
            description: 'Ingredient list heading detected but ingredient text is missing from the label',
            regulation_reference: ingredientCitation?.regulation_id || '21 CFR 101.4',
            suggested_fix: 'Add a complete ingredient list in descending order by weight immediately after the "Ingredients:" heading',
            citations: ingredientCitation ? [ingredientCitation] : [],
            confidence_score: 0.8,
          })
        }
        // else: allText has content after heading — label is compliant, no violation
      }
    }

    // Add nutrition validation errors as violations
    if (!nutritionValidation.isValid) {
      for (const error of nutritionValidation.errors) {
        violations.push({
          category: 'Nutrition Facts Validation',
          severity: 'critical' as const,
          description: error,
          regulation_reference: '21 CFR 101.9(c)',
          suggested_fix: 'Correct the value according to FDA rounding rules',
          citations: [],
          confidence_score: 1.0, // Code validation is 100% confident
        })
      }
    }

    // Add dimension violations
    violations.push(...dimensionViolations)

    // Add claim violations
    for (const claimViolation of claimViolations) {
      violations.push({
        category: 'Health Claims',
        severity: claimViolation.severity,
        description: claimViolation.description,
        regulation_reference: claimViolation.regulation,
        suggested_fix: claimViolation.recommendation,
        citations: [],
        confidence_score: 1.0 // Claims validation is rule-based
      })
    }

    // PACKAGING FORMAT: Filter out false positive violations based on format exemptions
    if (exemptFields.length > 0) {
      const beforeCount = violations.length
      violations = violations.filter(v => {
        const desc = (v.description || '').toLowerCase()
        const cat = (v.category || '').toLowerCase()
        
        // Skip Nutrition Facts violations for outer carton if inner package has them
        if (exemptFields.includes('nutrition_facts') && 
            (cat.includes('nutrition') || desc.includes('nutrition facts'))) {
          console.log('[v0] FORMAT FILTER: Suppressed Nutrition Facts violation for', packagingFormat)
          return false
        }
        
        // Skip ingredient list violations for outer carton
        if (exemptFields.includes('ingredient_list') && 
            (cat.includes('ingredient') || desc.includes('ingredient list'))) {
          console.log('[v0] FORMAT FILTER: Suppressed Ingredient List violation for', packagingFormat)
          return false
        }
        
        // Skip detailed nutrition violations for formats that can reference inner label
        if (exemptFields.includes('detailed_nutrition') && 
            desc.includes('detailed nutrition')) {
          return false
        }
        
        return true
      })
      
      if (beforeCount !== violations.length) {
        console.log(`[v0] FORMAT FILTER: Removed ${beforeCount - violations.length} false positive violations for ${packagingFormat}`)
      }
    }

    // PACKAGING FORMAT: Add format-specific violations
    if (formatConfig) {
      // Check: Multi-pack must declare total unit count
      if (formatConfig.rules.requiresTotalCount) {
        const allText = visionResult.textElements.allText.toLowerCase()
        const hasTotalCount = /\d+\s*(x|packets?|packs?|units?|count|pieces?|sachets?|bags?|pouches?)/i.test(allText)
        if (!hasTotalCount) {
          violations.push({
            category: 'Multi-pack Declaration',
            severity: 'critical' as const,
            description: `This is a ${formatConfig.nameVi}. FDA requires total unit count declaration (e.g., "6 packets", "24 x 100g"). No unit count was detected.`,
            regulation_reference: '21 CFR 101.105(g)',
            suggested_fix: 'Add total unit count on the outer packaging, e.g., "Contains 6 individual packets" or "24 x 100g"',
            citations: [],
            confidence_score: 0.85,
          })
        }
      }

      // Check: Outer carton must still have product name and net weight
      if (packagingFormat === 'outer_carton') {
        if (!visionResult.textElements.productName?.text) {
          violations.push({
            category: 'Outer Carton - Product Identity',
            severity: 'critical' as const,
            description: 'Outer carton/shipping box must still display the product name (Statement of Identity) per 21 CFR 101.3.',
            regulation_reference: '21 CFR 101.3',
            suggested_fix: 'Add product name/identity statement on the outer carton',
            citations: [],
            confidence_score: 0.9,
          })
        }
      }

      // Check: Small packages using standard format when linear is acceptable
      if (packagingFormat === 'individual_unit' && isSimplifiedAllowed) {
        // Add an info note that simplified labeling is acceptable
        violations.push({
          category: 'Small Package Format (Info)',
          severity: 'info' as const,
          description: `This is a small individual package. Per 21 CFR 101.9(j)(13), simplified or linear Nutrition Facts format is acceptable for packages with < 40 sq in PDP area (current: ${panelAreaSquareInches.toFixed(1)} sq in).`,
          regulation_reference: '21 CFR 101.9(j)(13)',
          suggested_fix: 'Linear (horizontal) Nutrition Facts format is acceptable for this package size. Ensure all mandatory nutrients are still listed.',
          citations: [],
          confidence_score: 1.0,
        })
      }
    }

    // Check if any violations need expert review (low confidence or no citations)
    const needsExpertReview = violations.some(
      (v) => (v.confidence_score ?? 1) < 0.8 || v.citations.length === 0
    )

    // Count total citations
    const citationCount = violations.reduce((sum, v) => sum + v.citations.length, 0)

    // Calculate separated confidence scores
    // Extraction confidence: Based on OCR quality and bounding box confidence
    const extractionConfidence = isManualEntry 
      ? 1.0 
      : visionResult.overallConfidence || 0

    // Legal reasoning confidence: Based on citation quality and similarity scores
    const avgCitationSimilarity = citationCount > 0
      ? violations.reduce((sum, v) => {
          const avgSim = v.citations.reduce((s, c) => s + c.relevance_score, 0) / (v.citations.length || 1)
          return sum + avgSim
        }, 0) / violations.length
      : 0

    const legalReasoningConfidence = citationCount > 0
      ? Math.min(0.95, avgCitationSimilarity * 0.8 + 0.2) // Scale to 0.2-0.95 range
      : 0.5 // Default to 0.5 if no citations (rule-based only)

    // Calculate risk scores using Risk Engine
    console.log('[v0] Calculating enforcement risk scores...')
    const { calculateOverallRisk, generateRiskSummary } = await import('@/lib/risk-engine')
    
    const riskResult = calculateOverallRisk({
      violations,
      warningLetterMatches: warningLetterContext,
      recallMatches: recallContext,
      extractionConfidence,
      legalReasoningConfidence,
    })

    // Replace violations with risk-enhanced versions
    violations = riskResult.violationsWithRisk

    console.log('[v0] Overall Risk Score:', riskResult.overallRiskScore, '/ 10')
    console.log('[v0] Risk Assessment:', riskResult.riskAssessment)
    console.log('[v0] Projected Risk (after fixes):', riskResult.projectedRiskScore, '/ 10')
    console.log('[v0] Enforcement Insights:', riskResult.enforcementInsights.length)

    // Determine overall result and status
    const hasCritical = violations.some((v) => v.severity === 'critical')
    const hasWarning = violations.some((v) => v.severity === 'warning')
    const overallResult = hasCritical ? 'fail' : hasWarning ? 'warning' : 'pass'

    // Set status: if needs review, go to ai_completed, otherwise verified
    const finalStatus = needsExpertReview ? 'ai_completed' : 'verified'

    // NEW: Generate commercial report summary
    // Build allFindingsForSummary from ALL violations (not just smart-mapped ones)
    // so the commercial summary includes claim violations, AI-detected issues, etc.
    console.log('[v0] Generating commercial report summary...')
    const professionalFindingCategories = new Set(professionalFindings.map(f => f.summary))
    const additionalFindings: import('@/lib/violation-to-cfr-mapper').MappedFinding[] = violations
      .filter(v => {
        // Skip violations that are already covered by professionalFindings
        const translatedCat = v.category
        return !professionalFindings.some(pf => 
          pf.cfr_reference === v.regulation_reference || 
          pf.summary.includes(translatedCat)
        )
      })
      .map(v => ({
        summary: v.category,
        legal_basis: v.regulation_reference ? `Căn cứ theo ${v.regulation_reference}` : '',
        expert_logic: v.description,
        remediation: v.suggested_fix || 'Xem chi tiết trong phần Chi Tiết Phát Hiện',
        severity: v.severity,
        cfr_reference: v.regulation_reference || '',
        confidence_score: v.confidence_score ?? 0.8,
      }))
    const allFindingsForSummary = [...professionalFindings, ...additionalFindings]
    console.log('[v0] Professional findings:', professionalFindings.length, '+ additional:', additionalFindings.length, '= total for summary:', allFindingsForSummary.length)
    const commercialSummary = SmartCitationFormatter.createReportSummary(allFindingsForSummary)
    const expertTips = SmartCitationFormatter.generateExpertTips(allFindingsForSummary)

    // Update report with results including ALL analysis and cost tracking
    console.log('[v0] ========== ANALYSIS SUMMARY ==========')
    console.log('[v0] Packaging Format:', formatConfig?.name || 'Not specified (default: single_package)')
    console.log('[v0] Total violations found:', violations.length)
    console.log('[v0] Smart mapped violations:', detectedViolations.length)
    console.log('[v0] Professional findings:', professionalFindings.length)
    console.log('[v0] Contrast violations:', contrastViolations.length)
    console.log('[v0] Geometry violations:', geometryViolations.length)
    console.log('[v0] Claim violations:', claimViolations.length)
    console.log('[v0] Warning letter matches:', warningLetterContext.length)
    console.log('[v0] Recall enforcement matches:', recallContext.length)
    console.log('[v0] Citations from Knowledge Base:', citationCount)
    console.log('[v0] Extraction Confidence:', (extractionConfidence * 100).toFixed(1) + '%')
    console.log('[v0] Legal Reasoning Confidence:', (legalReasoningConfidence * 100).toFixed(1) + '%')
    console.log('[v0] AI tokens used:', totalTokensUsed)
    console.log('[v0] Estimated cost: $' + ((totalTokensUsed / 1000) * 0.005).toFixed(4))
    console.log('[v0] PDP Area:', panelAreaSquareInches.toFixed(2), 'sq in (source:', pdpAreaSource + ')')
    console.log('[v0] Needs expert review:', needsExpertReview)
    console.log('[v0] Expert tips generated:', expertTips.length)
    console.log('[v0] =========================================')
    
    const { error: updateError } = await supabase
      .from('audit_reports')
      .update({
        status: finalStatus,
        overall_result: overallResult,
        // NOTE: `findings` and `violations` store the SAME array for backward compatibility.
        // `findings` is the canonical column; `violations` is kept because dashboard, checkout,
        // preview, expert-review, and audit-history pages read `report.violations` directly.
        // TODO: Migrate all readers to use `findings` then drop the `violations` column.
        findings: violations,
        geometry_violations: geometryViolations,
        contrast_violations: contrastViolations,
        claim_violations: claimViolations,
        multilanguage_issues: multiLanguageIssues ? [multiLanguageIssues] : [],
        needs_expert_review: needsExpertReview,
        citation_count: citationCount,
        required_disclaimers: disclaimers,
        pixels_per_inch: conversionResult?.pixelsPerInch,
        pdp_area_square_inches: conversionResult?.pdpAreaSquareInches || (pdpAreaSource !== 'default_conservative' ? panelAreaSquareInches : null),
        ai_tokens_used: totalTokensUsed,
        ai_cost_usd: (totalTokensUsed / 1000) * 0.005, // Approximate cost: $0.005 per 1K tokens
        commercial_summary: commercialSummary, // NEW: Professional report summary
        expert_tips: expertTips, // NEW: Expert recommendations
        // Vision extracted data for display in UI
        nutrition_facts: visionResult.nutritionFacts || [],
        ingredient_list: visionResult.ingredients?.join(', ') || null,
        allergen_declaration: visionResult.allergens?.join(', ') || null,
        health_claims: visionResult.detectedClaims || [],
        detected_languages: visionResult.detectedLanguages || ['English'],
        brand_name: visionResult.textElements?.brandName?.text || null,
        product_name: visionResult.textElements?.productName?.text || null,
        net_quantity: visionResult.textElements?.netQuantity?.text || null,
        ocr_confidence: visionResult.overallConfidence || null,
        overall_risk_score: riskResult.overallRiskScore,
        projected_risk_score: riskResult.projectedRiskScore,
        risk_assessment: riskResult.riskAssessment,
        violations: violations, // Redundant with `findings` — kept for backward compatibility (see note above)
        // Automatically unlock the report for the owner after a successful analysis.
        // This applies to all plans (Free Trial, Starter, Pro, Enterprise).
        // Reports only stay locked when analysis has NOT been performed yet.
        report_unlocked: true,
      })
      .eq('id', reportId)

    if (updateError) {
      throw updateError
    }

    // ── INCREMENT USAGE COUNTER ────────────────────────────────────────────────
    // Only count after a successful full analysis (not vision-only phase)
    if (phase !== 'vision_only' || visionDataConfirmed) {
      await supabase.rpc('increment_reports_used', { p_user_id: user.id })
    }
    // ── END INCREMENT ──────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      steps,
      violations,
      overallResult,
    })
  } catch (error) {
    console.error('[v0] Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze label' },
      { status: 500 }
    )
  }
}
