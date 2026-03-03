'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  MessageCircle,
  CheckCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

interface ExpertRequestPanelProps {
  reportId: string
  productName?: string
  productCategory?: string
  overallResult?: string
  needsExpertReview?: boolean
  planName?: string               // Tên gói hiện tại
  expertReviewsIncluded?: boolean // true = Pro/Enterprise
  expertReviewPrice?: number      // Giá lẻ VND — nếu không truyền sẽ fetch từ DB
}

type RequestStatus = 'idle' | 'pending' | 'in_review' | 'completed' | 'cancelled'

interface ExpertRequest {
  id: string
  status: RequestStatus
  created_at: string
  expert_summary?: string
  violation_reviews?: Array<{
    violation_index: number
    confirmed: boolean
    wording_fix?: string
    legal_note?: string
  }>
  recommended_actions?: Array<{
    action: string
    priority: string
    cfr_reference?: string
  }>
  sign_off_name?: string
  sign_off_at?: string
}

export function ExpertRequestPanel({
  reportId,
  productName,
  productCategory,
  overallResult,
  needsExpertReview,
  planName = 'Free Trial',
  expertReviewsIncluded = false,
  expertReviewPrice: expertReviewPriceProp,
}: ExpertRequestPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [existingRequest, setExistingRequest] = useState<ExpertRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userContext, setUserContext] = useState('')
  const [targetMarket, setTargetMarket] = useState('US')
  const [error, setError] = useState<string | null>(null)
  // Giá tư vấn lẻ — ưu tiên prop, fallback fetch từ API
  const [expertReviewPrice, setExpertReviewPrice] = useState<number>(expertReviewPriceProp ?? 499000)

  // Tự động mở panel nếu AI flag needs_expert_review
  useEffect(() => {
    if (needsExpertReview) setExpanded(true)
  }, [needsExpertReview])

  // Fetch giá tư vấn lẻ từ plan của user (nếu chưa được truyền qua prop)
  useEffect(() => {
    if (expertReviewPriceProp !== undefined) return // đã có prop, không fetch
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/expert-request/price')
        const data = await res.json()
        if (typeof data.expert_review_price_vnd === 'number') {
          setExpertReviewPrice(data.expert_review_price_vnd)
        }
      } catch {
        // giữ default 499000
      }
    }
    fetchPrice()
  }, [expertReviewPriceProp])

  // Lấy request hiện tại nếu đã gửi
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await fetch(`/api/expert-request?reportId=${reportId}`)
        const data = await res.json()
        if (data.request) setExistingRequest(data.request)
      } catch {
        // bỏ qua lỗi fetch
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [reportId])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/expert-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          userContext: userContext.trim() || null,
          targetMarket,
          productCategory,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        // Đã có request pending — refresh lại
        const refresh = await fetch(`/api/expert-request?reportId=${reportId}`)
        const refreshData = await refresh.json()
        if (refreshData.request) setExistingRequest(refreshData.request)
        return
      }

      if (res.status === 402) {
        setError(
          data.reason === 'no_active_subscription'
            ? 'Bạn cần đăng ký gói để sử dụng dịch vụ tư vấn chuyên gia.'
            : `Bạn đã dùng hết ${data.reviews_used}/${data.reviews_limit} lượt tư vấn trong tháng. Nâng cấp gói để tiếp tục.`
        )
        return
      }

      if (!res.ok) throw new Error(data.error || 'Gửi yêu cầu thất bại')

      setExistingRequest(data.request)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending:   { label: 'Đang chờ chuyên gia',   color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock },
    in_review: { label: 'Chuyên gia đang review', color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Loader2 },
    completed: { label: 'Đã có kết quả',          color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
    cancelled: { label: 'Đã huỷ',                 color: 'bg-muted text-muted-foreground border-border',  icon: AlertTriangle },
  }

  if (loading) return null

  // Nếu đã có request — hiển thị trạng thái
  if (existingRequest) {
    const cfg = statusConfig[existingRequest.status] ?? statusConfig.pending
    const StatusIcon = cfg.icon

    return (
      <Card className="border-2 border-primary/20">
        <div
          className="flex items-center justify-between p-5 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Tư vấn chuyên gia Vexim</p>
              <p className="text-xs text-muted-foreground">
                Yêu cầu gửi lúc {new Date(existingRequest.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs border ${cfg.color}`}>
              <StatusIcon className={`mr-1 h-3 w-3 ${existingRequest.status === 'in_review' ? 'animate-spin' : ''}`} />
              {cfg.label}
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Kết quả review từ chuyên gia */}
        {expanded && existingRequest.status === 'completed' && (
          <div className="px-5 pb-5 space-y-4 border-t pt-4">
            {/* Expert Summary */}
            {existingRequest.expert_summary && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Nhận xét tổng quan từ chuyên gia
                </p>
                <div className="bg-primary/5 rounded-lg p-4 text-sm leading-relaxed">
                  {existingRequest.expert_summary}
                </div>
              </div>
            )}

            {/* Violation Reviews — wording fix từng lỗi */}
            {existingRequest.violation_reviews && existingRequest.violation_reviews.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Hướng dẫn sửa từng vi phạm
                </p>
                <div className="space-y-3">
                  {existingRequest.violation_reviews.map((vr, i) => (
                    <div key={i} className={`rounded-lg p-3 text-sm border ${vr.confirmed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {vr.confirmed
                          ? <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          : <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        }
                        <span className="font-medium">
                          Vi phạm #{vr.violation_index + 1} — {vr.confirmed ? 'Xác nhận cần sửa' : 'Không nghiêm trọng'}
                        </span>
                      </div>
                      {vr.wording_fix && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">Wording đề xuất:</span>
                          <p className="mt-1 font-medium text-foreground bg-white rounded px-2 py-1 border">
                            {vr.wording_fix}
                          </p>
                        </div>
                      )}
                      {vr.legal_note && (
                        <p className="mt-2 text-xs text-muted-foreground italic">{vr.legal_note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {existingRequest.recommended_actions && existingRequest.recommended_actions.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Hành động ưu tiên
                </p>
                <div className="space-y-2">
                  {existingRequest.recommended_actions.map((ra, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className={`shrink-0 text-xs ${ra.priority === 'high' ? 'border-red-300 text-red-700' : ra.priority === 'medium' ? 'border-amber-300 text-amber-700' : 'border-border'}`}>
                        {ra.priority === 'high' ? 'Gấp' : ra.priority === 'medium' ? 'Quan trọng' : 'Nên làm'}
                      </Badge>
                      <span>{ra.action}</span>
                      {ra.cfr_reference && <span className="text-xs text-muted-foreground ml-auto shrink-0">({ra.cfr_reference})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sign off */}
            {existingRequest.sign_off_name && (
              <div className="border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Ký xác nhận bởi <span className="font-medium text-foreground">{existingRequest.sign_off_name}</span></span>
                <span>•</span>
                <span>{new Date(existingRequest.sign_off_at!).toLocaleString('vi-VN')}</span>
              </div>
            )}
          </div>
        )}

        {/* Trạng thái đang chờ */}
        {expanded && existingRequest.status === 'pending' && (
          <div className="px-5 pb-5 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Yêu cầu của bạn đã được ghi nhận. Chuyên gia Vexim sẽ phản hồi trong vòng <span className="font-medium text-foreground">48 giờ làm việc</span>.
            </p>
          </div>
        )}

        {expanded && existingRequest.status === 'in_review' && (
          <div className="px-5 pb-5 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Chuyên gia Vexim đang xem xét báo cáo của bạn. Kết quả sẽ có trong thời gian sớm nhất.
            </p>
          </div>
        )}
      </Card>
    )
  }

  // Chưa có request — hiển thị form gửi yêu cầu
  const isHighRisk = overallResult === 'fail' || needsExpertReview

  return (
    <Card className={`border-2 ${isHighRisk ? 'border-amber-300' : 'border-slate-200'}`}>
      {/* Question Banner */}
      <div className={`p-4 rounded-t-lg ${isHighRisk ? 'bg-amber-50 border-b border-amber-200' : 'bg-slate-50 border-b border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2.5 ${isHighRisk ? 'bg-amber-100' : 'bg-blue-100'}`}>
            <MessageCircle className={`h-5 w-5 ${isHighRisk ? 'text-amber-600' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <p className={`font-bold text-base ${isHighRisk ? 'text-amber-800' : 'text-slate-800'}`}>
              Bạn có cần hỗ trợ từ chuyên gia Vexim không?
            </p>
            <p className="text-sm text-slate-600 mt-0.5">
              {isHighRisk
                ? 'AI phát hiện một số điểm cần chuyên gia xem xét kỹ hơn để đảm bảo tuân thủ FDA.'
                : 'Chuyên gia sẽ giúp bạn hiểu rõ hơn về kết quả và tối ưu hóa nhãn sản phẩm.'}
            </p>
          </div>
        </div>
      </div>
      
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-sm text-slate-700">Tư vấn chuyên gia Vexim</p>
            <p className="text-xs text-muted-foreground">
              Nhận hướng dẫn sửa chi tiết + wording chính xác từ chuyên gia pháp lý FDA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!expertReviewsIncluded && expertReviewPrice > 0 && (
            <Badge variant="outline" className="text-xs">
              {expertReviewPrice.toLocaleString('vi-VN')}₫/lần
            </Badge>
          )}
          {expertReviewsIncluded && (
            <Badge className="text-xs bg-primary text-primary-foreground">Miễn phí trong gói</Badge>
          )}
          {needsExpertReview && (
            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 border">Khuyến nghị</Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t pt-4 space-y-4">
          {/* Mô tả dịch vụ */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              'Phân tích bối cảnh sản phẩm cụ thể',
              'Viết hướng dẫn sửa chi tiết',
              'Đề xuất wording chính xác',
              'Xác nhận sau khi sửa',
              'Ký tên & đóng dấu xác nhận',
              'SLA: phản hồi trong 48h',
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {/* Thị trường mục tiêu */}
          <div>
            <Label className="text-xs mb-1 block">Thị trường mục tiêu</Label>
            <select
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="US">Hoa Kỳ (FDA)</option>
              <option value="EU">Liên minh châu Âu</option>
              <option value="CA">Canada</option>
              <option value="AU">Úc</option>
            </select>
          </div>

          {/* Context tùy chọn */}
          <div>
            <Label className="text-xs mb-1 block">
              Thông tin bổ sung <span className="text-muted-foreground">(tùy chọn)</span>
            </Label>
            <Textarea
              placeholder="Ví dụ: Sản phẩm của tôi là thực phẩm chức năng cho người cao tuổi, dự kiến bán trên Amazon US..."
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
              {(error.includes('Nâng cấp') || error.includes('đăng ký gói')) && (
                <a href="/pricing?highlight=business#subscription-plans" className="ml-auto shrink-0 underline font-medium">
                  Xem bảng giá
                </a>
              )}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            {submitting
              ? 'Đang gửi...'
              : expertReviewsIncluded
              ? 'Gửi yêu cầu tư vấn (Miễn phí trong gói)'
              : expertReviewPrice > 0
              ? `Gửi yêu cầu tư vấn — ${expertReviewPrice.toLocaleString('vi-VN')}₫`
              : 'Gửi yêu cầu tư vấn'}
          </Button>

          {!expertReviewsIncluded && (
            <p className="text-xs text-center text-muted-foreground">
              Gói Business/Pro có lượt Expert Review miễn phí.{' '}
              <a href="/pricing?highlight=business#subscription-plans" className="text-primary underline font-medium">
                Xem bảng giá
              </a>
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
