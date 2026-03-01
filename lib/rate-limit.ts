/**
 * In-memory sliding-window rate limiter.
 *
 * Works per-instance (fine on Vercel Hobby with a single function instance).
 * For multi-instance production deployments, replace with Upstash Redis.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  const cutoff = now - windowMs
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetMs: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs } = config
  const now = Date.now()
  const cutoff = now - windowMs

  cleanup(windowMs)

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const resetMs = oldestInWindow + windowMs - now
    return {
      success: false,
      remaining: 0,
      resetMs,
    }
  }

  entry.timestamps.push(now)
  return {
    success: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  }
}

// Pre-configured limiters for auth endpoints
export const AUTH_RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes per IP */
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  /** Sign-up: 5 attempts per hour per IP */
  signUpByIp: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  /** Sign-up: 1 attempt per day per email */
  signUpByEmail: { maxRequests: 1, windowMs: 24 * 60 * 60 * 1000 },
  /** Password reset: 3 attempts per hour per IP */
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
} as const
