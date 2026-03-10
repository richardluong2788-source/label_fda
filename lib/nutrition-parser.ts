// ────────────────────────────────────────────────────────────
// Nutrition Value Parser - Fixes OCR merge bugs like "0mg0"
// ────────────────────────────────────────────────────────────

export interface NutritionFact {
  value: string | number | null | undefined
  unit?: string
  dailyValue?: string | number | null
  nutrient?: string
  name?: string
}

export interface ParsedNutritionValue {
  displayValue: string
  displayDV: string | null
}

/**
 * Parse and clean nutrition fact value that may have merged value+unit+dv
 * Fixes OCR bug where "0mg" + "0%" becomes "0mg0" 
 * Pattern: {value}{unit}{number} → separate into value+unit and dailyValue
 */
export function parseNutritionValue(fact: NutritionFact): ParsedNutritionValue {
  const value = fact.value
  const unit = fact.unit || ''
  let dailyValue = fact.dailyValue
  
  // Handle null/undefined/empty value - show "N/A" when numeric value is missing
  // This fixes display for micronutrients where Vision AI extracted %DV but not numeric value
  // Shows "N/A" instead of just "mg" which looks like a software bug
  if (value === null || value === undefined || value === '') {
    return {
      displayValue: 'N/A',
      displayDV: dailyValue != null ? String(dailyValue) : null
    }
  }
  
  // If value is already a clean number, just format it
  if (typeof value === 'number') {
    return {
      displayValue: `${value}${unit}`,
      displayDV: dailyValue != null ? String(dailyValue) : null
    }
  }
  
  // If value is a string that might have merged unit+dv (e.g., "0mg0" or "330mg14")
  if (typeof value === 'string') {
    // Pattern: number + unit + number (e.g., "0mg0", "330mg14", "2.5g12")
    const mergedPattern = /^(\d+(?:\.\d+)?)\s*(mg|g|mcg|kcal|cal)(\d+)$/i
    const match = value.match(mergedPattern)
    
    if (match) {
      const [, numValue, parsedUnit, dvValue] = match
      return {
        displayValue: `${numValue}${parsedUnit}`,
        displayDV: dvValue
      }
    }
    
    // Check if value already has unit attached but no DV merged
    const valueWithUnit = /^(\d+(?:\.\d+)?)\s*(mg|g|mcg|kcal|cal)?$/i
    const unitMatch = value.match(valueWithUnit)
    if (unitMatch) {
      return {
        displayValue: value,
        displayDV: dailyValue != null ? String(dailyValue) : null
      }
    }
    
    // Default: return as-is
    return {
      displayValue: value + (unit && !value.includes(unit) ? unit : ''),
      displayDV: dailyValue != null ? String(dailyValue) : null
    }
  }
  
  // Fallback for any other type
  return {
    displayValue: String(value) + unit,
    displayDV: dailyValue != null ? String(dailyValue) : null
  }
}
