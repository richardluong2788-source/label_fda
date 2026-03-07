/**
 * Unit Tests for Column Type Classifier
 * Reference: VXG-DEV-SPEC-NF-001 Section 3.2
 * 
 * Run with: npx vitest run lib/__tests__/column-type-classifier.test.ts
 */

import { describe, it, expect } from 'vitest'
import { 
  classifyColumnType, 
  classifyAllColumns, 
  detectPanelFormatType 
} from '../column-type-classifier'

describe('classifyColumnType - Single Column', () => {
  it('should always return PER_SERVING for single column', () => {
    const result = classifyColumnType('Amount per serving', 'Column 1', undefined, 1)
    expect(result.columnType).toBe('PER_SERVING')
    expect(result.source).toBe('RULE_BASED')
    expect(result.confidence).toBe('HIGH')
    expect(result.needsHumanReview).toBe(false)
  })

  it('should return PER_SERVING even with unusual header for single column', () => {
    const result = classifyColumnType('Weird Header Text', 'Test', undefined, 1)
    expect(result.columnType).toBe('PER_SERVING')
  })
})

describe('classifyColumnType - Case 1: Per Serving / Per Container', () => {
  it('should detect "Per Serving" header', () => {
    const result = classifyColumnType('Per Serving', 'Column 1', undefined, 2)
    expect(result.columnType).toBe('PER_SERVING')
    expect(result.confidence).toBe('HIGH')
  })

  it('should detect "Per 1 Serving" header', () => {
    const result = classifyColumnType('Per 1 Serving', 'Column 1', undefined, 2)
    expect(result.columnType).toBe('PER_SERVING')
  })

  it('should detect "Amount Per Serving" header', () => {
    const result = classifyColumnType('Amount Per Serving', 'Column 1', undefined, 2)
    expect(result.columnType).toBe('PER_SERVING')
  })

  it('should detect "Per Container" header', () => {
    const result = classifyColumnType('Per Container', 'Column 2', undefined, 2)
    expect(result.columnType).toBe('PER_CONTAINER')
    expect(result.confidence).toBe('HIGH')
  })

  it('should detect "Per Package" header', () => {
    const result = classifyColumnType('Per Package', 'Column 2', undefined, 2)
    expect(result.columnType).toBe('PER_CONTAINER')
  })

  it('should detect Spanish "Por Porción"', () => {
    const result = classifyColumnType('Por Porción', 'Columna 1', undefined, 2)
    expect(result.columnType).toBe('PER_SERVING')
  })

  it('should detect Spanish "Por Envase"', () => {
    const result = classifyColumnType('Por Envase', 'Columna 2', undefined, 2)
    expect(result.columnType).toBe('PER_CONTAINER')
  })
})

describe('classifyColumnType - Case 2: As Packaged / As Prepared', () => {
  it('should detect "As Packaged" header', () => {
    const result = classifyColumnType('As Packaged', 'Cereal', undefined, 2)
    expect(result.columnType).toBe('AS_PACKAGED')
    expect(result.confidence).toBe('HIGH')
  })

  it('should detect "As Prepared" header', () => {
    const result = classifyColumnType('As Prepared', 'With Milk', undefined, 2)
    expect(result.columnType).toBe('AS_PREPARED')
  })

  it('should detect "As Prepared with 2% milk" header', () => {
    const result = classifyColumnType('As Prepared with 2% milk', 'With Milk', undefined, 2)
    expect(result.columnType).toBe('AS_PREPARED')
  })

  it('should detect "with skim milk" header', () => {
    const result = classifyColumnType('with skim milk', 'Prepared', undefined, 2)
    expect(result.columnType).toBe('AS_PREPARED')
  })

  it('should detect Spanish "Tal como se prepara"', () => {
    const result = classifyColumnType('Tal como se prepara', 'Preparado', undefined, 2)
    expect(result.columnType).toBe('AS_PREPARED')
  })
})

describe('classifyColumnType - International: Per 100g/100ml', () => {
  it('should detect "Per 100g" header', () => {
    const result = classifyColumnType('Per 100g', 'Column 1', undefined, 2)
    expect(result.columnType).toBe('PER_100G')
    expect(result.confidence).toBe('HIGH')
  })

  it('should detect "Per 100 grams" header', () => {
    const result = classifyColumnType('Per 100 grams', 'Column 1', undefined, 2)
    expect(result.columnType).toBe('PER_100G')
  })

  it('should detect "Per 100ml" header', () => {
    const result = classifyColumnType('Per 100ml', 'Beverage', undefined, 2)
    expect(result.columnType).toBe('PER_100G')
  })

  it('should detect "Amount per 100g" header', () => {
    const result = classifyColumnType('Amount per 100g', 'EU Import', undefined, 2)
    expect(result.columnType).toBe('PER_100G')
  })
})

describe('classifyColumnType - Case 3: Variety Pack (VARIANT_SKU)', () => {
  it('should detect variant name "Cheddar"', () => {
    const result = classifyColumnType('', 'Cheddar', undefined, 3)
    expect(result.columnType).toBe('VARIANT_SKU')
    expect(result.confidence).toBe('MEDIUM')
  })

  it('should detect variant name "Colors"', () => {
    const result = classifyColumnType('', 'Colors', undefined, 3)
    expect(result.columnType).toBe('VARIANT_SKU')
  })

  it('should detect variant name "BBQ"', () => {
    const result = classifyColumnType(undefined, 'BBQ', undefined, 3)
    expect(result.columnType).toBe('VARIANT_SKU')
  })

  it('should detect variant name "Original"', () => {
    const result = classifyColumnType('', 'Original', undefined, 3)
    expect(result.columnType).toBe('VARIANT_SKU')
  })
})

describe('classifyColumnType - UNKNOWN with Human Review', () => {
  it('should return UNKNOWN for unrecognized header', () => {
    const result = classifyColumnType('Some Random Text That Does Not Match', 'Very Long Column Name That Exceeds Thirty Characters', undefined, 2)
    expect(result.columnType).toBe('UNKNOWN')
    expect(result.source).toBe('FALLBACK')
    expect(result.confidence).toBe('LOW')
    expect(result.needsHumanReview).toBe(true)
    expect(result.reviewReason).toContain('Column type undetermined')
  })

  it('should use AI suggestion when rule-based fails', () => {
    const result = classifyColumnType('Ambiguous Header', 'Long Column Name Exceeding Thirty', 'AS_PREPARED', 2)
    expect(result.columnType).toBe('AS_PREPARED')
    expect(result.source).toBe('AI')
    expect(result.confidence).toBe('MEDIUM')
    expect(result.needsHumanReview).toBe(false)
  })
})

describe('detectPanelFormatType', () => {
  it('should detect DUAL_SERVING_CONTAINER format', () => {
    const columns = [
      { columnType: 'PER_SERVING' as const },
      { columnType: 'PER_CONTAINER' as const },
    ]
    const result = detectPanelFormatType(columns)
    expect(result.formatType).toBe('DUAL_SERVING_CONTAINER')
  })

  it('should detect AS_PACKAGED_PREPARED format', () => {
    const columns = [
      { columnType: 'AS_PACKAGED' as const },
      { columnType: 'AS_PREPARED' as const },
    ]
    const result = detectPanelFormatType(columns)
    expect(result.formatType).toBe('AS_PACKAGED_PREPARED')
  })

  it('should detect VARIETY_PACK format', () => {
    const columns = [
      { columnType: 'VARIANT_SKU' as const },
      { columnType: 'VARIANT_SKU' as const },
      { columnType: 'VARIANT_SKU' as const },
    ]
    const result = detectPanelFormatType(columns)
    expect(result.formatType).toBe('VARIETY_PACK')
  })

  it('should detect INTERNATIONAL format', () => {
    const columns = [
      { columnType: 'PER_SERVING' as const },
      { columnType: 'PER_100G' as const },
    ]
    const result = detectPanelFormatType(columns)
    expect(result.formatType).toBe('INTERNATIONAL')
  })

  it('should detect MIXED format for unusual combinations', () => {
    const columns = [
      { columnType: 'PER_SERVING' as const },
      { columnType: 'AS_PREPARED' as const },
      { columnType: 'VARIANT_SKU' as const },
    ]
    const result = detectPanelFormatType(columns)
    expect(result.formatType).toBe('MIXED')
  })

  it('should return UNKNOWN for empty columns', () => {
    const result = detectPanelFormatType([])
    expect(result.formatType).toBe('UNKNOWN')
  })
})

describe('classifyAllColumns - Integration', () => {
  it('should classify Goldfish Variety Pack correctly', () => {
    const columns = [
      { columnName: 'Cheddar', headerText: '', nutritionFacts: [] },
      { columnName: 'Colors', headerText: '', nutritionFacts: [] },
      { columnName: 'Pretzel', headerText: '', nutritionFacts: [] },
    ]
    
    const classified = classifyAllColumns(columns)
    
    expect(classified).toHaveLength(3)
    expect(classified[0].columnType).toBe('VARIANT_SKU')
    expect(classified[1].columnType).toBe('VARIANT_SKU')
    expect(classified[2].columnType).toBe('VARIANT_SKU')
    expect(classified.every(c => c.needsHumanReview === false)).toBe(true)
  })

  it('should classify cereal with milk correctly', () => {
    const columns = [
      { columnName: 'Cereal', headerText: 'As Packaged', nutritionFacts: [] },
      { columnName: 'With Milk', headerText: 'As Prepared with ½ cup Skim Milk', nutritionFacts: [] },
    ]
    
    const classified = classifyAllColumns(columns)
    
    expect(classified[0].columnType).toBe('AS_PACKAGED')
    expect(classified[1].columnType).toBe('AS_PREPARED')
  })
})
