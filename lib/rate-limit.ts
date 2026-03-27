/**
 * Distributed rate limiter backed by Upstash Redis.
 *
 * Uses @upstash/ratelimit with a sliding-window algorithm.
 * All serverless instances share the same Redis store, so rate limits
 * are enforced correctly even when Vercel scales to many concurrent functions.
 *
 * Falls back to a permissive in-memory limiter if Redis env vars are missing
 * (e.g. during local dev without Upstash configured).
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Shared Redis client (singleton) ──────────────────────────────────────────
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

// ── Rate limit result interface (same shape as before) ───────────────────────
export interface RateLimitResult {
  success: boolean
  remaining: number
  resetMs: number
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

// ── Cache of Ratelimit instances (one per unique config) ─────────────────────
const limiters = new Map<string, Ratelimit>()

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  const r = getRedis()
  if (!r) return null

  const cacheKey = `${config.maxRequests}:${config.windowMs}`
  let limiter = limiters.get(cacheKey)
  if (!limiter) {
    const windowSec = Math.ceil(config.windowMs / 1000)
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSec} s`),
      analytics: true,
      prefix: 'rl',
    })
    limiters.set(cacheKey, limiter)
  }
  return limiter
}

// ── In-memory fallback (dev only) ────────────────────────────────────────────
const memoryStore = new Map<string, number[]>()

function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const cutoff = now - config.windowMs
  let timestamps = memoryStore.get(key) || []
  timestamps = timestamps.filter((t) => t > cutoff)

  if (timestamps.length >= config.maxRequests) {
    const resetMs = (timestamps[0] || now) + config.windowMs - now
    return { success: false, remaining: 0, resetMs }
  }

  timestamps.push(now)
  memoryStore.set(key, timestamps)
  return { success: true, remaining: config.maxRequests - timestamps.length, resetMs: config.windowMs }
}

// ── Main function (async because Redis is async) ─────────────────────────────
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = getLimiter(config)

  if (!limiter) {
    // No Redis configured — fall back to in-memory (local dev)
    return memoryRateLimit(key, config)
  }

  try {
    const result = await limiter.limit(key)
    return {
      success: result.success,
      remaining: result.remaining,
      resetMs: result.reset - Date.now(),
    }
  } catch (err) {
    console.error('[rate-limit] Upstash Redis error, falling back to in-memory:', err)
    // Fail open with in-memory fallback so auth doesn't break
    return memoryRateLimit(key, config)
  }
}

// ── Pre-configured limiters for auth endpoints ───────────────────────────────
export const AUTH_RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes per IP */
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  /** Sign-up: 5 attempts per hour per IP */
  signUpByIp: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  /** Sign-up: 1 attempt per day per email */
  signUpByEmail: { maxRequests: 1, windowMs: 24 * 60 * 60 * 1000 },
  /** Password reset: 3 attempts per hour per IP */
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  /** Analyze: 10 analyses per minute per user (prevents abuse) */
  analyze: { maxRequests: 10, windowMs: 60 * 1000 },
} as const

// ── Helper: get Redis client for direct use (caching, etc.) ──────────────────
export function getRedisClient(): Redis | null {
  return getRedis()
}
