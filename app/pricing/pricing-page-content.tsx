'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, MessageCircle, Users, FileText, Clock, CheckCircle, X, ArrowLeft, Shield } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { formatVND, formatUSD, vndToUsd } from '@/lib/currency'
import PricingClient from './pricing-client'

interface Plan {
  id: string
  name: string
  price_vnd: number
  annual_price_vnd?: number
  annual_discount_percent?: number
  reports_limit: number
  features: string[] | string
  is_active: boolean
  sort_order: number
  expert_reviews_limit?: number
  expert_review_price_vnd?: number
}

interface Props {
  plans: Plan[]
  currentPlanId: string | null
  isLoggedIn: boolean
}

export default function PricingPageContent({ plans, currentPlanId, isLoggedIn }: Props) {
  const { t, locale } = useTranslation()

  const EXPERT_FEATURE_ICONS = [FileText, CheckCircle, MessageCircle, Shield, Clock, Users]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="Vexim logo" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className="text-xl font-bold">Vexim Compliance AI</h1>
              <p className="text-xs text-muted-foreground">Vexim Global</p>
            </div>
          </Link>
          <div className="flex gap-2">
            {isLoggedIn ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">{t.pricing.login}</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">{t.pricing.tryFreeBtn}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 pb-16 max-w-6xl">
        {/* Back */}
        <Button variant="ghost" size="sm" className="gap-2 mb-6 -ml-2" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            {t.pricing.backToDashboard}
          </Link>
        </Button>

        {/* Hero + Plans (Client Component with Toggle) */}
        <PricingClient
          plans={plans}
          currentPlanId={currentPlanId}
          isLoggedIn={isLoggedIn}
        />

        {/* Expert Review Section */}
        <div id="expert-review" className="mb-16 scroll-mt-24">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 text-primary border-primary">
              <MessageCircle className="h-3 w-3 mr-1" />
              {t.pricing.expertServiceBadge}
            </Badge>
            <h2 className="text-3xl font-bold mb-3 text-balance">
              {t.pricing.expertTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
              {t.pricing.expertSubtitle}
            </p>
          </div>

          {/* What's included in Expert Review */}
          <Card className="p-6 mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t.pricing.expertIncludes}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {t.pricing.expertFeatures.map((text, i) => {
                const Icon = EXPERT_FEATURE_ICONS[i] ?? FileText
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span>{text}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Expert Review plan comparison */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans?.map((plan) => {
              const isFree = plan.id === 'free'
              const isStarter = plan.id === 'starter'
              const isPro = plan.id === 'pro'
              const isEnterprise = plan.id === 'enterprise'
              const expertPrice = plan.expert_review_price_vnd ?? 0
              const isCurrentPlan = currentPlanId === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`p-5 flex flex-col ${
                    isPro ? 'border-primary border-2 shadow-md' : ''
                  }`}
                >
                  <div className="mb-3">
                    <p className="font-semibold text-sm">{plan.name}</p>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="text-[10px] mt-1">{t.pricing.currentPlanBadge}</Badge>
                    )}
                  </div>

                  {/* Expert review access */}
                  <div className="mb-4 flex-1">
                    {isFree && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 text-muted-foreground/50" />
                          <span>{t.pricing.noExpertReview}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.pricing.upgradeToAccess}
                        </p>
                      </div>
                    )}
                    {isStarter && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <span>{t.pricing.buyPerUse}</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {locale === 'vi'
                            ? formatVND(expertPrice)
                            : `$${formatUSD(vndToUsd(expertPrice), false)}`
                          }
                          <span className="text-sm font-normal text-muted-foreground ml-1">{t.pricing.perUse}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.pricing.payPerRequest}
                        </p>
                      </div>
                    )}
                    {isPro && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700">{t.pricing.includedInPlan}</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {plan.expert_reviews_limit}
                          <span className="text-sm font-normal text-muted-foreground ml-1">{t.pricing.creditsPerMonth}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.pricing.freeCreditsPerMonth(plan.expert_reviews_limit ?? 0)}
                        </p>
                      </div>
                    )}
                    {isEnterprise && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700">{t.pricing.unlimited}</span>
                        </div>
                        <p className="text-2xl font-bold">
                          Unlimited
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.pricing.unlimitedExpert}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <Button variant="secondary" size="sm" className="w-full" disabled>
                      {t.pricing.currentPlanBtn}
                    </Button>
                  ) : isFree ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      {t.pricing.notAvailable}
                    </Button>
                  ) : isEnterprise ? (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href="mailto:sales@vexim.io">{t.pricing.contactSales}</a>
                    </Button>
                  ) : (
                    <Button
                      variant={isPro ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={isLoggedIn ? `/checkout?plan=${plan.id}&amount=${plan.price_vnd}&billing=monthly` : '/auth/sign-up'}>
                        {isPro ? t.pricing.upgradePro : t.pricing.upgradePlan(plan.name)}
                      </Link>
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        </div>

        {/* FAQ / guarantee strip */}
        <Card className="p-8 bg-muted/50 border-border text-center">
          <h3 className="text-xl font-bold mb-2">
            {t.pricing.securePaymentTitle}
          </h3>
          <p className="text-muted-foreground mb-4 text-pretty max-w-lg mx-auto">
            {t.pricing.securePaymentDesc}
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              {t.pricing.activateInstantly}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              {t.pricing.cancelAnytime}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              {t.pricing.emailSupport}
            </span>
          </div>
        </Card>
      </main>
    </div>
  )
}
