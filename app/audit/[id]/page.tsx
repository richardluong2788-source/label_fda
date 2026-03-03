'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Database,
} from 'lucide-react'
import type { AuditReport } from '@/lib/types'
import { ExpertRequestPanel } from '@/components/expert-request-panel'
import { AnalysisProgressView, ANALYSIS_STEPS } from '@/components/audit/analysis-progress'
import { ReportResultView } from '@/components/audit/report-result-view'

// ────────────────────────────────────────────────────────────
// Main Audit Page
// ────────────────────────────────────────────────────────────

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

  // ── PDF Download ──────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!params.id) return
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/audit/${params.id}/pdf`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Không thể tạo file báo cáo')
      }
      const html = await res.text()
      
      // Open in new tab with download button
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) win.focus()
      // Clean up blob URL after some time
      setTimeout(() => URL.revokeObjectURL(url), 120000)
    } catch (err: any) {
      console.error('[v0] PDF download error:', err)
      alert(err.message || 'Không thể tải báo cáo. Vui lòng thử lại.')
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Load Report on Mount ──────────────────────────────────
  useEffect(() => {
    loadReport()
  }, [params.id])

  // ── Scanning animation ────────────────────────────────────
  useEffect(() => {
    if (!analyzing) return
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
  }, [analyzing, scanDirection])

  // ── Load Report ───────────────────────────────────────────
  const loadReport = async () => {
    try {
      const res = await fetch(`/api/audit/${params.id}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      const rpt = data.report || data

      // Gate: redirect to preview if not unlocked and not pending
      if (rpt && rpt.status !== 'pending' && rpt.status !== 'kb_unavailable') {
        const isUnlocked = rpt.report_unlocked === true || rpt.payment_status === 'paid'
        if (!isUnlocked) {
          router.push(`/audit/${params.id}/preview`)
          return
        }
      }

      setReport(data)

      if (data.status === 'kb_unavailable') {
        setKbError({
          message:
            'Knowledge Base chưa có dữ liệu khi lần phân tích trước. Vui lòng thử lại sau khi Admin đã nạp tài liệu.',
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

  // ── Start Analysis ────────────────────────────────────────
  const startAnalysis = async () => {
    setAnalyzing(true)
    setCurrentStepIndex(0)

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
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: params.id }),
      })

      if (res.status === 402) {
        const errData = await res.json().catch(() => ({}))
        clearInterval(stepInterval)
        setAnalyzing(false)
        setLoading(false)
        setQuotaError({
          message: errData.message || 'Bạn đã dùng hết lượt phân tích trong tháng này.',
          plan_name: errData.quota?.plan_name || 'Free',
          reports_used: errData.quota?.reports_used ?? 0,
          reports_limit: errData.quota?.reports_limit ?? 0,
        })
        return
      }

      if (res.status === 503) {
        const errData = await res.json().catch(() => ({}))
        if (errData.error === 'knowledge_base_empty') {
          clearInterval(stepInterval)
          setAnalyzing(false)
          setLoading(false)
          setKbError({
            message:
              errData.message ||
              'Knowledge Base chưa có dữ liệu. Vui lòng liên hệ Admin.',
            totalDocuments: errData.kbStatus?.totalDocuments ?? 0,
          })
          return
        }
      }

      if (!res.ok) throw new Error('Analysis failed')

      setProgress(100)
      clearInterval(stepInterval)

      await new Promise((resolve) => setTimeout(resolve, 1000))
      await loadReport()
    } catch (error) {
      console.error('[v0] Analysis error:', error)
      clearInterval(stepInterval)
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Error States ���─────────────────────────────────────────

  if (quotaError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
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

  if (kbError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-8 max-w-lg w-full text-center">
          <Database className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Knowledge Base chưa sẵn sàng</h2>
          <p className="text-muted-foreground mb-4">{kbError.message}</p>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <p className="font-medium">Tại sao không thể phân tích?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                Hệ thống cần dữ liệu FDA regulations, Warning Letters và Recalls để phân tích
                chính xác.
              </li>
              <li>
                Hiện tại có <strong>{kbError.totalDocuments}</strong> tài liệu trong Knowledge
                Base.
              </li>
              <li>Cần ít nhất 1 tài liệu được nạp vào để bắt đầu phân tích.</li>
            </ul>
          </div>
          <div className="bg-muted rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <p className="font-medium">Cách khắc phục:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Liên hệ Admin để nạp tài liệu FDA vào Knowledge Base.</li>
              <li>
                Truy cập trang <strong>Knowledge Base</strong> và sử dụng chức năng &quot;Nạp
                tài liệu mới&quot; hoặc &quot;FDA Warning Letters Pipeline&quot;.
              </li>
              <li>Sau khi nạp xong, quay lại đây để chạy phân tích.</li>
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={async () => {
                setKbError(null)
                try {
                  await fetch(`/api/audit/${params.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'pending' }),
                  })
                } catch {}
                startAnalysis()
              }}
            >
              Thử lại phân tích
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

  // ── Loading State ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải báo cáo...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Không tìm thấy báo cáo</h2>
          <p className="text-muted-foreground mb-4">
            Báo cáo này không tồn tại hoặc đã bị xóa
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // ── Analysis in Progress ──────────────────────────────────

  if (analyzing || report.status === 'pending') {
    return (
      <AnalysisProgressView
        report={report}
        progress={progress}
        currentStepIndex={currentStepIndex}
        scanPosition={scanPosition}
        analyzing={analyzing}
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  // ── Results View ──────────────────────────────────────────

  return (
    <div>
      <ReportResultView
        report={report}
        onDownloadPdf={handleDownloadPdf}
        pdfLoading={pdfLoading}
      />

      {/* Expert Request Panel (below the new layout) */}
      <div className="bg-slate-50">
        <div className="container mx-auto px-4 pb-12 max-w-7xl">
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="hidden lg:block" />
            <div id="expert-request-panel">
              <ExpertRequestPanel
                reportId={String(params.id)}
                productName={report.product_name}
                productCategory={report.product_category}
                overallResult={report.overall_result}
                needsExpertReview={report.needs_expert_review}
                planName={(report as any).plan_name}
                expertReviewsIncluded={(report as any).expert_reviews_included}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
