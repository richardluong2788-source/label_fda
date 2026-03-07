/**
 * Vision Result Cache  —  Phase 3
 *
 * Caches the JSON output of `analyzeLabel()` in Upstash Redis, keyed by a
 * SHA-256 hash of the raw image bytes.
 *
 * Why image bytes, not URL?
 *   The same product label can be re-uploaded under a different Supabase
 *   Storage path.  Hashing the bytes gives a content-addressable key that
 *   hits the cache regardless of path changes.
 *
 * TTL: 7 days (604 800 s)
 *   Vision analysis output is deterministic for the same image content
 *   (temperature: 0, seed: 12345).  A week gives good hit-rates while
 *   keeping memory usage bounded.
 *
 * Cache-miss behaviour: returns null — callers fall back to live GPT-4o call.
 * Redis unavailable: all operations return null / no-op — analysis continues.
 */

import { createHash } from 'crypto'
import { getRedisClient } from './redis'
import type { VisionAnalysisResult } from '@/lib/ai-vision-analyzer'

// 7-day TTL in seconds
const VISION_CACHE_TTL_S = 7 * 24 * 60 * 60

// Redis key prefix to avoid collision with other namespaces
const PREFIX = 'vision:v1:'

/**
 * Download an image from `imageUrl` and compute its SHA-256 digest.
 * Returns the hex digest string to use as a cache key.
 */
export async function hashImageUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Vexim/1.0)' },
    })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return createHash('sha256').update(Buffer.from(buf)).digest('hex')
  } catch {
    return null
  }
}

/**
 * Look up a cached vision result by image content hash.
 * Returns the parsed result object, or null on miss / error.
 */
export async function getVisionCache(
  imageHash: string
): Promise<VisionAnalysisResult | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const cached = await redis.get<VisionAnalysisResult>(`${PREFIX}${imageHash}`)
    return cached ?? null
  } catch (err) {
    console.error('[vision-cache] Redis GET error:', err)
    return null
  }
}

/**
 * Store a vision result in Redis, keyed by image content hash.
 * Fire-and-forget — errors are logged but not re-thrown.
 */
export async function setVisionCache(
  imageHash: string,
  result: VisionAnalysisResult
): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.set(`${PREFIX}${imageHash}`, result, { ex: VISION_CACHE_TTL_S })
  } catch (err) {
    console.error('[vision-cache] Redis SET error:', err)
  }
}

/**
 * Convenience wrapper: hash the URL, check cache, return result + hit flag.
 */
export async function lookupVisionCache(imageUrl: string): Promise<{
  hit: boolean
  hash: string | null
  result: VisionAnalysisResult | null
}> {
  const hash = await hashImageUrl(imageUrl)
  if (!hash) return { hit: false, hash: null, result: null }

  const result = await getVisionCache(hash)
  return { hit: result !== null, hash, result }
}

/**
 * Delete a vision cache entry by image hash.
 * Used when needing to force a re-analysis (e.g., after code updates).
 */
export async function deleteVisionCache(imageHash: string): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false
  try {
    const result = await redis.del(`${PREFIX}${imageHash}`)
    return result > 0
  } catch (err) {
    console.error('[vision-cache] Redis DEL error:', err)
    return false
  }
}

/**
 * Delete a vision cache entry by image URL.
 * Hashes the image and attempts deletion.
 */
export async function deleteVisionCacheByUrl(imageUrl: string): Promise<boolean> {
  const hash = await hashImageUrl(imageUrl)
  if (!hash) return false
  return deleteVisionCache(hash)
}
