/**
 * Smart Chunking Strategy - Phase 2
 * 
 * Fixes Incomplete Chunking Issue by:
 * 1. Respecting sentence boundaries (no mid-sentence cuts)
 * 2. Preserving table structures (nutrition facts panels)
 * 3. Adding source references to each chunk (CFR section + page)
 * 4. Using overlap to maintain context across chunks
 * 5. Validating chunk quality before accepting
 */

// ==================== TYPES ====================

export interface ChunkOptions {
  /** Minimum chunk size in tokens/words (default: 80) */
  minChunkSize: number
  /** Target chunk size in tokens/words (default: 250) */
  targetChunkSize: number
  /** Maximum chunk size in tokens/words (default: 400) */
  maxChunkSize: number
  /** Overlap between consecutive chunks in words (default: 40) */
  overlapSize: number
  /** Preserve table structures as single chunks (default: true) */
  preserveTables: boolean
  /** Add source reference metadata to each chunk (default: true) */
  addSourceRefs: boolean
}

export interface SmartChunk {
  /** The chunk text content */
  content: string
  /** Word count */
  wordCount: number
  /** Character count */
  charCount: number
  /** Index within the parent document */
  chunkIndex: number
  /** Total chunks from the parent document */
  totalChunks: number
  /** Whether this chunk is a continuation from previous */
  isContinuation: boolean
  /** CFR references found in this chunk */
  cfrReferences: string[]
  /** Source document section if detected */
  sectionHeader: string | null
  /** Quality score 0-1 */
  qualityScore: number
  /** Chunk type */
  type: 'paragraph' | 'table' | 'list' | 'mixed'
}

// ==================== DEFAULT CONFIG ====================

const DEFAULT_OPTIONS: ChunkOptions = {
  minChunkSize: 80,
  targetChunkSize: 250,
  maxChunkSize: 400,
  overlapSize: 40,
  preserveTables: true,
  addSourceRefs: true,
}

// ==================== HELPERS ====================

/**
 * Extract CFR references from text (e.g., "21 CFR 101.9", "Section 101.36")
 */
function extractCfrReferences(text: string): string[] {
  const refs: string[] = []
  const patterns = [
    /(?:21\s+CFR|CFR)\s+(?:Part\s+)?(\d{2,3}\.\d+[a-z]?(?:\([a-z0-9]+\))*)/gi,
    /\u00A7\s*(\d{2,3}\.\d+[a-z]?)/g,  // Section symbol
    /Section\s+(\d{2,3}\.\d+[a-z]?)/gi,
  ]
  
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[1] || match[0]
      const cleaned = ref.replace(/^(?:21\s+CFR|CFR)\s+(?:Part\s+)?/i, '').trim()
      if (cleaned && !refs.includes(cleaned)) {
        refs.push(cleaned)
      }
    }
  }
  
  return refs
}

/**
 * Detect section headers in regulation text
 */
function detectSectionHeader(text: string): string | null {
  // Match patterns like "§ 101.36 Nutrition labeling of dietary supplements."
  const headerMatch = text.match(/(?:\u00A7|Section)\s*\d{2,3}\.\d+[a-z]?\s+[A-Z][^.\n]{5,100}\./)
  if (headerMatch) return headerMatch[0].trim()

  // Match subpart headers
  const subpartMatch = text.match(/Subpart\s+[A-Z][\u2014\u2013\u2015—–-][^\n]{5,80}/)
  if (subpartMatch) return subpartMatch[0].trim()

  return null
}

/**
 * Check if text contains a table structure (nutrition facts, etc.)
 */
function containsTable(text: string): boolean {
  const tableIndicators = [
    /nutrition facts/i,
    /serving size.*serving.*container/is,
    /amount per serving/i,
    /% daily value/i,
    /\|.*\|.*\|/,         // Pipe-separated table
    /\t.*\t.*\t/,         // Tab-separated data
    /^\s*[-=]{3,}\s*$/m,  // Horizontal rules
  ]
  
  return tableIndicators.some(pattern => pattern.test(text))
}

/**
 * Find the best sentence boundary near a target position
 */
function findSentenceBoundary(text: string, targetPos: number, direction: 'before' | 'after'): number {
  const sentenceEnders = /[.!?]\s+/g
  let bestPos = targetPos
  let match: RegExpExecArray | null
  
  if (direction === 'before') {
    while ((match = sentenceEnders.exec(text)) !== null) {
      const endPos = match.index + match[0].length
      if (endPos <= targetPos) {
        bestPos = endPos
      } else {
        break
      }
    }
  } else {
    while ((match = sentenceEnders.exec(text)) !== null) {
      const endPos = match.index + match[0].length
      if (endPos >= targetPos) {
        bestPos = endPos
        break
      }
    }
  }
  
  return bestPos
}

/**
 * Calculate chunk quality score
 */
function calculateQualityScore(chunk: string): number {
  let score = 1.0
  const words = chunk.split(/\s+/).filter(w => w.length > 0)
  
  // Penalize very short chunks
  if (words.length < 30) {
    score -= 0.3
  } else if (words.length < 50) {
    score -= 0.1
  }
  
  // Penalize chunks that start mid-sentence (lowercase start after trimming)
  const trimmed = chunk.trim()
  if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) {
    score -= 0.15
  }
  
  // Penalize truncated chunks (ending with incomplete sentence)
  if (!trimmed.endsWith('.') && !trimmed.endsWith(';') && !trimmed.endsWith(')') && !trimmed.endsWith('"')) {
    score -= 0.1
  }
  
  // Boost chunks with CFR references (more useful for regulatory search)
  const cfrRefs = extractCfrReferences(chunk)
  if (cfrRefs.length > 0) {
    score += 0.1
  }
  
  // Boost chunks with section headers
  if (detectSectionHeader(chunk)) {
    score += 0.05
  }
  
  // Penalize boilerplate
  if (/^21 CFR Part \d+$/i.test(trimmed) || trimmed.length < 50) {
    score -= 0.4
  }
  
  return Math.max(0, Math.min(1, score))
}

// ==================== MAIN CHUNKING ====================

/**
 * Smart chunk text with sentence boundary respect and table preservation.
 * 
 * @param text - Full text to chunk
 * @param options - Chunking configuration
 * @returns Array of validated, quality-scored chunks
 */
export function smartChunkText(
  text: string,
  options: Partial<ChunkOptions> = {}
): SmartChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: SmartChunk[] = []
  
  // Pre-process: normalize whitespace
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  
  // Step 1: Split into major sections (by double newline or section headers)
  const sections = splitIntoSections(cleanText)
  
  let globalIndex = 0
  
  for (const section of sections) {
    const sectionWords = section.split(/\s+/).filter(w => w.length > 0)
    
    // If section is a table and we should preserve it
    if (opts.preserveTables && containsTable(section)) {
      const cfrRefs = extractCfrReferences(section)
      const header = detectSectionHeader(section)
      
      chunks.push({
        content: section.trim(),
        wordCount: sectionWords.length,
        charCount: section.length,
        chunkIndex: globalIndex,
        totalChunks: 0, // Will be set later
        isContinuation: false,
        cfrReferences: cfrRefs,
        sectionHeader: header,
        qualityScore: calculateQualityScore(section),
        type: 'table',
      })
      globalIndex++
      continue
    }
    
    // If section fits in one chunk, keep it whole
    if (sectionWords.length <= opts.maxChunkSize) {
      if (sectionWords.length >= opts.minChunkSize) {
        const cfrRefs = extractCfrReferences(section)
        const header = detectSectionHeader(section)
        
        chunks.push({
          content: section.trim(),
          wordCount: sectionWords.length,
          charCount: section.length,
          chunkIndex: globalIndex,
          totalChunks: 0,
          isContinuation: false,
          cfrReferences: cfrRefs,
          sectionHeader: header,
          qualityScore: calculateQualityScore(section),
          type: detectChunkType(section),
        })
        globalIndex++
      }
      continue
    }
    
    // Split large sections into overlapping chunks at sentence boundaries
    const sectionChunks = splitSectionIntoChunks(section, opts)
    for (const sc of sectionChunks) {
      chunks.push({
        ...sc,
        chunkIndex: globalIndex,
        totalChunks: 0,
      })
      globalIndex++
    }
  }
  
  // Set totalChunks for all
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length
  }
  
  // Filter out very low quality chunks
  return chunks.filter(c => c.qualityScore >= 0.3)
}

/**
 * Split text into major sections by double newlines or section headers
 */
function splitIntoSections(text: string): string[] {
  // Split by section headers or double newlines
  const sectionPattern = /\n\n+/g
  const sections = text.split(sectionPattern).filter(s => s.trim().length > 0)
  
  // Merge very small adjacent sections
  const merged: string[] = []
  let current = ''
  
  for (const section of sections) {
    const words = section.split(/\s+/).length
    if (words < 30 && current) {
      current += '\n\n' + section
    } else if (current && current.split(/\s+/).length < 30) {
      current += '\n\n' + section
    } else {
      if (current) merged.push(current)
      current = section
    }
  }
  if (current) merged.push(current)
  
  return merged
}

/**
 * Split a single large section into overlapping chunks at sentence boundaries
 */
function splitSectionIntoChunks(
  section: string,
  opts: ChunkOptions
): Omit<SmartChunk, 'chunkIndex' | 'totalChunks'>[] {
  const chunks: Omit<SmartChunk, 'chunkIndex' | 'totalChunks'>[] = []
  const words = section.split(/\s+/)
  
  let start = 0
  let isFirst = true
  
  while (start < words.length) {
    const end = Math.min(start + opts.targetChunkSize, words.length)
    
    // Get the text for this chunk
    let chunkText = words.slice(start, end).join(' ')
    
    // Find the best sentence boundary for the end
    if (end < words.length) {
      const boundaryPos = findSentenceBoundary(chunkText, chunkText.length - 50, 'before')
      if (boundaryPos > chunkText.length * 0.6) {
        chunkText = chunkText.substring(0, boundaryPos)
      }
    }
    
    const chunkWords = chunkText.split(/\s+/).filter(w => w.length > 0)
    
    if (chunkWords.length >= opts.minChunkSize / 2) {
      chunks.push({
        content: chunkText.trim(),
        wordCount: chunkWords.length,
        charCount: chunkText.length,
        isContinuation: !isFirst,
        cfrReferences: extractCfrReferences(chunkText),
        sectionHeader: isFirst ? detectSectionHeader(chunkText) : null,
        qualityScore: calculateQualityScore(chunkText),
        type: detectChunkType(chunkText),
      })
    }
    
    // Advance with overlap
    const advanceBy = Math.max(
      opts.targetChunkSize - opts.overlapSize,
      Math.floor(opts.targetChunkSize * 0.6)
    )
    start += advanceBy
    isFirst = false
  }
  
  return chunks
}

/**
 * Detect chunk content type
 */
function detectChunkType(text: string): SmartChunk['type'] {
  if (containsTable(text)) return 'table'
  
  // Check for list patterns
  const listPattern = /^[\s]*[\-\*\u2022\d+\.]\s/m
  const listMatches = text.match(new RegExp(listPattern.source, 'gm'))
  if (listMatches && listMatches.length >= 3) return 'list'
  
  return 'paragraph'
}

/**
 * Re-chunk existing content with better quality.
 * Used for migration/re-processing of existing vector DB content.
 * 
 * @param existingContent - Current chunk content
 * @param fullDocument - Full source document (if available)
 * @param options - Chunking options
 * @returns Improved chunks
 */
export function rechunkContent(
  existingContent: string,
  fullDocument?: string,
  options: Partial<ChunkOptions> = {}
): SmartChunk[] {
  // If we have the full document, re-chunk from scratch
  if (fullDocument) {
    return smartChunkText(fullDocument, options)
  }
  
  // Otherwise, validate and split existing content if needed
  const words = existingContent.split(/\s+/).filter(w => w.length > 0)
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // If existing content is good quality and proper size, keep it
  const quality = calculateQualityScore(existingContent)
  if (quality >= 0.7 && words.length >= opts.minChunkSize && words.length <= opts.maxChunkSize) {
    return [{
      content: existingContent.trim(),
      wordCount: words.length,
      charCount: existingContent.length,
      chunkIndex: 0,
      totalChunks: 1,
      isContinuation: false,
      cfrReferences: extractCfrReferences(existingContent),
      sectionHeader: detectSectionHeader(existingContent),
      qualityScore: quality,
      type: detectChunkType(existingContent),
    }]
  }
  
  // Re-chunk if quality is low or size is wrong
  return smartChunkText(existingContent, options)
}
