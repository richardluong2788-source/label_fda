'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Lock,
  Check,
  Shield,
  FileText,
  Zap,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { AuditReport } from '@/lib/types'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [params.id])

  async function loadReport() {
    try {
      const res = await fetch(`/api/audit/${params.id}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      const r = data.report || data

      // Nếu đã có subscription active, redirect thẳng vào báo cáo
      if (r.report_unlocked === true || r.payment_status === 'paid') {
        router.replace(`/audit/${params.id}`)
        return
      }

      setReport(r)
    } catch (error) {
      console.error('[v0] Load report error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">Không tìm thấy báo cáo</h2>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  const violationCount  = report.violations?.length || 0
  const criticalCount   = report.violations?.filter((v) => v.severity === 'critical').length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <span className="text-sm text-muted-foreground">
            Mở khóa báo cáo — {report.product_name || 'Chưa có tên sản phẩm'}
          </span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4">
            <Lock className="mr-1 h-3 w-3" />
            Báo cáo chưa được mở khóa
          </Badge>
          <h1 className="text-3xl font-bold mb-3 text-balance">
            Đăng ký gói để xem toàn bộ kết quả
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Báo cáo phân tích FDA đầy đủ của bạn đã sẵn sàng. Chọn gói phù hợp để mở khóa
            ngay — không tính phí từng báo cáo riêng lẻ.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Tóm tắt báo cáo */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Tóm tắt kết quả phân tích</h2>
            </div>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng vi phạm phát hiện</span>
                <span className="font-semibold">{violationCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vi phạm nghiêm trọng</span>
                <span className="font-semibold text-destructive">{criticalCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Điểm rủi ro</span>
                <span className="font-semibold">
                  {report.overall_risk_score?.toFixed(1) ?? 'N/A'} / 10
                </span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium mb-2">Báo cáo đầy đủ bao gồm:</p>
              {[
                'Phân tích chi tiết từng vi phạm',
                'Trích dẫn CFR chính xác từ FDA',
                'Hướng dẫn khắc phục từng bước',
                'So sánh Warning Letters FDA thực tế',
                'Tải xuống PDF báo cáo chuyên nghiệp',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* CTA chọn gói */}
          <div className="space-y-4">
            <Card className="p-6 border-2 border-primary">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Chọn gói để mở khóa</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Không tính phí từng báo cáo. Một gói subscription mở khóa tất cả báo cáo trong
                chu kỳ thanh toán của bạn.
              </p>
              <Button size="lg" className="w-full gap-2" asChild>
                <a href="/pricing">
                  Xem các gói và thanh toán
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                <Lock className="h-3 w-3 inline mr-1" />
                Thanh toán bảo mật qua VNPay — quét QR ngân hàng
              </p>
            </Card>

            {/* Upsell tư vấn chuyên gia */}
            <Card className="p-4 border-amber-200 bg-amber-50/50">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-1">Cần tư vấn chuyên gia?</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Gói Pro trở lên bao gồm review chuyên sâu từ đội ngũ FDA compliance.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/pricing">Xem gói Pro</a>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Trust strip */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            <div>
              <Shield className="h-7 w-7 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Thanh toán bảo mật</p>
              <p className="text-xs text-muted-foreground">VNPay / QR ngân hàng</p>
            </div>
            <div>
              <FileText className="h-7 w-7 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Truy cập ngay</p>
              <p className="text-xs text-muted-foreground">Sau khi thanh toán</p>
            </div>
            <div>
              <Check className="h-7 w-7 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Không ràng buộc</p>
              <p className="text-xs text-muted-foreground">Hủy bất cứ lúc nào</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
