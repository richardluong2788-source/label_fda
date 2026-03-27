import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embedding-utils'
import { fullRerank, type RerankableResult, type RerankConfig } from '@/lib/rag/reranker'
import { isProductLabelQuery } from '@/lib/rag/intent-classifier'

/** Extract real CFR references from content, e.g. "§ 101.36", "§ 101.9(j)(13)" */
function extractCfrRefs(content: string): string[] {
  const refs: string[] = []
  const pattern = /§\s*(\d+\.\d+[a-z]?)/g
  let m: RegExpExecArray | null
  while ((m = pattern.exec(content)) !== null) {
    const ref = `§ ${m[1]}`
    if (!refs.includes(ref)) refs.push(ref)
  }
  return refs
}

/** Extract a meaningful title from content text */
function extractTitle(content: string, metadata: any): string {
  // Try CFR section header pattern: "§ 101.36 Nutrition labeling of dietary supplements."
  const headerMatch = content.match(/§\s*\d+\.\d+[a-z]?\s+[A-Z][^.\n]{5,80}\./)
  if (headerMatch) return headerMatch[0].trim()

  // Try subpart headers
  const subpartMatch = content.match(/Subpart\s+[A-Z][\u2014\u2013—-][^\n]{5,80}/)
  if (subpartMatch) return subpartMatch[0].trim()

  // Use first meaningful line
  const lines = content.split('\n').filter((l: string) => l.trim().length > 20)
  if (lines.length > 0) {
    const first = lines[0].trim()
    return first.length > 120 ? first.substring(0, 117) + '...' : first
  }

  return metadata?.source || 'Regulation'
}

/** Check if content is just a short boilerplate header */
function isBoilerplate(content: string): boolean {
  const t = content.trim()
  if (t.length < 50) return true
  if (t.length < 80 && /^21 CFR Part \d+/i.test(t)) return true
  return false
}

/** Content hash for dedup by actual text */
function contentKey(content: string): string {
  return content.replace(/\s+/g, ' ').trim().substring(0, 200).toLowerCase()
}

/**
 * Rewrite a product label (any language) into an English regulatory search query.
 * The goal is to raise vector similarity by matching the English regulation corpus.
 * Input:  "Vexim Serum. Thành phần: Nước, Glycerin, Phenoxyethanol. Net wt: 30g."
 * Output: "cosmetic labeling requirements ingredient list preservative net weight 21 CFR Part 701"
 */
function rewriteLabelToRegulationQuery(label: string): string {
  const lower = label.toLowerCase()
  const parts: string[] = ['cosmetic labeling requirements 21 CFR Part 701']

  // Ingredient list detected
  if (/thanh phan|thành phần|ingredients?/i.test(lower)) {
    parts.push('ingredient list declaration cosmetic labeling')
  }

  // Preservatives
  if (/phenoxyethanol|paraben|methylparaben|propylparaben|benzalkonium|sorbic acid/i.test(lower)) {
    parts.push('preservative cosmetic ingredient labeling')
  }

  // Specific cosmetic ingredients
  if (/glycerin|glycerol/i.test(lower)) parts.push('humectant moisturizing ingredient')
  if (/niacinamide/i.test(lower)) parts.push('vitamin cosmetic ingredient brightening')
  if (/retinol/i.test(lower)) parts.push('retinol vitamin A cosmetic anti-aging')
  if (/hyaluronic/i.test(lower)) parts.push('hyaluronic acid moisturizing cosmetic')
  if (/chiết xuất trà|chiet xuat tra|green tea|tea extract/i.test(lower)) {
    parts.push('botanical extract cosmetic ingredient')
  }
  if (/collagen/i.test(lower)) parts.push('collagen cosmetic ingredient')
  if (/vitamin c|ascorbic/i.test(lower)) parts.push('vitamin C antioxidant cosmetic ingredient')

  // Net weight / quantity
  if (/net\s*wt|net\s*weight|khối lượng|khoi luong|fl\.?\s*oz|\d+\s*(?:g|ml|oz)/i.test(lower)) {
    parts.push('net quantity statement net weight cosmetic label')
  }

  // Country of origin
  if (/made\s+in\s+\w+|nơi sản xuất|noi san xuat/i.test(lower)) {
    parts.push('country of origin manufacturer cosmetic labeling')
  }

  // Product type signals
  if (/serum/i.test(lower)) parts.push('cosmetic serum skin care labeling')
  if (/cream|kem dưỡng|kem duong/i.test(lower)) parts.push('cosmetic cream moisturizer labeling')
  if (/shampoo|dầu gội|dau goi/i.test(lower)) parts.push('shampoo hair cosmetic labeling')
  if (/sunscreen|chống nắng|chong nang/i.test(lower)) parts.push('sunscreen cosmetic labeling')
  if (/lipstick|son môi|son moi/i.test(lower)) parts.push('lipstick color cosmetic labeling')

  // Claims / intended use
  if (/trị mụn|tri mun|acne|pimple/i.test(lower)) {
    parts.push('cosmetic claim acne treatment skin labeling')
  }
  if (/phục hồi|phuc hoi|repair|restore/i.test(lower)) {
    parts.push('skin repair restoration cosmetic claim labeling')
  }
  if (/dưỡng ẩm|duong am|moistur/i.test(lower)) {
    parts.push('moisturizing cosmetic claim labeling')
  }
  if (/chống lão hóa|chong lao hoa|anti.?aging/i.test(lower)) {
    parts.push('anti-aging cosmetic claim labeling')
  }

  // Drug vs cosmetic boundary (if therapeutic claims)
  if (/trị|chữa|điều trị|chua|dieu tri|treat|cure|prevent/i.test(lower)) {
    parts.push('drug cosmetic classification therapeutic claim 21 CFR')
  }

  // Food label signals — not cosmetic
  if (/calories|carbohydrate|protein|sodium|sugar|fat|fiber/i.test(lower)) {
    return 'nutrition facts label requirements 21 CFR Part 101 food labeling'
  }

  return [...new Set(parts)].join(' ')
}

/**
 * Rewrite a short Vietnamese regulation question into English for better embedding.
 * "Yêu cầu ghi nhãn mỹ phẩm theo FDA là gì?" →
 * "FDA cosmetic labeling requirements 21 CFR Part 701"
 */
function rewriteVietnameseQuestion(query: string): string {
  const lower = query.toLowerCase()
  const parts: string[] = []

  // Detect topic from Vietnamese keywords
  const isCosmeticTopic =
    /mỹ phẩm|my pham|ghi nhãn mỹ|cosmetic|kem|serum|son |dầu gội|dau goi/i.test(lower)
  const isFoodTopic =
    /thực phẩm|thuc pham|dinh dưỡng|dinh duong|nhãn thực phẩm|food/i.test(lower)
  const isDrugTopic =
    /thuốc|thuoc|dược|duoc|OTC|prescription/i.test(lower)
  const isSupplementTopic =
    /thực phẩm chức năng|thuc pham chuc nang|bổ sung|bo sung|supplement/i.test(lower)

  // Detect requirement type
  const isLabelingQ =
    /ghi nhãn|ghi nhan|nhãn|labeling|label/i.test(lower)
  const isIngredientQ =
    /thành phần|thanh phan|ingredient|chất|chat /i.test(lower)
  const isNetWeightQ =
    /khối lượng|khoi luong|net weight|net quantity|trọng lượng/i.test(lower)
  const isWarningQ =
    /cảnh báo|canh bao|warning|caution/i.test(lower)
  const isClassificationQ =
    /phân loại|phan loai|classification|drug or cosmetic|thuốc hay/i.test(lower)
  const isClaimQ =
    /công bố|cong bo|claim|health claim|quảng cáo/i.test(lower)

  if (isCosmeticTopic) {
    parts.push('cosmetic labeling requirements 21 CFR Part 701')
    if (isIngredientQ) parts.push('cosmetic ingredient declaration list order of predominance')
    if (isNetWeightQ) parts.push('cosmetic net quantity statement packaging 701.13')
    if (isWarningQ) parts.push('cosmetic warning statement label requirement')
    if (isClaimQ) parts.push('cosmetic claim labeling drug cosmetic distinction')
  } else if (isFoodTopic) {
    parts.push('food labeling requirements 21 CFR Part 101')
    if (isIngredientQ) parts.push('food ingredient list declaration 101.4')
    if (isNetWeightQ) parts.push('food net quantity statement 101.105')
    if (isClaimQ) parts.push('health claim nutrient content claim food labeling')
  } else if (isDrugTopic) {
    parts.push('drug labeling requirements 21 CFR Part 201')
    if (isIngredientQ) parts.push('active ingredient inactive ingredient drug label')
  } else if (isSupplementTopic) {
    parts.push('dietary supplement labeling requirements 21 CFR Part 111')
    if (isIngredientQ) parts.push('supplement facts panel dietary ingredient')
  } else if (isLabelingQ) {
    // Generic labeling question — search broadly
    parts.push('FDA labeling requirements cosmetic food drug 21 CFR')
  } else if (isClassificationQ) {
    parts.push('drug cosmetic classification FDA distinction therapeutic claim cosmetic claim')
  } else {
    // Fallback: return original (will be embedded as-is)
    return query
  }

  return parts.join(' ')
}

export async function POST(request: Request) {
  try {
    const { query, limit = 5, useHybrid = true, useReranker = true, rerankConfig = {} } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    const supabase = await createClient()

    // When the query is a product label or a Vietnamese regulation question,
    // rewrite it into English regulatory terms before embedding.
    // This dramatically improves vector similarity vs the English regulation corpus.
    const isLabel = isProductLabelQuery(query)
    // Detect Vietnamese regulation questions by presence of Vietnamese diacritics
    const isViRegulationQuestion =
      !isLabel &&
      /[àáảãạăắặằẵẳâấậầẫẩđèéẻẽẹêếệềễểìíỉĩịòóỏõọôốộồỗổơớợờỡởùúủũụưứựừữửỳýỷỹỵ]/i.test(query)
    const embeddingQuery = isLabel
      ? rewriteLabelToRegulationQuery(query)
      : isViRegulationQuestion
        ? rewriteVietnameseQuestion(query)
        : query
    if (isLabel || isViRegulationQuestion) {
      console.log('[v0] Query rewrite applied (' + (isLabel ? 'label' : 'vi-question') + '):', embeddingQuery)
    }

    const queryEmbedding = await generateEmbedding(embeddingQuery)

    // Fetch a wide candidate pool so the reranker has enough to work with.
    // Short queries produce weaker embeddings, so we need more raw candidates.
    const fetchCount = Math.min(limit * 6, 120)

    // Try deduplicated function first (dedup by metadata.section in DB)
    let rawResults: any[] = []
    let usedDedup = false

    // Product labels (especially Vietnamese) produce weaker embeddings vs English regulation text.
    // Use a lower threshold for these so we get enough candidates for the reranker to work with.
    const MATCH_THRESHOLD = isLabel ? 0.15 : 0.22
    const { data: dedupResults, error: dedupError } = await supabase.rpc(
      'match_compliance_knowledge_deduplicated',
      {
        query_embedding: queryEmbedding,
        match_threshold: MATCH_THRESHOLD,
        match_count: fetchCount,
      }
    )

    if (!dedupError && dedupResults) {
      rawResults = dedupResults
      usedDedup = true
    } else {
      // Fallback to basic function + app-level dedup
      const { data, error } = await supabase.rpc('match_compliance_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: MATCH_THRESHOLD,
        match_count: Math.min(limit * 5, 100),
      })

      if (error) {
        console.error('[v0] Vector search error:', error)
        throw error
      }

      // App-level dedup by metadata.section
      const sectionMap = new Map<string, any>()
      for (const r of data || []) {
        const key = r.metadata?.section || r.metadata?.regulation_id || r.id
        if (!sectionMap.has(key) || r.similarity > sectionMap.get(key).similarity) {
          sectionMap.set(key, r)
        }
      }
      rawResults = Array.from(sectionMap.values()).sort((a, b) => b.similarity - a.similarity)
    }

    // HYBRID SEARCH: Improved keyword scoring with phrase-level differentiation
    if (useHybrid) {
      const stopwords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'could', 'may', 'might', 'must', 'can', 'what',
        'how', 'which', 'where', 'when', 'who', 'that', 'this',
      ])

      // For product labels and Vietnamese questions, use the rewritten English query
      // for keyword matching too — otherwise Vietnamese words won't match English docs
      const hybridQueryText = (isLabel || isViRegulationQuestion) ? embeddingQuery : query

      const keywords = hybridQueryText.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w))
      
      // Extract bigrams/trigrams from query for phrase matching
      const queryLower = hybridQueryText.toLowerCase()
      const queryBigrams: string[] = []
      for (let i = 0; i < keywords.length - 1; i++) {
        queryBigrams.push(`${keywords[i]} ${keywords[i + 1]}`)
      }
      const queryTrigrams: string[] = []
      for (let i = 0; i < keywords.length - 2; i++) {
        queryTrigrams.push(`${keywords[i]} ${keywords[i + 1]} ${keywords[i + 2]}`)
      }

      console.log('[v0] Hybrid search keywords:', keywords)
      console.log('[v0] Hybrid bigrams:', queryBigrams)
      
      for (const result of rawResults) {
        const contentLower = result.content.toLowerCase()
        let boostScore = 0
        let matchedKeywords = 0
        
        // 1. Individual keyword matches (reduced weight: +0.08 each, was +0.15)
        for (const keyword of keywords) {
          if (contentLower.includes(keyword)) {
            boostScore += 0.08
            matchedKeywords++
          }
        }
        
        // 2. Bigram matches (higher weight: phrase relevance)
        for (const bigram of queryBigrams) {
          if (contentLower.includes(bigram)) {
            boostScore += 0.12 // Phrase match is more valuable
          }
        }
        
        // 3. Trigram matches (highest weight: very specific match)
        for (const trigram of queryTrigrams) {
          if (contentLower.includes(trigram)) {
            boostScore += 0.18
          }
        }
        
        // 4. Exact full query match (strong signal)
        if (contentLower.includes(queryLower)) {
          boostScore += 0.25
        }
        
        // 5. Keyword density bonus: if most query terms appear, boost more
        const keywordRatio = keywords.length > 0 ? matchedKeywords / keywords.length : 0
        if (keywordRatio >= 0.8) {
          boostScore += 0.10 // Almost all terms present
        } else if (keywordRatio >= 0.6) {
          boostScore += 0.05 // Most terms present
        }
        
        // Apply boost (cap at 0.50 to prevent keyword-dominated scoring)
        boostScore = Math.min(0.50, boostScore)
        result.similarity = Math.min(0.99, result.similarity + boostScore)
        result.hybrid_boost = boostScore
      }
      
      // Re-sort after hybrid boosting
      rawResults.sort((a, b) => b.similarity - a.similarity)
    }

    // Filter boilerplate + content-based dedup (different sections, same text)
    const seenContent = new Set<string>()
    const deduped: any[] = []
    for (const r of rawResults) {
      if (isBoilerplate(r.content)) continue
      const hash = contentKey(r.content)
      if (!seenContent.has(hash)) {
        seenContent.add(hash)
        deduped.push(r)
      }
    }

    // PHASE 2: Apply Reranker if enabled
    let finalResults: any[]
    let rerankStats: any = null
    let queryIntent: any = null

    if (useReranker) {
      console.log('[v0] Applying Reranker to', deduped.length, 'results...')
      
      // Convert to RerankableResult format
      const rerankInput: RerankableResult[] = deduped.map((r: any) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
        metadata: r.metadata,
        section_name: r.section_name,
        hybrid_boost: r.hybrid_boost || 0,
      }))

      // Product labels and Vietnamese questions need a lower minScoreThreshold
      // because their embeddings are weaker due to language mismatch.
      const adaptiveConfig: Partial<RerankConfig> = (isLabel || isViRegulationQuestion)
        ? { ...rerankConfig, minScoreThreshold: 0.10 }
        : rerankConfig

      const rerankOutput = fullRerank(query, rerankInput, adaptiveConfig as Partial<RerankConfig>)
      finalResults = rerankOutput.results.slice(0, limit)
      rerankStats = rerankOutput.stats
      queryIntent = rerankOutput.queryIntent

      console.log('[v0] Reranker complete:', rerankOutput.stats.totalInput, '→', finalResults.length, 'results in', rerankOutput.stats.processingTimeMs, 'ms')
    } else {
      finalResults = deduped.slice(0, limit)
    }

    // Enrich with extracted info
    const enrichedResults = finalResults.map((r: any, idx: number) => {
      const meta = r.metadata || {}
      const cfrRefs = extractCfrRefs(r.content)
      const title = extractTitle(r.content, meta)
      // section_name comes from the deduplicated SQL function
      const sectionId = r.section_name || meta.section || meta.regulation_id || 'N/A'

      return {
        id: r.id,
        rank: idx + 1,
        regulation_id: sectionId,
        section_refs: cfrRefs,
        title,
        content: r.content,
        category: meta.industry || meta.category || 'General',
        source: meta.source || '21 CFR Part 101',
        similarity: r.final_score || r.similarity,
        metadata: meta,
        chunk_info: meta.total_chunks > 1
          ? `Chunk ${(meta.chunk_index || 0) + 1}/${meta.total_chunks}`
          : null,
        hybrid_boost: r.hybrid_boost || 0,
        // Phase 2: Reranker fields
        rerank_score: r.rerank_score || null,
        intent_boost: r.intent_boost || null,
        metadata_penalty: r.metadata_penalty || null,
        relevance_tier: r.relevance_tier || null,
      }
    })

    return NextResponse.json({
      results: enrichedResults,
      method: useReranker
        ? (useHybrid ? 'reranked_hybrid' : 'reranked_vector')
        : useHybrid 
          ? (usedDedup ? 'hybrid_vector_deduplicated' : 'hybrid_vector_app_dedup')
          : (usedDedup ? 'vector_search_deduplicated' : 'vector_search_app_dedup'),
      total_returned: enrichedResults.length,
      requested: limit,
      // Phase 2: Reranker metadata
      reranker: useReranker ? {
        enabled: true,
        stats: rerankStats,
        queryIntent,
      } : { enabled: false },
    })
  } catch (error: any) {
    console.error('Error searching knowledge base:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
