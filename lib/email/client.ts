import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('[email] RESEND_API_KEY is not set. Emails will not be sent.')
}

// Only create Resend client if API key is available, otherwise use null
// This prevents build errors when RESEND_API_KEY is not configured
export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null

export const EMAIL_FROM = process.env.EMAIL_FROM || 'AI Label Pro <noreply@ailabelpro.com>'
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ailabelpro.com'

/**
 * Safe send — never throws, logs errors instead so API routes never crash.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!resend) {
    console.warn('[email] Skipping send — RESEND_API_KEY not configured')
    return
  }
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[email] Resend error:', error)
    }
  } catch (err) {
    console.error('[email] Failed to send email:', err)
  }
}
