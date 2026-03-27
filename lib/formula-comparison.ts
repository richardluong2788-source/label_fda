import type { FormulaIngredient } from '@/lib/types'
import { searchIngredients } from '@/lib/ingredient-service'

export interface ComparisonIssue {
  type:
    | 'missing_ingredient'
    | 'extra_ingredient'
    | 'order_mismatch'
    | 'percentage_variance'
    | 'allergen_not_declared'
    | 'allergen_over_declared'
    | 'name_mismatch'
  severity: 'critical' | 'warning' | 'info'
  ingredient?: string
  description: string
  suggestion?: string
}

export interface FormulaLabelComparisonResult {
  ingredientsMatch: boolean
  orderCorrect: boolean
  percentageAccuracy: number
  criticalIssues: ComparisonIssue[]
  warnings: ComparisonIssue[]
  suggestions: ComparisonIssue[]
  allergenAnalysis: {
    declaredAllergens: string[]
    detectectedAllergens: string[]
    missingDeclarations: string[]
    overDeclaredAllergens: string[]
  }
  overallComplianceScore: number
}

/**
 * Compare submitted formula against extracted label information
 */
export async function compareFormulaToLabel(
  formulaIngredients: FormulaIngredient[],
  labelIngredients: FormulaIngredient[]
): Promise<FormulaLabelComparisonResult> {
  const criticalIssues: ComparisonIssue[] = []
  const warnings: ComparisonIssue[] = []
  const suggestions: ComparisonIssue[] = []

  // Normalize ingredient names for comparison
  const formularNormalized = formulaIngredients.map(i => ({
    ...i,
    normalizedName: normalizeIngredientName(i.name),
  }))
  const labelNormalized = labelIngredients.map(i => ({
    ...i,
    normalizedName: normalizeIngredientName(i.name),
  }))

  // Check for missing ingredients (on label but not in formula)
  for (const labelIng of labelNormalized) {
    const found = formularNormalized.find(
      f => f.normalizedName === labelIng.normalizedName || areSimilar(f.normalizedName, labelIng.normalizedName)
    )

    if (!found) {
      criticalIssues.push({
        type: 'missing_ingredient',
        severity: 'critical',
        ingredient: labelIng.name,
        description: `Ingredient "${labelIng.name}" is declared on label but missing from formula. This is a compliance issue.`,
        suggestion: `Verify that "${labelIng.name}" should be included in the formula, or update the label.`,
      })
    }
  }

  // Check for extra ingredients (in formula but not on label)
  for (const formulaIng of formularNormalized) {
    const found = labelNormalized.find(
      l => l.normalizedName === formulaIng.normalizedName || areSimilar(l.normalizedName, formulaIng.normalizedName)
    )

    if (!found) {
      warnings.push({
        type: 'extra_ingredient',
        severity: 'warning',
        ingredient: formulaIng.name,
        description: `Ingredient "${formulaIng.name}" is in the formula but not declared on the label.`,
        suggestion: `Either add this ingredient to the label or remove it from the formula if it's an error.`,
      })
    }
  }

  // Check order correctness
  const orderCorrect = checkIngredientOrder(formularNormalized, labelNormalized)
  if (!orderCorrect && labelNormalized.length > 0) {
    warnings.push({
      type: 'order_mismatch',
      severity: 'warning',
      description: 'Ingredient order differs between formula and label. FDA requires ingredients listed by descending percentage.',
      suggestion: 'Verify and correct ingredient order in formula and/or label.',
    })
  }

  // Check percentage variances
  const percentageIssues = checkPercentageVariances(formularNormalized, labelNormalized)
  if (percentageIssues.length > 0) {
    warnings.push(...percentageIssues)
  }

  // Analyze allergens
  const allergenAnalysis = await analyzeAllergens(formularNormalized, labelNormalized)

  // Check for allergen declaration issues
  if (allergenAnalysis.missingDeclarations.length > 0) {
    for (const allergen of allergenAnalysis.missingDeclarations) {
      criticalIssues.push({
        type: 'allergen_not_declared',
        severity: 'critical',
        ingredient: allergen,
        description: `Allergen "${allergen}" is present in ingredients but not declared on label. This is a FDA compliance violation.`,
        suggestion: `Add "${allergen}" to allergen statement on label.`,
      })
    }
  }

  // Check for over-declared allergens
  if (allergenAnalysis.overDeclaredAllergens.length > 0) {
    for (const allergen of allergenAnalysis.overDeclaredAllergens) {
      suggestions.push({
        type: 'allergen_over_declared',
        severity: 'info',
        ingredient: allergen,
        description: `Allergen "${allergen}" is declared but not found in formula ingredients.`,
        suggestion: `Verify if "${allergen}" is actually present or remove from allergen statement.`,
      })
    }
  }

  // Verify ingredient names against FDA/INCI database
  const nameMatchIssues = await checkIngredientNaming(formularNormalized)
  if (nameMatchIssues.length > 0) {
    warnings.push(...nameMatchIssues)
  }

  // Calculate overall compliance score
  const overallScore = calculateComplianceScore(criticalIssues, warnings, formularNormalized.length)

  // Check if ingredients match (accounting for minor variations)
  const ingredientsMatch = criticalIssues.length === 0 && formularNormalized.length === labelNormalized.length

  return {
    ingredientsMatch,
    orderCorrect,
    percentageAccuracy: calculatePercentageAccuracy(formularNormalized, labelNormalized),
    criticalIssues,
    warnings,
    suggestions,
    allergenAnalysis,
    overallComplianceScore: overallScore,
  }
}

/**
 * Normalize ingredient names for comparison (remove spaces, special chars, lowercase)
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Check if two ingredient names are similar using Levenshtein distance
 */
function areSimilar(name1: string, name2: string, threshold: number = 0.85): boolean {
  const distance = levenshteinDistance(name1, name2)
  const maxLength = Math.max(name1.length, name2.length)
  const similarity = 1 - distance / maxLength
  return similarity >= threshold
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(0))

  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j
  }

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      )
    }
  }

  return track[s2.length][s1.length]
}

/**
 * Check if ingredients are in correct order (descending by percentage)
 */
function checkIngredientOrder(formula: any[], label: any[]): boolean {
  if (label.length === 0) return true

  // Check if label percentages are in descending order
  for (let i = 1; i < label.length; i++) {
    if (label[i].percentage > label[i - 1].percentage) {
      return false
    }
  }

  return true
}

/**
 * Check percentage variances between formula and label
 */
function checkPercentageVariances(formula: any[], label: any[]): ComparisonIssue[] {
  const issues: ComparisonIssue[] = []
  const variance_threshold = 5 // 5% variance allowed

  for (const labelIng of label) {
    const formulaIng = formula.find(
      f => f.normalizedName === labelIng.normalizedName || areSimilar(f.normalizedName, labelIng.normalizedName)
    )

    if (formulaIng && formulaIng.percentage && labelIng.percentage) {
      const variance = Math.abs(formulaIng.percentage - labelIng.percentage)
      if (variance > variance_threshold) {
        issues.push({
          type: 'percentage_variance',
          severity: 'warning',
          ingredient: labelIng.name,
          description: `Percentage variance of ${variance.toFixed(1)}% for "${labelIng.name}" (Label: ${labelIng.percentage}%, Formula: ${formulaIng.percentage}%)`,
          suggestion: `Verify the correct percentage and update either formula or label.`,
        })
      }
    }
  }

  return issues
}

/**
 * Analyze allergen declarations
 */
async function analyzeAllergens(
  formula: any[],
  label: any[]
): Promise<{
  declaredAllergens: string[]
  detectectedAllergens: string[]
  missingDeclarations: string[]
  overDeclaredAllergens: string[]
}> {
  const declaredAllergens: string[] = []
  const detectectedAllergens: string[] = []

  // Get detected allergens from formula
  for (const ing of formula) {
    if (ing.allergen_declaration) {
      // Search ingredient database to check for allergens
      const results = await searchIngredients(ing.name, 1)
      if (results.length > 0 && results[0].allergen_group) {
        detectectedAllergens.push(results[0].allergen_group)
      }
    }
  }

  // Get declared allergens from label (if available)
  for (const ing of label) {
    if (ing.allergen_declaration) {
      declaredAllergens.push(ing.name)
    }
  }

  // Remove duplicates
  const uniqueDetected = [...new Set(detectectedAllergens)]
  const uniqueDeclared = [...new Set(declaredAllergens)]

  return {
    declaredAllergens: uniqueDeclared,
    detectectedAllergens: uniqueDetected,
    missingDeclarations: uniqueDetected.filter(a => !uniqueDeclared.includes(a)),
    overDeclaredAllergens: uniqueDeclared.filter(a => !uniqueDetected.includes(a)),
  }
}

/**
 * Check ingredient naming against FDA/INCI database
 */
async function checkIngredientNaming(formula: any[]): Promise<ComparisonIssue[]> {
  const issues: ComparisonIssue[] = []

  for (const ing of formula) {
    if (!ing.name) continue

    const results = await searchIngredients(ing.name, 5)

    if (results.length === 0) {
      issues.push({
        type: 'name_mismatch',
        severity: 'warning',
        ingredient: ing.name,
        description: `"${ing.name}" is not found in FDA/INCI ingredient database.`,
        suggestion: `Verify the ingredient name or check if alternative names exist.`,
      })
    } else if (!results.some(r => r.fda_common_name === ing.name || r.inci_name === ing.name)) {
      const suggestions = results.slice(0, 2).map(r => r.fda_common_name || r.inci_name).join(' or ')
      issues.push({
        type: 'name_mismatch',
        severity: 'warning',
        ingredient: ing.name,
        description: `"${ing.name}" may not be the standard FDA/INCI name.`,
        suggestion: `Consider using: ${suggestions}`,
      })
    }
  }

  return issues
}

/**
 * Calculate percentage accuracy score (how close total is to 100%)
 */
function calculatePercentageAccuracy(formula: any[], label: any[]): number {
  const formulaTotal = formula.reduce((sum, ing) => sum + (ing.percentage || 0), 0)
  const labelTotal = label.reduce((sum, ing) => sum + (ing.percentage || 0), 0)

  const deviation = Math.abs(formulaTotal - 100) + Math.abs(labelTotal - 100)
  return Math.max(0, 100 - deviation)
}

/**
 * Calculate overall compliance score (0-100)
 */
function calculateComplianceScore(
  critical: ComparisonIssue[],
  warnings: ComparisonIssue[],
  ingredientCount: number
): number {
  let score = 100

  // Critical issues reduce score significantly
  score -= critical.length * 10

  // Warnings reduce score moderately
  score -= warnings.length * 3

  // Minimum score of 0
  return Math.max(0, score)
}

/**
 * Generate a compliance report
 */
export function generateComplianceReport(comparison: FormulaLabelComparisonResult): string {
  const lines: string[] = []

  lines.push('=== FORMULA-LABEL COMPLIANCE REPORT ===\n')

  // Summary
  lines.push(`Overall Compliance Score: ${comparison.overallComplianceScore}/100`)
  lines.push(`Ingredients Match: ${comparison.ingredientsMatch ? 'Yes' : 'No'}`)
  lines.push(`Order Correct: ${comparison.orderCorrect ? 'Yes' : 'No'}`)
  lines.push(`Percentage Accuracy: ${comparison.percentageAccuracy.toFixed(1)}%\n`)

  // Critical Issues
  if (comparison.criticalIssues.length > 0) {
    lines.push('CRITICAL ISSUES (must be resolved):')
    for (const issue of comparison.criticalIssues) {
      lines.push(`• ${issue.description}`)
      if (issue.suggestion) lines.push(`  Suggestion: ${issue.suggestion}`)
    }
    lines.push('')
  }

  // Warnings
  if (comparison.warnings.length > 0) {
    lines.push('WARNINGS (review recommended):')
    for (const warning of comparison.warnings) {
      lines.push(`• ${warning.description}`)
      if (warning.suggestion) lines.push(`  Suggestion: ${warning.suggestion}`)
    }
    lines.push('')
  }

  // Allergen Info
  lines.push('ALLERGEN ANALYSIS:')
  lines.push(`Detected Allergens: ${comparison.allergenAnalysis.detectectedAllergens.join(', ') || 'None'}`)
  lines.push(`Declared Allergens: ${comparison.allergenAnalysis.declaredAllergens.join(', ') || 'None'}`)
  if (comparison.allergenAnalysis.missingDeclarations.length > 0) {
    lines.push(`⚠️ Missing Declarations: ${comparison.allergenAnalysis.missingDeclarations.join(', ')}`)
  }

  return lines.join('\n')
}
