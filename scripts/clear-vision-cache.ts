/**
 * Script to clear all vision cache entries from Upstash Redis
 * Run with: npx tsx scripts/clear-vision-cache.ts
 */

import { Redis } from '@upstash/redis'

async function clearVisionCache() {
  const redis = Redis.fromEnv()
  
  console.log('[v0] Scanning for vision cache keys...')
  
  let cursor = 0
  let totalDeleted = 0
  
  do {
    // Scan for keys with vision: prefix
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: 'vision:*',
      count: 100
    })
    
    cursor = Number(nextCursor)
    
    if (keys.length > 0) {
      console.log(`[v0] Found ${keys.length} vision cache keys`)
      
      // Delete all found keys
      for (const key of keys) {
        await redis.del(key)
        totalDeleted++
        console.log(`[v0] Deleted: ${key}`)
      }
    }
  } while (cursor !== 0)
  
  console.log(`[v0] Done! Deleted ${totalDeleted} vision cache entries.`)
}

clearVisionCache().catch(console.error)
