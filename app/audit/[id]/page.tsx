'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Database,
  Ship,
  Mail,
  RotateCcw,
} from 'lucide-react'
import type { AuditReport, Violation } from '@/lib/types'
import { ExpertRequestPanel } from '@/components/expert-request-panel'
import { AnalysisProgressView, ANALYSIS_STEPS } from '@/components/audit/analysis-progress'
import { ReportSummary } from '@/components/audit/report-summary'
import {
  CFRViolationsSection,
  WarningLetterSection,
  RecallSection,
  ImportAlertSection,
} from '@/components/audit/violation-sections'
import {
  RiskAssessmentSection,
  TechnicalChecksSection,
  CommercialSummarySection,
} from '@/components/audit/report-sections'

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
        throw new Error(err.error || 'Khong the tao file bao cao')
      }
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) win.focus()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: any) {
      console.error('[v0] PDF download error:', err)
      alert(err.message || 'Khong the tai bao cao. Vui long thu lai.')
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
            'Knowledge Base chua co du lieu khi lan phan tich truoc. Vui long thu lai sau khi Admin da nap tai lieu.',
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
          message: errData.message || 'Ban da dung het luot phan tich trong thang nay.',
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
              'Knowledge Base chua co du lieu. Vui long lien he Admin.',
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

  // ── Error States ──────────────────────────────────────────

  if (quotaError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Da het luot phan tich</h2>
          <p className="text-muted-foreground mb-4">{quotaError.message}</p>
          <div className="bg-muted rounded-lg p-4 mb-6 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goi hien tai</span>
              <span className="font-semibold">{quotaError.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Da dung thang nay</span>
              <span className="font-semibold">
                {quotaError.reports_used} / {quotaError.reports_limit} luot
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <a href="/pricing">Nang cap goi ngay</a>
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

  if (kbError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-8 max-w-lg w-full text-center">
          <Database className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Knowledge Base chua san sang</h2>
          <p className="text-muted-foreground mb-4">{kbError.message}</p>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <p className="font-medium">Tai sao khong the phan tich?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                He thong can du lieu FDA regulations, Warning Letters va Recalls de phan tich
                chinh xac.
              </li>
              <li>
                Hien tai co <strong>{kbError.totalDocuments}</strong> tai lieu trong Knowledge
                Base.
              </li>
              <li>Can it nhat 1 tai lieu duoc nap vao de bat dau phan tich.</li>
            </ul>
          </div>
          <div className="bg-muted rounded-lg p-4 mb-6 text-sm text-left space-y-2">
            <p className="font-medium">Cach khac phuc:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Lien he Admin de nap tai lieu FDA vao Knowledge Base.</li>
              <li>
                Truy cap trang <strong>Knowledge Base</strong> va su dung chuc nang &quot;Nap
                tai lieu moi&quot; hoac &quot;FDA Warning Letters Pipeline&quot;.
              </li>
              <li>Sau khi nap xong, quay lai day de chay phan tich.</li>
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

  // ── Loading State ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Dang tai bao cao...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Khong tim thay bao cao</h2>
          <p className="text-muted-foreground mb-4">
            Bao cao nay khong ton tai hoac da bi xoa
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lai Dashboard
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

  const allViolations: Violation[] = report.findings || report.violations || []
  const cfrViolations = allViolations.filter(
    (v) =>
      v.source_type !== 'import_alert' &&
      v.source_type !== 'warning_letter' &&
      v.source_type !== 'recall'
  )
  const wlViolations = allViolations.filter((v) => v.source_type === 'warning_letter')
  const recallViolations = allViolations.filter((v) => v.source_type === 'recall')
  const importAlertViolations = allViolations.filter(
    (v) => v.source_type === 'import_alert'
  )
  const violationsCount = cfrViolations.length
  const citationsCount =
    report.citation_count ||
    allViolations.reduce((sum, v) => sum + (v.citations?.length || 0), 0) ||
    0

  return (
    <div>
      {/* Action Bar */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/audit/${params.id}/versions`)}
          >
            <History className="mr-2 h-4 w-4" />
            Lich su phien ban
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
            {pdfLoading ? 'Dang tao...' : 'Tai PDF'}
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Chia se
          </Button>
          <Button
            size="sm"
            variant={report.needs_expert_review ? 'default' : 'outline'}
            onClick={() => {
              document
                .getElementById('expert-request-panel')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {report.needs_expert_review ? 'Can tu van chuyen gia' : 'Yeu cau tu van'}
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Report Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-balance">
              Bao cao Kiem tra Tuan thu FDA
              <Badge
                variant={
                  report.overall_result === 'pass'
                    ? 'default'
                    : report.overall_result === 'fail'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {report.overall_result === 'pass' && (
                  <CheckCircle className="mr-1 h-4 w-4" />
                )}
                {report.overall_result === 'fail' && (
                  <AlertCircle className="mr-1 h-4 w-4" />
                )}
                {report.overall_result === 'review' && (
                  <AlertTriangle className="mr-1 h-4 w-4" />
                )}
                {report.overall_result === 'pass'
                  ? 'Dat'
                  : report.overall_result === 'fail'
                  ? 'Khong dat'
                  : 'Can Xem xet'}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Report ID: {String(params.id).slice(0, 8)}
            </p>
          </div>
          {(report as any).can_export_pdf !== false ? (
            <Button onClick={handleDownloadPdf} disabled={pdfLoading} className="gap-2">
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pdfLoading ? 'Dang tao PDF...' : 'Tai xuong PDF'}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/pricing?highlight=starter')}
            >
              <Download className="h-4 w-4" />
              Nang cap de tai PDF
            </Button>
          )}
        </div>

        {/* Summary Grid */}
        <ReportSummary
          report={report}
          violationsCount={violationsCount}
          citationsCount={citationsCount}
          importAlertCount={importAlertViolations.length}
        />

        {/* Re-analyze notice for old reports */}
        {report.created_at &&
          new Date(report.created_at) < new Date('2026-03-02T12:00:00Z') && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-5 py-4 mb-6">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-0.5">
                  Report nay duoc tao truoc khi cap nhat ruleset domain-aware
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  He thong da duoc cap nhat de phan biet quy dinh rieng cho{' '}
                  <strong>Cosmetic</strong>, <strong>Food/Supplement</strong> va{' '}
                  <strong>OTC Drug</strong>. Vui long chay lai phan tich de nhan ket qua cap
                  nhat.
                </p>
              </div>
            </div>
          )}

        {/* Risk Assessment + Expert Tips */}
        <div className="mb-8">
          <RiskAssessmentSection report={report} />
        </div>

        {/* Tabbed Violation Sections */}
        <Tabs defaultValue="cfr" className="mb-8">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="cfr" className="gap-2 data-[state=active]:bg-background">
              <FileText className="h-4 w-4" />
              Tuan thu CFR
              {cfrViolations.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs"
                >
                  {cfrViolations.length}
                </Badge>
              )}
            </TabsTrigger>
            {wlViolations.length > 0 && (
              <TabsTrigger
                value="warning-letters"
                className="gap-2 data-[state=active]:bg-background"
              >
                <Mail className="h-4 w-4" />
                Warning Letters
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs"
                >
                  {wlViolations.length}
                </Badge>
              </TabsTrigger>
            )}
            {recallViolations.length > 0 && (
              <TabsTrigger
                value="recalls"
                className="gap-2 data-[state=active]:bg-background"
              >
                <RotateCcw className="h-4 w-4" />
                Recalls
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs"
                >
                  {recallViolations.length}
                </Badge>
              </TabsTrigger>
            )}
            {importAlertViolations.length > 0 && (
              <TabsTrigger
                value="import-alerts"
                className="gap-2 data-[state=active]:bg-background"
              >
                <Ship className="h-4 w-4" />
                Import Alerts
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs"
                >
                  {importAlertViolations.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="cfr" className="mt-6">
            <CFRViolationsSection violations={allViolations} />
          </TabsContent>

          {wlViolations.length > 0 && (
            <TabsContent value="warning-letters" className="mt-6">
              <WarningLetterSection violations={allViolations} />
            </TabsContent>
          )}

          {recallViolations.length > 0 && (
            <TabsContent value="recalls" className="mt-6">
              <RecallSection violations={allViolations} />
            </TabsContent>
          )}

          {importAlertViolations.length > 0 && (
            <TabsContent value="import-alerts" className="mt-6">
              <ImportAlertSection violations={allViolations} />
            </TabsContent>
          )}
        </Tabs>

        {/* Technical Checks (Geometry, Contrast, Multi-language) */}
        <div className="mb-8">
          <TechnicalChecksSection report={report} />
        </div>

        {/* Commercial Summary Report */}
        {report.commercial_summary && (
          <div className="mb-8">
            <CommercialSummarySection summary={report.commercial_summary} />
          </div>
        )}

        {/* Expert Request Panel */}
        <div id="expert-request-panel" className="mt-8">
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
      </main>
    </div>
  )
}
