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

    // 5. Impossible value checks (NF-MATH-003 to NF-MATH-008)
    const impossibleValueResult = this.validateImpossibleValues(facts)
    errors.push(...impossibleValueResult.errors)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingNutrients: mandatoryResult.missing,
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Multi-Column Nutrition Facts Validation (21 CFR §101.9(b)(12))
  // For variety packs with multiple products in one package
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPOSSIBLE VALUE DETECTION (NF-MATH-003, NF-MATH-005)
  // These are CRITICAL checks - missing them = false negatives
  // Reference: VXG-DEV-SPEC-NF-001 Section 4.1
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * NF-MATH-003: Added Sugars ≤ Total Sugars
   * Added sugars cannot exceed total sugars - this is a physical impossibility
   * Reference: 21 CFR 101.9(c)(6)(iii)
   */
  static validateAddedSugarsLessThanTotal(
    totalSugars: number | undefined,
    addedSugars: number | undefined
  ): { isValid: boolean; error?: string } {
    if (totalSugars === undefined || addedSugars === undefined) {
      return { isValid: true } // Can't validate if values missing
    }

    // Allow small tolerance for rounding (0.5g)
    if (addedSugars > totalSugars + 0.5) {
      return {
        isValid: false,
        error: `[NF-MATH-003] Added Sugars (${addedSugars}g) exceeds Total Sugars (${totalSugars}g). ` +
          `This is physically impossible - Added Sugars must be ≤ Total Sugars per 21 CFR 101.9(c)(6)(iii).`,
      }
    }

    return { isValid: true }
  }

  /**
   * NF-MATH-005: Saturated Fat ≤ Total Fat
   * Saturated fat cannot exceed total fat - this is a physical impossibility
   * Reference: 21 CFR 101.9(c)(2)
   */
  static validateSaturatedFatLessThanTotal(
    totalFat: number | undefined,
    saturatedFat: number | undefined
  ): { isValid: boolean; error?: string } {
    if (totalFat === undefined || saturatedFat === undefined) {
      return { isValid: true } // Can't validate if values missing
    }

    // Allow small tolerance for rounding (0.5g)
    if (saturatedFat > totalFat + 0.5) {
      return {
        isValid: false,
        error: `[NF-MATH-005] Saturated Fat (${saturatedFat}g) exceeds Total Fat (${totalFat}g). ` +
          `This is physically impossible - Saturated Fat must be ≤ Total Fat per 21 CFR 101.9(c)(2).`,
      }
    }

    return { isValid: true }
  }

  /**
   * NF-MATH-009: Trans Fat ≤ Total Fat (additional impossible value check)
   * Trans fat cannot exceed total fat
   * 
   * NOTE: NF-MATH-004 in spec is "%DV Math Verification" which is handled by validateDailyValue()
   * This rule (Trans Fat check) is an additional impossible value check beyond spec
   */
  static validateTransFatLessThanTotal(
    totalFat: number | undefined,
    transFat: number | undefined
  ): { isValid: boolean; error?: string } {
    if (totalFat === undefined || transFat === undefined) {
      return { isValid: true }
    }

    if (transFat > totalFat + 0.5) {
      return {
        isValid: false,
        error: `[NF-MATH-009] Trans Fat (${transFat}g) exceeds Total Fat (${totalFat}g). ` +
          `This is physically impossible - Trans Fat must be ≤ Total Fat.`,
      }
    }

    return { isValid: true }
  }

  /**
   * NF-MATH-006: Saturated + Trans ≤ Total Fat
   * Combined saturated and trans fat cannot exceed total fat
   */
  static validateCombinedFatsLessThanTotal(
    totalFat: number | undefined,
    saturatedFat: number | undefined,
    transFat: number | undefined
  ): { isValid: boolean; error?: string } {
    if (totalFat === undefined) {
      return { isValid: true }
    }

    const combined = (saturatedFat || 0) + (transFat || 0)
    
    // Allow 1g tolerance for rounding
    if (combined > totalFat + 1) {
      return {
        isValid: false,
        error: `[NF-MATH-006] Saturated Fat (${saturatedFat || 0}g) + Trans Fat (${transFat || 0}g) = ${combined}g exceeds Total Fat (${totalFat}g). ` +
          `This is physically impossible.`,
      }
    }

    return { isValid: true }
  }

  /**
   * NF-MATH-007: Dietary Fiber ≤ Total Carbohydrate
   * Dietary fiber is part of carbohydrates
   */
  static validateFiberLessThanCarbs(
    totalCarbs: number | undefined,
    dietaryFiber: number | undefined
  ): { isValid: boolean; error?: string } {
    if (totalCarbs === undefined || dietaryFiber === undefined) {
      return { isValid: true }
    }

    if (dietaryFiber > totalCarbs + 0.5) {
      return {
        isValid: false,
        error: `[NF-MATH-007] Dietary Fiber (${dietaryFiber}g) exceeds Total Carbohydrate (${totalCarbs}g). ` +
          `This is physically impossible - Dietary Fiber is a component of Total Carbohydrate.`,
      }
    }

    return { isValid: true }
  }

  /**
   * NF-MATH-008: Total Sugars ≤ Total Carbohydrate
   * Total sugars is part of carbohydrates
   */
  static validateSugarsLessThanCarbs(
    totalCarbs: number | undefined,
    totalSugars: number | undefined
  ): { isValid: boolean; error?: string } {
    if (totalCarbs === undefined || totalSugars === undefined) {
      return { isValid: true }
    }

    if (totalSugars > totalCarbs + 0.5) {
      return {
        isValid: false,
        error: `[NF-MATH-008] Total Sugars (${totalSugars}g) exceeds Total Carbohydrate (${totalCarbs}g). ` +
          `This is physically impossible - Total Sugars is a component of Total Carbohydrate.`,
      }
    }

    return { isValid: true }
  }

  /**
   * Run all impossible value checks on a set of nutrition facts
   * Returns all errors found
   */
  static validateImpossibleValues(
    facts: NutritionFact[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Helper to find nutrient value
    const getValue = (patterns: string[]): number | undefined => {
      for (const pattern of patterns) {
        const fact = facts.find(f => f.name.toLowerCase().includes(pattern))
        if (fact) return fact.value
      }
      return undefined
    }

    // Extract values
    const totalFat = getValue(['total fat'])
    const saturatedFat = getValue(['saturated fat', 'sat fat'])
    const transFat = getValue(['trans fat'])
    const totalCarbs = getValue(['total carbohydrate', 'total carb'])
    const dietaryFiber = getValue(['dietary fiber', 'fiber'])
    const totalSugars = getValue(['total sugar'])
    const addedSugars = getValue(['added sugar'])

    // NF-MATH-003: Added Sugars ≤ Total Sugars
    const sugarsCheck = this.validateAddedSugarsLessThanTotal(totalSugars, addedSugars)
    if (!sugarsCheck.isValid && sugarsCheck.error) {
      errors.push(sugarsCheck.error)
    }

    // NF-MATH-005: Saturated Fat ≤ Total Fat
    const satFatCheck = this.validateSaturatedFatLessThanTotal(totalFat, saturatedFat)
    if (!satFatCheck.isValid && satFatCheck.error) {
      errors.push(satFatCheck.error)
    }

    // NF-MATH-009: Trans Fat ≤ Total Fat
    const transFatCheck = this.validateTransFatLessThanTotal(totalFat, transFat)
    if (!transFatCheck.isValid && transFatCheck.error) {
      errors.push(transFatCheck.error)
    }

    // NF-MATH-006: Saturated + Trans ≤ Total Fat
    const combinedFatCheck = this.validateCombinedFatsLessThanTotal(totalFat, saturatedFat, transFat)
    if (!combinedFatCheck.isValid && combinedFatCheck.error) {
      errors.push(combinedFatCheck.error)
    }

    // NF-MATH-007: Dietary Fiber ≤ Total Carbohydrate
    const fiberCheck = this.validateFiberLessThanCarbs(totalCarbs, dietaryFiber)
    if (!fiberCheck.isValid && fiberCheck.error) {
      errors.push(fiberCheck.error)
    }

    // NF-MATH-008: Total Sugars ≤ Total Carbohydrate
    const sugarsVsCarbsCheck = this.validateSugarsLessThanCarbs(totalCarbs, totalSugars)
    if (!sugarsVsCarbsCheck.isValid && sugarsVsCarbsCheck.error) {
      errors.push(sugarsVsCarbsCheck.error)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-COLUMN MATH VALIDATION (NF-MATH-001, NF-MATH-002)
  // These validate Per Serving vs Per Container consistency
  // Reference: VXG-DEV-SPEC-NF-001 Section 4.1
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * NF-MATH-001: Calorie Consistency (Per Serving vs Per Container)
   * Validates: Per Container Calories = Per Serving Calories × Servings Per Container
   * 
   * Example: If Per Serving = 120 kcal and Servings = 2, then Per Container should = 240 kcal
   * Tolerance: ±5 kcal (fixed, accounts for rounding per 21 CFR 101.9(c))
   * Reference: 21 CFR 101.9(c) - Rounding rules for calories
   */
  static validateCalorieConsistency(
    perServingCalories: number,
    perContainerCalories: number,
    servingsPerContainer: number
  ): { isValid: boolean; error?: string; expected: number } {
    const expected = perServingCalories * servingsPerContainer
    
    // Tolerance: ±5 kcal (fixed, not percentage-based)
    // Per 21 CFR 101.9(c): calories can be rounded to nearest 5 or 10
    // So ±5 kcal tolerance accounts for cumulative rounding errors across columns
    const tolerance = 5
    
    const diff = Math.abs(perContainerCalories - expected)
    const isValid = diff <= tolerance
    
    if (!isValid) {
      return {
        isValid: false,
        expected,
        error: `[NF-MATH-001] Calorie cross-column math error: Per Serving (${perServingCalories} kcal) × ` +
          `Servings (${servingsPerContainer}) = ${expected} kcal, but Per Container shows ${perContainerCalories} kcal. ` +
          `Difference: ${diff} kcal (tolerance: ±${Math.round(tolerance)} kcal).`,
      }
    }
    
    return { isValid: true, expected }
  }

  /**
   * NF-MATH-002: Macro Nutrient Consistency (Per Serving vs Per Container)
   * Validates: Per Container value = Per Serving value × Servings Per Container
   * 
   * Applies to: Total Fat, Saturated Fat, Trans Fat, Cholesterol, Sodium,
   * Total Carbohydrate, Dietary Fiber, Total Sugars, Added Sugars, Protein
   * 
   * Tolerance: ±0.5g for gram-based nutrients, ±5mg for milligram-based nutrients
   * Reference: 21 CFR 101.9(c) - Per nutrient rounding rules
   */
  static validateMacroConsistency(
    nutrientName: string,
    perServingValue: number,
    perContainerValue: number,
    servingsPerContainer: number,
    unit: string
  ): { isValid: boolean; error?: string; expected: number } {
    const expected = perServingValue * servingsPerContainer
    
    // Fixed tolerance per unit, not percentage-based
    // This catches real labeling errors while allowing for FDA rounding
    let tolerance: number
    if (unit === 'mg') {
      tolerance = 5 // ±5mg tolerance per FDA rounding rules
    } else {
      tolerance = 0.5 // ±0.5g tolerance (per rounding rules: 0.5g for fats, 1g for carbs/protein)
    }
    
    const diff = Math.abs(perContainerValue - expected)
    const isValid = diff <= tolerance
    
    if (!isValid) {
      return {
        isValid: false,
        expected,
        error: `[NF-MATH-002] ${nutrientName} cross-column math error: Per Serving (${perServingValue}${unit}) × ` +
          `Servings (${servingsPerContainer}) = ${expected}${unit}, but Per Container shows ${perContainerValue}${unit}. ` +
          `Difference: ${diff}${unit} (tolerance: ±${tolerance.toFixed(1)}${unit}).`,
      }
    }
    
    return { isValid: true, expected }
  }

  /**
   * Run cross-column math validation for Per Serving / Per Container dual-column format
   * This is the primary validation for Case 1 multi-column labels
   */
  static validateCrossColumnMath(
    perServingColumn: { nutritionFacts: NutritionFact[] },
    perContainerColumn: { nutritionFacts: NutritionFact[] },
    servingsPerContainer: number
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    if (servingsPerContainer <= 0) {
      warnings.push('[NF-MATH] Cannot validate cross-column math: servingsPerContainer is missing or invalid')
      return { isValid: true, errors, warnings }
    }

    // Helper to find nutrient value
    const findNutrient = (facts: NutritionFact[], patterns: string[]): NutritionFact | undefined => {
      for (const pattern of patterns) {
        const found = facts.find(f => f.name.toLowerCase().includes(pattern))
        if (found) return found
      }
      return undefined
    }

    // NF-MATH-001: Calorie Consistency
    const perServingCalories = findNutrient(perServingColumn.nutritionFacts, ['calorie'])
    const perContainerCalories = findNutrient(perContainerColumn.nutritionFacts, ['calorie'])
    
    if (perServingCalories && perContainerCalories) {
      const calorieCheck = this.validateCalorieConsistency(
        perServingCalories.value,
        perContainerCalories.value,
        servingsPerContainer
      )
      if (!calorieCheck.isValid && calorieCheck.error) {
        errors.push(calorieCheck.error)
      }
    }

    // NF-MATH-002: Macro Consistency for each nutrient
    const nutrientsToCheck = [
      { patterns: ['total fat'], name: 'Total Fat', unit: 'g' },
      { patterns: ['saturated fat', 'sat fat'], name: 'Saturated Fat', unit: 'g' },
      { patterns: ['trans fat'], name: 'Trans Fat', unit: 'g' },
      { patterns: ['cholesterol'], name: 'Cholesterol', unit: 'mg' },
      { patterns: ['sodium'], name: 'Sodium', unit: 'mg' },
      { patterns: ['total carbohydrate', 'total carb'], name: 'Total Carbohydrate', unit: 'g' },
      { patterns: ['dietary fiber', 'fiber'], name: 'Dietary Fiber', unit: 'g' },
      { patterns: ['total sugar'], name: 'Total Sugars', unit: 'g' },
      { patterns: ['added sugar'], name: 'Added Sugars', unit: 'g' },
      { patterns: ['protein'], name: 'Protein', unit: 'g' },
    ]

    for (const nutrient of nutrientsToCheck) {
      const perServing = findNutrient(perServingColumn.nutritionFacts, nutrient.patterns)
      const perContainer = findNutrient(perContainerColumn.nutritionFacts, nutrient.patterns)
      
      if (perServing && perContainer) {
        const macroCheck = this.validateMacroConsistency(
          nutrient.name,
          perServing.value,
          perContainer.value,
          servingsPerContainer,
          nutrient.unit
        )
        if (!macroCheck.isValid && macroCheck.error) {
          errors.push(macroCheck.error)
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
   * Represents a single column in multi-column Nutrition Facts
   */
  static validateMultiColumnNutritionFacts(
    columns: Array<{
      columnName: string
      servingSize?: string
      servingsPerContainer?: number
      nutritionFacts: NutritionFact[]
    }>,
    productDomain?: ProductDomain
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    columnIssues: Array<{
      column: string
      missingNutrients: string[]
      inconsistentNutrients: string[]
    }>
  } {
    const errors: string[] = []
    const warnings: string[] = []
    const columnIssues: Array<{
      column: string
      missingNutrients: string[]
      inconsistentNutrients: string[]
    }> = []

    if (!columns || columns.length < 2) {
      // Not a multi-column format - skip validation
      return { isValid: true, errors: [], warnings: [], columnIssues: [] }
    }

    console.log(`[v0] Validating multi-column Nutrition Facts: ${columns.length} columns detected`)

    // ── 21 CFR §101.9(b)(12) Requirements ────────────────────────────────────
    // Multi-column format must:
    // 1. Each column must declare ALL mandatory nutrients OR include "not a significant source of..." statement
    // 2. Serving sizes can differ between columns (valid if products are genuinely different)
    // 3. All columns must use consistent formatting

    // Mandatory nutrients that should appear in ALL columns (if product contains them)
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
      'added sugars',
      'protein',
    ]

    // Build a map of which nutrients appear in each column
    const nutrientPresenceMap = new Map<string, Set<string>>() // nutrient -> set of column names
    
    for (const column of columns) {
      const columnNutrients = column.nutritionFacts.map(f => 
        f.name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
      )
      
      for (const nutrient of columnNutrients) {
        if (!nutrientPresenceMap.has(nutrient)) {
          nutrientPresenceMap.set(nutrient, new Set())
        }
        nutrientPresenceMap.get(nutrient)!.add(column.columnName)
      }
    }

    // Check each column for missing mandatory nutrients
    for (const column of columns) {
      const columnNutrients = new Set(
        column.nutritionFacts.map(f => 
          f.name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
        )
      )
      
      const missingInColumn: string[] = []
      const inconsistentInColumn: string[] = []
      
      for (const mandatoryNutrient of mandatoryNutrients) {
        // Check if this column is missing a mandatory nutrient
        const hasNutrient = Array.from(columnNutrients).some(n => 
          n.includes(mandatoryNutrient) || mandatoryNutrient.includes(n)
        )
        
        if (!hasNutrient) {
          // Check if OTHER columns have this nutrient (inconsistency)
          const columnsWithNutrient = nutrientPresenceMap.get(mandatoryNutrient)
          if (columnsWithNutrient && columnsWithNutrient.size > 0 && !columnsWithNutrient.has(column.columnName)) {
            // Other columns have it, but this one doesn't - INCONSISTENCY
            inconsistentInColumn.push(mandatoryNutrient)
          } else {
            // No columns have it - just missing (may be intentional)
            missingInColumn.push(mandatoryNutrient)
          }
        }
      }
      
      // Also check for non-mandatory nutrients that appear in some columns but not others
      // (e.g., Riboflavin, Niacin, Thiamin in enriched flour products)
      const vitaminMinerals = ['riboflavin', 'niacin', 'thiamin', 'vitamin d', 'calcium', 'iron', 'potassium']
      for (const vm of vitaminMinerals) {
        const columnsWithNutrient = Array.from(nutrientPresenceMap.entries())
          .filter(([key]) => key.includes(vm))
          .flatMap(([, cols]) => Array.from(cols))
        
        if (columnsWithNutrient.length > 0 && !columnsWithNutrient.includes(column.columnName)) {
          const hasIt = Array.from(columnNutrients).some(n => n.includes(vm))
          if (!hasIt) {
            inconsistentInColumn.push(vm)
          }
        }
      }
      
      if (missingInColumn.length > 0 || inconsistentInColumn.length > 0) {
        columnIssues.push({
          column: column.columnName,
          missingNutrients: missingInColumn,
          inconsistentNutrients: inconsistentInColumn,
        })
      }
    }

    // Generate warnings for inconsistencies
    for (const issue of columnIssues) {
      if (issue.inconsistentNutrients.length > 0) {
        warnings.push(
          `Column "${issue.column}" is missing nutrients that other columns declare: ${issue.inconsistentNutrients.join(', ')}. ` +
          `Per 21 CFR §101.9(b)(12), multi-column format should include all nutrients across columns or use "not a significant source of..." statement.`
        )
      }
      
      if (issue.missingNutrients.length > 0) {
        // This is less severe - might be intentional if ALL columns are missing it
        warnings.push(
          `Column "${issue.column}" is missing mandatory nutrients: ${issue.missingNutrients.join(', ')}. ` +
          `Verify this is intentional and compliant with 21 CFR §101.9(c).`
        )
      }
    }

    // Check for serving size consistency warning (informational)
    const servingSizes = columns.map(c => c.servingSize).filter(Boolean)
    const uniqueServingSizes = new Set(servingSizes)
    if (uniqueServingSizes.size > 1) {
      warnings.push(
        `Multi-column panel has different serving sizes: ${Array.from(uniqueServingSizes).join(' | ')}. ` +
        `This is allowed if products are genuinely different, but verify serving size declarations are accurate.`
      )
    }

    // ══════════════════════════════════════════════════════════════════════
    // NF-MATH-001 & NF-MATH-002: Cross-Column Math Validation
    // Detect Per Serving / Per Container format and validate math consistency
    // ══════════════════════════════════════════════════════════════════════
    
    // Detect Per Serving / Per Container dual-column format
    const perServingColumn = columns.find(c => {
      const name = (c.columnName || '').toLowerCase()
      return name.includes('per serving') || name.includes('serving') || name === ''
    })
    
    const perContainerColumn = columns.find(c => {
      const name = (c.columnName || '').toLowerCase()
      return name.includes('per container') || name.includes('per package') || name.includes('container')
    })
    
    // If we have Per Serving / Per Container format, validate cross-column math
    if (perServingColumn && perContainerColumn && perServingColumn !== perContainerColumn) {
      // Get servings per container from the Per Serving column (if available)
      const servingsPerContainer = perServingColumn.servingsPerContainer || 
        perContainerColumn.servingsPerContainer || 
        columns.find(c => c.servingsPerContainer)?.servingsPerContainer

      if (servingsPerContainer && servingsPerContainer > 1) {
        console.log(`[v0] Detected Per Serving / Per Container format. Running cross-column math validation (servings: ${servingsPerContainer})`)
        
        const crossColumnResult = this.validateCrossColumnMath(
          perServingColumn,
          perContainerColumn,
          servingsPerContainer
        )
        
        errors.push(...crossColumnResult.errors)
        warnings.push(...crossColumnResult.warnings)
      } else {
        warnings.push(
          `Detected Per Serving / Per Container columns but servingsPerContainer is missing or invalid. ` +
          `Cannot validate NF-MATH-001/002 cross-column math consistency.`
        )
      }
    }

    // Generate error if critical inconsistencies found
    const hasInconsistencies = columnIssues.some(i => i.inconsistentNutrients.length > 0)
    if (hasInconsistencies) {
      errors.push(
        `Multi-column Nutrition Facts has inconsistent nutrient declarations across columns. ` +
        `This may violate 21 CFR §101.9(b)(12) requirements for aggregate/dual-column labeling.`
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      columnIssues,
    }
  }
}
