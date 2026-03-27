# Vexim RAG System Architecture - Phase 1: Core Fix

## Problem Analysis

### 1. Wrong Source Metadata Issue
**Problem**: Chunks từ 21 CFR Part 701 (Cosmetics) bị gắn nhãn thành Part 101 (Food)
- Impact: AI confuses regulations giữa Food vs Cosmetics
- Root Cause: Inconsistent tagging trong vector DB metadata

**Solution**: Implement Metadata Validation Layer
```
Validation Logic:
- IF chunk contains "701." → force source = "Part 701 (Cosmetics)"
- IF chunk contains "101." → force source = "Part 101 (Food)"
- IF chunk contains "FALCPA" → force category = "Allergen Declaration"
- IF chunk contains "nutrition facts" (case-insensitive) → force regulation = "21 CFR 101.36"
```

### 2. Incomplete Chunking Issue
**Problem**: Text cắt ngang, mất context, metadata rác
- Example: Chunk ends with "The manufacturer must include..." → lỗi
- Root Cause: Chunking strategy không tính toán page breaks

**Solution**: Smart Chunking Strategy
```
Rules:
- Min chunk size: 300 tokens (preserve context)
- Max chunk size: 1000 tokens (manageable for LLM)
- Don't cut in middle of sentences
- Preserve table structures
- Each chunk must include source reference (CFR section + page)
```

### 3. Query Intent Misalignment
**Problem**: System không phân biệt Soap (cosmetic) vs Drug (pharmaceutical)
- Query: "Can I call my product a drug?" 
- Wrong response: Returns food regulations
- Right response: Returns drug vs cosmetic distinction rules

**Solution**: Intent Classification Layer
```
Before retrieval, classify query:
1. Food? (Keywords: nutrition, allergen, ingredient statement)
2. Drug? (Keywords: therapeutic claim, disease, medical)
3. Cosmetic? (Keywords: beauty, skin, appearance, intended use)
4. Soap? (Keywords: soap, cosmetic, anti-bacterial)

Then weight chunks by detected category
```

### 4. Hybrid Search Imbalance
**Problem**: Keyword search dominates over semantic similarity
- Vector score: 0.85 (high relevance)
- Keyword score: 0.95 (exact match but low relevance)
- Result: Exact match wrong regulation chosen

**Solution**: Reranker Layer (Priority 2)
- Use cross-encoder model (e.g., Cohere's rerank-english-v3.0)
- Score: (Vector_Score × 0.6) + (Keyword_Score × 0.3) + (Rerank_Score × 0.1)

## Implementation Roadmap

### Phase 1: Core Data Fix (THIS PHASE)
1. Create Metadata Validation Script
   - Scan all chunks in vector DB
   - Re-tag with correct source/category
   - Log all corrections
   
2. Implement Smart Chunking
   - Re-chunk source documents
   - Validate chunk boundaries
   - Add source references

### Phase 2: Retrieval Enhancement (COMPLETED)
1. **Reranker Layer** (`/lib/rag/reranker.ts`)
   - Weighted fusion scoring: Vector(0.55) + Keyword(0.25) + CrossEncoder(0.10) + Intent(0.10)
   - Lightweight cross-encoder: token overlap, bigram matching, CFR reference matching
   - Intent-aware scoring: boost results matching detected product category
   - Metadata validation penalty: penalize mismatched metadata using Phase 1 validator
   - Relevance tiers: primary (>=0.55), supporting (>=0.35), related (<0.35)

2. **Smart Chunking Strategy** (`/lib/rag/chunking-strategy.ts`)
   - Sentence boundary-aware splitting (no mid-sentence cuts)
   - Table structure preservation (nutrition facts panels kept whole)
   - Quality scoring per chunk (penalize boilerplate, boost CFR references)
   - Overlap-based chunking for context continuity
   - Section header detection and CFR reference extraction

3. **Pipeline Integration**
   - `embedding-utils.ts`: searchKnowledge() now runs quickRerank() on all results
   - `knowledge/search/route.ts`: Full reranker with configurable weights via API
   - `test-rag/page.tsx`: UI shows intent classification, reranker stats, tier tabs, scoring breakdown
   - Backwards compatible: useReranker=false falls back to original hybrid scoring

### Phase 3: UI Integration
1. Expose RAG in /analyze page
   - Show retrieved regulations
   - Display confidence scores
   
2. Add Knowledge Base UI
   - Search regulations directly
   - Browse by category

## Key Files
- `/lib/rag/metadata-validator.ts` - Validation logic (Phase 1)
- `/lib/rag/chunking-strategy.ts` - Smart chunking rules (Phase 2)
- `/lib/rag/intent-classifier.ts` - Query intent detection (Phase 1)
- `/lib/rag/reranker.ts` - Reranking logic (Phase 2)
- `/scripts/rag_data_migration.ts` - Data migration script (TBD)
