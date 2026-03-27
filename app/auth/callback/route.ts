import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth callback handler.
 * After the user authenticates with Google, Supabase redirects here
 * with a ?code= parameter. We exchange it for a session and redirect
 * the user to their intended destination.
 * 
 * For first-time OAuth users (no account_type), redirects to onboarding.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/protected'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to client-side handler to process localStorage pending_account_type
      // The handler will check for pending role selection and set up the account
      const redirectUrl = '/auth/callback/handler'
      
      // Use the forwarded host in production (important behind reverse proxies / Vercel)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectUrl}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      }
    }
  }

  // If code exchange fails or no code, redirect to auth error page
  return NextResponse.redirect(`${origin}/auth/error?error=oauth_callback_failed`)
}
