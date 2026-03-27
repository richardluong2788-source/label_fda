/**
 * Password policy validation.
 *
 * Enforced both client-side (for instant UX feedback) and should be
 * matched by Supabase Auth's own password policy (Dashboard > Auth > Policies).
 */

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
}

const MIN_LENGTH = 8
const MAX_LENGTH = 72 // bcrypt limit

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`)
  }

  if (password.length > MAX_LENGTH) {
    errors.push(`Password must be no more than ${MAX_LENGTH} characters`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/** Visual strength indicator: 0-4 */
export function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= MIN_LENGTH) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export const PASSWORD_STRENGTH_LABELS = [
  'Very weak',
  'Weak',
  'Fair',
  'Strong',
  'Very strong',
] as const

export const PASSWORD_STRENGTH_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-blue-500',
  'bg-green-500',
] as const
