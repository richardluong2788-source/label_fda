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
  const type    = params.get('type')
  const reportId = params.get('reportId')

  const isSuccess       = status === 'success'
  const isAddonPurchase = type === 'addon_expert_review'
  const isSingleReport  = type === 'single_report'

  const successTitle = isAddonPurchase
    ? 'Expert Review đã được yêu cầu!'
    : isSingleReport
    ? 'Báo cáo đã được mở khóa!'
    : 'Thanh toán thành công!'

  const successSubtitle = isAddonPurchase
    ? 'Yêu cầu của bạn đã được gửi. Chuyên gia sẽ xem xét trong vòng 48 giờ.'
    : isSingleReport
    ? 'Bạn có thể xem đầy đủ báo cáo kiểm tra ngay bây giờ.'
    : message

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
            {isSuccess ? successTitle : 'Thanh toán thất bại'}
          </h1>
          <p className="text-muted-foreground">
            {isSuccess ? successSubtitle : message}
          </p>
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
              <span className="text-muted-foreground">
                {isAddonPurchase ? 'Loại giao dịch' : isSingleReport ? 'Loại giao dịch' : 'Trạng thái gói'}
              </span>
              <span className="font-medium text-green-700">
                {isAddonPurchase
                  ? 'Expert Review (Mua lẻ)'
                  : isSingleReport
                  ? 'Mở khóa báo cáo'
                  : 'Đã kích hoạt'}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {isSuccess ? (
            isAddonPurchase || isSingleReport ? (
              <>
                <Button asChild>
                  <Link href={reportId ? `/audit/${reportId}` : '/history'}>
                    {reportId ? 'Xem báo cáo' : 'Xem lịch sử'}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Về Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/dashboard">Vào Dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings?tab=billing">Xem thông tin gói</Link>
                </Button>
              </>
            )
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
