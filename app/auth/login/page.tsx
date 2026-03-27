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
import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, Ship, Factory, GraduationCap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccountType = 'importer' | 'supplier' | 'qi'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<AccountType | null>(null)
  const router = useRouter()

  // Compact role options for Google sign-in
  const roleOptions = [
    { id: 'importer' as AccountType, icon: Ship, label: 'Importer', color: 'blue' },
    { id: 'supplier' as AccountType, icon: Factory, label: 'Supplier', color: 'emerald' },
    { id: 'qi' as AccountType, icon: GraduationCap, label: 'FSVP QI', color: 'violet' },
  ]

  const handleGoogleLogin = async () => {
    // Save selected role to localStorage before OAuth redirect
    if (selectedRole) {
      localStorage.setItem('pending_account_type', selectedRole)
    }
    
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
      // If successful, user is redirected to Google — no need to do anything here
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Check account_type and redirect accordingly
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const accountType = user.user_metadata?.account_type
        
        if (!accountType) {
          // Check user_profiles table
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('account_type')
            .eq('id', user.id)
            .single()
          
          if (!profile?.account_type) {
            // No account type, redirect to onboarding
            router.push('/onboarding/select-role')
            router.refresh()
            return
          }
          
          // Has account type in profile
          router.push(profile.account_type === 'qi' ? '/dashboard/qi' : '/dashboard')
        } else {
          // Has account type in metadata
          router.push(accountType === 'qi' ? '/dashboard/qi' : '/dashboard')
        }
      } else {
        router.push('/dashboard')
      }
      
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
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
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
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

                  {/* Role Selection for Google Sign-in */}
                  <div className="space-y-3">
                    <p className="text-xs text-center text-muted-foreground">
                      New user? Select your role first
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {roleOptions.map((role) => {
                        const isSelected = selectedRole === role.id
                        const Icon = role.icon
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRole(isSelected ? null : role.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                              isSelected 
                                ? role.color === 'blue' 
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : role.color === 'emerald'
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                  : "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            <div className={cn(
                              "relative flex items-center justify-center w-8 h-8 rounded-full",
                              role.color === 'blue' ? "bg-blue-100" :
                              role.color === 'emerald' ? "bg-emerald-100" : "bg-violet-100"
                            )}>
                              <Icon className={cn(
                                "h-4 w-4",
                                role.color === 'blue' ? "text-blue-600" :
                                role.color === 'emerald' ? "text-emerald-600" : "text-violet-600"
                              )} />
                              {isSelected && (
                                <div className={cn(
                                  "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                                  role.color === 'blue' ? "bg-blue-500" :
                                  role.color === 'emerald' ? "bg-emerald-500" : "bg-violet-500"
                                )}>
                                  <Check className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-medium">{role.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
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
                  {"Don't have an account? "}
                  <Link
                    href="/auth/sign-up"
                    className="underline underline-offset-4"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
