'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CreditCard, Calendar, TrendingUp, CheckCircle2, Clock, XCircle, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { enUS } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

interface Plan {
  id: string
  name: string
  price_vnd: number
  annual_price_vnd?: number
  annual_discount_percent?: number
  reports_limit: number
  expert_reviews_limit: number
  features: string[]
}

interface Subscription {
  plan_id: string
  status: string
  reports_used: number
  current_period_start: string
  current_period_end: string
  last_payment_at: string | null
  last_payment_amount_vnd: number | null
  subscription_plans: Plan
}

interface Transaction {
  id: string
  amount_vnd: number
  status: string
  plan_id: string
  created_at: string
  vnpay_txn_ref: string | null
  vnpay_bank_code: string | null
}

interface Props {
  subscription: Subscription | null
  transactions: Transaction[]
  allPlans: Plan[]
}

const TXN_STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  pending:   <Clock        className="h-4 w-4 text-yellow-500" />,
  failed:    <XCircle      className="h-4 w-4 text-destructive" />,
  expired:   <XCircle      className="h-4 w-4 text-muted-foreground" />,
}

export default function BillingTab({ subscription, transactions, allPlans }: Props) {
  const { t, locale } = useTranslation()
  const s = t.settings
  const dateFnsLocale = locale === 'vi' ? vi : enUS

  const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active:          { label: s.statusActive, variant: 'default' },
    cancelled:       { label: s.statusCancelled, variant: 'destructive' },
    expired:         { label: s.statusExpired, variant: 'destructive' },
    pending_payment: { label: s.statusPendingPayment, variant: 'secondary' },
  }

  const TXN_LABELS: Record<string, string> = {
    completed: s.txnCompleted,
    pending: s.txnPending,
    failed: s.txnFailed,
    expired: s.txnExpired,
  }

  if (!subscription) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">{s.noSubscription}</p>
        <Button asChild>
          <Link href="/pricing">{s.viewPricing}</Link>
        </Button>
      </Card>
    )
  }

  const plan = subscription.subscription_plans
  const reportsLimit = plan.reports_limit === -1 ? Infinity : plan.reports_limit
  const usagePercent =
    reportsLimit === Infinity ? 0 : Math.min(100, (subscription.reports_used / reportsLimit) * 100)

  const periodEnd = new Date(subscription.current_period_end)
  const daysLeft = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  const statusInfo = STATUS_LABELS[subscription.status] ?? { label: subscription.status, variant: 'outline' as const }

  const upgradePlans = allPlans.filter(
    (p) => p.id !== plan.id && p.id !== 'enterprise' && p.price_vnd > plan.price_vnd
  )

  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{s.currentPlan}</p>
            <h2 className="text-2xl font-bold">{plan.name}</h2>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{s.usageUsed}</p>
              <p className="font-semibold">
                {subscription.reports_used} /{' '}
                {reportsLimit === Infinity ? '\u221E' : reportsLimit}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{s.nextRenewal}</p>
              <p className="font-semibold">
                {format(periodEnd, 'dd/MM/yyyy', { locale: dateFnsLocale })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{s.daysLeft}</p>
              <p className="font-semibold">{daysLeft} {s.days}</p>
            </div>
          </div>
        </div>

        {/* Usage bar */}
        {reportsLimit !== Infinity && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{s.monthlyUsage}</span>
              <span>{s.usedOfLimit(subscription.reports_used, reportsLimit as number)}</span>
            </div>
            <Progress
              value={usagePercent}
              className={`h-2 ${usagePercent >= 80 ? '[&>div]:bg-destructive' : ''}`}
            />
            {usagePercent >= 100 ? (
              <p className="text-xs text-destructive mt-1 font-medium">{s.outOfQuota}</p>
            ) : usagePercent >= 80 ? (
              <p className="text-xs text-destructive mt-1">{s.almostOutQuota}</p>
            ) : null}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/pricing">{s.viewAllPlans}</Link>
          </Button>
          {plan.id !== 'free' && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              asChild
            >
              <Link href="/contact?subject=cancel">{s.cancelPlan}</Link>
            </Button>
          )}
        </div>
      </Card>

      {/* Upgrade suggestions */}
      {upgradePlans.length > 0 && (
        <UpgradePlansSection 
          upgradePlans={upgradePlans} 
          t={t} 
          locale={locale} 
        />
      )}

      {/* Payment history */}
      <div>
        <h3 className="font-semibold mb-3">{s.paymentHistory}</h3>
        <Card className="divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {s.noTransactions}
            </div>
          ) : (
            transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {TXN_STATUS_ICONS[txn.status] ?? <Clock className="h-4 w-4" />}
                  <div>
                    <p className="text-sm font-medium">
                      {txn.plan_id.charAt(0).toUpperCase() + txn.plan_id.slice(1)} Plan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(txn.created_at), 'dd/MM/yyyy HH:mm', { locale: dateFnsLocale })}
                      {txn.vnpay_bank_code ? ` \u00B7 ${txn.vnpay_bank_code}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {txn.amount_vnd.toLocaleString('vi-VN')}{'\u20AB'}
                  </p>
                  <Badge
                    variant={
                      txn.status === 'completed'
                        ? 'default'
                        : txn.status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className="text-xs"
                  >
                    {TXN_LABELS[txn.status] || txn.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <Separator />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        <span>{s.paymentNote}</span>
      </div>
    </div>
  )
}

// Separate component for upgrade plans with billing toggle
function UpgradePlansSection({ 
  upgradePlans, 
  t, 
  locale 
}: { 
  upgradePlans: Plan[]
  t: ReturnType<typeof useTranslation>['t']
  locale: string
}) {
  const [isAnnual, setIsAnnual] = useState(false)
  const s = t.settings

  // Check if any plan has annual pricing
  const hasAnnualPricing = upgradePlans.some(p => p.annual_price_vnd && p.annual_price_vnd > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{s.upgradePlan}</h3>
        
        {/* Billing toggle */}
        {hasAnnualPricing && (
          <div className="flex items-center gap-3">
            <Label 
              htmlFor="billing-toggle-settings" 
              className={`text-sm cursor-pointer ${!isAnnual ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              {t.pricing?.billingMonthly || t.common.month}
            </Label>
            <Switch
              id="billing-toggle-settings"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <div className="flex items-center gap-1.5">
              <Label 
                htmlFor="billing-toggle-settings" 
                className={`text-sm cursor-pointer ${isAnnual ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
              >
                {t.pricing?.billingAnnual || t.common.year}
              </Label>
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                {t.pricing?.saveUpTo || '-20%'}
              </Badge>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid sm:grid-cols-2 gap-4">
        {upgradePlans.map((p) => {
          const showAnnual = isAnnual && p.annual_price_vnd && p.annual_price_vnd > 0
          const displayPrice = showAnnual ? p.annual_price_vnd! : p.price_vnd
          const monthlyEquivalent = showAnnual ? Math.round(p.annual_price_vnd! / 12) : p.price_vnd
          const billingCycle = showAnnual ? 'annual' : 'monthly'
          const discountPercent = p.annual_discount_percent ?? 0

          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.reports_limit === -1
                      ? s.unlimitedUsage
                      : s.usagePerMonth(p.reports_limit)}
                  </p>
                </div>
                {showAnnual && discountPercent > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                    -{discountPercent}%
                  </Badge>
                )}
              </div>
              
              <div className="mb-3">
                {showAnnual ? (
                  <div>
                    <p className="text-2xl font-bold">
                      {monthlyEquivalent.toLocaleString('vi-VN')}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {'\u20AB'}/{t.common.month}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {t.pricing?.payAnnually 
                          ? t.pricing.payAnnually(displayPrice.toLocaleString('vi-VN'))
                          : `${displayPrice.toLocaleString('vi-VN')}\u20AB/${t.common.year}`
                        }
                      </p>
                    </div>
                    {p.price_vnd > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-through">
                        {p.price_vnd.toLocaleString('vi-VN')}{'\u20AB'}/{t.common.month}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-bold">
                    {displayPrice.toLocaleString('vi-VN')}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {'\u20AB'}/{t.common.month}
                    </span>
                  </p>
                )}
              </div>

              <Button size="sm" className="w-full" asChild>
                <Link href={`/checkout?plan=${p.id}&amount=${displayPrice}&billing=${billingCycle}`}>
                  {s.upgrade}
                </Link>
              </Button>
            </Card>
          )
        })}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        <Link href="/pricing" className="text-primary hover:underline">
          {s.viewAllPlansWithAnnual || 'View all plans including annual pricing'}
        </Link>
      </p>
    </div>
  )
}
