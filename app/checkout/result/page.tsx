'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function ResultInner() {
  const params  = useSearchParams()
  const status  = params.get('status')
  const message = decodeURIComponent(params.get('message') ?? '')
  const bank    = params.get('bank')
  const txnRef  = params.get('txnRef')

  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-5">
        {isSuccess ? (
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
        ) : (
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
        )}

        <div>
          <h1 className="text-2xl font-bold mb-2">
            {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
          </h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {isSuccess && (
          <div className="bg-muted rounded-lg px-4 py-3 text-sm text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mã giao dịch</span>
              <span className="font-mono font-medium">{txnRef}</span>
            </div>
            {bank && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngân hàng</span>
                <span className="font-medium">{bank}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trạng thái gói</span>
              <span className="font-medium text-green-700">Đã kích hoạt</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {isSuccess ? (
            <>
              <Button asChild>
                <Link href="/dashboard">Vào Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings?tab=billing">Xem thông tin gói</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link href="/pricing">Thử lại</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Về Dashboard</Link>
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ResultInner />
    </Suspense>
  )
}
