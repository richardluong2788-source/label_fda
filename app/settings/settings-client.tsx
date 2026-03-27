'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/lib/i18n'
import BillingTab from './billing-tab'
import OtherSettingsTab from './other-settings-tab'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
  subscription: any
  transactions: any[]
  allPlans: any[]
}

export function SettingsClient({ user, subscription, transactions, allPlans }: Props) {
  const { t } = useTranslation()
  const s = t.settings

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">{s.title}</h1>
        <p className="text-muted-foreground">{s.subtitle}</p>
      </div>

      <Tabs defaultValue="billing">
        <TabsList className="mb-6">
          <TabsTrigger value="billing">{s.billingTab}</TabsTrigger>
          <TabsTrigger value="other">{s.accountTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="billing">
          <BillingTab
            subscription={subscription}
            transactions={transactions}
            allPlans={allPlans}
          />
        </TabsContent>

        <TabsContent value="other">
          <OtherSettingsTab user={user} />
        </TabsContent>
      </Tabs>
    </>
  )
}
