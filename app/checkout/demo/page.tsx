'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QrCode, CheckCircle2, Loader2 } from 'lucide-react'

// Fake QR data URI — replaced by real VNPay QR in production
const DEMO_QR_DATA =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" fill="white"/>
    <!-- Finder patterns -->
    <rect x="10" y="10" width="60" height="60" rx="4" fill="black"/>
    <rect x="18" y="18" width="44" height="44" rx="2" fill="white"/>
    <rect x="26" y="26" width="28" height="28" rx="1" fill="black"/>
    <rect x="130" y="10" width="60" height="60" rx="4" fill="black"/>
    <rect x="138" y="18" width="44" height="44" rx="2" fill="white"/>
    <rect x="146" y="26" width="28" height="28" rx="1" fill="black"/>
    <rect x="10" y="130" width="60" height="60" rx="4" fill="black"/>
    <rect x="18" y="138" width="44" height="44" rx="2" fill="white"/>
    <rect x="26" y="146" width="28" height="28" rx="1" fill="black"/>
    <!-- Demo data modules (simplified) -->
    <rect x="80" y="10" width="8" height="8" fill="black"/>
    <rect x="96" y="10" width="8" height="8" fill="black"/>
    <rect x="112" y="10" width="8" height="8" fill="black"/>
    <rect x="88" y="20" width="8" height="8" fill="black"/>
    <rect x="104" y="20" width="8" height="8" fill="black"/>
    <rect x="80" y="30" width="8" height="8" fill="black"/>
    <rect x="96" y="30" width="8" height="8" fill="black"/>
    <rect x="80" y="80" width="8" height="8" fill="black"/>
    <rect x="96" y="80" width="8" height="8" fill="black"/>
    <rect x="112" y="80" width="8" height="8" fill="black"/>
    <rect x="128" y="80" width="8" height="8" fill="black"/>
    <rect x="144" y="80" width="8" height="8" fill="black"/>
    <rect x="160" y="80" width="8" height="8" fill="black"/>
    <rect x="176" y="80" width="8" height="8" fill="black"/>
    <rect x="80" y="96" width="8" height="8" fill="black"/>
    <rect x="112" y="96" width="8" height="8" fill="black"/>
    <rect x="144" y="96" width="8" height="8" fill="black"/>
    <rect x="176" y="96" width="8" height="8" fill="black"/>
    <rect x="80" y="112" width="8" height="8" fill="black"/>
    <rect x="96" y="112" width="8" height="8" fill="black"/>
    <rect x="128" y="112" width="8" height="8" fill="black"/>
    <rect x="160" y="112" width="8" height="8" fill="black"/>
    <rect x="80" y="128" width="8" height="8" fill="black"/>
    <rect x="112" y="128" width="8" height="8" fill="black"/>
    <rect x="144" y="128" width="8" height="8" fill="black"/>
    <rect x="176" y="128" width="8" height="8" fill="black"/>
    <rect x="80" y="144" width="8" height="8" fill="black"/>
    <rect x="96" y="144" width="8" height="8" fill="black"/>
    <rect x="128" y="144" width="8" height="8" fill="black"/>
    <rect x="80" y="160" width="8" height="8" fill="black"/>
    <rect x="96" y="160" width="8" height="8" fill="black"/>
    <rect x="112" y="160" width="8" height="8" fill="black"/>
    <rect x="128" y="160" width="8" height="8" fill="black"/>
    <rect x="144" y="160" width="8" height="8" fill="black"/>
    <rect x="80" y="176" width="8" height="8" fill="black"/>
    <rect x="112" y="176" width="8" height="8" fill="black"/>
    <rect x="160" y="176" width="8" height="8" fill="black"/>
    <rect x="176" y="176" width="8" height="8" fill="black"/>
    <!-- Center label -->
    <rect x="84" y="84" width="32" height="32" rx="4" fill="white"/>
    <text x="100" y="105" font-size="22" text-anchor="middle" fill="black" font-family="sans-serif">QR</text>
  </svg>`)

function DemoCheckoutInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const txnRef    = params.get('txnRef') ?? 'DEMO'
  const amount    = Number(params.get('amount') ?? 0)
  const orderInfo = params.get('orderInfo') ?? 'Gói dịch vụ'

  const [countdown, setCountdown] = useState(180) // 3 min demo timer
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  async function simulateSuccess() {
    setSimulating(true)
    // In demo mode: directly hit our callback with success code
    const res = await fetch(
      `/api/vnpay/callback?vnp_TxnRef=${txnRef}&vnp_ResponseCode=00&vnp_Amount=${amount * 100}&vnp_BankCode=DEMO&vnp_TransactionNo=DEMO${Date.now()}&vnp_SecureHash=demo`
    )
    const url = new URL(res.url)
    router.push(url.pathname + url.search)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6 text-center space-y-4">
        {/* Demo banner */}
        <Badge variant="secondary" className="mx-auto">
          DEMO MODE — VNPay chưa được cấu hình
        </Badge>

        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <QrCode className="h-4 w-4" />
          <span>Quét mã QR để thanh toán</span>
        </div>

        {/* Demo QR */}
        <div className="flex justify-center">
          <div className="rounded-xl border-2 border-border p-3 bg-white inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEMO_QR_DATA} alt="QR thanh toán demo" width={180} height={180} />
          </div>
        </div>

        <div>
          <p className="text-2xl font-bold tabular-nums">
            {amount.toLocaleString('vi-VN')}₫
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{decodeURIComponent(orderInfo)}</p>
          <p className="text-xs text-muted-foreground">Mã GD: {txnRef}</p>
        </div>

        {/* Countdown */}
        <div className="text-sm text-muted-foreground">
          QR hết hạn sau:{' '}
          <span className={countdown < 30 ? 'text-destructive font-semibold' : 'font-semibold'}>
            {formatTime(countdown)}
          </span>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            className="w-full gap-2"
            onClick={simulateSuccess}
            disabled={simulating}
          >
            {simulating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Giả lập thanh toán thành công</>
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/pricing')}>
            Huỷ
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Trong production, người dùng quét QR bằng app ngân hàng để thanh toán.
          Trang này chỉ xuất hiện khi VNPAY_TMN_CODE chưa được cấu hình.
        </p>
      </Card>
    </div>
  )
}

export default function DemoCheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <DemoCheckoutInner />
    </Suspense>
  )
}
