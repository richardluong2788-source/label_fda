'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Check, 
  X, 
  ShieldAlert,
  Ship,
  Factory,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  validatePassword,
  getPasswordStrength,
  PASSWORD_STRENGTH_LABELS,
  PASSWORD_STRENGTH_COLORS,
} from '@/lib/password-validation'
import { isDisposableEmail } from '@/lib/disposable-email'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// Account type definition
type AccountType = 'importer' | 'supplier' | 'qi'

// Cloudflare Turnstile site key (public — safe to expose)
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

// Account type options with descriptions
const accountTypeOptions = [
  {
    id: 'importer' as AccountType,
    icon: Ship,
    title: 'US Importer',
    subtitle: 'I import food into the United States',
    description: 'Manage FSVP compliance, verify foreign suppliers, and maintain required documentation.',
    features: [
      'Scan & analyze food labels',
      'Manage Foreign Suppliers',
      'FSVP compliance tracking',
      'Hire Qualified Individuals',
    ],
    color: 'blue',
  },
  {
    id: 'supplier' as AccountType,
    icon: Factory,
    title: 'Foreign Supplier',
    subtitle: 'I export food to the United States',
    description: 'Prepare FSVP documentation and support US Importers with compliance requirements.',
    features: [
      'Self-assessment tools',
      'Document management',
      'Connect with US Importers',
      'Audit preparation',
    ],
    color: 'emerald',
  },
  {
    id: 'qi' as AccountType,
    icon: GraduationCap,
    title: 'FSVP Qualified Individual',
    subtitle: 'I am an FSVP compliance expert',
    description: 'Provide QI services to US Importers per 21 CFR 1.502 requirements.',
    features: [
      'Review & approve hazard analyses',
      'Evaluate supplier capabilities',
      'Sign-off on verification plans',
      'Manage multiple clients',
    ],
    color: 'violet',
  },
]

export default function Page() {
  // Step management: 1 = Account Type, 2 = Credentials
  const [currentStep, setCurrentStep] = useState(1)
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const router = useRouter()

  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password]
  )
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  )

  // Real-time disposable email check (client-side for UX)
  const isEmailDisposable = useMemo(() => {
    if (!email || !email.includes('@')) return false
    return isDisposableEmail(email)
  }, [email])

  const passwordChecks = useMemo(
    () => [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'One lowercase letter', met: /[a-z]/.test(password) },
      { label: 'One number', met: /[0-9]/.test(password) },
      { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  )

  // ---------------------------------------------------------------
  // STEP 1: Cloudflare Turnstile — invisible CAPTCHA
  // Load the Turnstile script and render the invisible widget
  // ---------------------------------------------------------------
  const renderWidget = useCallback(() => {
    if (
      !TURNSTILE_SITE_KEY ||
      !turnstileRef.current ||
      widgetIdRef.current !== null
    )
      return
    if (typeof window === 'undefined' || !window.turnstile) return

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(null),
      'error-callback': () => setTurnstileToken(null),
      size: 'invisible',
      theme: 'auto',
    })
  }, [])

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return

    // If script already loaded, render immediately
    if (window.turnstile) {
      renderWidget()
      return
    }

    // Load Turnstile script
    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => renderWidget()
    document.head.appendChild(script)

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [renderWidget])

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        setError(error.message)
        setIsGoogleLoading(false)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Client-side validations
    if (isEmailDisposable) {
      setError(
        'Temporary or disposable email addresses are not allowed. Please use a personal or business email.'
      )
      setIsLoading(false)
      return
    }

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0])
      setIsLoading(false)
      return
    }

    // If Turnstile is configured but no token yet, trigger challenge
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.execute(widgetIdRef.current)
      }
      setError('Verifying you are human... Please try again in a moment.')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          accountType: accountType || 'importer',
          turnstileToken: turnstileToken || '',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Sign up failed')
        // Reset Turnstile on failure so user can retry
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
          setTurnstileToken(null)
        }
        return
      }

      router.push('/auth/sign-up-success')
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle step navigation
  const handleNextStep = () => {
    if (currentStep === 1 && accountType) {
      setCurrentStep(2)
      setError(null)
    }
  }

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
      setError(null)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className={cn("w-full", currentStep === 1 ? "max-w-4xl" : "max-w-sm")}>
        <div className="flex flex-col gap-6">
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
              currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div className={cn(
              "w-12 h-0.5 transition-colors",
              currentStep >= 2 ? "bg-primary" : "bg-muted"
            )} />
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
              currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              2
            </div>
          </div>

          {/* Step 1: Account Type Selection */}
          {currentStep === 1 && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Choose Your Account Type</CardTitle>
                <CardDescription>Select the option that best describes your role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {accountTypeOptions.map((option) => {
                    const isSelected = accountType === option.id
                    const Icon = option.icon
                    const colorClasses = option.color === 'blue' 
                      ? {
                          border: isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border hover:border-blue-300',
                          icon: 'text-blue-600 bg-blue-100',
                          badge: 'bg-blue-100 text-blue-700',
                        }
                      : option.color === 'violet'
                      ? {
                          border: isSelected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-border hover:border-violet-300',
                          icon: 'text-violet-600 bg-violet-100',
                          badge: 'bg-violet-100 text-violet-700',
                        }
                      : {
                          border: isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-border hover:border-emerald-300',
                          icon: 'text-emerald-600 bg-emerald-100',
                          badge: 'bg-emerald-100 text-emerald-700',
                        }
                    
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAccountType(option.id)}
                        className={cn(
                          "relative flex flex-col items-start p-5 rounded-xl border-2 transition-all text-left",
                          colorClasses.border,
                          isSelected && "bg-accent/50"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 className={cn("h-5 w-5", 
                              option.color === 'blue' ? 'text-blue-500' :
                              option.color === 'violet' ? 'text-violet-500' : 'text-emerald-500'
                            )} />
                          </div>
                        )}
                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg mb-4", colorClasses.icon)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold">{option.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{option.subtitle}</p>
                        <p className="text-xs text-muted-foreground mt-3">{option.description}</p>
                        <ul className="mt-4 space-y-2">
                          {option.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Check className={cn("h-3 w-3", 
                                option.color === 'blue' ? 'text-blue-500' :
                                option.color === 'violet' ? 'text-violet-500' : 'text-emerald-500'
                              )} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </button>
                    )
                  })}
                </div>
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="mt-6 flex flex-col gap-4">
                  <Button 
                    onClick={handleNextStep} 
                    disabled={!accountType}
                    className={cn(
                      "w-full",
                      accountType === 'importer' && "bg-blue-600 hover:bg-blue-700",
                      accountType === 'supplier' && "bg-emerald-600 hover:bg-emerald-700",
                      accountType === 'qi' && "bg-violet-600 hover:bg-violet-700"
                    )}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="underline underline-offset-4">
                      Login
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Email & Password */}
          {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handlePrevStep} className="h-8 w-8 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription>
                    Sign up as {accountType === 'importer' ? 'US Importer' : accountType === 'supplier' ? 'Foreign Supplier' : 'Qualified Individual'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  {/* ---------- Email ---------- */}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={isEmailDisposable ? 'border-destructive' : ''}
                    />
                    {/* STEP 2: Real-time disposable email warning */}
                    {isEmailDisposable && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Temporary email addresses are not allowed. Please use
                          a personal or business email.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ---------- Password ---------- */}
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {password.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                i < passwordStrength
                                  ? PASSWORD_STRENGTH_COLORS[passwordStrength]
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {PASSWORD_STRENGTH_LABELS[passwordStrength]}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {passwordChecks.map((check) => (
                            <li
                              key={check.label}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              {check.met ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <X className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span
                                className={
                                  check.met
                                    ? 'text-green-600'
                                    : 'text-muted-foreground'
                                }
                              >
                                {check.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* ---------- Repeat Password ---------- */}
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="repeat-password">Repeat Password</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="repeat-password"
                        type={showRepeatPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setShowRepeatPassword(!showRepeatPassword)
                        }
                        tabIndex={-1}
                        aria-label={
                          showRepeatPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showRepeatPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {repeatPassword.length > 0 &&
                      password !== repeatPassword && (
                        <p className="text-xs text-destructive">
                          Passwords do not match
                        </p>
                      )}
                  </div>

                  {/* ---------- Error ---------- */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Invisible Turnstile widget (renders nothing visible) */}
                  <div ref={turnstileRef} />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isLoading ||
                      isGoogleLoading ||
                      !passwordValidation.isValid ||
                      password !== repeatPassword ||
                      isEmailDisposable
                    }
                  >
                    {isLoading ? 'Creating an account...' : 'Sign up'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignUp}
                    disabled={isLoading || isGoogleLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  {'Already have an account? '}
                  <Link
                    href="/auth/login"
                    className="underline underline-offset-4"
                  >
                    Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// TypeScript declaration for the Turnstile global
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>
      ) => string
      execute: (widgetId: string) => void
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}
