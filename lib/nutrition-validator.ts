import type { NutritionFact, NutritionValidationResult } from './types'
import type { ProductDomain } from './packaging-format-config'

/**
 * EXPANDED: Nutrition Facts Panel Validator
 * 
 * Validates:
 * 1. FDA Rounding Rules (21 CFR 101.9(c)) - Original functionality
 * 2. Mandatory Nutrients (21 CFR 101.9(c)) - Required nutrients for 2016+ format
 * 3. %DV Accuracy (21 CFR 101.9(c)(8)(iv)) - Daily Value calculations
 * 4. Added Sugars Declaration (21 CFR 101.9(c)(6)(iii)) - 2020 requirement
 * 5. Serving Size Format (21 CFR 101.9(b)) - Common household measures
 * 
 * Note: Column formatting, font size, and tabular format are NOT validated here
 * as they require visual/geometry analysis (handled by geometry-validator.ts)
 */

/**
 * FDA Nutrition Facts Rounding Rules Validator
 * 
 * IMPORTANT: Different product types have different regulations:
 * - Conventional foods: 21 CFR 101.9(c) rounding rules apply
 * - Infant formula: 21 CFR 107 applies - NO standard rounding rules
 *   (Infant formula requires HIGHER precision as it's the sole nutrition source for infants)
 * - Dietary supplements: 21 CFR 101.36 applies
 * 
 * Reference: 21 CFR 101.9, 21 CFR 107, Infant Formula Act (IFA)
 */

// Product types exempt from 21 CFR 101.9(c) rounding rules
const ROUNDING_EXEMPT_DOMAINS: ProductDomain[] = ['infant_formula', 'supplement']

export class NutritionValidator {
  /**
   * Validate calories according to FDA rounding rules
   * - Less than 5 calories: express as 0
   * - 5 to 50 calories: express to nearest 5 calorie increment
   * - Above 50 calories: express to nearest 10 calorie increment
   */
  static validateCalories(value: number): { isValid: boolean; expected: number } {
    if (value < 5) {
      return { isValid: value === 0, expected: 0 }
    }
    if (value <= 50) {
      const expected = Math.round(value / 5) * 5
      return { isValid: value === expected, expected }
    }
    const expected = Math.round(value / 10) * 10
    return { isValid: value === expected, expected }
  }

  /**
   * Validate total fat according to FDA rounding rules
   * - Less than 0.5g: express as 0g
   * - 0.5g to 5g: express to nearest 0.5g
   * - Above 5g: express to nearest 1g
   */
  static validateFat(value: number): { isValid: boolean; expected: number } {
    if (value < 0.5) {
      return { isValid: value === 0, expected: 0 }
    }
    if (value < 5) {
      const expected = Math.round(value * 2) / 2
      return { isValid: Math.abs(value - expected) < 0.01, expected }
    }
    const expected = Math.round(value)
    return { isValid: Math.abs(value - expected) < 0.01, expected }
  }

  /**
   * Validate sugars according to FDA rounding rules
   * - Less than 0.5g: express as 0g or "less than 1g"
   * - 0.5g and above: express to nearest 1g
   */
  static validateSugar(value: number): { isValid: boolean; expected: number } {
    if (value < 0.5) {
      return { isValid: value === 0, expected: 0 }
    }
    const expected = Math.round(value)
    return { isValid: Math.abs(value - expected) < 0.01, expected }
  }

  /**
   * Validate sodium according to FDA rounding rules
   * - Less than 5mg: express as 0mg
   * - 5mg to 140mg: express to nearest 5mg
   * - Above 140mg: express to nearest 10mg
   */
  static validateSodium(value: number): { isValid: boolean; expected: number } {
    if (value < 5) {
      return { isValid: value === 0, expected: 0 }
    }
    if (value <= 140) {
      const expected = Math.round(value / 5) * 5
      return { isValid: value === expected, expected }
    }
    const expected = Math.round(value / 10) * 10
    return { isValid: value === expected, expected }
  }

  /**
   * Comprehensive validation of nutrition facts
   * 
   * @param facts - Array of nutrition facts to validate
   * @param productDomain - Product domain (e.g., 'food', 'infant_formula', 'supplement')
   *                        Infant formula and supplements are EXEMPT from 21 CFR 101.9(c) rounding rules
   */
  static validateNutritionFacts(
    facts: NutritionFact[],
    productDomain?: ProductDomain
  ): NutritionValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // CRITICAL: Infant formula (21 CFR 107) and dietary supplements (21 CFR 101.36)
    // are NOT subject to 21 CFR 101.9(c) rounding rules.
    // Infant formula REQUIRES higher precision because it's the sole nutrition source for infants.
    if (productDomain && ROUNDING_EXEMPT_DOMAINS.includes(productDomain)) {
      // Return valid with no errors - these products use their own precision rules
      return {
        isValid: true,
        errors: [],
        warnings: [],
      }
    }

    for (const fact of facts) {
      const name = fact.name.toLowerCase()

      if (name.includes('calorie')) {
        const validation = this.validateCalories(fact.value)
        if (!validation.isValid) {
          errors.push(
            `Calories value ${fact.value} does not follow FDA rounding rules. Expected: ${validation.expected}`
          )
        }
      } else if (name.includes('fat') && !name.includes('fatty')) {
        const validation = this.validateFat(fact.value)
        if (!validation.isValid) {
          errors.push(
            `Fat value ${fact.value}g does not follow FDA rounding rules. Expected: ${validation.expected}g`
          )
        }
      } else if (name.includes('sugar')) {
        const validation = this.validateSugar(fact.value)
        if (!validation.isValid) {
          warnings.push(
            `Sugar value ${fact.value}g may not follow FDA rounding rules. Expected: ${validation.expected}g`
          )
        }
      } else if (name.includes('sodium')) {
        const validation = this.validateSodium(fact.value)
        if (!validation.isValid) {
          errors.push(
            `Sodium value ${fact.value}mg does not follow FDA rounding rules. Expected: ${validation.expected}mg`
          )
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Check if serving size follows FDA common household measures
   */
  static validateServingSize(servingSize: string): {
    isValid: boolean
    error?: string
  } {
    const commonMeasures = [
      'cup',
      'tablespoon',
      'teaspoon',
      'piece',
      'slice',
      'oz',
      'container',
      'package',
    ]

    const hasCommonMeasure = commonMeasures.some((measure) =>
      servingSize.toLowerCase().includes(measure)
    )

    if (!hasCommonMeasure) {
      return {
        isValid: false,
        error:
          'Serving size must include common household measures (cup, tablespoon, piece, etc.)',
      }
    }

    return { isValid: true }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Nutrition Facts Panel Formatting Compliance (21 CFR 101.9 & 101.36)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate %DV (Daily Value) accuracy
   * Reference: 21 CFR 101.9(c)(8)(iv) - %DV must be calculated correctly
   * 
   * @param nutrient - Nutrient name (e.g., "Total Fat", "Sodium")
   * @param actualValue - Value on label (in g, mg, etc.)
   * @param claimedDV - %DV shown on label
   */
  static validateDailyValue(
    nutrient: string,
    actualValue: number,
    claimedDV: number,
    unit: string
  ): { isValid: boolean; expected: number; error?: string } {
    // FDA Daily Reference Values (DRV) for 2,000 calorie diet - 21 CFR 101.9(c)(9)
    const dailyReferenceValues: Record<string, { value: number; unit: string }> = {
      'total fat': { value: 78, unit: 'g' },
      'saturated fat': { value: 20, unit: 'g' },
      'cholesterol': { value: 300, unit: 'mg' },
      'sodium': { value: 2300, unit: 'mg' },
      'total carbohydrate': { value: 275, unit: 'g' },
      'dietary fiber': { value: 28, unit: 'g' },
      'total sugars': { value: 50, unit: 'g' },
      'added sugars': { value: 50, unit: 'g' },
      'protein': { value: 50, unit: 'g' },
      'vitamin d': { value: 20, unit: 'mcg' },
      'calcium': { value: 1300, unit: 'mg' },
      'iron': { value: 18, unit: 'mg' },
      'potassium': { value: 4700, unit: 'mg' },
    }

    const nutrientKey = nutrient.toLowerCase()
    const drv = dailyReferenceValues[nutrientKey]

    if (!drv) {
      // Nutrient not in DRV list - can't validate
      return { isValid: true, expected: claimedDV }
    }

    // Calculate expected %DV
    const expectedDV = Math.round((actualValue / drv.value) * 100)

    // Allow ±2% tolerance for rounding
    const isValid = Math.abs(expectedDV - claimedDV) <= 2

    if (!isValid) {
      return {
        isValid: false,
        expected: expectedDV,
        error: `%DV for ${nutrient} should be ${expectedDV}% based on ${actualValue}${unit} (claimed: ${claimedDV}%)`,
      }
    }

    return { isValid: true, expected: expectedDV }
  }

  /**
   * Check mandatory nutrients are present (21 CFR 101.9(c))
   * 2016+ format requires: Calories, Total Fat, Saturated Fat, Trans Fat,
   * Cholesterol, Sodium, Total Carb, Dietary Fiber, Total Sugars, Added Sugars,
   * Protein, Vitamin D, Calcium, Iron, Potassium
   */
  static validateMandatoryNutrients(
    facts: NutritionFact[]
  ): { isValid: boolean; missing: string[] } {
    const mandatoryNutrients = [
      'calories',
      'total fat',
      'saturated fat',
      'trans fat',
      'cholesterol',
      'sodium',
      'total carbohydrate',
      'dietary fiber',
      'total sugars',
      'added sugars', // Required since 2020
      'protein',
      'vitamin d',    // Required since 2016 update
      'calcium',
      'iron',
      'potassium',    // Required since 2016 update
    ]

    const presentNutrients = facts.map(f => 
      (f.name || '').toLowerCase().replace(/[^a-z\s]/g, '').trim()
    )

    const missing = mandatoryNutrients.filter(nutrient => {
      // Check if any present nutrient contains this mandatory nutrient name
      return !presentNutrients.some(present => 
        present.includes(nutrient) || nutrient.includes(present)
      )
    })

    return {
      isValid: missing.length === 0,
      missing,
    }
  }

  /**
   * Validate Added Sugars declaration (21 CFR 101.9(c)(6)(iii))
   * Added Sugars must be indented and include %DV
   * Total Sugars should NOT have %DV (per FDA guidance)
   */
  static validateSugarsDeclaration(
    totalSugars: NutritionFact | undefined,
    addedSugars: NutritionFact | undefined
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!addedSugars) {
      errors.push('Added Sugars declaration is required per 2016 FDA label update (21 CFR 101.9(c)(6)(iii))')
    } else {
      if (addedSugars.dailyValue === undefined || addedSugars.dailyValue === null) {
        errors.push('Added Sugars must include %Daily Value')
      }
    }

    // Total Sugars should NOT show %DV (FDA guidance)
    if (totalSugars && totalSugars.dailyValue !== undefined && totalSugars.dailyValue > 0) {
      errors.push('Total Sugars should NOT display %Daily Value (only Added Sugars should have %DV)')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Comprehensive Nutrition Facts Panel validation
   * Combines all checks: rounding rules, mandatory nutrients, %DV accuracy, sugars
   */
  static validateNutritionFactsPanel(
    facts: NutritionFact[],
    productDomain?: ProductDomain
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    missingNutrients: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Skip validation for exempt products
    if (productDomain && ROUNDING_EXEMPT_DOMAINS.includes(productDomain)) {
      return { isValid: true, errors: [], warnings: [], missingNutrients: [] }
    }

    // 1. Rounding rules validation
    const roundingResult = this.validateNutritionFacts(facts, productDomain)
    errors.push(...roundingResult.errors)
    warnings.push(...roundingResult.warnings)

    // 2. Mandatory nutrients check
    const mandatoryResult = this.validateMandatoryNutrients(facts)
    if (!mandatoryResult.isValid) {
      warnings.push(`Missing mandatory nutrients: ${mandatoryResult.missing.join(', ')}`)
    }

    // 3. Added sugars declaration check
    const totalSugars = facts.find(f => 
      f.name.toLowerCase().includes('total sugar') && 
      !f.name.toLowerCase().includes('added')
    )
    const addedSugars = facts.find(f => 
      f.name.toLowerCase().includes('added sugar')
    )
    const sugarsResult = this.validateSugarsDeclaration(totalSugars, addedSugars)
    warnings.push(...sugarsResult.errors)

    // 4. %DV accuracy check for each nutrient with claimed %DV
    for (const fact of facts) {
      if (fact.dailyValue !== undefined && fact.dailyValue > 0) {
        const dvResult = this.validateDailyValue(
          fact.name,
          fact.value,
          fact.dailyValue,
          fact.unit || ''
        )
        if (!dvResult.isValid && dvResult.error) {
          warnings.push(dvResult.error)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingNutrients: mandatoryResult.missing,
    }
  }
}
