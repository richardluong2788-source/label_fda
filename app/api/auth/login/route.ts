import { createClient } from '@/lib/supabase/server'
import { rateLimit, AUTH_RATE_LIMITS } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // --- RATE LIMITING by IP ---
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const rl = await rateLimit(`login:${ip}`, AUTH_RATE_LIMITS.login)

    if (!rl.success) {
      const retryAfterSeconds = Math.ceil(rl.resetMs / 1000)
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds) },
        }
      )
    }

    // --- INPUT VALIDATION ---
    const body = await request.json()
    const { email, password } = body

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

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // --- SIGN IN ---
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Generic error message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true, user: { id: data.user.id, email: data.user.email } })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
