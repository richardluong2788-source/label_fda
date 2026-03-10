'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  User,
  FileText,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  ZoomIn,
  X,
  ImageOff,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { AppHeader } from '@/components/app-header'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { FDAComplianceIntelligence, FDAIntelligenceAnalysisCard, type AIAnalysis } from '@/components/fda-compliance-intelligence'
import type { LabelImageEntry } from '@/lib/types'

interface ViolationReview {
  violation_index: number
  confirmed: boolean
  wording_fix: string
  legal_note: string
  prevention_guide?: string // Only for source_type='recall' - prevention documentation guide
}

interface RecommendedAction {
  action: string
  priority: 'high' | 'medium' | 'low'
  cfr_reference: string
}

interface ExpertReviewWorkspaceProps {
  request: any
  report: any
  adminUser: any
  userEmail?: string
}

export function ExpertReviewWorkspace({
  request,
  report,
  adminUser,
  userEmail,
}: ExpertReviewWorkspaceProps) {
  const router = useRouter()
  const findings = report?.findings ?? []

  const [expertSummary, setExpertSummary] = useState(request.expert_summary ?? '')
  const [signOffName, setSignOffName] = useState(
    request.sign_off_name ?? adminUser?.display_name ?? adminUser?.email ?? ''
  )
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const labelImageUrl = report?.label_image_url ?? null
const [violationReviews, setViolationReviews] = useState<ViolationReview[]>(
  request.violation_reviews?.length
  ? request.violation_reviews
  : findings.map((f: any, i: number) => ({
  violation_index: i,
  confirmed: f.source_type !== 'recall', // Recall items default to not confirmed (they are market warnings, not violations)
  wording_fix: '',
  legal_note: '',
  prevention_guide: '',
  }))
  )
  const [recommendedActions, setRecommendedActions] = useState<RecommendedAction[]>(
    request.recommended_actions?.length
      ? request.recommended_actions
      : []
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiDrafting, setAiDrafting] = useState(false)
  const [aiDraftError, setAiDraftError] = useState<string | null>(null)
  const [aiDrafted, setAiDrafted] = useState(false)
  const [fdaAIAnalysis, setFdaAIAnalysis] = useState<AIAnalysis | null>(null)

  // -- AI Draft Assistant --
  const handleAIDraft = async () => {
    setAiDrafting(true)
    setAiDraftError(null)
    try {
      const res = await fetch('/api/admin/expert-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'AI draft failed')
      }

      const { draft } = await res.json()

      // Điền dữ liệu AI soạn vào form — admin chỉ cần chỉnh sửa
      // API trả về snake_case: expert_summary, violation_reviews, recommended_actions
      if (draft.expert_summary) setExpertSummary(draft.expert_summary)
      if (draft.violation_reviews?.length) {
        setViolationReviews(
          draft.violation_reviews.map((vr: any, i: number) => ({
            violation_index: vr.violation_index ?? i,
            confirmed: vr.confirmed ?? true,
            wording_fix: vr.wording_fix ?? '',
            legal_note: vr.legal_note ?? '',
            prevention_guide: vr.prevention_guide ?? '', // For recall items
          }))
        )
      }
      if (draft.recommended_actions?.length) {
        setRecommendedActions(
          draft.recommended_actions.map((ra: any) => ({
            action: ra.action ?? '',
            priority: ra.priority ?? 'medium',
            cfr_reference: ra.cfr_reference ?? '',
          }))
        )
      }
      setAiDrafted(true)
    } catch (err: any) {
      setAiDraftError(err.message)
    } finally {
      setAiDrafting(false)
    }
  }

  // -- Violation review helpers --
  const updateVR = (i: number, field: keyof ViolationReview, value: any) => {
    setViolationReviews((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  // -- Recommended actions helpers --
  const addAction = () => {
    setRecommendedActions((prev) => [
      ...prev,
      { action: '', priority: 'medium', cfr_reference: '' },
    ])
  }
  const updateRA = (i: number, field: keyof RecommendedAction, value: any) => {
    setRecommendedActions((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }
  const removeRA = (i: number) => {
    setRecommendedActions((prev) => prev.filter((_, idx) => idx !== i))
  }

  const isReadOnly = request.status === 'completed'

  const handleSubmit = async () => {
    setError(null)
    if (!expertSummary.trim()) {
      setError('Vui lòng nhập nhận xét tổng quan')
      return
    }
    if (!signOffName.trim()) {
      setError('Vui lòng nhập tên ký xác nhận')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/expert-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          action: 'complete',
          expertSummary,
          violationReviews,
          recommendedActions,
          signOffName,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gửi review thất bại')
      }

      router.push('/admin')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/admin/expert-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: request.id, action: 'assign' }),
      })
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const priorityConfig = {
    high:   { label: 'Gấp',        color: 'border-red-300 text-red-700' },
    medium: { label: 'Quan trọng', color: 'border-amber-300 text-amber-700' },
    low:    { label: 'Nên làm',    color: 'border-border text-muted-foreground' },
  }

  const isAdmin = ['admin', 'superadmin', 'expert'].includes(adminUser?.role ?? '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Dùng AppHeader để admin có thể điều hướng sang Phân tích / các trang khác */}
      <AppHeader email={userEmail ?? adminUser?.email} isAdmin={isAdmin} />

      {/* Breadcrumb / sub-header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Expert Queue
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h2 className="text-base font-bold">
                {report?.product_name || report?.file_name || 'Expert Review'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Request #{request.id.slice(0, 8)} — Gửi lúc{' '}
                {new Date(request.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {request.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={handleAssign} disabled={submitting}>
                Nhận việc n��y
              </Button>
            )}
            <Badge
              className={`text-xs border ${
                request.status === 'completed'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : request.status === 'in_review'
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}
            >
              {request.status === 'completed'
                ? 'Hoàn thành'
                : request.status === 'in_review'
                ? 'Đang review'
                : 'Chờ xử lý'}
            </Badge>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* ===== CỘT TRÁI: Thông tin request + từng vi phạm ===== */}
          <div className="space-y-6">
            {/* Context từ user */}
            <Card className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Thông tin từ khách hàng
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thị trường:</span>
                  <span className="font-medium">{request.target_market ?? 'US'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngành:</span>
                  <span className="font-medium">{report?.product_category ?? request.product_category ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Score:</span>
                  <span className="font-medium">{report?.overall_risk_score ?? '—'}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kết quả AI:</span>
                  <Badge variant={report?.overall_result === 'fail' ? 'destructive' : 'secondary'} className="text-xs">
                    {report?.overall_result?.toUpperCase() ?? '—'}
                  </Badge>
                </div>
                {request.user_context && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Ghi chú từ khách hàng:</p>
                    <p className="italic text-sm">"{request.user_context}"</p>
                  </div>
                )}
              </div>
            </Card>

            {/* FDA Compliance Intelligence - Full details for expert view */}
            <FDAComplianceIntelligence 
              report={report} 
              showFullDetails={true} 
              onAIAnalysisComplete={setFdaAIAnalysis}
            />

            {/* Ảnh nhãn sản phẩm - hiển thị tất cả ảnh */}
            <Card className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <ImageOff className="h-4 w-4 text-primary" />
                Nhãn sản phẩm {(report?.label_images as LabelImageEntry[])?.length > 1 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {(report?.label_images as LabelImageEntry[]).length} ảnh
                  </Badge>
                )}
              </h2>
              <LabelImageGallery
                images={(report?.label_images as LabelImageEntry[]) || []}
                fallbackUrl={labelImageUrl}
              />
            </Card>

            {/* Danh sách vi phạm — review từng cái */}
            <Card className="p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Vi phạm AI phát hiện ({findings.length})
              </h2>

              {findings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có vi phạm nào được ghi nhận.</p>
              ) : (
                <div className="space-y-4">
                  {findings.map((f: any, i: number) => {
                    const vr = violationReviews[i] ?? { violation_index: i, confirmed: true, wording_fix: '', legal_note: '' }
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border p-4 space-y-3 ${
                          f.severity === 'critical' ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/40'
                        }`}
                      >
                        {/* Header vi phạm */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {f.severity === 'critical' ? (
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            <span className="font-medium text-sm">{f.category}</span>
                          </div>
                          <Badge variant={f.severity === 'critical' ? 'destructive' : 'default'} className="text-xs shrink-0">
                            {f.severity === 'critical' ? 'Critical' : 'Warning'}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">{f.description}</p>

                        {f.suggested_fix && (
                          <div className="bg-blue-50 rounded p-2 text-xs text-blue-800">
                            <span className="font-medium">AI gợi ý: </span>
                            <ReactMarkdown 
                              className="inline prose prose-xs prose-blue max-w-none [&>p]:inline [&>p]:m-0 [&>strong]:font-semibold [&>em]:italic"
                              components={{
                                p: ({ children }) => <span>{children}</span>,
                              }}
                            >
                              {f.suggested_fix}
                            </ReactMarkdown>
                          </div>
                        )}

                        {f.regulation_reference && (
                          <p className="text-xs font-mono text-primary">{f.regulation_reference}</p>
                        )}

                        {/* AI confidence */}
                        {f.confidence_score !== undefined && (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">AI Confidence</span>
                              <span>{Math.round(f.confidence_score * 100)}%</span>
                            </div>
                            <Progress value={f.confidence_score * 100} className="h-1" />
                          </div>
                        )}

                        {/* Expert input */}
                        <div className="border-t pt-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Label className="text-xs">Xác nhận vi phạm?</Label>
                              <span 
                                className="text-[10px] text-muted-foreground cursor-help" 
                                title="Có: Vi phạm sẽ được ghi nhận trong báo cáo chính thức và ảnh hưởng đến đánh giá tuân thủ.&#10;Không: Vi phạm sẽ bị bỏ qua (false positive từ AI) và không xuất hiện trong báo cáo cuối."
                              >
                                (?)
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={vr.confirmed ? 'default' : 'outline'}
                                className="h-7 text-xs"
                                disabled={isReadOnly}
                                onClick={() => updateVR(i, 'confirmed', true)}
                                title="Xác nhận vi phạm này là đúng - sẽ xuất hiện trong báo cáo cuối"
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Có
                              </Button>
                              <Button
                                size="sm"
                                variant={!vr.confirmed ? 'destructive' : 'outline'}
                                className="h-7 text-xs"
                                disabled={isReadOnly}
                                onClick={() => updateVR(i, 'confirmed', false)}
                                title="Bác bỏ vi phạm này (AI nhận diện sai) - sẽ bị loại khỏi báo cáo"
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Không
                              </Button>
                            </div>
                          </div>

                          {vr.confirmed && (
                            <>
                              <div>
                                <Label className="text-xs mb-1 block flex items-center gap-1.5">
                                  Wording đề xuất sửa
                                  {aiDrafted && vr.wording_fix && (
                                    <span className="text-[10px] text-green-600 font-normal">(AI soạn)</span>
                                  )}
                                </Label>
                                <Textarea
                                  value={vr.wording_fix}
                                  onChange={(e) => updateVR(i, 'wording_fix', e.target.value)}
                                  placeholder={
                                    // Dynamic placeholder based on violation type
                                    f.category?.toLowerCase().includes('ingredient') 
                                      ? 'Ví dụ: Sắp xếp lại thứ tự thành phần theo trọng lượng giảm dần trong công thức sản xuất'
                                      : f.category?.toLowerCase().includes('allergen')
                                      ? 'Ví dụ: Thêm "Contains: Milk, Wheat, Soy" hoặc in đậm allergens trong danh sách thành phần'
                                      : f.category?.toLowerCase().includes('health') || f.category?.toLowerCase().includes('claim')
                                      ? 'Ví dụ: Thay "Boosts immunity" bằng "Contains Vitamin C which contributes to normal immune function"'
                                      : f.category?.toLowerCase().includes('net') || f.category?.toLowerCase().includes('weight')
                                      ? 'Ví dụ: "Net Wt 12 oz (340g)" - thêm đơn vị metric/imperial song song'
                                      : 'Ví dụ: Đề xuất văn bản chính xác cần sửa trên nhãn'
                                  }
                                  rows={2}
                                  className={`text-xs ${aiDrafted && vr.wording_fix ? 'border-green-300 bg-green-50/50' : ''}`}
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block flex items-center gap-1.5">
                                  Ghi chú pháp lý
                                  {aiDrafted && vr.legal_note && (
                                    <span className="text-[10px] text-green-600 font-normal">(AI soạn)</span>
                                  )}
                                </Label>
                                <Textarea
                                  value={vr.legal_note}
                                  onChange={(e) => updateVR(i, 'legal_note', e.target.value)}
                                  placeholder="Ví dụ: Theo 21 CFR 101.14, health claims phải được FDA authorize trước..."
                                  rows={2}
                                  className={`text-xs ${aiDrafted && vr.legal_note ? 'border-green-300 bg-green-50/50' : ''}`}
                                  disabled={isReadOnly}
                                />
                              </div>
                              {/* Prevention Guide - Only for recall items */}
                              {findings[i]?.source_type === 'recall' && (
                                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                  <Label className="text-xs mb-1 block flex items-center gap-1.5 text-amber-800">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Hướng dẫn chuẩn bị hồ sơ phòng ngừa
                                    {aiDrafted && vr.prevention_guide && (
                                      <span className="text-[10px] text-green-600 font-normal">(AI soạn)</span>
                                    )}
                                  </Label>
                                  <Textarea
                                    value={vr.prevention_guide || ''}
                                    onChange={(e) => updateVR(i, 'prevention_guide', e.target.value)}
                                    placeholder="Hướng dẫn phòng ngừa: Kiểm tra độ chính xác nhãn, quy trình QC, hồ sơ nguồn gốc nguyên liệu, kết quả kiểm nghiệm ATTP..."
                                    rows={3}
                                    className={`text-xs ${aiDrafted && vr.prevention_guide ? 'border-green-300 bg-green-50/50' : 'bg-white'}`}
                                    disabled={isReadOnly}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ===== CỘT PHẢI: AI Draft + Tổng quan + Recommended actions + Sign off ===== */}
          <div className="space-y-6">
            {/* AI Draft Assistant */}
            {!isReadOnly && (
              <Card className={`p-5 border-primary/30 ${aiDrafted ? 'bg-green-50 border-green-300' : 'bg-primary/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Sparkles className={`h-4 w-4 ${aiDrafted ? 'text-green-600' : 'text-primary'}`} />
                    AI Soạn thảo
                    {aiDrafted && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đã soạn xong
                      </Badge>
                    )}
                  </h2>
                  <Button
                    size="sm"
                    onClick={handleAIDraft}
                    disabled={aiDrafting || findings.length === 0}
                    variant={aiDrafted ? 'outline' : 'default'}
                  >
                    {aiDrafting ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Đang soạn...
                      </>
                    ) : aiDrafted ? (
                      <>
                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                        Soạn lại
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                        Soạn thảo tự động
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {aiDrafted 
                    ? 'AI đã soạn xong nội dung. Các trường được đánh dấu viền xanh là do AI tạo - hãy xem xét và chỉnh sửa nếu cần trước khi ký xác nhận.'
                    : 'AI sẽ soạn sẵn wording fix, legal notes, summary và recommended actions dựa trên vi phạm. Bạn chỉ cần đọc lại, chỉnh sửa và ký off.'
                  }
                </p>
                {aiDraftError && (
                  <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded p-2 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {aiDraftError}
                  </div>
                )}
              </Card>
            )}

            {/* Expert Summary */}
            <Card className={`p-5 ${aiDrafted && expertSummary ? 'ring-2 ring-green-300 ring-offset-1' : ''}`}>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Nhận xét tổng quan của chuyên gia
                {aiDrafted && expertSummary && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    AI đã soạn
                  </Badge>
                )}
              </h2>
              <Textarea
                value={expertSummary}
                onChange={(e) => {
                  setExpertSummary(e.target.value)
                }}
                placeholder="Viết đánh giá tổng thể về mức độ tuân thủ, rủi ro pháp lý, và hướng khắc phục chính..."
                rows={6}
                className={`text-sm ${aiDrafted && expertSummary ? 'border-green-300 bg-green-50/30' : ''}`}
                disabled={isReadOnly}
              />
            </Card>

            {/* Recommended Actions */}
            <Card className={`p-5 ${aiDrafted && recommendedActions.length > 0 ? 'ring-2 ring-green-300 ring-offset-1' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Hành động ưu tiên
                  {aiDrafted && recommendedActions.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      AI đã soạn
                    </Badge>
                  )}
                </h2>
                {!isReadOnly && (
                  <Button size="sm" variant="outline" onClick={addAction}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Thêm
                  </Button>
                )}
              </div>

              {recommendedActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có hành động nào. Bấm "Thêm" để thêm.</p>
              ) : (
                <div className="space-y-3">
                  {recommendedActions.map((ra, i) => (
                    <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={ra.priority}
                          onChange={(e) => updateRA(i, 'priority', e.target.value)}
                          className={`px-2 py-1 rounded border text-xs font-medium ${priorityConfig[ra.priority].color}`}
                          disabled={isReadOnly}
                        >
                          <option value="high">Gấp</option>
                          <option value="medium">Quan trọng</option>
                          <option value="low">Nên làm</option>
                        </select>
                        {!isReadOnly && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeRA(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        value={ra.action}
                        onChange={(e) => updateRA(i, 'action', e.target.value)}
                        placeholder="Mô tả hành động cần thực hiện..."
                        rows={2}
                        className="text-xs"
                        disabled={isReadOnly}
                      />
                      <input
                        type="text"
                        value={ra.cfr_reference}
                        onChange={(e) => updateRA(i, 'cfr_reference', e.target.value)}
                        placeholder="CFR Reference (vd: 21 CFR 101.9)"
                        className="w-full px-2 py-1.5 border rounded text-xs font-mono"
                        disabled={isReadOnly}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* FDA Intelligence AI Analysis - displayed after Hành động ưu tiên */}
            {fdaAIAnalysis && (
              <FDAIntelligenceAnalysisCard analysis={fdaAIAnalysis} />
            )}

            {/* Sign Off */}
            {!isReadOnly && (
              <Card className="p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Ký xác nhận
                </h2>
                <div className="mb-4">
                  <Label className="text-xs mb-1 block">Tên chuyên gia ký</Label>
                  <input
                    type="text"
                    value={signOffName}
                    onChange={(e) => setSignOffName(e.target.value)}
                    placeholder="Họ tên đầy đủ + chức danh"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {error && (
                  <div className="mb-4 text-sm text-destructive bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {submitting ? 'Đang lưu...' : 'Hoàn thành & Ký xác nhận'}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Báo cáo sẽ chuyển sang trạng thái "Verified" và user nhận thông báo
                </p>
              </Card>
            )}

            {/* Completed sign-off display */}
            {isReadOnly && request.sign_off_name && (
              <Card className="p-5 bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">Đã ký xác nhận</p>
                    <p className="text-sm text-green-700">
                      {request.sign_off_name}
                    </p>
                    <p className="text-xs text-green-600">
                      {new Date(request.sign_off_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {lightboxOpen && labelImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-1 text-sm"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
              Đóng
            </button>
            <img
              src={labelImageUrl}
              alt="Nhãn sản phẩm phóng to"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
