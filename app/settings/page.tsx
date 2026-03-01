import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppHeader } from '@/components/app-header'
import BillingTab from './billing-tab'
import OtherSettingsTab from './other-settings-tab'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Check admin role — đồng nhất với /analyze và /history
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin =
    adminUser?.role === 'admin' ||
    adminUser?.role === 'superadmin' ||
    adminUser?.role === 'expert'

  // Fetch subscription + plan info
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', user.id)
    .single()

  // Auto-provision free plan if not exists
  let activeSub = subscription
  if (!activeSub) {
    await supabase.rpc('get_or_create_subscription', { p_user_id: user.id })
    const { data: newSub } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .single()
    activeSub = newSub
  }

  // Fetch recent payment transactions
  const { data: transactions } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch all plans for upgrade options
  const { data: allPlans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={user.email ?? ''} isAdmin={isAdmin} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Cài đặt</h1>
          <p className="text-muted-foreground">Quản lý tài khoản và gói dịch vụ của bạn</p>
        </div>

        <Tabs defaultValue="billing">
          <TabsList className="mb-6">
            <TabsTrigger value="billing">Gói dịch vụ & Thanh toán</TabsTrigger>
            <TabsTrigger value="other">Tài khoản</TabsTrigger>
          </TabsList>

          <TabsContent value="billing">
            <BillingTab
              subscription={activeSub}
              transactions={transactions ?? []}
              allPlans={allPlans ?? []}
            />
          </TabsContent>

          <TabsContent value="other">
            <OtherSettingsTab user={user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
