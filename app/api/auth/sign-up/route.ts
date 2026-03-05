import { createClient } from '@/lib/supabase/server'
import { rateLimit, AUTH_RATE_LIMITS } from '@/lib/rate-limit'
import { validatePassword } from '@/lib/password-validation'
import { isDisposableEmail } from '@/lib/disposable-email'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, welcomeEmailTemplate } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    // ===================================================================
    // STEP 1: Cloudflare Turnstile — invisible CAPTCHA (anti-bot)
    // ===================================================================
    const body = await request.json()
    const { email, password, turnstileToken } = body

    const turnstileResult = await verifyTurnstileToken(turnstileToken, ip)
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error },
        { status: 403 }
      )
    }

    // ===================================================================
    // STEP 2: Validate email — format + disposable email blacklist
    // ===================================================================
    if (
      !email ||
      typeof email !== 'string' ||
      !password ||
      typeof password !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Block disposable / temporary email providers
    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        {
          error:
            'Temporary or disposable email addresses are not allowed. Please use a personal or business email.',
        },
        { status: 400 }
      )
    }

    // ===================================================================
    // STEP 3: Rate limiting — per IP (5/hour) + per email (1/day)
    // ===================================================================

    // 3a. Rate limit by IP: max 5 sign-ups per hour
    const ipLimit = await rateLimit(
      `signup:ip:${ip}`,
      AUTH_RATE_LIMITS.signUpByIp
    )
    if (!ipLimit.success) {
      const retryMin = Math.ceil(ipLimit.resetMs / 60000)
      return NextResponse.json(
        {
          error: `Too many sign-up attempts from your network. Please try again in ${retryMin} minutes.`,
        },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(ipLimit.resetMs / 1000)) } }
      )
    }

    // 3b. Rate limit by email: max 1 sign-up per day per email address
    const emailLimit = await rateLimit(
      `signup:email:${normalizedEmail}`,
      AUTH_RATE_LIMITS.signUpByEmail
    )
    if (!emailLimit.success) {
      return NextResponse.json(
        {
          error:
            'This email has already been used for registration recently. Please check your inbox for the confirmation email, or try again later.',
        },
        { status: 429 }
      )
    }

    // ===================================================================
    // Password policy validation (server-side enforcement)
    // ===================================================================
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.isValid) {
      return NextResponse.json(
        { error: passwordCheck.errors[0] },
        { status: 400 }
      )
    }

    // ===================================================================
    // Create the account via Supabase Auth
    // ===================================================================
    const supabase = await createClient()
    const origin = request.headers.get('origin') || ''

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${origin}/protected`,
      },
    })

    if (error) {
      // Don't reveal if email already exists (prevents user enumeration)
      if (error.message.toLowerCase().includes('already registered')) {
        return NextResponse.json(
          {
            error:
              'Unable to create account. Please try a different email or log in.',
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Unable to create account. Please try again.' },
        { status: 400 }
      )
    }

    // Send welcome email (fire-and-forget — never block sign-up)
    const lang = (body.lang as 'vi' | 'en') || 'en'
    const { subject, html } = welcomeEmailTemplate({ email: normalizedEmail, lang })
    sendEmail({ to: normalizedEmail, subject, html })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
