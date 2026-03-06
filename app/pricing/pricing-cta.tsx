'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

interface Props {
  planId: string
  planName: string
  priceVnd: number
  isPopular: boolean
  isCurrent: boolean
  isFree: boolean
  isEnterprise: boolean
  isLoggedIn: boolean
}

export default function PricingCTA({
  planId,
  priceVnd,
  isPopular,
  isCurrent,
  isFree,
  isEnterprise,
  isLoggedIn,
}: Props) {
  const router = useRouter()
  const { t, locale } = useTranslation()

  if (isCurrent) {
    return (
      <Button className="w-full" variant="secondary" size="lg" disabled>
        {t.pricing.currentPlanBtn}
      </Button>
    )
  }

  if (isEnterprise) {
    return (
      <Button className="w-full" variant="outline" size="lg" asChild>
        <a href="mailto:sales@vexim.io">{t.pricing.contactSales}</a>
      </Button>
    )
  }

  const handleClick = () => {
    if (!isLoggedIn) {
      router.push('/auth/sign-up')
      return
    }
    if (isFree) {
      // Already on free — no action needed (handled by isCurrent above)
      return
    }
    // Redirect to checkout with plan pre-selected (monthly billing by default)
    router.push(`/checkout?plan=${planId}&amount=${priceVnd}&billing=monthly`)
  }

  const formattedPrice = locale === 'vi' 
    ? priceVnd.toLocaleString('vi-VN')
    : `$${Math.round(priceVnd / 25000).toLocaleString()}`

  const label = isFree
    ? t.pricing.tryFreeBtn
    : t.pricing.upgradeBtn(formattedPrice, locale === 'vi' ? 'tháng' : 'month')

  return (
    <Button
      className="w-full"
      variant={isPopular ? 'default' : 'outline'}
      size="lg"
      onClick={handleClick}
    >
      {label}
    </Button>
  )
}
