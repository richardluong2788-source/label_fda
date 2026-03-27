import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPricingManager } from './admin-pricing-manager'

export const metadata = { title: 'Quản lý giá gói | Admin' }

export default async function AdminPricingPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/auth/login')

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!adminUser) redirect('/dashboard')

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  return <AdminPricingManager initialPlans={plans ?? []} />
}
