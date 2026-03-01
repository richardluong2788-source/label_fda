/**
 * RAG Metadata Validator
 * Fixes Wrong Source Metadata issues in vector DB
 */

export interface ChunkMetadata {
  id: string
  source: string
  section: string
  content: string
  pageNumber?: number
  partNumber?: string
  category?: string
  confidence?: number
}

export interface ValidationResult {
  chunkId: string
  originalSource: string
  correctedSource: string
  issues: string[]
  corrected: boolean
}

/**
 * Detect correct regulation type from chunk content
 */
export function detectRegulatorySource(content: string): {
  partNumber: string
  category: string
  confidence: number
} {
  const contentLower = content.toLowerCase()
  const results = {
    partNumber: '',
    category: '',
    confidence: 0
  }

  // Check for Part 701 - Cosmetics
  if (contentLower.includes('701.') || contentLower.includes('part 701')) {
    results.partNumber = '701'
    results.category = 'Cosmetics'
    results.confidence = 0.95
    return results
  }

  // Check for Part 101 - Food Labeling
  if (contentLower.includes('101.') || contentLower.includes('part 101')) {
    results.partNumber = '101'
    results.category = 'Food Labeling'
    results.confidence = 0.95
    return results
  }

  // Check for Part 820 - Quality System (Device Manufacturing)
  if (contentLower.includes('820.') || contentLower.includes('part 820')) {
    results.partNumber = '820'
    results.category = 'Medical Device'
    results.confidence = 0.95
    return results
  }

  // Content-based detection for Cosmetics
  const cosmeticKeywords = ['soap', 'cosmetic', 'beauty', 'skincare', 'perfume', 'fragrance', 'cosmetic claim']
  const cosmeticMatches = cosmeticKeywords.filter(k => contentLower.includes(k)).length
  if (cosmeticMatches >= 2) {
    results.partNumber = '701'
    results.category = 'Cosmetics'
    results.confidence = 0.85
    return results
  }

  // Content-based detection for Food
  const foodKeywords = ['nutrition facts', 'serving size', 'calories', 'ingredient statement', 'allergen', 'net weight']
  const foodMatches = foodKeywords.filter(k => contentLower.includes(k)).length
  if (foodMatches >= 2) {
    results.partNumber = '101'
    results.category = 'Food Labeling'
    results.confidence = 0.85
    return results
  }

  // Content-based detection for Drugs
  const drugKeywords = ['therapeutic', 'drug', 'medication', 'pharmaceutical', 'disease claim', 'cure', 'treat', 'prevent']
  const drugMatches = drugKeywords.filter(k => contentLower.includes(k)).length
  if (drugMatches >= 2) {
    results.partNumber = '201'
    results.category = 'Drug'
    results.confidence = 0.80
    return results
  }

  return results
}

/**
 * Detect specific regulation within the content
 */
export function detectSpecificRegulation(content: string): {
  regulation: string
  section: string
  confidence: number
} {
  const contentLower = content.toLowerCase()

  // FALCPA - Major allergens declaration
  if (contentLower.includes('falcpa') || contentLower.includes('major allergen')) {
    return {
      regulation: 'FALCPA',
      section: '21 CFR 101.100 & 325.100 & 701.3',
      confidence: 0.95
    }
  }

  // Nutrition Facts Format
  if (contentLower.includes('nutrition facts') && contentLower.includes('serving')) {
    return {
      regulation: 'Nutrition Label Format',
      section: '21 CFR 101.36',
      confidence: 0.90
    }
  }

  // Net Weight/Quantity Declaration
  if (contentLower.includes('net weight') || contentLower.includes('net quantity')) {
    return {
      regulation: 'Net Quantity Declaration',
      section: '21 CFR 101.105',
      confidence: 0.90
    }
  }

  // Ingredient Declaration
  if (contentLower.includes('ingredient') && contentLower.includes('statement')) {
    return {
      regulation: 'Ingredient Declaration',
      section: '21 CFR 101.4',
      confidence: 0.88
    }
  }

  return {
    regulation: 'General Labeling',
    section: 'Various',
    confidence: 0.5
  }
}

/**
 * Validate and correct chunk metadata
 */
export function validateChunkMetadata(chunk: ChunkMetadata): ValidationResult {
  const issues: string[] = []
  let correctedSource = chunk.source

  // Detect what the content actually is
  const detected = detectRegulatorySource(chunk.content)
  const regulation = detectSpecificRegulation(chunk.content)

  // Check if source is correct
  if (detected.partNumber && chunk.source !== detected.partNumber) {
    issues.push(
      `Source mismatch: labeled as '${chunk.source}' but content indicates '${detected.partNumber} (${detected.category})'`
    )
    correctedSource = detected.partNumber
  }

  // Check for incomplete chunk (common issue)
  if (chunk.content.trim().endsWith('...')) {
    issues.push('Content appears to be truncated')
  }

  // Check for minimal content
  if (chunk.content.split(' ').length < 50) {
    issues.push('Chunk is too small - may lack context')
  }

  // Validate metadata exists
  if (!chunk.pageNumber) {
    issues.push('Missing page number reference')
  }

  if (!regulation.section) {
    issues.push('Could not determine specific regulation')
  }

  return {
    chunkId: chunk.id,
    originalSource: chunk.source,
    correctedSource,
    issues,
    corrected: correctedSource !== chunk.source
  }
}

/**
 * Batch validate multiple chunks
 */
export function validateBatch(chunks: ChunkMetadata[]): {
  validResults: ValidationResult[]
  correctionSummary: {
    totalChunks: number
    correctedChunks: number
    issuesFound: number
    partTransfers: Record<string, number>
  }
} {
  const results = chunks.map(chunk => validateChunkMetadata(chunk))
  
  const partTransfers: Record<string, number> = {}
  let correctedCount = 0
  let issuesCount = 0

  results.forEach(result => {
    if (result.corrected) {
      correctedCount++
      const key = `${result.originalSource} → ${result.correctedSource}`
      partTransfers[key] = (partTransfers[key] || 0) + 1
    }
    issuesCount += result.issues.length
  })

  return {
    validResults: results,
    correctionSummary: {
      totalChunks: chunks.length,
      correctedChunks: correctedCount,
      issuesFound: issuesCount,
      partTransfers
    }
  }
}
