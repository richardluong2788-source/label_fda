import type { VisionAnalysisResult } from './ai-vision-analyzer'
import type { KnowledgeSearchResult } from './embedding-utils'
import { getPackagingFormat, getExemptFields, getMinFontSize, mapProductTypeToDomain, type PackagingFormatId, type ProductDomain } from './packaging-format-config'

export interface ViolationMapping {
  type: 'font_size' | 'rounding' | 'net_weight' | 'ingredient_order' | 'allergen_bold' | 'color_contrast' | 'hairlines' | 'missing_field'
  severity: 'critical' | 'warning' | 'info'
  detectedValue: any
  requiredValue: any
  regulationSection: string
  logicCondition: string
}

export interface MappedFinding {
  summary: string
  legal_basis: string
  expert_logic: string
  remediation: string
  severity: 'critical' | 'warning' | 'info'
  cfr_reference: string
  confidence_score: number
}

/**
 * VIOLATION-TO-CFR MAPPER
 * Maps Vision AI findings to specific CFR regulations with business logic
 */
export class ViolationToCFRMapper {
  /**
   * Map font size violations
   */
  static mapFontSizeViolation(
    element: string,
    detectedSize: number,
    requiredSize: number,
    pdpArea: number,
    regulation: KnowledgeSearchResult | null
  ): ViolationMapping | null {
    // Logic: conventional food, PDP >= 40 sq in, Nutrition Facts title must be >= 16pt
    if (element === 'Nutrition Facts Title' && pdpArea >= 40 && detectedSize < requiredSize) {
      return {
        type: 'font_size',
        severity: 'critical',
        detectedValue: `${detectedSize}pt`,
        requiredValue: `${requiredSize}pt`,
        regulationSection: regulation?.regulation_id || '21 CFR 101.9(d)(1)(iv)',
        logicCondition: `PDP area >= 40 sq in AND font_size < ${requiredSize}pt`
      }
    }
    return null
  }

  /**
   * Map rounding rule violations
   */
  static mapRoundingViolation(
    nutrient: string,
    detectedValue: number,
    correctValue: number,
    regulation: KnowledgeSearchResult | null
  ): ViolationMapping | null {
    // Calories must be rounded to nearest 5
    if (nutrient === 'Calories' && detectedValue % 5 !== 0) {
      return {
        type: 'rounding',
        severity: 'critical',
        detectedValue: `${detectedValue} kcal`,
        requiredValue: `${correctValue} kcal`,
        regulationSection: regulation?.regulation_id || '21 CFR 101.9(c)(1)',
        logicCondition: 'calories % 5 != 0'
      }
    }

    // Trans fat < 0.5g must be expressed as 0
    if (nutrient === 'Trans Fat' && detectedValue > 0 && detectedValue < 0.5) {
      return {
        type: 'rounding',
        severity: 'critical',
        detectedValue: `${detectedValue}g`,
        requiredValue: '0g',
        regulationSection: regulation?.regulation_id || '21 CFR 101.9(c)(2)(ii)',
        logicCondition: 'trans_fat > 0 AND trans_fat < 0.5'
      }
    }

    return null
  }

  /**
   * Map net weight violations (dual declaration required)
   */
  static mapNetWeightViolation(
    netQuantityText: string,
    regulation: KnowledgeSearchResult | null
  ): ViolationMapping | null {
    const hasMetric = /\d+\s*(g|kg|ml|l)/i.test(netQuantityText)
    const hasImperial = /\d+\s*(oz|lb|fl oz)/i.test(netQuantityText)

    if (!hasMetric || !hasImperial) {
      return {
        type: 'net_weight',
        severity: 'critical',
        detectedValue: netQuantityText,
        requiredValue: 'Both metric (g/ml) and imperial (oz/fl oz) units',
        regulationSection: regulation?.regulation_id || '21 CFR 101.105',
        logicCondition: '!hasMetric OR !hasImperial'
      }
    }

    return null
  }

  /**
   * Map ingredient order violations
   * NOTE: This is a SOFT WARNING only - cannot definitively determine order without weight data
   */
  static mapIngredientOrderViolation(
    ingredients: string[],
    regulation: KnowledgeSearchResult | null
  ): ViolationMapping | null {
    // ONLY create violation if we have substantial ingredient list (3+ items)
    // AND this is just a reminder to verify, not a definitive violation
    if (ingredients.length >= 3) {
      return {
        type: 'ingredient_order',
        severity: 'warning',
        detectedValue: ingredients.join(', '),
        requiredValue: 'Descending order by weight',
        regulationSection: regulation?.regulation_id || '21 CFR 101.4(a)(1)',
        logicCondition: 'ingredients detected - verify order matches actual weights'
      }
    }
    return null
  }

  /**
   * Map allergen bold formatting violations
   * ONLY triggers if allergens are actually detected in the label text
   * NOTE: Currently not called because Vision AI cannot reliably detect
   * per-word font weight in ingredient lists. Re-enable when Vision output
   * includes bold/distinctive formatting metadata for individual words.
   */
  static mapAllergenBoldViolation(
    allergens: string[],
    isBold: boolean,
    hasAllergenText: boolean,
    regulation: KnowledgeSearchResult | null
  ): ViolationMapping | null {
    // ONLY create violation if:
    // 1. Allergens are detected in label
    // 2. We can confirm they're in ingredient list
    // 3. They're not bolded
    if (allergens.length > 0 && hasAllergenText && !isBold) {
      return {
        type: 'allergen_bold',
        severity: 'critical',
        detectedValue: 'Normal text',
        requiredValue: 'Bold or distinctive type',
        regulationSection: regulation?.regulation_id || 'FALCPA Section 203(w)(1)',
        logicCondition: 'allergens detected in ingredient list AND !isBold'
      }
    }
    return null
  }

  /**
   * Map color contrast violations
   */
  static mapColorContrastViolation(
    element: string,
    ratio: number,
    minRatio: number,
    regulation: KnowledgeSearchResult | null
  ): ViolationMapping | null {
    if (ratio < minRatio) {
      return {
        type: 'color_contrast',
        severity: 'warning',
        detectedValue: `${ratio.toFixed(1)}:1`,
        requiredValue: `${minRatio}:1 minimum`,
        regulationSection: regulation?.regulation_id || '21 CFR 101.15(d)',
        logicCondition: `contrast_ratio < ${minRatio}`
      }
    }
    return null
  }

  /**
   * Map hairlines vs dots violation
   */
  static mapHairlinesViolation(
    hasHairlines: boolean,
    pdpArea: number,
    regulation: KnowledgeSearchResult | null
  ): ViolationMapping | null {
    if (hasHairlines && pdpArea < 40) {
      return {
        type: 'hairlines',
        severity: 'warning',
        detectedValue: 'Using hairlines',
        requiredValue: 'Use dots instead when space limited',
        regulationSection: regulation?.regulation_id || '21 CFR 101.9(j)(13)(ii)(A)(2)',
        logicCondition: 'hasHairlines AND pdp_area < 40'
      }
    }
    return null
  }

  /**
   * Auto-detect violations from vision data
   * @param packagingFormat - Optional packaging format to apply format-specific rules
   */
  static detectViolations(
    visionResult: VisionAnalysisResult,
    pdpArea: number,
    regulations: KnowledgeSearchResult[],
    packagingFormat?: PackagingFormatId,
    productDomain?: ProductDomain
  ): ViolationMapping[] {
    const violations: ViolationMapping[] = []

    const domain: ProductDomain = productDomain || 'food'

    // Get packaging format exemptions (domain-aware)
    const formatConfig = packagingFormat ? getPackagingFormat(packagingFormat) : null
    const exemptFields = packagingFormat ? getExemptFields(packagingFormat, domain) : []
    const minFontForFormat = packagingFormat ? getMinFontSize(packagingFormat, pdpArea, domain) : 6

    // Find relevant regulations
    const fontSizeReg = regulations.find(r => r.regulation_id.includes('101.9') && r.content.toLowerCase().includes('font'))
    const roundingReg = regulations.find(r => r.regulation_id.includes('101.9(c)'))
    const netWeightReg = regulations.find(r => r.regulation_id.includes('101.105'))
    const ingredientReg = regulations.find(r => r.regulation_id.includes('101.4'))
    const allergenReg = regulations.find(r => r.content.toLowerCase().includes('allergen'))

    // Check font size for Nutrition Facts title
    // CRITICAL FIX: "Nutrition Facts" is NOT in brandName field!
    // We need to detect it from the allText or create a dedicated field
    // For now, only flag if we can confirm "Nutrition Facts" text exists and has metadata
    const allText = visionResult.textElements.allText || ''
    const hasNutritionFactsLabel = allText.toLowerCase().includes('nutrition facts')
    
    // Only check if we have evidence of a Nutrition Facts panel
    // PACKAGING FORMAT: Skip Nutrition Facts font check for outer cartons that don't require them
    const skipNutritionCheck = exemptFields.includes('nutrition_facts')
    if (hasNutritionFactsLabel && pdpArea >= 40 && !skipNutritionCheck) {
      // Try to infer font size from context - if we have nutrition data but all text elements are 0pt,
      // this is a data quality issue, not a compliance issue
      let inferredNFFontSize = 0
      
      // Check if we have any text elements with valid font sizes
      const validFontSizes = [
        visionResult.textElements.brandName?.fontSize || 0,
        visionResult.textElements.productName?.fontSize || 0,
        visionResult.textElements.netQuantity?.fontSize || 0
      ].filter(size => size > 0)
      
      if (validFontSizes.length > 0) {
        // If we have valid font sizes for other elements, we can make an inference
        // "Nutrition Facts" title is typically the largest or near-largest text
        inferredNFFontSize = Math.max(...validFontSizes)
      }
      
      // ONLY flag violation if:
      // 1. We have valid font size data from other elements (proving AI can read fonts)
      // 2. AND the largest detected font is still < 16pt
      // This prevents false positives when AI simply fails to extract font data
      if (validFontSizes.length > 0 && inferredNFFontSize < 16) {
        const violation = this.mapFontSizeViolation(
          'Nutrition Facts Title', 
          inferredNFFontSize, 
          16, 
          pdpArea, 
          fontSizeReg || null
        )
        if (violation) violations.push(violation)
      } else if (validFontSizes.length === 0) {
        console.log('[v0] SKIPPING font size check - no valid font data extracted (AI OCR issue, not compliance issue)')
      }
    }

    // Check rounding for nutrition facts
    // PACKAGING FORMAT: Skip if nutrition_facts are exempt (e.g., outer carton)
    const skipRoundingCheck = exemptFields.includes('nutrition_facts')
    for (const nutrient of (skipRoundingCheck ? [] : visionResult.nutritionFacts)) {
      if (nutrient.name === 'Calories' && nutrient.value % 5 !== 0) {
        const correctValue = Math.round(nutrient.value / 5) * 5
        const violation = this.mapRoundingViolation('Calories', nutrient.value, correctValue, roundingReg || null)
        if (violation) violations.push(violation)
      }

      if (nutrient.name === 'Trans Fat' && nutrient.value > 0 && nutrient.value < 0.5) {
        const violation = this.mapRoundingViolation('Trans Fat', nutrient.value, 0, roundingReg || null)
        if (violation) violations.push(violation)
      }
    }

    // Check net weight dual declaration
    const netQty = visionResult.textElements.netQuantity
    if (netQty) {
      const violation = this.mapNetWeightViolation(netQty.text, netWeightReg || null)
      if (violation) violations.push(violation)
    }

    // Check ingredient order
    // PACKAGING FORMAT: Skip for formats that don't require full ingredient list
    if (visionResult.ingredients.length > 0 && !exemptFields.includes('ingredient_list')) {
      const violation = this.mapIngredientOrderViolation(visionResult.ingredients, ingredientReg || null)
      if (violation) violations.push(violation)
    }

    // Check allergen bold - only if allergens AND ingredients list both present
    // FIX: Vision AI cannot reliably detect bold/distinctive formatting on individual allergen
    // words within the ingredient list. Hardcoding isBold=false caused 100% false positive rate.
    // Instead: only flag if we have HIGH confidence the allergens are NOT in distinctive type.
    // Since we CANNOT determine this from current Vision output, we skip this check entirely
    // and downgrade to an informational note in the allergen declaration check (analyze route).
    // Re-enable this when Vision AI can extract per-word font weight from ingredient lists.
    if (visionResult.allergens.length > 0 && visionResult.ingredients.length > 0) {
      const hasAllergenText = visionResult.textElements.allText.toLowerCase().includes('allergen') ||
                               visionResult.textElements.allText.toLowerCase().includes('contains:')
      if (hasAllergenText) {
        // We know allergens are declared. We cannot verify bold formatting from Vision AI,
        // so we do NOT create a violation here. This avoids 100% false positive rate.
        console.log('[v0] Allergen text found - skipping bold check (Vision AI cannot verify font weight)')
      }
    }

    return violations
  }
}
