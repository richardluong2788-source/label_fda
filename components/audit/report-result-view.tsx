'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Loader2,
  Info,
  Search,
  ArrowRight,
  Expand,
  Shield,
} from 'lucide-react'
import type { AuditReport, Violation, LabelImageEntry } from '@/lib/types'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { LabelPreview } from '@/components/label-preview'
import { getLabelConfig } from '@/lib/label-field-config'

// ────────────────────────────────────────────────────────────
// Risk Score Circular Gauge - Vexim Compliance AI
// ────────────────────────────────────────────────────────────

function RiskScoreGauge({ score }: { score: number }) {
  const color =
    score >= 7 ? '#ef4444' : score >= 4 ? '#f59e0b' : '#22c55e'
  const circumference = 2 * Math.PI * 42
  const dashLength = (score / 10) * circumference

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
        />
      </svg>
      <span
        className="absolute text-2xl font-bold"
        style={{ color }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// OCR Confidence Bar
// ────────────────────────────────────────────────────────────

function OcrConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const barColor =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{'DO TIN CAY OCR'}</span>
      </div>
      <span className="text-lg font-bold text-slate-800">{pct}%</span>
      <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Ingredient Tags
// ────────────────────────────────────────────────────────────

function IngredientTags({ ingredientList }: { ingredientList: string }) {
  const ingredients = ingredientList
    .split(/,|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8)

  return (
    <div className="flex flex-wrap gap-1.5">
      {ingredients.map((ing, i) => (
        <span
          key={i}
          className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700"
        >
          {ing}
        </span>
      ))}
      {ingredientList.split(/,|;/).length > 8 && (
        <span className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-400">
          +{ingredientList.split(/,|;/).length - 8}
        </span>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Severity Badge (NGHIEM TRONG / CANH BAO)
// ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-red-500 text-white">
        {'NGHIEM TRONG'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-amber-500 text-white">
      {'CANH BAO'}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Violation Icon
// ────────────────────────────────────────────────────────────

function ViolationIcon({ severity, type }: { severity: string; type?: string }) {
  if (type === 'contrast' || type === 'color_contrast') {
    return (
      <div className="rounded-full bg-blue-100 p-2.5 shrink-0">
        <Info className="h-5 w-5 text-blue-600" />
      </div>
    )
  }
  if (severity === 'critical') {
    return (
      <div className="rounded-full bg-red-100 p-2.5 shrink-0">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>
    )
  }
  return (
    <div className="rounded-full bg-amber-100 p-2.5 shrink-0">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// A/B Comparison Violation Card
// ────────────────────────────────────────────────────────────

function ViolationCard({ violation, index }: { violation: Violation; index: number }) {
  const isContrast =
    violation.category?.toLowerCase().includes('contrast') ||
    violation.category?.toLowerCase().includes('tuong phan') ||
    violation.category?.toLowerCase().includes('color')

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon
            severity={violation.severity}
            type={isContrast ? 'contrast' : undefined}
          />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {violation.category}
            </h3>
            {violation.regulation_reference && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  {violation.regulation_reference}
                </span>
              </div>
            )}
          </div>
        </div>
        <SeverityBadge severity={violation.severity} />
      </div>

      {/* A/B Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Current on label (red) */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {'HIEN TAI TREN NHAN'}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            {'"'}{violation.description}{'"'}
          </p>
        </div>

        {/* Right: Fix recommendation (green) */}
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {'HUONG DAN KHAC PHUC (VEXIM RECOMMENDATION)'}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.suggested_fix || 'Chua co huong dan khac phuc tu he thong.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Contrast Violation Card (merged into main list per spec)
// ────────────────────────────────────────────────────────────

function ContrastViolationCard({
  violation,
}: {
  violation: {
    type: string
    severity: 'critical' | 'warning' | 'info'
    description: string
    ratio?: number
    recommendation?: string
    colors?: { foreground: string; background: string }
  }
}) {
  const ratioText = violation.ratio
    ? `Ty le tuong phan ${violation.ratio.toFixed(2)}:1 (Yeu cau toi thieu 4.5:1)`
    : violation.description

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-100 p-2.5 shrink-0">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {'Do tuong phan mau sac thap'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                {'FDA "conspicuous" labeling requirements'}
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity === 'critical' ? 'critical' : 'warning'} />
      </div>

      {/* A/B Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Current (red) */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {'HIEN TAI TREN NHAN'}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            {'"'}{ratioText}{'"'}
          </p>
          {violation.colors && (
            <div className="flex items-center gap-2 mt-3">
              <div
                className="w-5 h-5 rounded border border-slate-300"
                style={{ backgroundColor: violation.colors.foreground }}
              />
              <span className="text-[10px] font-mono text-slate-500">
                {violation.colors.foreground}
              </span>
              <span className="text-slate-400">/</span>
              <div
                className="w-5 h-5 rounded border border-slate-300"
                style={{ backgroundColor: violation.colors.background }}
              />
              <span className="text-[10px] font-mono text-slate-500">
                {violation.colors.background}
              </span>
            </div>
          )}
        </div>

        {/* Right: Recommendation (green) */}
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {'HUONG DAN KHAC PHUC (VEXIM RECOMMENDATION)'}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.recommendation ||
              'Tang do dam cua chu hoac thay doi mau nen de dam bao tinh de doc.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Report Result View (matches mockup layout)
// ────────────────────────────────────────────────────────────

interface ReportResultViewProps {
  report: AuditReport
  onDownloadPdf: () => void
  pdfLoading: boolean
}

export function ReportResultView({
  report,
  onDownloadPdf,
  pdfLoading,
}: ReportResultViewProps) {
  const router = useRouter()

  const allViolations: Violation[] = report.findings || report.violations || []
  const cfrViolations = allViolations.filter(
    (v) =>
      v.source_type !== 'import_alert' &&
      v.source_type !== 'warning_letter' &&
      v.source_type !== 'recall'
  )
  const contrastViolations = report.contrast_violations || []

  // Risk label
  const riskScore = report.overall_risk_score ?? 5
  const riskLabel =
    riskScore >= 7
      ? 'Cao'
      : riskScore >= 4
        ? 'Trung binh - Cao'
        : riskScore >= 2
          ? 'Trung binh'
          : 'Thap'

  const criticalCount =
    cfrViolations.filter((v) => v.severity === 'critical').length +
    contrastViolations.filter((v) => v.severity === 'critical').length
  const warningCount =
    cfrViolations.filter((v) => v.severity === 'warning').length +
    contrastViolations.filter((v) => v.severity === 'warning' || v.severity === 'info').length

  // Description sentence
  const descParts: string[] = []
  if (criticalCount > 0) descParts.push(`${criticalCount} vi pham nghiem trong`)
  if (warningCount > 0) descParts.push(`${warningCount} canh bao`)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HEADER BAR ────────────────────────────────────── */}
      <header className="bg-[#1e293b] text-white sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Vexim Compliance AI</h1>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider leading-tight">
                {'THI TRUONG: HOA KY (FDA)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Pipeline indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/60 border border-slate-600">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-slate-300">FDA Pipeline: Connected</span>
            </div>

            {/* Export Button */}
            <Button
              onClick={onDownloadPdf}
              disabled={pdfLoading}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 text-sm font-semibold"
              size="sm"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pdfLoading ? 'Dang tao...' : 'Xuat Bao Cao'}
            </Button>
          </div>
        </div>
      </header>

      {/* ── BODY CONTENT ──────────────────────────────────── */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* ── LEFT SIDEBAR ───────────────────────────────── */}
          <aside className="space-y-4">
            {/* Label Images Card */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                    <Expand className="h-4 w-4 text-slate-500" />
                    {'Hinh anh nhan'}
                  </h2>
                  {report.label_images && report.label_images.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] uppercase font-bold tracking-wider border-0">
                      {report.label_images.length} {'HINH ANH'}
                    </Badge>
                  )}
                </div>

                {report.label_image_url === 'manual-entry' ? (
                  <div className="rounded-lg overflow-hidden bg-slate-100 p-3 flex items-center justify-center min-h-[180px]">
                    {report.form_data && report.product_category ? (
                      <LabelPreview
                        config={getLabelConfig(report.product_category)}
                        formData={report.form_data}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {'Khong co du lieu'}
                      </p>
                    )}
                  </div>
                ) : (
                  <LabelImageGallery
                    images={(report.label_images as LabelImageEntry[]) || []}
                    fallbackUrl={report.label_image_url}
                  />
                )}
              </div>
            </Card>

            {/* Product Info Card */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-4 w-4 text-slate-500" />
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {'THONG TIN SAN PHAM (AI)'}
                  </h2>
                </div>

                <div className="space-y-3">
                  {(report as any).brand_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {'THUONG HIEU'}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {(report as any).brand_name}
                      </p>
                    </div>
                  )}

                  {report.product_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {'TEN SAN PHAM'}
                      </p>
                      <p className="text-sm font-medium text-slate-700 italic">
                        {report.product_name}
                      </p>
                    </div>
                  )}

                  {report.ingredient_list && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                        {'THANH PHAN TRICH XUAT'}
                      </p>
                      <IngredientTags ingredientList={report.ingredient_list} />
                    </div>
                  )}

                  {report.product_category && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {'DANH MUC'}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.product_category}
                      </p>
                    </div>
                  )}

                  {report.target_market && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {'THI TRUONG'}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.target_market}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </aside>

          {/* ── MAIN CONTENT ───────────────────────────────── */}
          <div className="space-y-6">
            {/* Risk Score Banner */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-6 flex items-center gap-6 flex-wrap">
                <RiskScoreGauge score={riskScore} />

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    {'Muc do rui ro: '}
                    <span
                      className={
                        riskScore >= 7
                          ? 'text-red-600'
                          : riskScore >= 4
                            ? 'text-amber-600'
                            : 'text-green-600'
                      }
                    >
                      {riskLabel}
                    </span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {descParts.length > 0
                      ? `Nhan co ${descParts.join(' va ')} can duoc sua truoc khi phan phoi.`
                      : 'Nhan tuan thu cac quy dinh FDA duoc kiem tra. Rui ro thap.'}
                  </p>
                </div>

                {report.ocr_confidence !== undefined && (
                  <OcrConfidenceBar confidence={report.ocr_confidence} />
                )}
              </div>
            </Card>

            {/* ── VIOLATIONS SECTION ───────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {'CHI TIET KIEM TRA TUAN THU (21 CFR)'}
                </h2>
              </div>

              {cfrViolations.length === 0 && contrastViolations.length === 0 ? (
                <Card className="bg-white border-slate-200 p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {'Khong co vi pham CFR'}
                  </h3>
                  <p className="text-slate-500">
                    {'Nhan cua ban tuan thu tat ca cac quy dinh FDA duoc kiem tra'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-5">
                  {/* CFR violations */}
                  {cfrViolations.map((violation, index) => (
                    <ViolationCard
                      key={`cfr-${index}`}
                      violation={violation}
                      index={index}
                    />
                  ))}

                  {/* Contrast violations merged into main list */}
                  {contrastViolations.map((cv, index) => (
                    <ContrastViolationCard
                      key={`contrast-${index}`}
                      violation={cv}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── EXPERT CTA BANNER ────────────────────────── */}
            <div className="rounded-xl bg-[#1e293b] p-6 flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-4 min-w-0">
                <div className="rounded-full bg-blue-600/20 p-3 shrink-0">
                  <Search className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {'Tu van chuyen gia Vexim'}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-lg">
                    {'He thong phat hien cac diem can chuyen gia xem xet ky hon de toi uu hoa kha nang thong quan va tranh bi FDA Warning Letter.'}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  document
                    .getElementById('expert-request-panel')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold gap-2 px-6 shrink-0"
                size="lg"
              >
                {'GUI YEU CAU TU VAN'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
