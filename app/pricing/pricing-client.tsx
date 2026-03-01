'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Check, Zap, Shield, Crown, Star, CalendarDays, Briefcase } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

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
}

interface Props {
  plans: Plan[]
  currentPlanId: string | null
  isLoggedIn: boolean
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap,
  starter: Shield,
  business: Briefcase,
  pro: Star,
  enterprise: Crown,
}

const POPULAR_PLAN = 'pro'

export default function PricingClient({ plans, currentPlanId, isLoggedIn }: Props) {
  const [isAnnual, setIsAnnual] = useState(false)
  const [highlightedPlan, setHighlightedPlan] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for highlight param from URL (e.g., /pricing?highlight=business)
  useEffect(() => {
    const highlight = searchParams.get('highlight')
    if (highlight) {
      setHighlightedPlan(highlight)
      // Remove highlight after 5 seconds
      const timer = setTimeout(() => setHighlightedPlan(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleSelect = (plan: Plan) => {
    if (!isLoggedIn) {
      router.push('/auth/sign-up')
      return
    }
    
    if (plan.id === 'free' || plan.id === 'enterprise') {
      return
    }

    const amount = isAnnual && plan.annual_price_vnd ? plan.annual_price_vnd : plan.price_vnd
    const billingCycle = isAnnual ? 'annual' : 'monthly'
    router.push(`/checkout?plan=${plan.id}&amount=${amount}&billing=${billingCycle}`)
  }

  // Check if any plan has annual pricing
  const hasAnnualPricing = plans.some(p => p.annual_price_vnd && p.annual_price_vnd > 0)

  return (
    <>
      {/* Hero */}
      <div className="text-center mb-10">
        <Badge variant="outline" className="mb-4 text-primary border-primary">
          Thị trường Việt Nam
        </Badge>
        <h2 className="text-4xl font-bold mb-4 text-balance">
          Bảng giá dịch vụ FDA Compliance
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
          Thanh toán đơn giản qua QR ngân hàng — không cần thẻ quốc tế.
          Nâng cấp hoặc huỷ bất cứ lúc nào.
        </p>
      </div>

      {/* Billing Toggle */}
      {hasAnnualPricing && (
        <div className="flex items-center justify-center gap-4 mb-10">
          <Label 
            htmlFor="billing-toggle" 
            className={`text-sm font-medium cursor-pointer ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            Thanh toán tháng
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="billing-toggle" 
              className={`text-sm font-medium cursor-pointer ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Thanh toán năm
            </Label>
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              Tiết kiệm đến 20%
            </Badge>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div id="subscription-plans" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 scroll-mt-24">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] ?? Zap
          const isPopular = plan.id === POPULAR_PLAN
          const isCurrent = currentPlanId === plan.id
          const isHighlighted = highlightedPlan === plan.id
          const isFree = plan.id === 'free'
          const isEnterprise = plan.id === 'enterprise'
          const features: string[] = Array.isArray(plan.features)
            ? plan.features
            : JSON.parse(plan.features ?? '[]')

          // Determine price to display
          const showAnnual = isAnnual && plan.annual_price_vnd && plan.annual_price_vnd > 0
          const displayPrice = showAnnual ? plan.annual_price_vnd! : plan.price_vnd
          const monthlyEquivalent = showAnnual ? Math.round(plan.annual_price_vnd! / 12) : plan.price_vnd
          const discountPercent = plan.annual_discount_percent ?? 0

          return (
            <Card
              key={plan.id}
              className={`flex flex-col p-6 relative transition-all ${
                isHighlighted
                  ? 'border-green-500 border-2 shadow-lg shadow-green-500/20 ring-2 ring-green-500/20'
                  : isPopular
                  ? 'border-primary border-2 shadow-lg'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  Phổ biến nhất
                </Badge>
              )}
              {isCurrent && !isPopular && (
                <Badge
                  variant="secondary"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap"
                >
                  Gói hiện tại
                </Badge>
              )}

              {/* Icon + name */}
              <div className="mb-4">
                <div
                  className={`rounded-lg p-2 w-10 h-10 flex items-center justify-center mb-3 ${
                    isPopular ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isPopular ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  />
                </div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-5">
                {isEnterprise ? (
                  <p className="text-3xl font-bold">Liên hệ</p>
                ) : isFree ? (
                  <div>
                    <p className="text-3xl font-bold">Miễn phí</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.reports_limit} lượt / đăng ký
                    </p>
                  </div>
                ) : showAnnual ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">
                        {monthlyEquivalent.toLocaleString('vi-VN')}
                        <span className="text-base font-normal text-muted-foreground ml-1">
                          ₫/tháng
                        </span>
                      </p>
                      {discountPercent > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          -{discountPercent}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Thanh toán {displayPrice.toLocaleString('vi-VN')}₫/năm
                      </p>
                    </div>
                    {plan.price_vnd > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 line-through">
                        {plan.price_vnd.toLocaleString('vi-VN')}₫/tháng
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.reports_limit === -1
                        ? 'Không giới hạn lượt'
                        : `${plan.reports_limit} lượt AI / tháng`}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold">
                      {plan.price_vnd.toLocaleString('vi-VN')}
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        ₫/tháng
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.reports_limit === -1
                        ? 'Không giới hạn lượt'
                        : `${plan.reports_limit} lượt AI / tháng`}
                    </p>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <Button className="w-full" variant="secondary" size="lg" disabled>
                  Gói hiện tại
                </Button>
              ) : isEnterprise ? (
                <Button className="w-full" variant="outline" size="lg" asChild>
                  <a href="mailto:sales@vexim.io">Liên hệ Sales</a>
                </Button>
              ) : isFree ? (
                <Button 
                  className="w-full" 
                  variant="outline" 
                  size="lg"
                  onClick={() => !isLoggedIn && router.push('/auth/sign-up')}
                >
                  {isLoggedIn ? 'Gói miễn phí' : 'Dùng thử miễn phí'}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleSelect(plan)}
                >
                  {showAnnual 
                    ? `Nâng cấp — ${displayPrice.toLocaleString('vi-VN')}₫/năm`
                    : `Nâng cấp — ${displayPrice.toLocaleString('vi-VN')}₫/tháng`
                  }
                </Button>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}
