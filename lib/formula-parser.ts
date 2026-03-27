import { Anthropic } from '@anthropic-ai/sdk'
import type { FormulaIngredient } from '@/lib/types'

const client = new Anthropic()

export interface ParseFormulaResult {
  success: boolean
  ingredients: FormulaIngredient[]
  totalPercentage?: number
  confidenceScore: number
  warnings: string[]
  parsingErrors: string[]
}

/**
 * Parse formula from various file formats using Claude's vision and reasoning capabilities
 */
export async function parseFormula(
  fileContent: string | Buffer,
  fileType: 'excel' | 'csv' | 'pdf' | 'image' | 'text',
  productName?: string
): Promise<ParseFormulaResult> {
  const warnings: string[] = []
  const parsingErrors: string[] = []

  try {
    // Convert file content to text if needed
    let text = typeof fileContent === 'string' ? fileContent : fileContent.toString()

    // Prepare the prompt for Claude
    const prompt = prepareParsingPrompt(text, fileType, productName)

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract the response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse the JSON response from Claude
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      parsingErrors.push('Failed to parse Claude response into JSON format')
      return {
        success: false,
        ingredients: [],
        confidenceScore: 0,
        warnings,
        parsingErrors,
      }
    }

    const parsedData = JSON.parse(jsonMatch[0])

    // Validate and structure the results
    const ingredients: FormulaIngredient[] = (parsedData.ingredients || []).map(
      (ing: any, index: number) => ({
        id: `ing_${index}`,
        name: ing.name || '',
        percentage: parseFloat(ing.percentage) || 0,
        function: ing.function || ing.role || '',
        status: ing.verified ? 'verified' : 'unverified',
        allergen_declaration: ing.is_allergen || false,
      })
    )

    // Calculate total percentage
    const totalPercentage = ingredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0)

    // Validate totals
    if (totalPercentage > 100.5 || totalPercentage < 99.5) {
      warnings.push(
        `Total percentage is ${totalPercentage}%, expected close to 100%. Please verify ingredient percentages.`
      )
    }

    // Calculate confidence score
    const confidenceScore = parsedData.confidence_score || calculateConfidenceScore(ingredients, totalPercentage)

    return {
      success: ingredients.length > 0,
      ingredients,
      totalPercentage: parseFloat(totalPercentage.toFixed(2)),
      confidenceScore,
      warnings,
      parsingErrors,
    }
  } catch (error) {
    console.error('[v0] Formula parsing error:', error)
    parsingErrors.push(`Parsing failed: ${error instanceof Error ? error.message : String(error)}`)

    return {
      success: false,
      ingredients: [],
      confidenceScore: 0,
      warnings,
      parsingErrors,
    }
  }
}

/**
 * Validate parsed ingredients against ingredient database
 */
export async function validateParsedIngredients(ingredients: FormulaIngredient[]): Promise<{
  validIngredients: FormulaIngredient[]
  invalidIngredients: Array<{ name: string; reason: string }>
  suggestions: Array<{ original: string; suggested: string[] }>
}> {
  const validIngredients: FormulaIngredient[] = []
  const invalidIngredients: Array<{ name: string; reason: string }> = []
  const suggestions: Array<{ original: string; suggested: string[] }> = []

  for (const ingredient of ingredients) {
    // This would normally call the ingredient service to check against the database
    // For now, we do basic validation
    if (!ingredient.name || ingredient.name.trim().length === 0) {
      invalidIngredients.push({
        name: ingredient.name || 'Unknown',
        reason: 'Empty ingredient name',
      })
    } else if (ingredient.percentage < 0) {
      invalidIngredients.push({
        name: ingredient.name,
        reason: 'Negative percentage value',
      })
    } else {
      validIngredients.push(ingredient)
    }
  }

  return {
    validIngredients,
    invalidIngredients,
    suggestions,
  }
}

/**
 * Prepare the prompt for Claude to parse formula documents
 */
function prepareParsingPrompt(content: string, fileType: string, productName?: string): string {
  return `You are an expert food/cosmetic/supplement formula analyst. Extract the ingredients list from the provided document.

${productName ? `Product Name: ${productName}` : ''}

Please analyze the provided ${fileType} content and extract the formula/ingredients information. 

Return the result as a valid JSON object with this structure:
{
  "product_name": "name if found",
  "ingredients": [
    {
      "name": "ingredient name (FDA/INCI standard if possible)",
      "percentage": 0.0,
      "function": "preservative|color|flavor|etc",
      "is_allergen": true/false,
      "verified": true/false
    }
  ],
  "confidence_score": 0.0-1.0,
  "notes": "any relevant notes"
}

Important:
- Extract ingredient names as they appear
- Convert percentages to numeric values
- Identify allergens when mentioned
- Set confidence_score based on clarity and completeness of the data
- Return ONLY valid JSON

Content to parse:
${content.substring(0, 3000)}${content.length > 3000 ? '...[truncated]' : ''}`
}

/**
 * Calculate confidence score based on data completeness
 */
function calculateConfidenceScore(ingredients: FormulaIngredient[], totalPercentage: number): number {
  let score = 0.5 // Base score

  // Increase for number of ingredients
  if (ingredients.length > 0) {
    score += Math.min(0.2, ingredients.length / 50) // Max +0.2
  }

  // Increase for percentage completeness
  if (ingredients.every(i => i.percentage && i.percentage > 0)) {
    score += 0.15
  }

  // Increase for function information
  if (ingredients.some(i => i.function)) {
    score += 0.1
  }

  // Adjust for total percentage accuracy
  if (Math.abs(totalPercentage - 100) < 1) {
    score += 0.05
  }

  return Math.min(1, score)
}

/**
 * Extract ingredients from CSV content
 */
export async function parseCSVFormula(csvContent: string): Promise<ParseFormulaResult> {
  const lines = csvContent.trim().split('\n')
  const ingredients: FormulaIngredient[] = []
  const parsingErrors: string[] = []

  // Try to detect headers and parse
  const headerLine = lines[0].toLowerCase()
  const hasHeader =
    headerLine.includes('ingredient') || headerLine.includes('name') || headerLine.includes('percentage')

  const startLine = hasHeader ? 1 : 0
  let totalPercentage = 0

  for (let i = startLine; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim())

    if (cells.length < 2) continue

    const name = cells[0]
    const percentage = parseFloat(cells[1])
    const func = cells[2] || ''

    if (name && !isNaN(percentage)) {
      ingredients.push({
        name,
        percentage,
        function: func,
        status: 'unverified',
      })
      totalPercentage += percentage
    }
  }

  if (ingredients.length === 0) {
    parsingErrors.push('No valid ingredients found in CSV')
  }

  return {
    success: ingredients.length > 0,
    ingredients,
    totalPercentage: parseFloat(totalPercentage.toFixed(2)),
    confidenceScore: 0.7,
    warnings: Math.abs(totalPercentage - 100) > 1 ? ['Total percentage does not equal 100%'] : [],
    parsingErrors,
  }
}

/**
 * Extract ingredients from text/manual input
 */
export async function parseTextFormula(textContent: string): Promise<ParseFormulaResult> {
  // Use Claude to parse free-form text formula
  return parseFormula(textContent, 'text')
}
