'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Client-side callback handler to process pending account_type from localStorage
 * This page is redirected to after OAuth callback when user needs role assignment
 */
export default function CallbackHandlerPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Processing...')

  useEffect(() => {
    async function processCallback() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        // Check if user already has account_type
        const existingAccountType = user.user_metadata?.account_type
        
        if (existingAccountType) {
          // User already has account type, redirect to appropriate dashboard
          router.push(existingAccountType === 'qi' ? '/dashboard/qi' : '/dashboard')
          return
        }

        // Check for pending account type from localStorage (set before Google OAuth)
        const pendingAccountType = localStorage.getItem('pending_account_type')
        
        if (pendingAccountType && ['importer', 'supplier', 'qi'].includes(pendingAccountType)) {
          setStatus('Setting up your account...')
          
          // Update user metadata
          const { error: updateError } = await supabase.auth.updateUser({
            data: { account_type: pendingAccountType }
          })

          if (!updateError) {
            // Also update/create user_profiles
            await supabase
              .from('user_profiles')
              .upsert({
                id: user.id,
                account_type: pendingAccountType,
              }, {
                onConflict: 'id',
              })
            
            // Clear the pending value
            localStorage.removeItem('pending_account_type')
            
            // Redirect to appropriate dashboard
            router.push(pendingAccountType === 'qi' ? '/dashboard/qi' : '/dashboard')
            return
          }
        }

        // No pending account type, redirect to onboarding
        router.push('/onboarding/select-role')
        
      } catch (error) {
        console.error('Callback handler error:', error)
        router.push('/onboarding/select-role')
      }
    }

    processCallback()
  }, [router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  )
}
