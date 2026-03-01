import type { NutritionFact, NutritionValidationResult } from './types'

/**
 * FDA Nutrition Facts Rounding Rules Validator
 * Implements 21 CFR 101.9(c) rounding requirements
 */

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
   */
  static validateNutritionFacts(facts: NutritionFact[]): NutritionValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

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
}
