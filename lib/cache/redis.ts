/**
 * Shared Upstash Redis client singleton for all cache layers.
 *
 * Uses KV_REST_API_URL + KV_REST_API_TOKEN (set automatically by Upstash integration).
 * Returns null when env vars are missing so callers can gracefully skip caching
 * without crashing (e.g. local dev without Redis configured).
 */

import { Redis } from '@upstash/redis'

let _client: Redis | null = null

export function getRedisClient(): Redis | null {
  if (_client) return _client
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  _client = new Redis({ url, token })
  return _client
}
