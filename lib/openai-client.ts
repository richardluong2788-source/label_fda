import OpenAI from 'openai'

// Lazy-initialized OpenAI client (avoids build-time errors when env var is not available)
let _openai: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })
  }
  return _openai
}

// Backwards-compatible export (getter triggers lazy init at runtime, not build time)
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAIClient() as any)[prop]
  },
})

// Retry configuration
const MAX_RETRIES = 5
const INITIAL_DELAY = 1000 // 1 second

/**
 * Exponential backoff retry wrapper
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isLastRetry = i === retries - 1
      const isRateLimitError = error?.status === 429 || error?.code === 'rate_limit_exceeded'
      
      if (isLastRetry || !isRateLimitError) {
        throw error
      }

      const delay = INITIAL_DELAY * Math.pow(2, i)
      console.log(`[v0] Retry ${i + 1}/${retries} after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error('Max retries exceeded')
}
