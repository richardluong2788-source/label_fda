/**
 * Embedding Vector Cache  —  Phase 3
 *
 * Caches OpenAI `text-embedding-3-small` (1 536-dim) vectors in Upstash Redis,
 * keyed by a SHA-256 hash of the input text (after normalisation).
 *
 * Why this matters:
 *   Each analysis fires 3–5 `generateEmbedding()` calls (regulations query,
 *   warning-letters query, recalls query, …).  The queries are constructed
 *   from label text + product category — the same product gets re-analyzed
 *   after every edit, so the same queries are repeated frequently.
 *   Caching embeddings eliminates redundant OpenAI API round-trips and
 *   shaves 200–600 ms from the RAG step.
 *
 * TTL: 30 days (2 592 000 s)
 *   Embedding models rarely change.  Vectors for the same text string are
 *   stable across calls.  30 days gives high hit-rates with bounded memory.
 *
 * Stored format:
 *   A float32 array (1 536 elements) encoded as a JSON array of numbers.
 *   Redis overhead per entry ≈ 12 KB.
 *
 * Redis unavailable: all operations return null / no-op — analysis continues.
 */

import { createHash } from 'crypto'
import { getRedisClient } from './redis'

// 30-day TTL in seconds
const EMBEDDING_CACHE_TTL_S = 30 * 24 * 60 * 60

// Redis key prefix — bump version to invalidate stale 19161-dim embeddings
// v1: old wrong-dimension embeddings (19161-dim)
// v2: correct text-embedding-3-small embeddings (1536-dim)
const PREFIX = 'emb:v2:'

/**
 * Normalise text before hashing to maximise cache hit-rate.
 * Collapses whitespace and lowercases — minor formatting differences in the
 * query string should still hit the same cache entry.
 */
function normaliseText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 8000)
}

/**
 * Compute the cache key for a given text input.
 */
export function embeddingCacheKey(text: string): string {
  const hash = createHash('sha256')
    .update(normaliseText(text))
    .digest('hex')
  return `${PREFIX}${hash}`
}

/**
 * Look up a cached embedding vector.
 * Returns the number[] vector, or null on miss / error.
 */
export async function getEmbeddingCache(text: string): Promise<number[] | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const cached = await redis.get<number[]>(embeddingCacheKey(text))
    if (!cached) return null
    // Validate dimension — reject stale vectors from old embedding models
    if (!Array.isArray(cached) || cached.length !== 1536) {
      console.warn('[embedding-cache] Stale/invalid cached embedding (dims=' + cached?.length + '), ignoring')
      return null
    }
    return cached
  } catch (err) {
    console.error('[embedding-cache] Redis GET error:', err)
    return null
  }
}

/**
 * Store an embedding vector in Redis.
 * Fire-and-forget — errors are logged but not re-thrown.
 */
export async function setEmbeddingCache(
  text: string,
  embedding: number[]
): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.set(embeddingCacheKey(text), embedding, {
      ex: EMBEDDING_CACHE_TTL_S,
    })
  } catch (err) {
    console.error('[embedding-cache] Redis SET error:', err)
  }
}
