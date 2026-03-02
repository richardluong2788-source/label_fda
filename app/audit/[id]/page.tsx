'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Loader2,
  FileText,
  History,
  Download,
  Share2,
  MessageCircle,
  Search,
  ScanLine,
  Database,
  Shield,
  FileSearch,
  Sparkles,
  Settings,
  Globe,
  Languages,
  Package,
  Ruler,
  Ship,
  ExternalLink,
  TrendingDown,
  Lightbulb,
  Activity,
  Palette,
  Mail,
  RotateCcw,
} from 'lucide-react'
import type { AuditReport, Violation, LabelImageEntry } from '@/lib/types'
import { LabelPreview } from '@/components/label-preview'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { getLabelConfig } from '@/lib/label-field-config'
import { mapNutrientToFieldKey } from '@/lib/utils' // Import the missing function
import { ExpertRequestPanel } from '@/components/expert-request-panel'

// Enhanced Analysis Steps with detailed info
const ANALYSIS_STEPS = [
  {
    id: 'vision',
    title: 'Phân tích hình ảnh bằng GPT-4 Vision',
    description: 'Đang quét và trích xuất văn bản, màu sắc, kích thước chữ, và layout từ nhãn...',
    icon: ScanLine,
    progress: 15,
    details: ['Optical Character Recognition (OCR)', 'Phát hiện Nutrition Facts panel', 'Đo lường kích thước chữ', 'Phân tích màu sắc và contrast'],
  },
  {
    id: 'fda_search',
    title: 'Tra cứu FDA Regulations (Knowledge Base)',
    description: 'Đang tìm kiếm quy định FDA trong Knowledge Base với RAG AI (Độ tương đồng 99%)...',
    icon: Database,
    progress: 35,
    details: ['21 CFR Phần 101 - Nhãn dinh dưỡng', 'FALCPA - Luật chất gây dị ứng', 'Quy định về Health Claims', 'Yêu cầu liệt kê thành phần'],
  },
  {
    id: 'geometry',
    title: 'Kiểm tra hình học và kích thước',
    description: 'Đang xác minh kích thước panel, font size, và spacing theo quy định FDA...',
    icon: FileSearch,
    progress: 55,
    details: ['Tính diện tích Principal Display Panel', 'Kiểm tra minimum font size', 'Xác minh spacing và margins', 'Đo lường hairlines'],
  },
  {
    id: 'allergen',
    title: 'Phân tích chất gây dị ứng (Allergens)',
    description: 'Đang kiểm tra khai báo allergen theo FALCPA Section 203...',
    icon: Shield,
    progress: 70,
    details: ['Milk, Eggs, Fish, Shellfish', 'Tree nuts, Peanuts, Wheat, Soybeans', 'Kiểm tra "Contains:" statement', 'Xác minh bold formatting'],
  },
  {
    id: 'nutrition',
    title: 'Xác thực Nutrition Facts',
    description: 'Đang kiểm tra format, rounding, và thứ tự nutrients...',
    icon: FileText,
    progress: 85,
    details: ['Tuân thủ khẩu phần (Serving size)', 'Khai báo Calorie', 'Quy tắc làm tròn chất dinh dưỡng', 'Tỷ lệ Giá trị Hằng ngày (% DV)'],
  },
  {
    id: 'mapping',
    title: 'Ánh xạ vi phạm với trích dẫn CFR',
    description: 'Đang tạo báo cáo thương mại với trích dẫn chính xác từ FDA...',
    icon: Sparkles,
    progress: 95,
    details: ['Định dạng trích dẫn thông minh', 'Ánh xạ vi phạm → CFR', 'Tạo báo cáo thương mại', 'Khuyến nghị chuyên gia'],
  },
]

export default function AuditPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [scanPosition, setScanPosition] = useState(0)
  const [scanDirection, setScanDirection] = useState<'down' | 'up'>('down')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [quotaError, setQuotaError] = useState<{
    message: string
    plan_name: string
    reports_used: number
    reports_limit: number
  } | null>(null)
  const [kbError, setKbError] = useState<{
    message: string
    totalDocuments: number
  } | null>(null)

  const handleDownloadPdf = async () => {
    if (!params.id) return
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/audit/${params.id}/pdf`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Không thể tạo file báo cáo')
      }
      // PDF route trả về HTML inline — mở tab mới để user in/lưu PDF
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url  = URL.createObjectURL(blob)
      const win  = window.open(url, '_blank')
      if (win) win.focus()
      // Giải phóng object URL sau 60s
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: any) {
      console.error('[v0] PDF download error:', err)
      alert(err.message || 'Không thể tải báo cáo. Vui lòng thử lại.')
    } finally {
      setPdfLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [params.id])

  // Scanning animation effect - bidirectional smooth animation
  useEffect(() => {
    if (analyzing) {
      const interval = setInterval(() => {
        setScanPosition((prev) => {
          if (scanDirection === 'down') {
            if (prev >= 100) {
              setScanDirection('up')
              return 100
            }
            return prev + 1.5
          } else {
            if (prev <= 0) {
              setScanDirection('down')
              return 0
            }
            return prev - 1.5
          }
        })
      }, 25)
      return () => clearInterval(interval)
    }
  }, [analyzing, scanDirection])

  const loadReport = async () => {
    try {
      const res = await fetch(`/api/audit/${params.id}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()

      const report = data.report || data

      // Gate check: chỉ block khi báo cáo đã hoàn thành nhưng chưa được unlock.
      // Báo cáo đang pending (status === 'pending') luôn cho phép vào để chạy phân tích.
      // Báo cáo được coi là accessible nếu:
      //   (a) report_unlocked = true  — đã được unlock sau VNPay callback, HOẶC
      //   (b) payment_status = 'paid' — flag cũ, backward-compatible, HOẶC
      //   (c) status = 'pending'       — đang phân tích, chưa cần unlock
      if (report && report.status !== 'pending' && report.status !== 'kb_unavailable') {
        const isUnlocked =
          report.report_unlocked === true ||
          report.payment_status === 'paid'

        if (!isUnlocked) {
          router.push(`/audit/${params.id}/preview`)
          return
        }
      }

      setReport(data)

      // If KB was unavailable previously, show the KB error screen so user can retry
      if (data.status === 'kb_unavailable') {
        setKbError({
          message: 'Knowledge Base chua co du lieu khi lan phan tich truoc. Vui long thu lai sau khi Admin da nap tai lieu.',
          totalDocuments: 0,
        })
        return
      }

      if (data.status === 'pending') {
        startAnalysis()
      }
    } catch (error) {
      console.error('[v0] Load report error:', error)
    } finally {
      setLoading(false)
    }
  }

  const startAnalysis = async () => {
    setAnalyzing(true)
    setCurrentStepIndex(0)

    // Simulate progress through steps
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < ANALYSIS_STEPS.length - 1) {
          setProgress(ANALYSIS_STEPS[prev + 1].progress)
          return prev + 1
        }
        return prev
      })
    }, 3000)

    try {
      // Call actual analysis API
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: params.id }),
      })

      if (res.status === 402) {
        // Hết quota — parse chi tiết lỗi và hiển thị cho user
        const errData = await res.json().catch(() => ({}))
        clearInterval(stepInterval)
        setAnalyzing(false)
        setLoading(false)
        setQuotaError({
          message:       errData.message || 'Bạn đã dùng hết lượt phân tích trong tháng này.',
          plan_name:     errData.quota?.plan_name || 'Free',
          reports_used:  errData.quota?.reports_used ?? 0,
          reports_limit: errData.quota?.reports_limit ?? 0,
        })
        return
      }

      if (res.status === 503) {
        // Knowledge Base trống — không thể phân tích
        const errData = await res.json().catch(() => ({}))
        if (errData.error === 'knowledge_base_empty') {
          clearInterval(stepInterval)
          setAnalyzing(false)
          setLoading(false)
          setKbError({
            message: errData.message || 'Knowledge Base chưa có dữ liệu. Vui lòng liên hệ Admin.',
            totalDocuments: errData.kbStatus?.totalDocuments ?? 0,
          })
          return
        }
      }

      if (!res.ok) throw new Error('Analysis failed')

      // Complete progress
      setProgress(100)
      clearInterval(stepInterval)

      // Wait a moment then reload
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await loadReport()
    } catch (error) {
      console.error('[v0] Analysis error:', error)
      clearInterval(stepInterval)
    } finally {
      setAnalyzing(false)
    }
  }

  // Quota exceeded — hiển thị trang riêng thay vì blank/crash
  if (quotaError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Đã hết lượt phân tích</h2>
          <p className="text-muted-foreground mb-4">{quotaError.message}</p>
          <div className="bg-muted rounded-lg p-4 mb-6 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gói hiện tại</span>
              <span className="font-semibold">{quotaError.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Đã dùng tháng này</span>
              <span className="font-semibold">
                {quotaError.reports_used} / {quotaError.reports_limit} lượt
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <a href="/pricing">Nâng cấp gói ngay</a>
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại Dashboard
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Knowledge Base empty — hiển thị trang thông báo KB chưa sẵn sàng
  if (kbError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-8 max-w-lg w-full text-center">
          <Database className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Knowledge Base chua san sang</h2>
          <p className="text-muted-foreground mb-4">{kbError.message}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <p className="font-medium text-amber-900">Tai sao khong the phan tich?</p>
            <ul className="list-disc list-inside text-amber-800 space-y-1">
              <li>He thong can du lieu FDA regulations, Warning Letters va Recalls de phan tich chinh xac.</li>
              <li>Hien tai co <strong>{kbError.totalDocuments}</strong> tai lieu trong Knowledge Base.</li>
              <li>Can it nhat 1 tai lieu duoc nap vao de bat dau phan tich.</li>
            </ul>
          </div>
          <div className="bg-muted rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <p className="font-medium">Cach khac phuc:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Lien he Admin de nap tai lieu FDA vao Knowledge Base.</li>
              <li>Truy cap trang <strong>Knowledge Base</strong> va su dung chuc nang &quot;Nap tai lieu moi&quot; hoac &quot;FDA Warning Letters Pipeline&quot;.</li>
              <li>Sau khi nap xong, quay lai day de chay phan tich.</li>
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={async () => {
              setKbError(null)
              // Reset report status to pending so analysis can re-run
              try {
                await fetch(`/api/audit/${params.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'pending' }),
                })
              } catch {}
              startAnalysis()
            }}>
              Thu lai phan tich
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lai Dashboard
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải báo cáo...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Không tìm thấy báo cáo</h2>
          <p className="text-muted-foreground mb-4">Báo cáo này không tồn tại hoặc đã bị xóa</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // Analysis in progress view
  if (analyzing || report.status === 'pending') {
    const currentStep = ANALYSIS_STEPS[currentStepIndex]
    const StepIcon = currentStep.icon

    return (
      <div className="flex-1">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Badge variant="outline" className="font-mono">
              Report ID: {String(params.id).slice(0, 8)}
            </Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Label Preview with Scanning Animation */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-primary" />
                {report.label_image_url === 'manual-entry' ? 'Xem trước Nhãn' : 'Hình ảnh Nhãn'}
                {report.label_images && report.label_images.length > 1 && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {report.label_images.length} hinh anh
                  </Badge>
                )}
              </h2>
              {report.label_image_url === 'manual-entry' ? (
                <div className="relative rounded-lg overflow-hidden bg-slate-100 p-4 flex items-center justify-center">
                  {report.form_data && report.product_category ? (
                    <LabelPreview
                      config={getLabelConfig(report.product_category)}
                      formData={report.form_data}
                    />
                  ) : (
                    <div className="text-muted-foreground">Không có dữ liệu dinh dưỡng</div>
                  )}
                </div>
              ) : (
                <LabelImageGallery
                  images={(report.label_images as LabelImageEntry[]) || []}
                  fallbackUrl={report.label_image_url}
                  scanning={analyzing}
                  scanPosition={scanPosition}
                  autoRotate={analyzing}
                  autoRotateInterval={5000}
                />
              )}

              {/* Advanced Settings Summary (if any were configured) */}
              {(report.target_market || report.packaging_format || report.product_type || report.pdp_dimensions) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Cau hinh phan tich</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {report.target_market && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Globe className="h-3 w-3" />
                        {report.target_market}
                      </Badge>
                    )}
                    {report.label_language && report.label_language.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Languages className="h-3 w-3" />
                        {report.label_language.join(', ').toUpperCase()}
                      </Badge>
                    )}
                    {report.packaging_format && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Package className="h-3 w-3" />
                        {report.packaging_format.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {report.product_type && (
                      <Badge variant="outline" className="text-xs gap-1">
                        {report.product_type}
                      </Badge>
                    )}
                    {report.pdp_dimensions && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Ruler className="h-3 w-3" />
                        {report.pdp_dimensions.width} x {report.pdp_dimensions.height} {report.pdp_dimensions.unit}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Analysis Progress */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Tiến trình phân tích</h2>
                  <Badge variant="secondary">{progress}%</Badge>
                </div>
                <Progress value={progress} className="h-2 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Bước {currentStepIndex + 1} / {ANALYSIS_STEPS.length}
                </p>
              </Card>

              {/* Current Step Details */}
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3 shrink-0">
                    <StepIcon className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-2">{currentStep.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{currentStep.description}</p>
                    <div className="space-y-2">
                      {currentStep.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* All Steps Timeline */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Quy trình phân tích FDA</h3>
                <div className="space-y-3">
                  {ANALYSIS_STEPS.map((step, idx) => {
                    const Icon = step.icon
                    const isCompleted = idx < currentStepIndex
                    const isCurrent = idx === currentStepIndex
                    const isPending = idx > currentStepIndex

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary/10 border border-primary/20'
                            : isCompleted
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-muted/30'
                        }`}
                      >
                        <div
                          className={`rounded-full p-2 shrink-0 ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : isCurrent ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isPending ? 'text-muted-foreground' : ''
                            }`}
                          >
                            {step.title}
                          </p>
                        </div>
                        {isCompleted && (
                          <Badge variant="secondary" className="text-xs">
                            Hoàn thành
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Results view
  // Split violations into CFR (affects Pass/Fail) and Import Alert (border risk only)
  const allViolations = report.findings || report.violations || []
  const cfrViolations = allViolations.filter((v: Violation) => v.source_type !== 'import_alert')
  const importAlertViolations = allViolations.filter((v: Violation) => v.source_type === 'import_alert')
  // violationsCount = CFR violations only — these determine Pass/Fail
  const violationsCount = cfrViolations.length
  const citationsCount =
    report.citation_count ||
    (report.findings || report.violations)?.reduce(
      (sum, v) => sum + (v.citations?.length || 0),
      0
    ) ||
    0

  return (
    <div>
      {/* Action bar */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/audit/${params.id}/versions`)}>
            <History className="mr-2 h-4 w-4" />
            Lịch sử phiên bản
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {pdfLoading ? 'Đang tạo...' : 'Tải PDF'}
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Chia sẻ
          </Button>
          <Button
            size="sm"
            variant={report.needs_expert_review ? 'default' : 'outline'}
            onClick={() => {
              document.getElementById('expert-request-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {report.needs_expert_review ? 'Cần tư vấn chuyên gia' : 'Yêu cầu tư vấn'}
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Report Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              Báo cáo Kiểm tra Tuân thủ FDA
              <Badge
                variant={
                  report.overall_result === 'pass'
                    ? 'default'
                    : report.overall_result === 'fail'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {report.overall_result === 'pass' && <CheckCircle className="mr-1 h-4 w-4" />}
                {report.overall_result === 'fail' && <AlertCircle className="mr-1 h-4 w-4" />}
                {report.overall_result === 'review' && <AlertTriangle className="mr-1 h-4 w-4" />}
                {report.overall_result === 'pass'
                  ? 'Đạt'
                  : report.overall_result === 'fail'
                  ? 'Không đạt'
                  : 'Cần Xem xét'}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Report ID: {String(params.id).slice(0, 8)}
            </p>
          </div>
          {report.can_export_pdf !== false ? (
            <Button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="gap-2"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pdfLoading ? 'Đang tạo PDF...' : 'Tải xuống PDF'}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/pricing?highlight=starter')}
            >
              <Download className="h-4 w-4" />
              Nâng cấp để tải PDF
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Label Display */}
          <Card className="lg:col-span-1">
            <div className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                {report.label_image_url === 'manual-entry' ? 'Xem trước Nhãn' : 'Hình ảnh Nhãn'}
                {report.label_images && report.label_images.length > 1 && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {report.label_images.length} hinh anh
                  </Badge>
                )}
              </h2>
              {report.label_image_url === 'manual-entry' ? (
                <div className="rounded-lg overflow-hidden bg-slate-100 p-4 flex items-center justify-center">
                  {report.form_data && report.product_category ? (
                    <LabelPreview
                      config={getLabelConfig(report.product_category)}
                      formData={report.form_data}
                    />
                  ) : (
                    <div className="text-muted-foreground">Không có dữ liệu dinh dưỡng</div>
                  )}
                </div>
              ) : (
                <LabelImageGallery
                  images={(report.label_images as LabelImageEntry[]) || []}
                  fallbackUrl={report.label_image_url}
                />
              )}
              {report.product_name && (
                <h3 className="text-xl font-bold mt-4">{report.product_name}</h3>
              )}

              {/* Analysis Settings Summary */}
              {(report.target_market || report.packaging_format || report.product_type || report.pdp_dimensions) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Cau hinh phan tich da ap dung</span>
                  </div>
                  <div className="space-y-2">
                    {report.target_market && (
                      <div className="flex items-center gap-2 text-xs">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Thi truong:</span>
                        <span className="font-medium">{report.target_market}</span>
                      </div>
                    )}
                    {report.label_language && report.label_language.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Ngon ngu:</span>
                        <span className="font-medium">{report.label_language.join(', ').toUpperCase()}</span>
                      </div>
                    )}
                    {report.packaging_format && (
                      <div className="flex items-center gap-2 text-xs">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Bao bi:</span>
                        <span className="font-medium">{report.packaging_format.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {report.product_type && (
                      <div className="flex items-center gap-2 text-xs">
                        <FileSearch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Loai SP:</span>
                        <span className="font-medium">{report.product_type}</span>
                      </div>
                    )}
                    {report.pdp_dimensions && (
                      <div className="flex items-center gap-2 text-xs">
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">PDP:</span>
                        <span className="font-medium">
                          {report.pdp_dimensions.width} x {report.pdp_dimensions.height} {report.pdp_dimensions.unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Analysis Summary */}
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="font-semibold text-lg mb-4">Chi tiết Phân tích</h2>
              
              {/* Status Overview */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6 pb-6 border-b">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Trạng thái:</span>
                    <Badge
                      variant={
                        report.status === 'verified'
                          ? 'default'
                          : report.status === 'ai_completed'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {report.status === 'pending'
                        ? 'Đang xử lý'
                        : report.status === 'ai_completed'
                        ? 'Chờ Xem xét'
                        : 'Đã Xác minh'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Ngày tạo:</span>
                    <span className="font-medium text-sm">
                      {new Date(report.created_at).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Vi phạm CFR:</span>
                    <span className="font-semibold text-sm">{violationsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Trích dẫn CFR:</span>
                    <span className="font-semibold text-sm">{citationsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Rủi ro Import Alert:</span>
                    <span className={`font-semibold text-sm ${importAlertViolations.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {importAlertViolations.length > 0 ? `${importAlertViolations.length} cảnh báo` : 'Không có'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {report.pdp_area_square_inches && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Diện tích PDP:</span>
                      <span className="font-medium text-sm">
                        {report.pdp_area_square_inches.toFixed(2)} sq in
                      </span>
                    </div>
                  )}
                  {report.pixels_per_inch && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Độ phân giải:</span>
                      <span className="font-medium text-sm">{report.pixels_per_inch.toFixed(0)} PPI</span>
                    </div>
                  )}
                  {report.product_category && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Danh mục:</span>
                      <span className="font-medium text-sm">{report.product_category}</span>
                    </div>
                  )}
                  {report.ocr_confidence !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Độ tin cậy OCR:</span>
                      <span className="font-medium text-sm">{Math.round(report.ocr_confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Extracted Content */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Dữ liệu Nhãn AI trích xuất</h3>
                </div>

                {/* Nutrition Facts Section */}
                {report.nutrition_facts && report.nutrition_facts.length > 0 && (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-sm">Thành phần Dinh dưỡng</h4>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {report.nutrition_facts.length} nutrients
                      </Badge>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {report.nutrition_facts.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs py-1 px-2 rounded bg-muted/50">
                          <span className="text-muted-foreground">{item.name}:</span>
                          <span className="font-medium">
                            {item.value}{item.unit}
                            {item.daily_value && <span className="text-muted-foreground ml-1">({item.daily_value}% DV)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Text Elements Section */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Brand/Product Info */}
                  {(report.product_name || report.brand_name || report.net_quantity) && (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileSearch className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-sm">Thông tin Sản phẩm</h4>
                      </div>
                      <div className="space-y-2 text-xs">
                        {report.brand_name && (
                          <div>
                            <span className="text-muted-foreground">Thương hiệu:</span>
                            <p className="font-medium mt-0.5">{report.brand_name}</p>
                          </div>
                        )}
                        {report.product_name && (
                          <div>
                            <span className="text-muted-foreground">Sản phẩm:</span>
                            <p className="font-medium mt-0.5">{report.product_name}</p>
                          </div>
                        )}
                        {report.net_quantity && (
                          <div>
                            <span className="text-muted-foreground">Khối lượng tịnh:</span>
                            <p className="font-medium mt-0.5">{report.net_quantity}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ingredients */}
                  {report.ingredient_list && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-sm">Thành phần</h4>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-4">
                        {report.ingredient_list}
                      </p>
                    </div>
                  )}
                </div>

                {/* Allergens & Claims */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {report.allergen_declaration && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-amber-600" />
                        <h4 className="font-medium text-sm text-amber-900">Chất gây Dị ứng</h4>
                      </div>
                      <p className="text-xs text-amber-800">{report.allergen_declaration}</p>
                    </div>
                  )}
                  
                  {report.health_claims && report.health_claims.length > 0 && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-sm text-purple-900">Công bố Sức khỏe</h4>
                      </div>
                      <div className="space-y-1">
                        {report.health_claims.map((claim: string, idx: number) => (
                          <p key={idx} className="text-xs text-purple-800">• {claim}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Detected Languages */}
                {report.detected_languages && report.detected_languages.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Ngôn ngữ phát hiện:</span>
                    <div className="flex gap-1">
                      {report.detected_languages.map((lang: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {report.needs_expert_review && (
              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-orange-900 mb-1">
                      Báo cáo này cần chuyên gia xác minh
                    </h3>
                    <p className="text-sm text-orange-700">
                      {violationsCount > 0
                        ? `Nhãn này có ${violationsCount} vi phạm cần được sửa trước khi phân phối.`
                        : 'Phân tích AI hoàn tất. Khuyến nghị chuyên gia xem xét để phê duyệt cuối cùng.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {report.overall_result === 'pass' && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Đánh giá tổng thể</p>
                    <p className="text-sm text-green-700 mt-1">
                      {violationsCount === 0
                        ? 'Nhãn này tuân thủ các quy định FDA. Không phát hiện vi phạm.'
                        : `Nhãn này có ${violationsCount} vi phạm cần được sửa trước khi phân phối.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Re-analyze notice for reports generated before domain-aware ruleset fix ── */}
        {report.created_at && new Date(report.created_at) < new Date('2026-03-02T12:00:00Z') && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm mb-0.5">
                Report này được tạo trước khi cập nhật ruleset domain-aware
              </p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Hệ thống đã được cập nhật để phân biệt quy định riêng cho <strong>Cosmetic</strong>,{' '}
                <strong>Food/Supplement</strong> và <strong>OTC Drug</strong>. Một số vi phạm trong report
                này (ví dụ: "prevent" bị flag cho sản phẩm cosmetic) có thể không còn chính xác.
                Vui lòng chạy lại phân tích để nhận kết quả cập nhật.
              </p>
            </div>
          </div>
        )}

        {/* ── Risk Assessment + Expert Tips ─────────────────────────────────────── */}
        {(report.overall_risk_score !== undefined || (report.expert_tips && report.expert_tips.length > 0)) && (
          <div className={`grid gap-6 mb-8 ${report.expert_tips && report.expert_tips.length > 0 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Risk Score Card */}
            {report.overall_risk_score !== undefined && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Rủi ro Thực thi FDA</h2>
                </div>

                {/* Risk Gauge — flex row: gauge | stats | (projected score when full-width) */}
                <div className="flex items-center gap-8 mb-5">
                  {/* Circular gauge */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(report.overall_risk_score / 10) * 264} 264`}
                        className={
                          report.overall_risk_score >= 7 ? 'text-red-500'
                          : report.overall_risk_score >= 4 ? 'text-amber-500'
                          : 'text-green-500'
                        }
                        stroke="currentColor"
                      />
                    </svg>
                    <span className={`absolute text-2xl font-bold ${
                      report.overall_risk_score >= 7 ? 'text-red-600'
                      : report.overall_risk_score >= 4 ? 'text-amber-600'
                      : 'text-green-600'
                    }`}>
                      {report.overall_risk_score.toFixed(1)}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">Mức độ rủi ro</span>
                      <Badge className={`${
                        report.risk_assessment === 'Critical' || report.risk_assessment === 'High'
                          ? 'bg-red-100 text-red-800 hover:bg-red-100'
                          : report.risk_assessment === 'Medium-High' || report.risk_assessment === 'Medium'
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                          : 'bg-green-100 text-green-800 hover:bg-green-100'
                      }`}>
                        {report.risk_assessment || 'N/A'}
                      </Badge>
                    </div>

                    {report.projected_risk_score !== undefined && report.projected_risk_score < report.overall_risk_score && (
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-green-600 shrink-0" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">Sau khi sửa lỗi nghiêm trọng: </span>
                          <span className="font-semibold text-green-700">{report.projected_risk_score.toFixed(1)}/10</span>
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Điểm risk dựa trên mức độ vi phạm, lịch sử enforcement của FDA, và Warning Letters liên quan.
                    </p>
                  </div>
                </div>

                {/* Risk Scale Legend — full width bar */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-0.5 mb-1.5">
                    <div className="flex-1 h-2 rounded-l-full bg-green-400" />
                    <div className="flex-1 h-2 bg-green-300" />
                    <div className="flex-1 h-2 bg-amber-300" />
                    <div className="flex-1 h-2 bg-amber-400" />
                    <div className="flex-1 h-2 bg-red-400" />
                    <div className="flex-1 h-2 rounded-r-full bg-red-500" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-muted-foreground">Thấp (0)</span>
                    <span className="text-[11px] text-muted-foreground">Trung bình (5)</span>
                    <span className="text-[11px] text-muted-foreground">Nghiêm trọng (10)</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Expert Tips Card */}
            {report.expert_tips && report.expert_tips.length > 0 && (
              <Card className="p-6 border-blue-200 bg-blue-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-lg">Lời khuyên từ Chuyên gia</h2>
                </div>
                <div className="space-y-3">
                  {report.expert_tips.map((tip: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-blue-100"
                    >
                      <span className="text-blue-600 font-bold text-sm shrink-0 mt-0.5">{idx + 1}.</span>
                      <p className="text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── SECTION 1: Label Compliance Audit (CFR violations only) ──────────── */}
        {(() => {
          const allViolations = report.findings || report.violations || []
          // Pure CFR violations — exclude enforcement-history signals (handled in dedicated sections below)
          const cfrViolations = allViolations.filter(
            (v: Violation) =>
              v.source_type !== 'import_alert' &&
              v.source_type !== 'warning_letter' &&
              v.source_type !== 'recall'
          )
          const criticalCount = cfrViolations.filter((v: Violation) => v.severity === 'critical').length
          const warningCount  = cfrViolations.filter((v: Violation) => v.severity === 'warning').length

          return (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Kiểm tra Tuân thủ Nhãn</h2>
                  <Badge variant="secondary">{cfrViolations.length} vi phạm</Badge>
                </div>
                {cfrViolations.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {criticalCount} Nghiêm trọng • {warningCount} Cảnh báo
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-6 border-l-2 border-primary/30 pl-3">
                Kết quả kiểm tra tuân thủ nhãn theo quy định <span className="font-medium text-foreground">21 CFR</span>.
                Kết quả Đạt/Không Đạt dựa trên các vi phạm nghiêm trọng bên dưới.
                Lịch sử Warning Letter và Recall được hiển thị riêng ở các mục bên dưới.
              </p>

              {cfrViolations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Không có vi phạm CFR</h3>
                  <p className="text-muted-foreground">
                    Nhãn của bạn tuân thủ tất cả các quy định FDA được kiểm tra
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cfrViolations.map((violation: Violation, index: number) => (
                    <Card
                      key={index}
                      className={`p-6 ${
                        violation.severity === 'critical'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-orange-200 bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {violation.severity === 'critical' ? (
                            <div className="rounded-full bg-red-100 p-2">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                          ) : (
                            <div className="rounded-full bg-orange-100 p-2">
                              <AlertTriangle className="h-5 w-5 text-orange-600" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h3 className="font-semibold text-lg">{violation.category}</h3>
                            <Badge
                              variant={violation.severity === 'critical' ? 'destructive' : 'default'}
                              className="shrink-0"
                            >
                              {violation.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                            </Badge>
                          </div>

                          <p className="text-sm mb-4">{violation.description}</p>

                          {violation.regulation_reference && (
                            <div className="bg-slate-100 rounded-lg p-4 mb-4">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Điều khoản áp dụng:
                              </p>
                              <p className="text-sm font-mono text-primary">
                                {violation.regulation_reference}
                              </p>
                            </div>
                          )}

                          {violation.suggested_fix && (
                            <div className="bg-blue-50 rounded-lg p-4 mb-4">
                              <p className="text-xs font-medium text-blue-900 mb-2">Hướng dẫn khắc phục:</p>
                              <p className="text-sm text-blue-800">{violation.suggested_fix}</p>
                            </div>
                          )}

                          {violation.citations && violation.citations.length > 0 && (
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-medium text-primary hover:underline mb-2">
                                Trích dẫn từ quy định ({violation.citations.length}):
                              </summary>
                              <div className="space-y-2 ml-4 mt-2">
                                {violation.citations.map((citation, citIdx) => (
                                  <div
                                    key={citIdx}
                                    className="text-xs bg-white rounded p-3 border border-slate-200"
                                  >
                                    <p className="font-medium mb-1">{citation.section}</p>
                                    <p className="text-muted-foreground italic">{citation.text}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Nguồn: {citation.source} (Độ liên quan: {(citation.relevance_score * 100).toFixed(0)}%)
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {violation.confidence_score !== undefined && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Độ tin cậy phân tích:</span>
                                <span className="font-medium">{Math.round(violation.confidence_score * 100)}%</span>
                              </div>
                              <Progress value={violation.confidence_score * 100} className="h-1" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          )
        })()}

        {/* ── SECTION 1b: FDA Warning Letter Patterns ──────────────────────────── */}
        {(() => {
          const allViolations = report.findings || report.violations || []
          const wlViolations = allViolations.filter((v: Violation) => v.source_type === 'warning_letter')
          if (wlViolations.length === 0) return null

          return (
            <Card className="p-6 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  <h2 className="text-xl font-bold">Mẫu Cảnh báo FDA (Warning Letter)</h2>
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                    {wlViolations.length} mẫu phát hiện
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg bg-purple-50 border-l-4 border-purple-400 p-4 mb-6">
                <p className="text-sm font-semibold text-purple-900 mb-1">
                  Dựa trên lịch sử FDA Warning Letters thực tế
                </p>
                <p className="text-sm text-purple-800 leading-relaxed">
                  Các mục này không phải vi phạm CFR mới — chúng là <span className="font-medium">mẫu lỗi lặp lại</span> mà FDA
                  đã gửi Warning Letter cho các doanh nghiệp khác với ngôn ngữ tương tự. Đây là tín hiệu
                  rủi ro enforcement cao, cần xem xét và sửa trước khi phân phối.
                  Không ảnh hưởng đến kết quả Pass/Fail của nhãn.
                </p>
              </div>

              <div className="space-y-4">
                {wlViolations.map((violation: Violation, index: number) => (
                  <Card
                    key={index}
                    className={`p-5 border-purple-200 bg-purple-50/40 ${
                      violation.severity === 'critical' ? 'border-l-4 border-l-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <div className="rounded-full bg-purple-100 p-2">
                          <Mail className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-base text-slate-800">{violation.category}</h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-xs">
                              Warning Letter
                            </Badge>
                            <Badge
                              variant={violation.severity === 'critical' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {violation.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-slate-700 mb-3">{violation.description}</p>

                        {violation.regulation_reference && (
                          <div className="bg-purple-100/60 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-purple-900 mb-0.5">Điều khoản liên quan:</p>
                            <p className="text-xs font-mono text-purple-800">{violation.regulation_reference}</p>
                          </div>
                        )}

                        {violation.suggested_fix && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-blue-900 mb-1">Hướng dẫn khắc phục:</p>
                            <p className="text-xs text-blue-800">{violation.suggested_fix}</p>
                          </div>
                        )}

                        {violation.warning_letter_id && (
                          <a
                            href={`https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/${violation.warning_letter_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-purple-700 hover:underline"
                          >
                            Xem Warning Letter gốc trên FDA.gov <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        {violation.confidence_score !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Mức tương đồng với Warning Letter:</span>
                              <span className="font-medium">{Math.round(violation.confidence_score * 100)}%</span>
                            </div>
                            <Progress value={violation.confidence_score * 100} className="h-1" />
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                          Nguồn: Lịch sử Warning Letter của FDA — đây là tín hiệu rủi ro, không phải vi phạm CFR trực tiếp.
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )
        })()}

        {/* ── SECTION 1c: FDA Recall Patterns ─────────────────────────���───────── */}
        {(() => {
          const allViolations = report.findings || report.violations || []
          const recallViolations = allViolations.filter((v: Violation) => v.source_type === 'recall')
          if (recallViolations.length === 0) return null

          const hasClassI = recallViolations.some(
            (v: Violation) => v.category?.includes('Class I') || v.severity === 'critical'
          )

          return (
            <Card className={`p-6 ${hasClassI ? 'border-orange-300' : 'border-yellow-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className={`h-5 w-5 ${hasClassI ? 'text-orange-600' : 'text-yellow-600'}`} />
                  <h2 className="text-xl font-bold">Mẫu Thu hồi FDA (Recall)</h2>
                  <Badge className={`${hasClassI ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'} hover:bg-inherit`}>
                    {recallViolations.length} mẫu phát hiện
                  </Badge>
                </div>
              </div>

              <div className={`rounded-lg border-l-4 p-4 mb-6 ${hasClassI ? 'bg-orange-50 border-orange-400' : 'bg-yellow-50 border-yellow-400'}`}>
                <p className={`text-sm font-semibold mb-1 ${hasClassI ? 'text-orange-900' : 'text-yellow-900'}`}>
                  Nhãn chứa yếu tố tương tự sản phẩm đã bị FDA Recall
                </p>
                <p className={`text-sm leading-relaxed ${hasClassI ? 'text-orange-800' : 'text-yellow-800'}`}>
                  Các mục này được phát hiện dựa trên cơ sở dữ liệu openFDA Recall.
                  Không có nghĩa sản phẩm của bạn sẽ bị recall — nhưng chứa từ khóa, thành phần,
                  hoặc cấu trúc nhãn tương đồng với sản phẩm đã bị thu hồi.
                  Cần xem xét kỹ để phòng ngừa rủi ro. Không ảnh hưởng đến Pass/Fail.
                </p>
              </div>

              <div className="space-y-4">
                {recallViolations.map((violation: Violation, index: number) => (
                  <Card
                    key={index}
                    className={`p-5 ${
                      violation.severity === 'critical'
                        ? 'border-orange-300 bg-orange-50/40 border-l-4 border-l-orange-500'
                        : 'border-yellow-200 bg-yellow-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <div className={`rounded-full p-2 ${violation.severity === 'critical' ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                          <RotateCcw className={`h-5 w-5 ${violation.severity === 'critical' ? 'text-orange-600' : 'text-yellow-600'}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-base text-slate-800">{violation.category}</h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              className={`text-xs text-white ${
                                violation.severity === 'critical'
                                  ? 'bg-orange-600 hover:bg-orange-600'
                                  : 'bg-yellow-500 hover:bg-yellow-500'
                              }`}
                            >
                              {violation.severity === 'critical' ? 'Recall Loại I' : 'Mẫu Thu hồi'}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-slate-700 mb-3">{violation.description}</p>

                        {violation.regulation_reference && (
                          <div className={`rounded-lg p-3 mb-3 ${violation.severity === 'critical' ? 'bg-orange-100/60' : 'bg-yellow-100/60'}`}>
                            <p className="text-xs font-medium text-slate-700 mb-0.5">Nguồn dữ liệu Recall:</p>
                            <p className="text-xs font-mono text-slate-700">{violation.regulation_reference}</p>
                          </div>
                        )}

                        {violation.suggested_fix && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-blue-900 mb-1">Hành động phòng ngừa đề xuất:</p>
                            <p className="text-xs text-blue-800">{violation.suggested_fix}</p>
                          </div>
                        )}

                        {violation.confidence_score !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Mức tương đồng với sự kiện Recall:</span>
                              <span className="font-medium">{Math.round(violation.confidence_score * 100)}%</span>
                            </div>
                            <Progress value={violation.confidence_score * 100} className="h-1" />
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                          Nguồn: Cơ sở dữ liệu openFDA Recall — đây là tín hiệu rủi ro, không phải vi phạm CFR trực tiếp.
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )
        })()}

        {/* ── SECTION 2: Border Entry Risk Assessment (Import Alerts) ─────────── */}
        {(() => {
          const allViolations = report.findings || report.violations || []
          const importAlertViolations = allViolations.filter((v: Violation) => v.source_type === 'import_alert')
          if (importAlertViolations.length === 0) return null

          const hasCritical = importAlertViolations.some((v: Violation) => v.severity === 'critical')

          return (
            <Card className={`p-6 ${hasCritical ? 'border-red-300' : 'border-amber-300'}`}>
              {/* Section header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Ship className={`h-5 w-5 ${hasCritical ? 'text-red-600' : 'text-amber-600'}`} />
                  <h2 className="text-xl font-bold">Rủi ro Thông quan Biên giới</h2>
                  <Badge className={`${hasCritical ? 'bg-red-600 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-500'} text-white`}>
                    {importAlertViolations.length} Import Alert
                  </Badge>
                </div>
              </div>

              {/* Key educational note — Vexim's value proposition */}
              <div className={`rounded-lg border-l-4 p-4 mb-6 ${hasCritical ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-400'}`}>
                <p className={`text-sm font-semibold mb-1 ${hasCritical ? 'text-red-900' : 'text-amber-900'}`}>
                  Quan trọng: Nhãn đúng luật không đảm bảo hàng qua cảng
                </p>
                <p className={`text-sm leading-relaxed ${hasCritical ? 'text-red-800' : 'text-amber-800'}`}>
                  Nhãn của bạn có thể <span className="font-medium">Pass</span> toàn bộ kiểm tra CFR bên trên,
                  nhưng hàng hóa vẫn có nguy cơ bị giữ tại cảng Mỹ (DWPE — Detention Without Physical Examination)
                  n��u sản phẩm hoặc nhà sản xuất thuộc diện Import Alert của FDA.
                  Đây là rủi ro biên giới độc lập với tuân thủ nhãn.
                </p>
              </div>

              <div className="space-y-4">
                {importAlertViolations.map((violation: Violation, index: number) => (
                  <Card
                    key={index}
                    className={`p-6 ${
                      violation.severity === 'critical'
                        ? 'border-red-300 bg-red-50/60'
                        : 'border-amber-300 bg-amber-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <div className={`rounded-full p-2 ${violation.severity === 'critical' ? 'bg-red-100' : 'bg-amber-100'}`}>
                          <Ship className={`h-5 w-5 ${violation.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-base">{violation.category}</h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`text-xs ${violation.severity === 'critical' ? 'bg-red-600 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-500'} text-white`}>
                              {violation.severity === 'critical' ? 'Rủi ro DWPE' : 'Rủi ro Nhập khẩu'}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm mb-3 text-slate-700">{violation.description}</p>

                        {violation.regulation_reference && (
                          <div className={`rounded-lg p-3 mb-3 flex items-center gap-2 ${violation.severity === 'critical' ? 'bg-red-100/60' : 'bg-amber-100/60'}`}>
                            <p className="text-xs font-mono font-medium text-slate-700 flex-1">{violation.regulation_reference}</p>
                            {violation.import_alert_number && (
                              <a
                                href={`https://www.accessdata.fda.gov/cms_ia/ialist.html#${violation.import_alert_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                              >
                                Xem trên FDA.gov <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {violation.suggested_fix && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-blue-900 mb-1">Khuyến nghị:</p>
                            <p className="text-xs text-blue-800">{violation.suggested_fix}</p>
                          </div>
                        )}

                        {violation.confidence_score !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Mức liên quan:</span>
                              <span className="font-medium">{Math.round(violation.confidence_score * 100)}%</span>
                            </div>
                            <Progress value={violation.confidence_score * 100} className="h-1" />
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                          Import Alert là tín hiệu rủi ro biên giới — không phải vi phạm CFR trực tiếp.
                          Không được tính vào kết quả Pass/Fail của nhãn.
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )
        })()}

        {/* ── Visual & Technical Checks (Geometry, Contrast, Multi-language) ── */}
        {(
          (report.geometry_violations && report.geometry_violations.length > 0) ||
          (report.contrast_violations && report.contrast_violations.length > 0) ||
          (report.multilanguage_issues && report.multilanguage_issues.length > 0)
        ) && (
          <div className={`grid gap-4 ${(() => {
            const count = [
              report.geometry_violations?.length > 0,
              report.contrast_violations?.length > 0,
              report.multilanguage_issues?.length > 0,
            ].filter(Boolean).length
            return count === 1 ? 'grid-cols-1' : count === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
          })()}`}>
            {/* Geometry Violations */}
            {report.geometry_violations && report.geometry_violations.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Ruler className="h-4 w-4 text-violet-600" />
                  <h3 className="font-semibold text-sm">Kiểm tra Hình học</h3>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {report.geometry_violations.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {report.geometry_violations.map((gv: any, idx: number) => (
                    <div key={idx} className={`rounded-lg p-3 border text-xs ${
                      gv.severity === 'critical' ? 'border-red-200 bg-red-50/50' :
                      gv.severity === 'warning' ? 'border-amber-200 bg-amber-50/50' :
                      'border-blue-200 bg-blue-50/50'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium capitalize">{gv.type?.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className={`text-[10px] ${
                          gv.severity === 'critical' ? 'border-red-300 text-red-700' :
                          gv.severity === 'warning' ? 'border-amber-300 text-amber-700' :
                          'border-blue-300 text-blue-700'
                        }`}>
                          {gv.severity === 'critical' ? 'Nghiêm trọng' : gv.severity === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{gv.description}</p>
                      {gv.regulation && (
                        <p className="font-mono text-[10px] text-muted-foreground mt-1.5">{gv.regulation}</p>
                      )}
                      {(gv.expected || gv.actual) && (
                        <div className="flex gap-3 mt-2 pt-2 border-t">
                          {gv.expected && <span className="text-green-700">Chuẩn: {gv.expected}</span>}
                          {gv.actual && <span className="text-red-700">Thực tế: {gv.actual}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Contrast Violations */}
            {report.contrast_violations && report.contrast_violations.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="h-4 w-4 text-pink-600" />
                  <h3 className="font-semibold text-sm">Tương phản Màu sắc</h3>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {report.contrast_violations.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {report.contrast_violations.map((cv: any, idx: number) => (
                    <div key={idx} className="rounded-lg p-3 border border-amber-200 bg-amber-50/50 text-xs">
                      <p className="font-medium mb-1.5">{cv.description}</p>
                      {cv.ratio !== undefined && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-muted-foreground">Tỷ lệ:</span>
                          <span className={`font-bold ${cv.ratio >= 4.5 ? 'text-green-700' : cv.ratio >= 3 ? 'text-amber-700' : 'text-red-700'}`}>
                            {cv.ratio.toFixed(2)}:1
                          </span>
                          <span className="text-muted-foreground">(tối thiểu 4.5:1)</span>
                        </div>
                      )}
                      {cv.colors && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: cv.colors.foreground }} />
                            <span className="font-mono text-[10px]">{cv.colors.foreground}</span>
                          </div>
                          <span className="text-muted-foreground">/</span>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: cv.colors.background }} />
                            <span className="font-mono text-[10px]">{cv.colors.background}</span>
                          </div>
                        </div>
                      )}
                      {cv.recommendation && (
                        <p className="text-muted-foreground mt-2 pt-2 border-t">{cv.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Multi-language Issues */}
            {report.multilanguage_issues && report.multilanguage_issues.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Languages className="h-4 w-4 text-teal-600" />
                  <h3 className="font-semibold text-sm">Kiểm tra Đa ngôn ngữ</h3>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {report.multilanguage_issues.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {report.multilanguage_issues.map((ml: any, idx: number) => (
                    <div key={idx} className={`rounded-lg p-3 border text-xs ${
                      ml.hasIssue ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'
                    }`}>
                      <p className="font-medium mb-2">{ml.description}</p>
                      {ml.detectedLanguages && ml.detectedLanguages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {ml.detectedLanguages.map((lang: string, langIdx: number) => (
                            <Badge key={langIdx} variant="outline" className="text-[10px]">{lang}</Badge>
                          ))}
                        </div>
                      )}
                      {ml.missingFields && ml.missingFields.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-muted-foreground mb-1">Thiếu bản dịch:</p>
                          <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                            {ml.missingFields.map((field: string, fIdx: number) => (
                              <li key={fIdx}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── SECTION 3: Commercial Summary Report ──────────────────────────── */}
        {report.commercial_summary && (
          <Card className="p-6 mt-6">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Báo cáo Thương mại Tổng hợp</h2>
                </div>
                <Badge variant="outline" className="group-open:hidden">
                  Nhấn để xem chi tiết
                </Badge>
              </summary>
              <div className="mt-4 pt-4 border-t prose prose-sm max-w-none">
                {report.commercial_summary.split('\n').map((line: string, idx: number) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={idx} className="text-base font-bold mt-4 mb-2">{line.replace(/^### /, '').replace(/🔴|🟠|💡/g, '').trim()}</h3>
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={idx} className="text-lg font-bold mt-4 mb-2">{line.replace(/^## /, '')}</h2>
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={idx} className="font-semibold mt-2">{line.replace(/\*\*/g, '')}</p>
                  }
                  if (line.startsWith('- ')) {
                    return <p key={idx} className="text-sm pl-4 py-0.5 text-muted-foreground">{line.replace(/^- /, '')}</p>
                  }
                  if (line.trim() === '') return <div key={idx} className="h-2" />
                  return <p key={idx} className="text-sm">{line.replace(/\*\*/g, '')}</p>
                })}
              </div>
            </details>
          </Card>
        )}

        {/* Expert Request Panel — luôn hiển thị sau violations */}
        <div id="expert-request-panel" className="mt-8">
          <ExpertRequestPanel
            reportId={String(params.id)}
            productName={report.product_name}
            productCategory={report.product_category}
            overallResult={report.overall_result}
            needsExpertReview={report.needs_expert_review}
            planName={report.plan_name}
            expertReviewsIncluded={report.expert_reviews_included}
          />
        </div>
      </main>
    </div>
  )
}
