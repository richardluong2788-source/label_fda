/**
 * Embedding utilities for Knowledge Base
 * Converts text to vectors for semantic search
 * 
 * Phase 2: Integrated with Reranker Layer for better retrieval quality
 */

import { openai, retryWithBackoff } from './openai-client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { quickRerank, type RerankableResult } from './rag/reranker'

/**
 * Generate embedding vector for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  console.log('[v0] Generating embedding for text length:', text.length)
  
  try {
    const response = await retryWithBackoff(() =>
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // Limit to 8K chars to avoid token limits
      })
    )
    
    console.log('[v0] Successfully generated embedding')
    return response.data[0].embedding
  } catch (error) {
    console.error('[v0] Error generating embedding:', error)
    
    // CRITICAL FIX: Do NOT return a mock embedding. A fake vector will match
    // random documents in the DB, producing silently wrong RAG results.
    // Let the error propagate so callers (searchKnowledge, searchWarningLetters,
    // searchRecalls) fall into their own catch blocks and return [] instead of
    // fake citations that mislead the analysis.
    throw new Error(
      `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown OpenAI error'}. ` +
      `RAG search will be skipped for this query to avoid false results.`
    )
  }
}

/**
 * Generate embeddings for multiple texts in batch (OPTIMIZED)
 * OpenAI supports up to 2048 texts per batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  console.log('[v0] Generating batch embeddings for', texts.length, 'texts')
  
  if (texts.length === 0) return []
  
  try {
    // Truncate all texts to 8K chars
    const truncatedTexts = texts.map(text => text.slice(0, 8000))
    
    const response = await retryWithBackoff(() =>
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: truncatedTexts,
      })
    )
    
    console.log('[v0] Successfully generated', response.data.length, 'embeddings in batch')
    return response.data.map(item => item.embedding)
  } catch (error) {
    console.error('[v0] Error generating batch embeddings:', error)
    
    // Fallback to individual generation
    console.log('[v0] Falling back to individual embedding generation')
    const embeddings: number[][] = []
    for (const text of texts) {
      const embedding = await generateEmbedding(text)
      embeddings.push(embedding)
    }
    return embeddings
  }
}

/**
 * Chunk text into smaller pieces for better retrieval
 * Optimal chunk size for FDA/CFR regulations: 500-800 chars
 * @param text - Full text to chunk
 * @param chunkSize - Target size of each chunk (characters)
 * @param overlap - Overlap between chunks (characters)
 */
export function chunkText(
  text: string,
  chunkSize: number = 600,
  overlap: number = 150
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = start + chunkSize
    const chunk = text.slice(start, end)
    chunks.push(chunk.trim())
    start = end - overlap
  }

  return chunks
}

export interface KnowledgeSearchResult {
  id: number
  regulation_id: string
  section: string
  content: string
  category: string
  metadata: any
  similarity: number
}

/**
 * Perform semantic search in knowledge base using HYBRID SEARCH
 * Combines vector search (semantic) with keyword matching (exact)
 * Uses deduplicated function + content-based dedup to avoid duplicates
 * @param query - Search query text
 * @param limit - Max results to return
 */
export async function searchKnowledge(
  query: string,
  limit: number = 5
): Promise<KnowledgeSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query)
    const supabase = await createClient()
    
    // Try deduplicated function first (dedup by metadata.section in DB)
    let rawResults: any[] = []
    const fetchCount = Math.min(limit * 3, 60)

    const { data: dedupData, error: dedupError } = await supabase.rpc(
      'match_compliance_knowledge_deduplicated',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.45, // Increased from 0.35 to reduce false positives
        match_count: fetchCount,
      }
    )

    if (!dedupError && dedupData) {
      rawResults = dedupData
    } else {
      // Fallback to basic function + app-level dedup by metadata.section
      const { data, error } = await supabase.rpc('match_compliance_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.45, // Increased from 0.35 for better precision
        match_count: Math.min(limit * 5, 100),
      })

      if (error) {
        console.error('[v0] Vector search error:', error)
        return []
      }

      const sectionMap = new Map<string, any>()
      for (const r of data || []) {
        // Temporal filter: skip inactive (expired/emergency) chunks
        if (r.is_active === false) continue

        const key = r.metadata?.section || r.metadata?.regulation_id || r.id
        if (!sectionMap.has(key) || r.similarity > sectionMap.get(key).similarity) {
          sectionMap.set(key, r)
        }
      }
      rawResults = Array.from(sectionMap.values())
        .sort((a: any, b: any) => b.similarity - a.similarity)
    }

    // HYBRID SEARCH: Improved keyword scoring with phrase-level differentiation
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'must', 'can',
    ])
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w))

    // Extract bigrams for phrase matching
    const queryLower = query.toLowerCase()
    const queryBigrams: string[] = []
    for (let i = 0; i < keywords.length - 1; i++) {
      queryBigrams.push(`${keywords[i]} ${keywords[i + 1]}`)
    }
    
    for (const result of rawResults) {
      const contentLower = result.content.toLowerCase()
      let boostScore = 0
      let matchedKeywords = 0
      
      // Individual keyword matches (+0.08 each)
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          boostScore += 0.08
          matchedKeywords++
        }
      }
      
      // Bigram phrase matches (+0.12 each)
      for (const bigram of queryBigrams) {
        if (contentLower.includes(bigram)) {
          boostScore += 0.12
        }
      }
      
      // Exact query match
      if (contentLower.includes(queryLower)) {
        boostScore += 0.25
      }
      
      // Keyword density bonus
      const keywordRatio = keywords.length > 0 ? matchedKeywords / keywords.length : 0
      if (keywordRatio >= 0.8) boostScore += 0.10
      else if (keywordRatio >= 0.6) boostScore += 0.05
      
      boostScore = Math.min(0.50, boostScore)
      result.similarity = Math.min(0.99, result.similarity + boostScore)
      result.hybrid_boost = boostScore
    }
    
    rawResults.sort((a: any, b: any) => b.similarity - a.similarity)

    // Content-based dedup + boilerplate filter
    const seenContent = new Set<string>()
    const deduped: any[] = []
    for (const r of rawResults) {
      const t = r.content?.trim() || ''
      if (t.length < 50) continue
      if (t.length < 80 && /^21 CFR Part \d+/i.test(t)) continue
      const hash = t.replace(/\s+/g, ' ').substring(0, 200).toLowerCase()
      if (!seenContent.has(hash)) {
        seenContent.add(hash)
        deduped.push(r)
      }
    }

    // PHASE 2: Apply Reranker Layer for better scoring
    // Convert to RerankableResult format for the reranker
    const rerankInput: RerankableResult[] = deduped.map((r: any) => ({
      id: r.id,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
      section_name: r.section_name,
      hybrid_boost: r.hybrid_boost || 0,
    }))

    // Run reranker with quick mode (optimized for analyze pipeline)
    const reranked = quickRerank(query, rerankInput, Math.floor(limit * 1.5))

    console.log('[v0] Reranker applied:', rerankInput.length, '→', reranked.length, 'results')

    // Enrich with standard fields
    const enriched = reranked.map((r: RerankableResult) => {
      const meta = r.metadata || {}
      
      return {
        id: r.id,
        regulation_id: (r as any).section_name || meta.section || meta.regulation_id || 'N/A',
        section: (r as any).section_name || meta.section || meta.regulation_id || 'Unknown',
        content: r.content,
        category: meta.industry || meta.category || 'General',
        metadata: meta,
        similarity: r.final_score || r.similarity,
        relevance_tier: r.relevance_tier || 'related',
        rerank_score: r.rerank_score,
        intent_boost: r.intent_boost,
        metadata_penalty: r.metadata_penalty,
      }
    })

    // Return reranked results
    return enriched.slice(0, Math.floor(limit * 1.5))
  } catch (error) {
    console.error('[v0] Error searching knowledge:', error)
    return []
  }
}

/**
 * Search Warning Letters specifically using vector search + metadata filter
 * Returns negative examples (violations) for dual-query RAG
 * @param query - Search query text
 * @param limit - Max results to return
 * @param productCategory - Optional category filter (food/drug/cosmetic/device/…)
 */
export async function searchWarningLetters(
  query: string,
  limit: number = 3,
  productCategory?: string
): Promise<KnowledgeSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query)
    const supabase = await createClient()

    // Use base vector search then filter by document_type in app layer
    const { data, error } = await supabase.rpc('match_compliance_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.40, // Increased from 0.30 for higher quality warning letter matches
      match_count: limit * 5,
    })

    if (error) {
      console.error('[v0] Warning Letter search error:', error)
      return []
    }

    // Normalise the category for matching
    const normCat = productCategory?.toLowerCase().replace(/[^a-z]/g, '') || ''

    // Filter to Warning Letters only + category pre-filter + boost by keyword matches
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)

    const warningResults = (data || [])
      .filter((r: any) => {
        if (r.metadata?.document_type !== 'FDA Warning Letter') return false
        // Temporal filter: exclude inactive (emergency/expired) chunks
        if (r.is_active === false) return false
        // Category pre-filter
        if (normCat) {
          const chunkCat = (r.metadata?.category || '').toLowerCase().replace(/[^a-z]/g, '')
          if (chunkCat && chunkCat !== 'unknown' && chunkCat !== 'general' && chunkCat !== normCat) {
            return false
          }
        }
        return true
      })
      .map((r: any) => {
        const contentLower = r.content.toLowerCase()
        let boostScore = 0

        // Boost for keyword matches in content
        for (const keyword of keywords) {
          if (contentLower.includes(keyword)) boostScore += 0.10
        }

        // Boost for problematic_keywords overlap
        const probKeywords = r.metadata?.problematic_keywords || []
        for (const pk of probKeywords) {
          if (query.toLowerCase().includes(pk.toLowerCase())) {
            boostScore += 0.20 // Strong boost for red-flag keyword match
          }
        }

        // Boost for matching category
        const chunkCat = (r.metadata?.category || '').toLowerCase()
        if (normCat && chunkCat === normCat) {
          boostScore += 0.15
        }

        // Recency boost: WL from last 2 years are most enforcement-relevant
        const issueDate = r.metadata?.issue_date ? new Date(r.metadata.issue_date) : null
        if (issueDate) {
          const ageMonths = (Date.now() - issueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          if (ageMonths <= 12)  boostScore += 0.15  // last 12 months: strongest signal
          else if (ageMonths <= 24) boostScore += 0.08  // 1-2 years
          else if (ageMonths <= 36) boostScore += 0.03  // 2-3 years
          // older than 3 years: no recency boost, but still included (is_active handles expiry)
        }

        return {
          ...r,
          similarity: Math.min(0.99, r.similarity + boostScore),
        }
      })
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit)

    return warningResults.map((r: any) => {
      // Determine relevance tier for warning letters
      let relevance_tier: 'primary' | 'supporting' | 'related'
      if (r.similarity >= 0.55) {
        relevance_tier = 'primary'    // Strong enforcement pattern match
      } else if (r.similarity >= 0.40) {
        relevance_tier = 'supporting'  // Relevant violation example
      } else {
        relevance_tier = 'related'     // Possible pattern
      }
      
      return {
        id: r.id,
        regulation_id: r.metadata?.letter_id || 'Warning Letter',
        section: r.metadata?.violation_type?.[0] || 'FDA Warning',
        content: r.content,
        category: r.metadata?.industry || r.metadata?.category || 'General',
        metadata: r.metadata,
        similarity: r.similarity,
        relevance_tier,
      }
    })
  } catch (error) {
    console.error('[v0] Error searching Warning Letters:', error)
    return []
  }
}

/**
 * QUAD-QUERY RAG: Get relevant context for AI analysis
 * Queries regulations (L1) + warning letters (L2) + recalls (L3) + import alerts (L4)
 * in parallel for comprehensive compliance analysis.
 */
export async function getRelevantContext(
  labelContent: string,
  productCategory: string
): Promise<KnowledgeSearchResult[]> {
  console.log('[v0] Getting relevant context for category:', productCategory)
  console.log('[v0] Label content length:', labelContent.length)

  try {
    const searchQuery = `${productCategory} ${labelContent.slice(0, 500)}`

    // QUAD QUERY: Run all four searches in parallel — pass productCategory for category pre-filter
    const [regulations, warnings, recalls] = await Promise.all([
      searchKnowledge(searchQuery, 10),
      searchWarningLetters(searchQuery, 5, productCategory),
      searchRecalls(searchQuery, 3, productCategory),
      // Note: Import Alerts (L4) are fetched separately in analyze route via getImportAlertContext()
      // because they use different data structures (not KnowledgeSearchResult)
    ])

    console.log('[v0] RAG retrieved', regulations.length, 'regulations with avg similarity:',
      regulations.length > 0 ? (regulations.reduce((sum, r) => sum + r.similarity, 0) / regulations.length).toFixed(3) : 0
    )
    console.log('[v0] RAG retrieved', warnings.length, 'warning letter violations with avg similarity:',
      warnings.length > 0 ? (warnings.reduce((sum, r) => sum + r.similarity, 0) / warnings.length).toFixed(3) : 0
    )
    console.log('[v0] RAG retrieved', recalls.length, 'recall enforcement examples with avg similarity:',
      recalls.length > 0 ? (recalls.reduce((sum, r) => sum + r.similarity, 0) / recalls.length).toFixed(3) : 0
    )

    // Return combined: regulations first, then warnings, then recalls (tagged via metadata)
    // Import Alerts are injected separately in the analyze route prompt builder
    return [...regulations, ...warnings, ...recalls]
  } catch (error) {
    console.error('[v0] Error getting relevant context:', error)
    return []
  }
}

/**
 * Separate getter for warning letter results (used by analyze route for prompt injection)
 */
export async function getWarningLetterContext(
  labelContent: string,
  productCategory: string
): Promise<KnowledgeSearchResult[]> {
  try {
    const searchQuery = `${productCategory} ${labelContent.slice(0, 500)}`
    return await searchWarningLetters(searchQuery, 5, productCategory)
  } catch (error) {
    console.error('[v0] Error getting warning letter context:', error)
    return []
  }
}

/**
 * Search FDA Recalls specifically using vector search + metadata filter
 * Returns recall enforcement examples (negative examples) for triple-query RAG
 * @param query - Search query text
 * @param limit - Max results to return
 * @param productCategory - Optional category filter (food/drug/cosmetic/device/…)
 */
export async function searchRecalls(
  query: string,
  limit: number = 3,
  productCategory?: string
): Promise<KnowledgeSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query)
    const supabase = await createClient()

    // Use base vector search then filter by document_type = 'FDA Recall'
    const { data, error } = await supabase.rpc('match_compliance_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.40,
      match_count: limit * 5,
    })

    if (error) {
      console.error('[v0] Recall search error:', error)
      return []
    }

    const normCat = productCategory?.toLowerCase().replace(/[^a-z]/g, '') || ''

    // Filter to FDA Recalls only + category pre-filter + boost by keyword matches
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)

    const recallResults = (data || [])
      .filter((r: any) => {
        if (r.metadata?.document_type !== 'FDA Recall') return false
        // Temporal filter: exclude inactive (expired/closed) recall chunks
        if (r.is_active === false) return false
        if (normCat) {
          const chunkCat = (r.metadata?.category || '').toLowerCase().replace(/[^a-z]/g, '')
          if (chunkCat && chunkCat !== 'unknown' && chunkCat !== 'general' && chunkCat !== normCat) {
            return false
          }
        }
        return true
      })
      .map((r: any) => {
        const contentLower = r.content.toLowerCase()
        let boostScore = 0

        // Boost for keyword matches in content
        for (const keyword of keywords) {
          if (contentLower.includes(keyword)) boostScore += 0.10
        }

        // Boost for problematic_keywords overlap
        const probKeywords = r.metadata?.problematic_keywords || []
        for (const pk of probKeywords) {
          if (query.toLowerCase().includes(pk.toLowerCase())) {
            boostScore += 0.20
          }
        }

        // Boost for matching product_type OR category
        const chunkCat = (r.metadata?.category || '').toLowerCase()
        const productType = (r.metadata?.product_type || '').toLowerCase()
        if (normCat && (chunkCat === normCat || productType.includes(normCat))) {
          boostScore += 0.15
        }

        // Recency boost: recent recalls = more relevant enforcement signal
        const recallDate = r.metadata?.recall_initiation_date
          ? new Date(r.metadata.recall_initiation_date) : null
        if (recallDate) {
          const ageMonths = (Date.now() - recallDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          if (ageMonths <= 12)  boostScore += 0.15
          else if (ageMonths <= 24) boostScore += 0.08
          else if (ageMonths <= 36) boostScore += 0.03
        }

        return {
          ...r,
          similarity: Math.min(0.99, r.similarity + boostScore),
        }
      })
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit)

    return recallResults.map((r: any) => {
      let relevance_tier: 'primary' | 'supporting' | 'related'
      if (r.similarity >= 0.55) {
        relevance_tier = 'primary'
      } else if (r.similarity >= 0.40) {
        relevance_tier = 'supporting'
      } else {
        relevance_tier = 'related'
      }

      return {
        id: r.id,
        regulation_id: r.metadata?.recall_number || 'FDA Recall',
        section: r.metadata?.recall_issue_type || 'FDA Recall',
        content: r.content,
        category: r.metadata?.category || r.metadata?.product_type || 'General',
        metadata: r.metadata,
        similarity: r.similarity,
        relevance_tier,
      }
    })
  } catch (error) {
    console.error('[v0] Error searching Recalls:', error)
    return []
  }
}

/**
 * Separate getter for recall results (used by analyze route for prompt injection)
 */
export async function getRecallContext(
  labelContent: string,
  productCategory: string
): Promise<KnowledgeSearchResult[]> {
  try {
    const searchQuery = `${productCategory} ${labelContent.slice(0, 500)}`
    return await searchRecalls(searchQuery, 5, productCategory)
  } catch (error) {
    console.error('[v0] Error getting recall context:', error)
    return []
  }
}

/**
 * Import Alert search result (from pending_import_alerts, not compliance_knowledge)
 */
export interface ImportAlertResult {
  id: string
  alert_number: string
  alert_title: string
  industry_type: string
  reason_for_alert: string
  action_type: string
  red_list_entities: any[]
  effective_date: string | null
  source_url: string | null
  match_score: number
  match_method: 'entity' | 'reason'
  /** Countries this alert is restricted to. Empty = global. */
  country_scope: string[]
}

/**
 * Normalize a company name before fuzzy matching to improve accuracy.
 * Strips common legal entity suffixes, punctuation, and whitespace variations.
 * Example: "Vexim Global JSC." → "vexim global"
 * Example: "ABC Foods Co., Ltd" → "abc foods"
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove legal entity suffixes (order matters: longer first)
    .replace(/\b(co\.?,?\s*ltd\.?|co\.?,?\s*limited|joint\s+stock\s+company|joint\s+stock\s+co\.?|j\.?s\.?c\.?|l\.?l\.?c\.?|l\.?t\.?d\.?|inc\.?|corp\.?|corporation|company|co\.?|pvt\.?|private|plc\.?|gmbh|s\.?a\.?s?\.?|b\.?v\.?|n\.?v\.?|a\.?g\.?)\b/gi, '')
    // Remove parenthetical suffixes like (JSC), (Ltd)
    .replace(/\([^)]*\)/g, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Search Import Alerts using DUAL strategy:
 *   1. Entity matching (pg_trgm fuzzy on normalized company name) — threshold 0.40 after normalization
 *   2. Reason full-text search (ts_rank on reason_for_alert + extracted_content)
 *      — country_of_origin filter applied: if alert has country_scope, skip if no country match
 *
 * Import Alerts are Layer 4 in RAG — used as Risk Context only, never for Citations.
 * Uses DB functions created in migration 024 instead of vector embeddings.
 *
 * @param query - Search query (label text / company name / violation keywords)
 * @param limit - Max results to return
 * @param industryType - Optional filter: 'food' | 'dietary-supplement' | 'cosmetic' | 'drug' | 'device'
 * @param companyName - Optional: explicit company name for entity matching
 * @param countryOfOrigin - Optional: country extracted from label (e.g. "Vietnam") for country-scoped alert filtering
 */
export async function searchImportAlerts(
  query: string,
  limit: number = 2,
  industryType?: string,
  companyName?: string,
  countryOfOrigin?: string
): Promise<ImportAlertResult[]> {
  try {
    const supabase = createAdminClient()
    const results: ImportAlertResult[] = []
    const seenAlertNumbers = new Set<string>()

    // Strategy 1: Entity matching (if companyName provided or extractable from query)
    // Normalize before matching: strip legal suffixes, lowercase, collapse spaces
    const rawEntityName = companyName || extractCompanyNameFromQuery(query)
    const entityName = rawEntityName ? normalizeCompanyName(rawEntityName) : null
    if (entityName && entityName.length >= 3) {
      console.log('[v0] Import Alert entity search — raw:', rawEntityName, '→ normalized:', entityName)

      const { data: entityResults, error: entityError } = await supabase.rpc(
        'match_import_alerts_by_entity',
        {
          // Use normalized name for better fuzzy matching accuracy
          p_company_name: entityName,
          p_industry_type: industryType || null,
          // Lower threshold after normalization: 0.40 (was 0.50) because stripping
          // legal suffixes reduces string length, making similarity scores lower for true matches
          p_similarity: 0.40,
        }
      )

      if (!entityError && entityResults) {
        for (const r of entityResults) {
          if (!seenAlertNumbers.has(r.alert_number)) {
            seenAlertNumbers.add(r.alert_number)
            results.push({
              id: r.id,
              alert_number: r.alert_number,
              alert_title: r.alert_title,
              industry_type: r.industry_type,
              reason_for_alert: r.reason_for_alert,
              action_type: r.action_type,
              red_list_entities: r.red_list_entities || [],
              effective_date: r.effective_date,
              source_url: r.source_url,
              match_score: r.match_score,
              match_method: 'entity',
              country_scope: r.country_scope || [],
            })
          }
        }
        console.log('[v0] Import Alert entity matches:', results.length)
      } else if (entityError) {
        console.warn('[v0] Import Alert entity search error:', entityError.message)
      }
    }

    // Strategy 2: Reason full-text search (always run for broader coverage)
    // Country-of-origin filter: if countryOfOrigin is provided, skip alerts whose
    // country_scope is non-empty AND does not include the product's country.
    // Example: alert 16-131 scoped to ["China", "Hong Kong"] — skip for "Vietnam"
    const reasonQuery = query.slice(0, 500)
    console.log('[v0] Import Alert reason search | country:', countryOfOrigin || 'not specified')

    const { data: reasonResults, error: reasonError } = await supabase.rpc(
      'search_import_alerts_by_reason',
      {
        p_query: reasonQuery,
        p_industry_type: industryType || null,
        p_limit: limit * 3, // Fetch extra to allow country filtering below
      }
    )

    if (!reasonError && reasonResults) {
      for (const r of reasonResults) {
        if (seenAlertNumbers.has(r.alert_number)) continue

        // Country-scope guard: if alert is country-restricted, only include if country matches
        const alertCountryScope: string[] = r.country_scope || []
        if (alertCountryScope.length > 0 && countryOfOrigin) {
          const normalizedOrigin = countryOfOrigin.toLowerCase().trim()
          const scopeMatch = alertCountryScope.some(
            c => c.toLowerCase().trim() === normalizedOrigin ||
                 normalizedOrigin.includes(c.toLowerCase().trim())
          )
          if (!scopeMatch) {
            console.log('[v0] Skipping alert', r.alert_number, '— country-restricted to', alertCountryScope, '| product from:', countryOfOrigin)
            continue
          }
        }

        seenAlertNumbers.add(r.alert_number)
        results.push({
          id: r.id,
          alert_number: r.alert_number,
          alert_title: r.alert_title,
          industry_type: r.industry_type,
          reason_for_alert: r.reason_for_alert,
          action_type: r.action_type,
          red_list_entities: [],  // reason search doesn't return full entity list
          effective_date: r.effective_date,
          source_url: r.source_url,
          match_score: r.ts_rank,
          match_method: 'reason',
          country_scope: r.country_scope || [],
        })

        if (results.length >= limit) break // Hard-cap after country filtering
      }
      console.log('[v0] Import Alert reason matches (after dedup + country filter):', results.length)
    } else if (reasonError) {
      console.warn('[v0] Import Alert reason search error:', reasonError.message)
    }

    // Sort by match_score descending, hard-cap at limit
    // Data freshness: prefer alerts effective in last 5 years (sort secondary by effective_date)
    const FIVE_YEARS_AGO = new Date()
    FIVE_YEARS_AGO.setFullYear(FIVE_YEARS_AGO.getFullYear() - 5)

    return results
      .sort((a, b) => {
        // Primary: entity match beats reason match
        if (a.match_method !== b.match_method) {
          return a.match_method === 'entity' ? -1 : 1
        }
        // Secondary: match_score descending
        if (Math.abs(b.match_score - a.match_score) > 0.05) {
          return b.match_score - a.match_score
        }
        // Tertiary: newer effective_date first (data freshness)
        const dateA = a.effective_date ? new Date(a.effective_date).getTime() : 0
        const dateB = b.effective_date ? new Date(b.effective_date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, limit)
  } catch (error) {
    console.error('[v0] Error searching Import Alerts:', error)
    return []
  }
}

/**
 * Extract a likely company name from label text for entity matching.
 * Looks for patterns like "Manufactured by", "Distributed by", "Produced by", brand names, etc.
 */
function extractCompanyNameFromQuery(query: string): string | null {
  const patterns = [
    /(?:manufactured|produced|distributed|packed|imported)\s+by[:\s]+([A-Z][A-Za-z\s&.,]+?)(?:\.|,|\n|$)/i,
    /(?:company|firm|brand)[:\s]+([A-Z][A-Za-z\s&.,]+?)(?:\.|,|\n|$)/i,
  ]

  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match?.[1]) {
      const name = match[1].trim().replace(/[.,]+$/, '')
      if (name.length >= 3 && name.length <= 100) {
        return name
      }
    }
  }
  return null
}

/**
 * Separate getter for Import Alert results (used by analyze route for prompt injection)
 * Layer 4: Risk Context only — NOT included in citations
 *
 * @param labelContent - Extracted text from the label image
 * @param productCategory - Product category (food, dietary_supplement, cosmetic, drug...)
 * @param companyName - Company name extracted from label or user-provided
 * @param countryOfOrigin - Country of origin extracted from label or user-provided (e.g. "Vietnam")
 *                          Used to skip country-scoped alerts that don't apply (e.g. China-only alerts)
 */
export async function getImportAlertContext(
  labelContent: string,
  productCategory: string,
  companyName?: string,
  countryOfOrigin?: string
): Promise<ImportAlertResult[]> {
  try {
    // Map product category to industry_type used by Import Alerts
    const industryMap: Record<string, string> = {
      food: 'food',
      dietary_supplement: 'dietary-supplement',
      supplement: 'dietary-supplement',
      cosmetic: 'cosmetic',
      drug: 'drug',
      drug_otc: 'drug',
      device: 'device',
    }
    const normCat = productCategory?.toLowerCase().replace(/[\s-]/g, '_') || ''
    const industryType = industryMap[normCat] || undefined

    const searchQuery = `${productCategory} ${labelContent.slice(0, 500)}`
    return await searchImportAlerts(searchQuery, 2, industryType, companyName, countryOfOrigin)
  } catch (error) {
    console.error('[v0] Error getting import alert context:', error)
    return []
  }
}
