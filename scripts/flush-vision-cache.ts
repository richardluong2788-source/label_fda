import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Script to flush all vision cache from Upstash Redis
 * Usage: npx tsx scripts/flush-vision-cache.ts
 */
async function flushVisionCache() {
  try {
    console.log('[v0] Starting vision cache flush...')

    // Get all keys matching vision cache pattern
    const PREFIX = 'label-fda:vision-cache:'
    
    // Since SCAN is not available in Upstash HTTP API, we'll use a FLUSHDB approach
    // or manually delete based on known patterns. For now, let's try to use KEYS pattern
    try {
      // Try to get keys with pattern (may not work in all Upstash tiers)
      const keys = await redis.keys(`${PREFIX}*`)
      console.log(`[v0] Found ${keys.length} cache entries`)
      
      if (keys.length > 0) {
        for (const key of keys) {
          await redis.del(key as string)
          console.log(`[v0] Deleted: ${key}`)
        }
      }
      
      console.log('[v0] Vision cache flush completed')
    } catch (err) {
      console.log('[v0] KEYS command not supported, using DEL with known prefix')
      // Fallback: just inform user to manually clear or use a different approach
      console.log('[v0] Please delete cache entries manually or contact support')
    }
  } catch (error) {
    console.error('[v0] Error flushing vision cache:', error)
    process.exit(1)
  }
}

flushVisionCache()
