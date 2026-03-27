'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Mail, Lock, User, Shield, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SupplierAuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  supplierEmail?: string
  supplierName?: string
  onAuthSuccess: (sessionId: string, type: 'guest' | 'authenticated') => void
}

type AuthStep = 'choose' | 'guest_email' | 'guest_verify' | 'login' | 'signup'

export function SupplierAuthModal({
  open,
  onOpenChange,
  token,
  supplierEmail,
  supplierName,
  onAuthSuccess
}: SupplierAuthModalProps) {
  const [step, setStep] = useState<AuthStep>('choose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Guest flow state
  const [guestEmail, setGuestEmail] = useState(supplierEmail || '')
  const [guestName, setGuestName] = useState(supplierName || '')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  
  // Login/Signup state
  const [email, setEmail] = useState(supplierEmail || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState(supplierName || '')

  const supabase = createClient()

  const handleGuestStart = async () => {
    if (!guestEmail) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/supplier-portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_guest_session',
          email: guestEmail,
          name: guestName
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to start session')
        return
      }

      setSessionId(data.sessionId)
      if (data.devCode) {
        setDevCode(data.devCode) // Only shown in development
      }
      setStep('guest_verify')

    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError('Please enter the 6-character verification code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/supplier-portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_email',
          sessionId,
          verificationCode
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid verification code')
        return
      }

      onAuthSuccess(sessionId!, 'guest')
      onOpenChange(false)

    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      // Create authenticated session
      const res = await fetch(`/api/supplier-portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authenticated_session' })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create session')
        return
      }

      onAuthSuccess(data.sessionId, 'authenticated')
      onOpenChange(false)

    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    if (!email || !password || !name) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'supplier',
            account_type: 'supplier'
          }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Auto sign in after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        // If auto sign-in fails, likely email confirmation required
        setError('Account created! Please check your email to confirm, then log in.')
        setStep('login')
        return
      }

      // Create authenticated session
      const res = await fetch(`/api/supplier-portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authenticated_session' })
      })

      const data = await res.json()

      if (res.ok) {
        onAuthSuccess(data.sessionId, 'authenticated')
        onOpenChange(false)
      }

    } catch (err) {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderChooseStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        To access and upload documents for this request, please verify your identity.
      </p>
      
      <div className="grid gap-3">
        <Button
          variant="outline"
          className="h-auto p-4 justify-start"
          onClick={() => setStep('guest_email')}
        >
          <Mail className="h-5 w-5 mr-3 text-primary" />
          <div className="text-left">
            <div className="font-medium">Continue as Guest</div>
            <div className="text-xs text-muted-foreground">
              Verify your email to access this request
            </div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 justify-start"
          onClick={() => setStep('login')}
        >
          <Lock className="h-5 w-5 mr-3 text-primary" />
          <div className="text-left">
            <div className="font-medium">Sign In</div>
            <div className="text-xs text-muted-foreground">
              Already have an account? Sign in for full access
            </div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 justify-start"
          onClick={() => setStep('signup')}
        >
          <User className="h-5 w-5 mr-3 text-primary" />
          <div className="text-left">
            <div className="font-medium">Create Account</div>
            <div className="text-xs text-muted-foreground">
              New supplier? Create an account for ongoing access
            </div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>
    </div>
  )

  const renderGuestEmail = () => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setStep('choose')} className="mb-2">
        Back
      </Button>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="guest-name">Your Name</Label>
          <Input
            id="guest-name"
            placeholder="Enter your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="guest-email">Email Address</Label>
          <Input
            id="guest-email"
            type="email"
            placeholder="Enter your email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We will send a verification code to this email
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleGuestStart} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
        Send Verification Code
      </Button>
    </div>
  )

  const renderGuestVerify = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <Shield className="h-12 w-12 mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">
          We sent a verification code to <strong>{guestEmail}</strong>
        </p>
      </div>

      {devCode && (
        <Alert>
          <AlertDescription>
            Development mode: Your code is <strong>{devCode}</strong>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="verification-code">Verification Code</Label>
        <Input
          id="verification-code"
          placeholder="Enter 6-character code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="text-center text-lg tracking-widest font-mono"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleVerifyCode} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Verify & Continue
      </Button>

      <Button variant="link" onClick={() => setStep('guest_email')} className="w-full">
        Resend code
      </Button>
    </div>
  )

  const renderLoginSignup = () => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setStep('choose')} className="mb-2">
        Back
      </Button>

      <Tabs value={step} onValueChange={(v) => setStep(v as AuthStep)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Create Account</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-3 mt-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleLogin} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Sign In
          </Button>
        </TabsContent>

        <TabsContent value="signup" className="space-y-3 mt-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <Input
              id="signup-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-confirm">Confirm Password</Label>
            <Input
              id="signup-confirm"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSignup} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create Account
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'choose' && 'Access Document Request'}
            {step === 'guest_email' && 'Guest Access'}
            {step === 'guest_verify' && 'Verify Your Email'}
            {(step === 'login' || step === 'signup') && 'Account Access'}
          </DialogTitle>
          <DialogDescription>
            {step === 'choose' && 'Choose how you want to access this document request'}
            {step === 'guest_email' && 'Enter your email to receive a verification code'}
            {step === 'guest_verify' && 'Enter the code we sent to your email'}
            {(step === 'login' || step === 'signup') && 'Sign in or create an account for full access'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && renderChooseStep()}
        {step === 'guest_email' && renderGuestEmail()}
        {step === 'guest_verify' && renderGuestVerify()}
        {(step === 'login' || step === 'signup') && renderLoginSignup()}
      </DialogContent>
    </Dialog>
  )
}
