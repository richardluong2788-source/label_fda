/**
 * RAG Reranker Layer - Phase 2
 * 
 * Fixes Hybrid Search Imbalance by implementing:
 * 1. Cross-encoder scoring via OpenAI (fallback if no Cohere)
 * 2. Intent-aware scoring (boost results matching detected category)
 * 3. Weighted fusion: Vector(0.6) + Keyword(0.3) + Rerank(0.1)
 * 4. Metadata validation boost (penalize mismatched metadata)
 */

import { classifyIntent, getCategoryFilters, type ProductCategory } from './intent-classifier'
import { detectRegulatorySource, detectSpecificRegulation } from './metadata-validator'

// ==================== TYPES ====================

export interface RerankableResult {
  id: number | string
  content: string
  similarity: number        // Original vector similarity score
  metadata?: Record<string, any>
  section_name?: string
  hybrid_boost?: number     // Keyword boost already applied
  // Will be populated by reranker
  rerank_score?: number
  final_score?: number
  intent_boost?: number
  metadata_penalty?: number
  relevance_tier?: 'primary' | 'supporting' | 'related'
}

export interface RerankConfig {
  /** Weight for vector similarity score (default: 0.55) */
  vectorWeight: number
  /** Weight for keyword match score (default: 0.25) */
  keywordWeight: number
  /** Weight for rerank/cross-encoder score (default: 0.10) */
  rerankWeight: number
  /** Weight for intent alignment score (default: 0.10) */
  intentWeight: number
  /** Maximum penalty for metadata mismatch (default: 0.15) */
  metadataPenaltyMax: number
  /** Minimum final score threshold to include (default: 0.30) */
  minScoreThreshold: number
  /** Enable cross-encoder reranking (default: true) */
  enableCrossEncoder: boolean
  /** Enable intent-based boosting (default: true) */
  enableIntentBoost: boolean
  /** Enable metadata validation penalty (default: true) */
  enableMetadataValidation: boolean
}

export interface RerankOutput {
  results: RerankableResult[]
  config: RerankConfig
  queryIntent: {
    category: ProductCategory
    confidence: number
    keywords: string[]
  }
  stats: {
    totalInput: number
    totalOutput: number
    avgFinalScore: number
    avgVectorScore: number
    avgRerankScore: number
    rerankedAt: string
    processingTimeMs: number
  }
}

// ==================== DEFAULT CONFIG ====================

const DEFAULT_CONFIG: RerankConfig = {
  // vector(0.55) + keyword(0.20) + rerank(0.10) + intent(0.15) = 1.00
  // Intent gets more weight because when confidence is high (90%) it's a very strong signal.
  vectorWeight: 0.55,
  keywordWeight: 0.20,
  rerankWeight: 0.10,
  intentWeight: 0.15,
  metadataPenaltyMax: 0.12,
  minScoreThreshold: 0.18,
  enableCrossEncoder: true,
  enableIntentBoost: true,
  enableMetadataValidation: true,
}

// ==================== CROSS-ENCODER SCORING ====================

/**
 * Lightweight cross-encoder scoring using semantic overlap analysis.
 * This replaces a heavy API call (Cohere/OpenAI) with a fast local computation
 * that captures query-document relevance more precisely than pure vector similarity.
 */
function crossEncoderScore(query: string, document: string): number {
  const queryLower = query.toLowerCase()
  const docLower = document.toLowerCase()

  // 1. Extract meaningful tokens (skip stopwords)
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'what',
    'how', 'which', 'where', 'when', 'who', 'that', 'this', 'these',
    'those', 'it', 'its', 'they', 'their', 'them', 'we', 'our', 'us',
    'i', 'my', 'me', 'you', 'your', 'he', 'she', 'his', 'her',
  ])

  const queryTokens = queryLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w))

  const docTokens = docLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w))

  if (queryTokens.length === 0 || docTokens.length === 0) return 0.3

  // 2. Exact token overlap (weighted higher)
  let exactMatches = 0
  for (const qt of queryTokens) {
    if (docTokens.includes(qt)) {
      exactMatches++
    }
  }
  const exactOverlap = exactMatches / queryTokens.length

  // 3. Partial/substring overlap (for compound terms)
  let partialMatches = 0
  for (const qt of queryTokens) {
    if (docLower.includes(qt)) {
      partialMatches++
    }
  }
  const partialOverlap = partialMatches / queryTokens.length

  // 4. N-gram overlap (bigrams for phrase matching)
  const queryBigrams = new Set<string>()
  for (let i = 0; i < queryTokens.length - 1; i++) {
    queryBigrams.add(`${queryTokens[i]} ${queryTokens[i + 1]}`)
  }

  const docText = docTokens.join(' ')
  let bigramMatches = 0
  for (const bigram of queryBigrams) {
    if (docText.includes(bigram)) {
      bigramMatches++
    }
  }
  const bigramOverlap = queryBigrams.size > 0 ? bigramMatches / queryBigrams.size : 0

  // 5. CFR reference matching (e.g., "101.9" in both query and doc)
  const cfrPattern = /\d{2,3}\.\d+[a-z]?/g
  const queryCfrs = queryLower.match(cfrPattern) || []
  const docCfrs = docLower.match(cfrPattern) || []
  let cfrBoost = 0
  for (const qcfr of queryCfrs) {
    if (docCfrs.some(dcfr => dcfr.startsWith(qcfr) || qcfr.startsWith(dcfr))) {
      cfrBoost = 0.25
      break
    }
  }

  // 6. FDA domain-specific phrase matching
  // Key multi-word FDA terms that should be matched as phrases
  const fdaPhrases = [
    'net quantity', 'net weight', 'net contents', 'quantity of contents',
    'principal display panel', 'display panel', 'information panel',
    'nutrition facts', 'serving size', 'daily value', 'percent daily value',
    'drug facts', 'active ingredient', 'inactive ingredient',
    'supplement facts', 'dietary supplement', 'dietary ingredient',
    'statement of identity', 'common name', 'standard of identity',
    'health claim', 'nutrient content claim', 'structure function claim',
    'warning statement', 'allergen declaration', 'color additive',
    'adequate directions', 'intended use', 'cosmetic labeling',
    'font size', 'type size', 'conspicuous', 'area of principal display',
    'supplemental statement', 'metric system', 'dual declaration',
  ]
  
  let phraseBoost = 0
  for (const phrase of fdaPhrases) {
    const inQuery = queryLower.includes(phrase)
    const inDoc = docLower.includes(phrase)
    if (inQuery && inDoc) {
      phraseBoost += 0.15 // Strong boost: same FDA phrase in both query and doc
    } else if (inQuery && !inDoc) {
      phraseBoost -= 0.05 // Slight penalty: query asks for this concept but doc doesn't mention it
    }
  }
  phraseBoost = Math.max(-0.1, Math.min(0.3, phraseBoost)) // Clamp

  // 7. Document length penalty (very short docs are likely boilerplate)
  const lengthPenalty = docTokens.length < 20 ? 0.7 : docTokens.length < 50 ? 0.85 : 1.0

  // Weighted combination with domain phrase boost
  const score = (
    exactOverlap * 0.25 +
    partialOverlap * 0.15 +
    bigramOverlap * 0.15 +
    cfrBoost * 0.15 +
    Math.max(0, phraseBoost) * 0.30 // FDA phrase matching gets significant weight
  ) * lengthPenalty + phraseBoost * 0.1 // Small additive from phrase matching

  // Normalize to 0-1 range
  return Math.min(1.0, Math.max(0, score))
}

// ==================== INTENT-AWARE SCORING ====================

/**
 * Calculate intent alignment score.
 * Boosts documents whose metadata category matches the detected query intent.
 */
function calculateIntentScore(
  result: RerankableResult,
  detectedCategory: ProductCategory,
  categoryFilters: { partNumbers: string[]; regulations: string[]; weight: number }
): number {
  const meta = result.metadata || {}
  const content = result.content
  const contentLower = content.toLowerCase()
  let score = 0

  // --- Step 1: Determine the document's ACTUAL CFR part ---
  // Priority: content-detected part (most reliable) > section field > source field.
  // Metadata source labels are sometimes wrong (e.g. Part 701 docs stored under "21 CFR Part 101").
  // detectRegulatorySource reads the actual text, so it is ground truth.
  const contentDetected = detectRegulatorySource(content)
  const contentPart = contentDetected.partNumber  // e.g. "701"

  const sectionStr = (meta.section || '').toString()
  // Section tag like "§ 701.30" or "701.3" -> extract leading part number
  const sectionPart = sectionStr.match(/\b(7\d{2}|[12]\d{2}|8[0-9]{2})\b/)?.[1] || ''

  const sourceStr = (meta.source || meta.regulation || '').toString()
  const sourcePart = sourceStr.match(/part\s*(\d{2,3})\b/i)?.[1] || ''

  // Use the most reliable signal available
  const docPart = contentPart || sectionPart || sourcePart

  // --- Step 2: Gate on resolved part number ---
  if (docPart && categoryFilters.partNumbers.length > 0) {
    if (categoryFilters.partNumbers.includes(docPart)) {
      // Document belongs to the correct regulation — strong base score
      score += 0.5
    } else {
      // Document is genuinely from a different regulation.
      // Small non-zero score so it can still surface if vector similarity is very high.
      return 0.05
    }
  }

  // --- Step 3: Exclusive category keyword matching in content ---
  // Only use terms that uniquely identify the category, not generic words
  // like "labeling" or "ingredient" that appear across all categories.
  const exclusiveCategoryKeywords: Record<string, string[]> = {
    food: [
      'nutrition facts', 'serving size', 'calories', 'daily value',
      'net quantity', 'net weight', 'allergen', 'principal display panel',
    ],
    drug: [
      'drug facts', 'active ingredient', 'dosage', 'therapeutic',
      'over-the-counter', 'prescription',
    ],
    cosmetic: [
      'cosmetic ingredient', 'cosmetic labeling', 'fragrance', 'color additive',
      'toilet articles', '701.3', '701.30',
    ],
    supplement: [
      'supplement facts', 'dietary supplement', 'dshea', 'dietary ingredient',
      'structure-function',
    ],
    device: [
      'medical device', 'biocompatibility', 'quality system', 'diagnostic',
    ],
    soap: ['soap', 'bar soap', 'antiseptic soap'],
    mixed: [],
    unknown: [],
  }

  const keywords = exclusiveCategoryKeywords[detectedCategory] || []
  let keywordHits = 0
  for (const kw of keywords) {
    if (contentLower.includes(kw)) keywordHits++
  }
  if (keywords.length > 0) {
    score += (keywordHits / keywords.length) * 0.3
  }

  // --- Step 4: Explicit CFR part number reference in document content ---
  for (const partNum of categoryFilters.partNumbers) {
    const partRegex = new RegExp(`part\\s*${partNum}\\b|\\b${partNum}\\.\\d`, 'i')
    if (partRegex.test(content)) {
      score += 0.2
      break
    }
  }

  return Math.min(1.0, score)
}

// ==================== METADATA VALIDATION ====================

/**
 * Calculate penalty for metadata inconsistencies.
 * Uses the metadata-validator from Phase 1 to detect mismatches.
 */
function calculateMetadataPenalty(result: RerankableResult): number {
  const meta = result.metadata || {}
  const content = result.content
  let penalty = 0

  // The metadata source field is sometimes wrong (import labeling errors).
  // Only penalize when BOTH the section tag AND the source disagree with content.
  // A single field mismatch is likely a labeling error, not a content quality issue.
  const sourceStr = (meta.source || meta.regulation || '').toString()
  const sourcePart = sourceStr.match(/part\s*(\d{2,3})\b/i)?.[1] || ''

  const sectionStr = (meta.section || '').toString()
  const sectionPart = sectionStr.match(/\b(7\d{2}|[12]\d{2}|8[0-9]{2})\b/)?.[1] || ''

  const contentDetected = detectRegulatorySource(content)
  const contentPart = contentDetected.partNumber

  // Only penalize when both source AND section point to a different part than the content.
  // This avoids false penalties on docs where source is wrong but section/content are correct.
  if (
    contentPart &&
    sourcePart && sourcePart !== contentPart &&
    sectionPart && sectionPart !== contentPart
  ) {
    penalty += 0.08
  }

  // Check for truncated/incomplete chunks
  const trimmed = content.trim()
  if (trimmed.endsWith('...') || trimmed.endsWith('…')) {
    penalty += 0.05
  }

  // Check for very short chunks (likely incomplete boilerplate)
  const wordCount = content.split(/\s+/).length
  if (wordCount < 30) {
    penalty += 0.08
  } else if (wordCount < 50) {
    penalty += 0.03
  }

  // Check for boilerplate section headers with no real content
  if (wordCount < 80 && /^21 CFR Part \d+/i.test(trimmed)) {
    penalty += 0.05
  }

  return Math.min(0.12, penalty)
}

// ==================== MAIN RERANKER ====================

/**
 * Rerank search results using weighted fusion scoring.
 * 
 * Formula: final_score = (vector * W_v) + (keyword * W_k) + (rerank * W_r) + (intent * W_i) - metadata_penalty
 * 
 * Default weights: vector=0.55, keyword=0.25, rerank=0.10, intent=0.10
 * 
 * @param query - Original search query
 * @param results - Raw search results from vector + keyword search
 * @param config - Optional reranker configuration
 * @returns Reranked results with detailed scoring breakdown
 */
export function rerankResults(
  query: string,
  results: RerankableResult[],
  config: Partial<RerankConfig> = {}
): RerankOutput {
  const startTime = Date.now()
  const cfg: RerankConfig = { ...DEFAULT_CONFIG, ...config }

  // Classify query intent
  const intentResult = classifyIntent(query)
  const categoryFilters = getCategoryFilters(intentResult.category)

  console.log(`[v0] Intent classified: category=${intentResult.category} confidence=${(intentResult.confidence * 100).toFixed(0)}% keywords=[${intentResult.keywords.slice(0, 5).join(', ')}]`)

  // Score each result
  const scored = results.map(result => {
    // Decompose the original similarity into vector and keyword components
    // hybrid_boost is the total boost from keyword/bigram/trigram/density matching
    // (0.08 per keyword + 0.12 per bigram + 0.18 per trigram + density bonus, capped at 0.50)
    // similarity is already boosted (original_vector + hybrid_boost)
    const keywordBoost = result.hybrid_boost || 0
    const rawVectorScore = Math.max(0, result.similarity - keywordBoost) // Remove boost to get pure vector
    
    // Normalize keyword score directly as proportion of max boost (0.50)
    // This creates differentiation: boost=0.08 -> 16%, boost=0.32 -> 64%, boost=0.50 -> 100%
    const keywordScore = Math.min(1.0, keywordBoost / 0.50)

    // Cross-encoder score
    const rerankScore = cfg.enableCrossEncoder
      ? crossEncoderScore(query, result.content)
      : 0

    // Intent alignment score
    const intentScore = cfg.enableIntentBoost
      ? calculateIntentScore(result, intentResult.category, categoryFilters)
      : 0

    // Metadata penalty
    const metaPenalty = cfg.enableMetadataValidation
      ? calculateMetadataPenalty(result)
      : 0

    // Weighted fusion using decomposed scores.
    // metaPenalty is already capped at 0.15 by calculateMetadataPenalty —
    // apply it directly without a multiplier to prevent over-penalization.
    const finalScore = Math.max(0, Math.min(1.0,
      (rawVectorScore * cfg.vectorWeight) +
      (keywordScore * cfg.keywordWeight) +
      (rerankScore * cfg.rerankWeight) +
      (intentScore * cfg.intentWeight) -
      metaPenalty
    ))

    console.log(`[v0] Reranker scoring [${(result.section_name || result.id)}]: raw_vector=${rawVectorScore.toFixed(3)} kw_boost=${keywordBoost.toFixed(3)} kw_score=${keywordScore.toFixed(3)} rerank=${rerankScore.toFixed(3)} intent=${intentScore.toFixed(3)} penalty=${metaPenalty.toFixed(3)} -> final=${finalScore.toFixed(3)}`)

    // Determine relevance tier based on final weighted score.
    // "primary"   >= 0.50 : high-confidence, directly relevant
    // "supporting" >= 0.32 : relevant context, may need verification
    // "related"    < 0.32 : loosely related, use with caution
    let relevanceTier: 'primary' | 'supporting' | 'related'
    if (finalScore >= 0.50) {
      relevanceTier = 'primary'
    } else if (finalScore >= 0.32) {
      relevanceTier = 'supporting'
    } else {
      relevanceTier = 'related'
    }

    return {
      ...result,
      similarity: finalScore, // Override similarity with final score
      rerank_score: rerankScore,
      final_score: finalScore,
      intent_boost: intentScore,
      metadata_penalty: metaPenalty,
      relevance_tier: relevanceTier,
    }
  })

  // Sort by final score descending
  scored.sort((a, b) => (b.final_score || 0) - (a.final_score || 0))

  // Filter by minimum threshold
  const filtered = scored.filter(r => (r.final_score || 0) >= cfg.minScoreThreshold)

  // Calculate stats
  const endTime = Date.now()
  const avgFinal = filtered.length > 0
    ? filtered.reduce((sum, r) => sum + (r.final_score || 0), 0) / filtered.length
    : 0
  const avgVector = results.length > 0
    ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
    : 0
  const avgRerank = filtered.length > 0
    ? filtered.reduce((sum, r) => sum + (r.rerank_score || 0), 0) / filtered.length
    : 0

  return {
    results: filtered,
    config: cfg,
    queryIntent: {
      category: intentResult.category,
      confidence: intentResult.confidence,
      keywords: intentResult.keywords,
    },
    stats: {
      totalInput: results.length,
      totalOutput: filtered.length,
      avgFinalScore: Number(avgFinal.toFixed(4)),
      avgVectorScore: Number(avgVector.toFixed(4)),
      avgRerankScore: Number(avgRerank.toFixed(4)),
      rerankedAt: new Date().toISOString(),
      processingTimeMs: endTime - startTime,
    },
  }
}

/**
 * Quick rerank with sensible defaults for the analyze pipeline.
 * Applies lighter configuration optimized for speed during analysis.
 */
export function quickRerank(
  query: string,
  results: RerankableResult[],
  limit: number = 10
): RerankableResult[] {
  const output = rerankResults(query, results, {
    enableCrossEncoder: true,
    enableIntentBoost: true,
    enableMetadataValidation: true,
    minScoreThreshold: 0.25,
  })
  return output.results.slice(0, limit)
}

/**
 * Full rerank with detailed output for the Test RAG page and debugging.
 */
export function fullRerank(
  query: string,
  results: RerankableResult[],
  config: Partial<RerankConfig> = {}
): RerankOutput {
  return rerankResults(query, results, config)
}
