/**
 * Cloudflare Turnstile server-side verification.
 *
 * Validates the invisible CAPTCHA token sent from the client.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes': string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Verify a Turnstile token on the server side.
 *
 * @param token  - The `cf-turnstile-response` token from the client widget
 * @param ip     - The client's IP address (optional but recommended)
 * @returns      - `{ success: true }` if valid, `{ success: false, error }` otherwise
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If Turnstile is not configured, skip verification (development / staging)
  // In production, you should ALWAYS have TURNSTILE_SECRET_KEY set.
  if (!secretKey) {
    console.warn(
      '[Turnstile] TURNSTILE_SECRET_KEY not set — skipping verification. Set this in production!'
    )
    return { success: true }
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA verification required. Please try again.' }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (ip) {
      formData.append('remoteip', ip)
    }

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const data: TurnstileVerifyResponse = await res.json()

    if (!data.success) {
      console.error('[Turnstile] Verification failed:', data['error-codes'])
      return {
        success: false,
        error: 'CAPTCHA verification failed. Please refresh and try again.',
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[Turnstile] Network error during verification:', err)
    return {
      success: false,
      error: 'Unable to verify CAPTCHA. Please try again later.',
    }
  }
}
