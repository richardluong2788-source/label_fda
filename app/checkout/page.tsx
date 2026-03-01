import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckoutClient from './checkout-client'

interface Props {
  searchParams: Promise<{ plan?: string; amount?: string; billing?: string }>
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { plan: planId, amount, billing } = await searchParams
  const billingCycle = billing === 'annual' ? 'annual' : 'monthly' as const

  if (!planId) redirect('/pricing')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/checkout?plan=' + planId)

  // Load plan details
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, name, price_vnd, reports_limit, features')
    .eq('id', planId)
    .single()

  if (!plan || plan.price_vnd === 0) redirect('/pricing')

  // Resolve amount: use query param if provided, else use DB price
  const finalAmount = amount ? Number(amount) : plan.price_vnd

  return (
    <CheckoutClient
      plan={plan}
      amount={finalAmount}
      userEmail={user.email ?? ''}
      billingCycle={billingCycle}
    />
  )
}
