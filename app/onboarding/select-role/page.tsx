'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Ship, 
  Factory, 
  GraduationCap, 
  Check, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type AccountType = 'importer' | 'supplier' | 'qi'

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

export default function SelectRolePage() {
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check if user is authenticated and already has account_type
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Not logged in, redirect to login
          router.push('/auth/login')
          return
        }

        // Check if user already has account_type
        if (user.user_metadata?.account_type) {
          // Already has account type, redirect to appropriate dashboard
          const accountType = user.user_metadata.account_type
          if (accountType === 'qi') {
            router.push('/dashboard/qi')
          } else {
            router.push('/dashboard')
          }
          return
        }

        // Also check user_profiles table
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('account_type')
          .eq('id', user.id)
          .single()

        if (profile?.account_type) {
          if (profile.account_type === 'qi') {
            router.push('/dashboard/qi')
          } else {
            router.push('/dashboard')
          }
          return
        }

        setIsCheckingAuth(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  const handleConfirm = async () => {
    if (!accountType) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to continue')
        return
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { account_type: accountType }
      })

      if (updateError) {
        throw updateError
      }

      // Update user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          account_type: accountType,
        }, {
          onConflict: 'id',
        })

      if (profileError) {
        console.error('Failed to update profile:', profileError)
        // Don't fail, metadata is updated
      }

      // Redirect to appropriate dashboard
      if (accountType === 'qi') {
        router.push('/dashboard/qi')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Failed to save account type:', err)
      setError('Failed to save your selection. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col gap-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to AI Label Pro</h1>
            <p className="text-muted-foreground mt-2">
              Let us know how you will be using the platform so we can personalize your experience.
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Choose Your Account Type</CardTitle>
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
                        check: 'text-blue-500',
                      }
                    : option.color === 'violet'
                    ? {
                        border: isSelected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-border hover:border-violet-300',
                        icon: 'text-violet-600 bg-violet-100',
                        check: 'text-violet-500',
                      }
                    : {
                        border: isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-border hover:border-emerald-300',
                        icon: 'text-emerald-600 bg-emerald-100',
                        check: 'text-emerald-500',
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
                          <CheckCircle2 className={cn("h-5 w-5", colorClasses.check)} />
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
                            <Check className={cn("h-3 w-3", colorClasses.check)} />
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

              <div className="mt-6">
                <Button 
                  onClick={handleConfirm} 
                  disabled={!accountType || isLoading}
                  className={cn(
                    "w-full",
                    accountType === 'importer' && "bg-blue-600 hover:bg-blue-700",
                    accountType === 'supplier' && "bg-emerald-600 hover:bg-emerald-700",
                    accountType === 'qi' && "bg-violet-600 hover:bg-violet-700"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue to Dashboard'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            You can change your account type later in your profile settings.
          </p>
        </div>
      </div>
    </div>
  )
}
