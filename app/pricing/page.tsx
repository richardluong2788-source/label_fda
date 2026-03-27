import { createClient } from '@/lib/supabase/server'
import PricingPageContent from './pricing-page-content'

export default async function PricingPage() {
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentPlanId: string | null = null
  if (user) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .single()
    currentPlanId = sub?.plan_id ?? 'free'
  }

  return (
    <PricingPageContent
      plans={plans ?? []}
      currentPlanId={currentPlanId}
      isLoggedIn={!!user}
    />
  )
}
