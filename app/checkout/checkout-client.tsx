'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  QrCode,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

interface Plan {
  id: string
  name: string
  price_vnd: number
  reports_limit: number
  features: string[]
}

interface Props {
  plan: Plan
  amount: number
  userEmail: string
  billingCycle?: 'monthly' | 'annual'
}

export default function CheckoutClient({ plan, amount, userEmail, billingCycle = 'monthly' }: Props) {
  const isAnnual = billingCycle === 'annual'
  const periodLabel = isAnnual ? '12 tháng' : '1 tháng'
  const monthlyEquivalent = isAnnual ? Math.round(amount / 12) : amount
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handlePayment() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/vnpay/create-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ 
          planId: plan.id, 
          amount,
          billingCycle: isAnnual ? 'annual' : 'monthly'
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.payUrl) {
        setError(data.error ?? 'Không thể tạo yêu cầu thanh toán. Vui lòng thử lại.')
        setLoading(false)
        return
      }

      // Redirect to VNPay payment page (or demo page)
      window.location.href = data.payUrl
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  const reportsLabel =
    plan.reports_limit === -1
      ? 'Không giới hạn lượt phân tích'
      : `${plan.reports_limit} lượt phân tích / tháng`

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Back link */}
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại bảng giá
        </Link>

        {/* Order summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold">Xác nhận đơn hàng</h1>
            <Badge variant={isAnnual ? 'default' : 'secondary'}>
              {periodLabel}
              {isAnnual && <span className="ml-1 text-xs opacity-80">Tiết kiệm 20%</span>}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Tài khoản: <span className="font-medium text-foreground">{userEmail}</span>
          </p>

          <Separator className="mb-5" />

          {/* Plan info */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold text-lg">{plan.name}</p>
              <p className="text-sm text-muted-foreground">{reportsLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums">
                {amount.toLocaleString('vi-VN')}
                <span className="text-base font-normal text-muted-foreground">₫</span>
              </p>
              {isAnnual && (
                <p className="text-xs text-muted-foreground">
                  = {monthlyEquivalent.toLocaleString('vi-VN')}₫/tháng
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-1.5 mb-5">
            {plan.features?.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Separator className="mb-5" />

          <div className="flex items-center justify-between text-sm mb-6">
            <span className="font-medium">Tổng thanh toán</span>
            <span className="text-xl font-bold tabular-nums">
              {amount.toLocaleString('vi-VN')}₫
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Pay button */}
          <Button
            className="w-full h-12 text-base gap-2"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang chuyển sang VNPay...
              </>
            ) : (
              <>
                <QrCode className="h-5 w-5" />
                Thanh toán qua QR ngân hàng
              </>
            )}
          </Button>
        </Card>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Bảo mật SSL
          </span>
          <span>Hỗ trợ 30+ ngân hàng VN</span>
          <span>Không lưu thông tin thẻ</span>
        </div>
      </div>
    </div>
  )
}
