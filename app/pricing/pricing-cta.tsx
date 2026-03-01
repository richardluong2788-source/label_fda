'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

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

  if (isCurrent) {
    return (
      <Button className="w-full" variant="secondary" size="lg" disabled>
        Gói hiện tại
      </Button>
    )
  }

  if (isEnterprise) {
    return (
      <Button className="w-full" variant="outline" size="lg" asChild>
        <a href="mailto:sales@vexim.io">Liên hệ Sales</a>
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
    // Redirect to checkout with plan pre-selected
    router.push(`/checkout?plan=${planId}&amount=${priceVnd}`)
  }

  const label = isFree
    ? 'Dùng thử miễn phí'
    : `Nâng cấp — ${priceVnd.toLocaleString('vi-VN')}₫/tháng`

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
