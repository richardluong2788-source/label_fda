/**
 * Unit Tests for NF-MATH Rules (Cross-Column Math & Impossible Value Detection)
 * Reference: VXG-DEV-SPEC-NF-001 Section 4.1
 * 
 * Run with: npx vitest run lib/__tests__/nutrition-math-rules.test.ts
 */

import { describe, it, expect } from 'vitest'
import { NutritionValidator } from '../nutrition-validator'

// ═══════════════════════════════════════════════════════════════════════════
// NF-MATH-001: Calorie Consistency (Cross-Column)
// Per Container Calories = Per Serving Calories × Servings Per Container
// ═══════════════════════════════════════════════════════════════════════════

describe('NF-MATH-001: Calorie Consistency (Cross-Column)', () => {
  it('should pass when calories match exactly', () => {
    // 120 kcal × 2 servings = 240 kcal
    const result = NutritionValidator.validateCalorieConsistency(120, 240, 2)
    expect(result.isValid).toBe(true)
    expect(result.expected).toBe(240)
  })

  it('should pass when within 5% tolerance', () => {
    // 120 × 2 = 240, showing 250 (4.2% diff) - within tolerance
    const result = NutritionValidator.validateCalorieConsistency(120, 250, 2)
    expect(result.isValid).toBe(true)
  })

  it('should pass when within 10 kcal absolute tolerance', () => {
    // 50 × 2 = 100, showing 108 (8% diff but only 8 kcal) - within tolerance
    const result = NutritionValidator.validateCalorieConsistency(50, 108, 2)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when exceeds tolerance - Goldfish bug scenario', () => {
    // Expected: 140 × 2 = 280, but showing 200 (28.6% diff)
    const result = NutritionValidator.validateCalorieConsistency(140, 200, 2)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-001')
    expect(result.error).toContain('140 kcal')
    expect(result.error).toContain('280 kcal')
    expect(result.error).toContain('200 kcal')
  })

  it('should FAIL when Per Container is way off', () => {
    // 100 × 3 = 300, showing 450 (50% diff)
    const result = NutritionValidator.validateCalorieConsistency(100, 450, 3)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-001')
  })

  it('should handle decimal servings correctly', () => {
    // 150 × 2.5 = 375
    const result = NutritionValidator.validateCalorieConsistency(150, 375, 2.5)
    expect(result.isValid).toBe(true)
    expect(result.expected).toBe(375)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// NF-MATH-002: Macro Nutrient Consistency (Cross-Column)
// Per Container value = Per Serving value × Servings Per Container
// ═══════════════════════════════════════════════════════════════════════════

describe('NF-MATH-002: Macro Nutrient Consistency (Cross-Column)', () => {
  it('should pass when Total Fat matches exactly', () => {
    // 5g × 2 = 10g
    const result = NutritionValidator.validateMacroConsistency('Total Fat', 5, 10, 2, 'g')
    expect(result.isValid).toBe(true)
  })

  it('should pass when within ±0.5g tolerance for grams', () => {
    // 20g × 2 = 40g, showing 40.5g (within ±0.5g tolerance)
    const result = NutritionValidator.validateMacroConsistency('Total Fat', 20, 40.5, 2, 'g')
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when exceeds ±0.5g tolerance for grams', () => {
    // 2g × 2 = 4g, showing 5g (exceeds ±0.5g tolerance)
    const result = NutritionValidator.validateMacroConsistency('Saturated Fat', 2, 5, 2, 'g')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-002')
  })

  it('should FAIL when exceeds tolerance', () => {
    // 10g × 2 = 20g, showing 30g (50% diff)
    const result = NutritionValidator.validateMacroConsistency('Total Fat', 10, 30, 2, 'g')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-002')
    expect(result.error).toContain('Total Fat')
  })

  it('should handle Sodium in mg correctly', () => {
    // 200mg × 2 = 400mg, showing 410mg (2.5% diff)
    const result = NutritionValidator.validateMacroConsistency('Sodium', 200, 410, 2, 'mg')
    expect(result.isValid).toBe(true)
  })

  it('should FAIL for Sodium when exceeds tolerance', () => {
    // 150mg × 2 = 300mg, showing 400mg (33% diff)
    const result = NutritionValidator.validateMacroConsistency('Sodium', 150, 400, 2, 'mg')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-002')
    expect(result.error).toContain('Sodium')
  })

  it('should handle Cholesterol correctly', () => {
    // 25mg × 2 = 50mg
    const result = NutritionValidator.validateMacroConsistency('Cholesterol', 25, 50, 2, 'mg')
    expect(result.isValid).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Cross-Column Math Integration Test
// ═══════════════════════════════════════════════════════════════════════════

describe('validateCrossColumnMath - Integration', () => {
  it('should pass for valid Per Serving / Per Container data', () => {
    const perServing = {
      nutritionFacts: [
        { name: 'Calories', value: 150, unit: 'kcal' },
        { name: 'Total Fat', value: 8, unit: 'g' },
        { name: 'Sodium', value: 200, unit: 'mg' },
        { name: 'Total Carbohydrate', value: 20, unit: 'g' },
        { name: 'Protein', value: 5, unit: 'g' },
      ],
    }
    
    const perContainer = {
      nutritionFacts: [
        { name: 'Calories', value: 300, unit: 'kcal' },
        { name: 'Total Fat', value: 16, unit: 'g' },
        { name: 'Sodium', value: 400, unit: 'mg' },
        { name: 'Total Carbohydrate', value: 40, unit: 'g' },
        { name: 'Protein', value: 10, unit: 'g' },
      ],
    }
    
    const result = NutritionValidator.validateCrossColumnMath(perServing, perContainer, 2)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should FAIL when calorie math is wrong - Goldfish bug scenario', () => {
    const perServing = {
      nutritionFacts: [
        { name: 'Calories', value: 140, unit: 'kcal' },
        { name: 'Total Fat', value: 5, unit: 'g' },
      ],
    }
    
    const perContainer = {
      nutritionFacts: [
        { name: 'Calories', value: 200, unit: 'kcal' }, // WRONG: should be 280
        { name: 'Total Fat', value: 10, unit: 'g' },
      ],
    }
    
    const result = NutritionValidator.validateCrossColumnMath(perServing, perContainer, 2)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('NF-MATH-001'))).toBe(true)
  })

  it('should FAIL when multiple nutrients have math errors', () => {
    const perServing = {
      nutritionFacts: [
        { name: 'Calories', value: 100, unit: 'kcal' },
        { name: 'Total Fat', value: 10, unit: 'g' },
        { name: 'Sodium', value: 300, unit: 'mg' },
      ],
    }
    
    const perContainer = {
      nutritionFacts: [
        { name: 'Calories', value: 150, unit: 'kcal' }, // WRONG: should be 200
        { name: 'Total Fat', value: 15, unit: 'g' },    // WRONG: should be 20
        { name: 'Sodium', value: 450, unit: 'mg' },     // WRONG: should be 600
      ],
    }
    
    const result = NutritionValidator.validateCrossColumnMath(perServing, perContainer, 2)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })

  it('should handle missing servingsPerContainer gracefully', () => {
    const perServing = { nutritionFacts: [{ name: 'Calories', value: 100, unit: 'kcal' }] }
    const perContainer = { nutritionFacts: [{ name: 'Calories', value: 200, unit: 'kcal' }] }
    
    const result = NutritionValidator.validateCrossColumnMath(perServing, perContainer, 0)
    expect(result.isValid).toBe(true)
    expect(result.warnings.some(w => w.includes('servingsPerContainer'))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// IMPOSSIBLE VALUE DETECTION (NF-MATH-003 to NF-MATH-008)
// ═══════════════════════════════════════════════════════════════════════════

describe('NF-MATH-003: Added Sugars ≤ Total Sugars', () => {
  it('should pass when added sugars equals total sugars', () => {
    const result = NutritionValidator.validateAddedSugarsLessThanTotal(12, 12)
    expect(result.isValid).toBe(true)
  })

  it('should pass when added sugars is less than total sugars', () => {
    const result = NutritionValidator.validateAddedSugarsLessThanTotal(20, 15)
    expect(result.isValid).toBe(true)
  })

  it('should pass when added sugars is 0', () => {
    const result = NutritionValidator.validateAddedSugarsLessThanTotal(8, 0)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when added sugars exceeds total sugars', () => {
    const result = NutritionValidator.validateAddedSugarsLessThanTotal(10, 15)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-003')
    expect(result.error).toContain('Added Sugars (15g) exceeds Total Sugars (10g)')
  })

  it('should allow small rounding tolerance (0.5g)', () => {
    // 10.5g added vs 10g total - within tolerance
    const result = NutritionValidator.validateAddedSugarsLessThanTotal(10, 10.5)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when exceeds tolerance', () => {
    // 11g added vs 10g total - exceeds tolerance
    const result = NutritionValidator.validateAddedSugarsLessThanTotal(10, 11)
    expect(result.isValid).toBe(false)
  })

  it('should pass when values are undefined', () => {
    expect(NutritionValidator.validateAddedSugarsLessThanTotal(undefined, 10).isValid).toBe(true)
    expect(NutritionValidator.validateAddedSugarsLessThanTotal(10, undefined).isValid).toBe(true)
    expect(NutritionValidator.validateAddedSugarsLessThanTotal(undefined, undefined).isValid).toBe(true)
  })
})

describe('NF-MATH-005: Saturated Fat ≤ Total Fat', () => {
  it('should pass when saturated fat equals total fat', () => {
    const result = NutritionValidator.validateSaturatedFatLessThanTotal(8, 8)
    expect(result.isValid).toBe(true)
  })

  it('should pass when saturated fat is less than total fat', () => {
    const result = NutritionValidator.validateSaturatedFatLessThanTotal(15, 5)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when saturated fat exceeds total fat', () => {
    const result = NutritionValidator.validateSaturatedFatLessThanTotal(5, 10)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-005')
    expect(result.error).toContain('Saturated Fat (10g) exceeds Total Fat (5g)')
  })

  it('should allow small rounding tolerance (0.5g)', () => {
    const result = NutritionValidator.validateSaturatedFatLessThanTotal(5, 5.5)
    expect(result.isValid).toBe(true)
  })

  it('should pass when values are undefined', () => {
    expect(NutritionValidator.validateSaturatedFatLessThanTotal(undefined, 5).isValid).toBe(true)
    expect(NutritionValidator.validateSaturatedFatLessThanTotal(5, undefined).isValid).toBe(true)
  })
})

describe('NF-MATH-009: Trans Fat ≤ Total Fat', () => {
  it('should pass when trans fat is less than total fat', () => {
    const result = NutritionValidator.validateTransFatLessThanTotal(10, 2)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when trans fat exceeds total fat', () => {
    const result = NutritionValidator.validateTransFatLessThanTotal(3, 5)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-009')
  })
  
  it('should pass when trans fat equals total fat', () => {
    const result = NutritionValidator.validateTransFatLessThanTotal(5, 5)
    expect(result.isValid).toBe(true)
  })

  it('should pass when values are undefined', () => {
    expect(NutritionValidator.validateTransFatLessThanTotal(undefined, 2).isValid).toBe(true)
    expect(NutritionValidator.validateTransFatLessThanTotal(5, undefined).isValid).toBe(true)
  })
})

describe('NF-MATH-006: Saturated + Trans ≤ Total Fat', () => {
  it('should pass when combined fats equal total fat', () => {
    const result = NutritionValidator.validateCombinedFatsLessThanTotal(10, 7, 3)
    expect(result.isValid).toBe(true)
  })

  it('should pass when combined fats are less than total fat', () => {
    const result = NutritionValidator.validateCombinedFatsLessThanTotal(15, 5, 2)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when combined fats exceed total fat', () => {
    const result = NutritionValidator.validateCombinedFatsLessThanTotal(10, 8, 5)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-006')
    expect(result.error).toContain('13g exceeds Total Fat (10g)')
  })

  it('should allow 1g tolerance for rounding', () => {
    // 8 + 3 = 11, total = 10, difference = 1g (within tolerance)
    const result = NutritionValidator.validateCombinedFatsLessThanTotal(10, 8, 3)
    expect(result.isValid).toBe(true)
  })

  it('should handle missing values gracefully', () => {
    expect(NutritionValidator.validateCombinedFatsLessThanTotal(10, undefined, 2).isValid).toBe(true)
    expect(NutritionValidator.validateCombinedFatsLessThanTotal(10, 5, undefined).isValid).toBe(true)
  })
})

describe('NF-MATH-007: Dietary Fiber ≤ Total Carbohydrate', () => {
  it('should pass when fiber is less than carbs', () => {
    const result = NutritionValidator.validateFiberLessThanCarbs(30, 5)
    expect(result.isValid).toBe(true)
  })

  it('should pass when fiber equals total carbs (100% fiber content)', () => {
    // Edge case: All carbs are fiber - valid (e.g., pure psyllium husk)
    // Fiber = Carbs = valid, should NOT be flagged as violation
    const result = NutritionValidator.validateFiberLessThanCarbs(5, 5)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when fiber exceeds carbs', () => {
    const result = NutritionValidator.validateFiberLessThanCarbs(10, 15)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-007')
  })

  it('should handle missing values gracefully', () => {
    expect(NutritionValidator.validateFiberLessThanCarbs(undefined, 5).isValid).toBe(true)
    expect(NutritionValidator.validateFiberLessThanCarbs(20, undefined).isValid).toBe(true)
  })
})

describe('NF-MATH-008: Total Sugars ≤ Total Carbohydrate', () => {
  it('should pass when sugars is less than carbs', () => {
    const result = NutritionValidator.validateSugarsLessThanCarbs(40, 20)
    expect(result.isValid).toBe(true)
  })

  it('should pass when sugars equals total carbs (100% sugar content)', () => {
    // Edge case: All carbs are sugars - valid (e.g., pure sugar product)
    // Total Sugars = Carbs = valid, should NOT be flagged as violation
    const result = NutritionValidator.validateSugarsLessThanCarbs(25, 25)
    expect(result.isValid).toBe(true)
  })

  it('should FAIL when sugars exceeds carbs', () => {
    const result = NutritionValidator.validateSugarsLessThanCarbs(15, 25)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('NF-MATH-008')
  })

  it('should handle missing values gracefully', () => {
    expect(NutritionValidator.validateSugarsLessThanCarbs(undefined, 20).isValid).toBe(true)
    expect(NutritionValidator.validateSugarsLessThanCarbs(40, undefined).isValid).toBe(true)
  })
})

describe('validateImpossibleValues - Integration', () => {
  it('should detect multiple impossible values in one panel', () => {
    const facts = [
      { name: 'Total Fat', value: 5, unit: 'g' },
      { name: 'Saturated Fat', value: 10, unit: 'g' },  // IMPOSSIBLE: > total fat
      { name: 'Trans Fat', value: 8, unit: 'g' },        // IMPOSSIBLE: > total fat
      { name: 'Total Carbohydrate', value: 20, unit: 'g' },
      { name: 'Total Sugars', value: 25, unit: 'g' },    // IMPOSSIBLE: > total carbs
      { name: 'Added Sugars', value: 30, unit: 'g' },    // IMPOSSIBLE: > total sugars
    ]

    const result = NutritionValidator.validateImpossibleValues(facts)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
    expect(result.errors.some(e => e.includes('NF-MATH-003'))).toBe(true) // Added > Total sugars
    expect(result.errors.some(e => e.includes('NF-MATH-005'))).toBe(true) // Sat > Total fat
    expect(result.errors.some(e => e.includes('NF-MATH-009'))).toBe(true) // Trans > Total fat
    expect(result.errors.some(e => e.includes('NF-MATH-008'))).toBe(true) // Sugars > Carbs
  })

  it('should pass for valid nutrition facts', () => {
    const facts = [
      { name: 'Calories', value: 150, unit: 'kcal' },
      { name: 'Total Fat', value: 8, unit: 'g' },
      { name: 'Saturated Fat', value: 3, unit: 'g' },
      { name: 'Trans Fat', value: 0, unit: 'g' },
      { name: 'Total Carbohydrate', value: 20, unit: 'g' },
      { name: 'Dietary Fiber', value: 2, unit: 'g' },
      { name: 'Total Sugars', value: 8, unit: 'g' },
      { name: 'Added Sugars', value: 5, unit: 'g' },
    ]

    const result = NutritionValidator.validateImpossibleValues(facts)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle real-world Goldfish Variety Pack data', () => {
    // Simulated data from Goldfish Big Smiles Variety Pack
    const cheddarColumn = [
      { name: 'Calories', value: 140, unit: 'kcal' },
      { name: 'Total Fat', value: 5, unit: 'g' },
      { name: 'Saturated Fat', value: 1, unit: 'g' },
      { name: 'Trans Fat', value: 0, unit: 'g' },
      { name: 'Total Carbohydrate', value: 20, unit: 'g' },
      { name: 'Total Sugars', value: 0, unit: 'g' },
      { name: 'Added Sugars', value: 0, unit: 'g' },
    ]

    const result = NutritionValidator.validateImpossibleValues(cheddarColumn)
    expect(result.isValid).toBe(true)
  })
})
