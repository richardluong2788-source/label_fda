import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminRevenueDashboard } from './admin-revenue-dashboard'

export const metadata = { title: 'Tổng quan doanh thu | Admin' }

export default async function AdminRevenuePage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/auth/login')

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!adminUser) redirect('/dashboard')

  // Server-side data fetch
  const [
    { data: transactions },
    { data: subscriptions },
    { data: plans },
  ] = await Promise.all([
    supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('user_subscriptions')
      .select('plan_id, status, created_at, last_payment_at'),
    supabase
      .from('subscription_plans')
      .select('id, name, price_vnd, reports_limit')
      .order('sort_order', { ascending: true }),
  ])

  return (
    <AdminRevenueDashboard
      transactions={transactions ?? []}
      subscriptions={subscriptions ?? []}
      plans={plans ?? []}
      userEmail={user.email ?? ''}
      adminUser={adminUser}
    />
  )
}
