import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Map known Supabase/auth error codes to user-friendly messages.
 * We intentionally do NOT expose raw error codes or messages to the user
 * to prevent information leakage that could help attackers.
 */
const FRIENDLY_ERRORS: Record<string, string> = {
  access_denied: 'Access was denied. Please try logging in again.',
  otp_expired: 'Your verification link has expired. Please request a new one.',
  validation_failed: 'The request could not be validated. Please try again.',
  server_error: 'An internal error occurred. Please try again later.',
  unauthorized_client: 'This application is not authorized. Please contact support.',
}

const DEFAULT_MESSAGE = 'Something went wrong during authentication. Please try again.'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorCode = params?.error ?? ''

  // Only show a known friendly message, never the raw error string
  const displayMessage = FRIENDLY_ERRORS[errorCode] ?? DEFAULT_MESSAGE

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{displayMessage}</p>
              <Button asChild className="w-full">
                <Link href="/auth/login">Back to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
