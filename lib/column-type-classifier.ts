/**
 * Column Type Classifier for Multi-Column Nutrition Facts
 * 
 * Hybrid approach: AI extracts headerText, rule-based validates/overrides
 * Reference: VXG-DEV-SPEC-NF-001 Section 3.2 (Step 2: Column Detection & Classification)
 * 
 * Column Types (21 CFR §101.9):
 * - PER_SERVING / PER_CONTAINER: §101.9(b)(12) - Dual column for serving/package
 * - AS_PACKAGED / AS_PREPARED: §101.9(b)(9) - Foods requiring preparation
 * - VARIANT_SKU: §101.9(b)(12) + §101.9(h)(1) - Variety packs
 * - PER_100G: International format (EU imports)
 */

import type { ColumnType, ColumnTypeSource, NutritionFactsColumn } from './types'

export interface ColumnClassificationResult {
  columnType: ColumnType
  source: ColumnTypeSource
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  normalizedHeader: string
  needsHumanReview: boolean
  reviewReason?: string
}

/**
 * Keyword patterns for rule-based column type detection
 * Ordered by priority - first match wins
 */
const COLUMN_TYPE_PATTERNS: Array<{
  type: ColumnType
  patterns: RegExp[]
  confidence: 'HIGH' | 'MEDIUM'
}> = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CASE 1: Per Serving / Per Container (21 CFR §101.9(b)(12))
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'PER_SERVING',
    patterns: [
      /per\s*(1\s*)?serving/i,
      /amount\s*per\s*serving/i,
      /por\s*porci[oó]n/i,                    // Spanish
    ],
    confidence: 'HIGH',
  },
  {
    type: 'PER_CONTAINER',
    patterns: [
      /per\s*container/i,
      /per\s*package/i,
      /per\s*bottle/i,
      /per\s*can/i,
      /por\s*envase/i,                        // Spanish
      /entire\s*package/i,
    ],
    confidence: 'HIGH',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE 2: As Packaged / As Prepared (21 CFR §101.9(b)(9))
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'AS_PACKAGED',
    patterns: [
      /as\s*packaged/i,
      /as\s*sold/i,
      /dry\s*mix/i,
      /before\s*prepar/i,
    ],
    confidence: 'HIGH',
  },
  {
    type: 'AS_PREPARED',
    patterns: [
      /as\s*prepared/i,
      /with\s*milk/i,
      /with\s*water/i,
      /with\s*\d+%\s*milk/i,
      /with\s*skim\s*milk/i,
      /with\s*whole\s*milk/i,
      /prepared\s*with/i,
      /tal\s*como\s*se\s*prepara/i,           // Spanish
      /when\s*prepared/i,
    ],
    confidence: 'HIGH',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNATIONAL: Per 100g/100ml (EU/Asia imports)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'PER_100G',
    patterns: [
      /per\s*100\s*(g|gram|grams|ml|mL)/i,
      /amount\s*per\s*100\s*(g|ml)/i,
      /100\s*(g|ml)\s*contains/i,
    ],
    confidence: 'HIGH',
  },
]

/**
 * Classify column type using rule-based pattern matching
 * 
 * @param headerText - Raw header text extracted from label
 * @param columnName - Column name/variant name (e.g., "Cheddar", "Original")
 * @param aiSuggestedType - Optional AI-suggested type for validation
 * @param columnCount - Total number of columns (single column = always PER_SERVING)
 */
export function classifyColumnType(
  headerText: string | undefined,
  columnName: string,
  aiSuggestedType?: ColumnType,
  columnCount: number = 1
): ColumnClassificationResult {
  const h = (headerText || '').toLowerCase().trim()
  const n = columnName.toLowerCase().trim()

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCEPTION: Single column is ALWAYS PER_SERVING
  // ═══════════════════════════════════════════════════════════════════════════
  if (columnCount === 1) {
    return {
      columnType: 'PER_SERVING',
      source: 'RULE_BASED',
      confidence: 'HIGH',
      normalizedHeader: 'PER_SERVING',
      needsHumanReview: false,
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RULE-BASED DETECTION: Try all patterns
  // ═══════════════════════════════════════════════════════════════════════════
  for (const { type, patterns, confidence } of COLUMN_TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(h)) {
        // Rule-based match found
        const result: ColumnClassificationResult = {
          columnType: type,
          source: 'RULE_BASED',
          confidence,
          normalizedHeader: type,
          needsHumanReview: false,
        }

        // If AI suggested different type, log it but trust rule-based
        if (aiSuggestedType && aiSuggestedType !== type) {
          console.log(`[v0] Column type conflict: AI suggested ${aiSuggestedType}, rule-based detected ${type}. Using rule-based.`)
        }

        return result
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT_SKU DETECTION: Column name differs from headerText, short product name
  // ═══════════════════════════════════════════════════════════════════════════
  if (
    n.length < 30 &&
    !n.includes('serving') &&
    !n.includes('prepared') &&
    !n.includes('packaged') &&
    !n.includes('container') &&
    !n.includes('100g')
  ) {
    // Likely a variety pack variant (e.g., "Cheddar", "BBQ", "Original")
    return {
      columnType: 'VARIANT_SKU',
      source: 'RULE_BASED',
      confidence: 'MEDIUM',
      normalizedHeader: 'VARIANT_SKU',
      needsHumanReview: false,
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI FALLBACK: Use AI suggestion if available
  // ═══════════════════════════════════════════════════════════════════════════
  if (aiSuggestedType && aiSuggestedType !== 'UNKNOWN') {
    return {
      columnType: aiSuggestedType,
      source: 'AI',
      confidence: 'MEDIUM',
      normalizedHeader: aiSuggestedType,
      needsHumanReview: false,
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UNKNOWN: Cannot determine - require human review
  // NO SILENT FALLBACK to PER_SERVING
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    columnType: 'UNKNOWN',
    source: 'FALLBACK',
    confidence: 'LOW',
    normalizedHeader: 'UNKNOWN',
    needsHumanReview: true,
    reviewReason: `Column type undetermined for "${columnName}" (headerText: "${headerText || 'N/A'}"). Math validation skipped.`,
  }
}

/**
 * Classify all columns in a multi-column Nutrition Facts panel
 */
export function classifyAllColumns(
  columns: NutritionFactsColumn[]
): Array<NutritionFactsColumn & { classification: ColumnClassificationResult }> {
  const columnCount = columns.length

  return columns.map(column => {
    const classification = classifyColumnType(
      column.headerText,
      column.columnName,
      column.columnType,
      columnCount
    )

    return {
      ...column,
      columnType: classification.columnType,
      columnTypeSource: classification.source,
      headerTextNormalized: classification.normalizedHeader,
      needsHumanReview: classification.needsHumanReview,
      reviewReason: classification.reviewReason,
      classification,
    }
  })
}

/**
 * Determine the overall column format type for the panel
 * Returns: 'DUAL_SERVING_CONTAINER' | 'AS_PACKAGED_PREPARED' | 'VARIETY_PACK' | 'MIXED'
 */
export function detectPanelFormatType(
  columns: Array<{ columnType?: ColumnType }>
): {
  formatType: 'DUAL_SERVING_CONTAINER' | 'AS_PACKAGED_PREPARED' | 'VARIETY_PACK' | 'INTERNATIONAL' | 'MIXED' | 'UNKNOWN'
  description: string
} {
  const types = columns.map(c => c.columnType).filter(Boolean) as ColumnType[]

  if (types.length === 0) {
    return { formatType: 'UNKNOWN', description: 'No column types detected' }
  }

  // Check for specific combinations
  const hasPerServing = types.includes('PER_SERVING')
  const hasPerContainer = types.includes('PER_CONTAINER')
  const hasAsPackaged = types.includes('AS_PACKAGED')
  const hasAsPrepared = types.includes('AS_PREPARED')
  const hasVariantSku = types.includes('VARIANT_SKU')
  const hasPer100g = types.includes('PER_100G')

  // Case 1: Per Serving / Per Container
  if (hasPerServing && hasPerContainer && !hasVariantSku) {
    return {
      formatType: 'DUAL_SERVING_CONTAINER',
      description: 'Dual-column format showing per-serving and per-container values (21 CFR §101.9(b)(12))',
    }
  }

  // Case 2: As Packaged / As Prepared
  if (hasAsPackaged && hasAsPrepared) {
    return {
      formatType: 'AS_PACKAGED_PREPARED',
      description: 'Dual-column format for foods requiring preparation (21 CFR §101.9(b)(9))',
    }
  }

  // Case 3: Variety Pack
  if (hasVariantSku && types.filter(t => t === 'VARIANT_SKU').length >= 2) {
    return {
      formatType: 'VARIETY_PACK',
      description: 'Multi-column format for variety/assorted packs (21 CFR §101.9(b)(12) + §101.9(h)(1))',
    }
  }

  // International format
  if (hasPer100g) {
    return {
      formatType: 'INTERNATIONAL',
      description: 'International format with per-100g/100ml values (EU/Asia)',
    }
  }

  // Mixed or unrecognized
  return {
    formatType: 'MIXED',
    description: `Mixed column types detected: ${types.join(', ')}`,
  }
}
