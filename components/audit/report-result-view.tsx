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
  Mail,
  RotateCcw,
  Ship,
  FileText,
} from 'lucide-react'
import type { AuditReport, Violation, LabelImageEntry } from '@/lib/types'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { LabelPreview } from '@/components/label-preview'
import { getLabelConfig } from '@/lib/label-field-config'
import { useTranslation } from '@/lib/i18n'

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
        <span>ĐỘ TIN CẬY OCR</span>
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
// Severity Badge (NGHIÊM TRỌNG / CẢNH BÁO)
// ────────────────────────────────────────────────────────────

function SeverityBadge({ severity, t }: { severity: string; t: ReturnType<typeof useTranslation>['t'] }) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-red-500 text-white">
        {t.report.critical}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-amber-500 text-white">
      {t.report.warning}
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
  if (type === 'warning_letter') {
    return (
      <div className="rounded-full bg-orange-100 p-2.5 shrink-0">
        <Mail className="h-5 w-5 text-orange-600" />
      </div>
    )
  }
  if (type === 'recall') {
    return (
      <div className="rounded-full bg-purple-100 p-2.5 shrink-0">
        <RotateCcw className="h-5 w-5 text-purple-600" />
      </div>
    )
  }
  if (type === 'import_alert') {
    return (
      <div className="rounded-full bg-cyan-100 p-2.5 shrink-0">
        <Ship className="h-5 w-5 text-cyan-600" />
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

function ViolationCard({ violation, index, t }: { violation: Violation; index: number; t: ReturnType<typeof useTranslation>['t'] }) {
  const isContrast =
    violation.category?.toLowerCase().includes('contrast') ||
    violation.category?.toLowerCase().includes('tương phản') ||
    violation.category?.toLowerCase().includes('color')

  const getCategoryName = (category: string) => {
    // Check both exact and case-insensitive match
    return t.report.categoryNames[category] || t.report.categoryNames[category.toLowerCase()] || category
  }

  const getLocalizedFix = (fix: string | undefined) => {
    if (!fix) return t.report.defaultFix
    return fix
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon
            severity={violation.severity}
            type={isContrast ? 'contrast' : violation.source_type}
          />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {getCategoryName(violation.category)}
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
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      {/* A/B Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Current on label (red) */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {t.report.currentOnLabel}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>

        {/* Right: Fix recommendation (green) */}
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.fixGuidance}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {getLocalizedFix(violation.suggested_fix)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Warning Letter Violation Card
// ────────────────────────────────────────────────────────────

function WarningLetterCard({ violation, t }: { violation: Violation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="warning_letter" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.warningLetterTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-orange-100 text-orange-700 border border-orange-200">
                FDA Warning Letter
              </span>
              {violation.regulation_reference && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  {violation.regulation_reference}
                </span>
              )}
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-orange-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-3">
            {t.report.violationContent}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.veximRecommendation}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.suggested_fix || t.report.warningLetterDefaultFix}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Recall Card
// ────────────────────────────────────────────────────────────

function RecallCard({ violation, t }: { violation: Violation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-purple-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="recall" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.recallTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-purple-100 text-purple-700 border border-purple-200">
                FDA Recall
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-purple-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-3">
            {t.report.recallInfo}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.veximRecommendation}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.suggested_fix || t.report.recallDefaultFix}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Import Alert Card
// ────────────────────────────────────────────────────────────

function ImportAlertCard({ violation, t }: { violation: Violation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-cyan-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="import_alert" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.importAlertTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-100 text-cyan-700 border border-cyan-200">
                Import Alert
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-cyan-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 mb-3">
            {t.report.importAlertContent}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.veximRecommendation}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.suggested_fix || t.report.importAlertDefaultFix}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────���──────────────
// Contrast Violation Card (merged into main list per spec)
// ────────────────────────────────────────────────────────────

function ContrastViolationCard({
  violation,
  t,
}: {
  violation: {
    type: string
    severity: 'critical' | 'warning' | 'info'
    description: string
    ratio?: number
    recommendation?: string
    colors?: { foreground: string; background: string }
  }
  t: ReturnType<typeof useTranslation>['t']
}) {
  const ratioText = violation.ratio
    ? t.report.contrastRatio(violation.ratio)
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
              {t.report.lowContrastTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                {t.report.fdaReadabilityReq}
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity === 'critical' ? 'critical' : 'warning'} t={t} />
      </div>

      {/* A/B Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Current (red) */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {t.report.currentOnLabel}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{ratioText}&rdquo;
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
            {t.report.fixGuidance}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.recommendation || t.report.contrastDefaultFix}
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
  const { t } = useTranslation()

  const allViolations: Violation[] = report.findings || report.violations || []
  
  // Filter violations by source type - these come from real FDA data
  const cfrViolations = allViolations.filter(
    (v) =>
      v.source_type !== 'import_alert' &&
      v.source_type !== 'warning_letter' &&
      v.source_type !== 'recall'
  )
  const wlViolations = allViolations.filter((v) => v.source_type === 'warning_letter')
  const recallViolations = allViolations.filter((v) => v.source_type === 'recall')
  const importAlertViolations = allViolations.filter((v) => v.source_type === 'import_alert')
  
  const contrastViolations = report.contrast_violations || []

  const riskScore = report.overall_risk_score ?? 5
  const riskLabel =
    riskScore >= 7
      ? t.report.riskHigh
      : riskScore >= 4
        ? t.report.riskMediumHigh
        : riskScore >= 2
          ? t.report.riskMedium
          : t.report.riskLow

  const criticalCount =
    allViolations.filter((v) => v.severity === 'critical').length +
    contrastViolations.filter((v) => v.severity === 'critical').length
  const warningCount =
    allViolations.filter((v) => v.severity === 'warning').length +
    contrastViolations.filter((v) => v.severity === 'warning' || v.severity === 'info').length

  const descParts: string[] = []
  if (criticalCount > 0) descParts.push(`${criticalCount} ${t.report.criticalViolations}`)
  if (warningCount > 0) descParts.push(`${warningCount} ${t.report.warnings}`)

  return (
    <div className="bg-slate-50">
      {/* ── BODY CONTENT ──────────────────────────────────── */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-600 font-medium">FDA Pipeline: Connected</span>
            </div>
          </div>
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
            {pdfLoading ? t.report.generating : t.report.exportReport}
          </Button>
        </div>
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* ── LEFT SIDEBAR ───────────────────────────────── */}
          <aside className="space-y-4">
            {/* Label Images Card */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                    <Expand className="h-4 w-4 text-slate-500" />
                    {t.report.labelImages}
                  </h2>
                  {report.label_images && report.label_images.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] uppercase font-bold tracking-wider border-0">
                      {report.label_images.length} {t.report.images}
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
                        {t.common.noData}
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
                    {t.report.productInfoAI}
                  </h2>
                </div>

                <div className="space-y-3">
                  {(report as any).brand_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.brand}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {(report as any).brand_name}
                      </p>
                    </div>
                  )}

                  {report.product_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.productName}
                      </p>
                      <p className="text-sm font-medium text-slate-700 italic">
                        {report.product_name}
                      </p>
                    </div>
                  )}

                  {report.ingredient_list && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                        {t.report.extractedIngredients}
                      </p>
                      <IngredientTags ingredientList={report.ingredient_list} />
                    </div>
                  )}

                  {report.product_category && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.category}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.product_category}
                      </p>
                    </div>
                  )}

                  {report.target_market && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.market}
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
                    {t.report.riskLevel}:{' '}
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
                      ? t.report.riskDescWithIssues(descParts.join(` ${t.common.and} `))
                      : t.report.riskDescCompliant}
                  </p>
                </div>

                {report.ocr_confidence !== undefined && (
                  <OcrConfidenceBar confidence={report.ocr_confidence} />
                )}
              </div>
            </Card>

            {/* ── OVERALL ASSESSMENT FROM VEXIM AI ─────────────────── */}
            <Card className={`overflow-hidden border-2 ${
              riskScore >= 7 
                ? 'border-red-200 bg-red-50' 
                : riskScore >= 2 
                  ? 'border-amber-200 bg-amber-50' 
                  : 'border-green-200 bg-green-50'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`rounded-full p-2.5 ${
                    riskScore >= 7 
                      ? 'bg-red-100' 
                      : riskScore >= 2 
                        ? 'bg-amber-100' 
                        : 'bg-green-100'
                  }`}>
                    {riskScore >= 7 ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : riskScore >= 2 ? (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                    {t.report.overallAssessment}
                  </h2>
                </div>

                {/* Compliance Summary */}
                <div className="space-y-4">
                  {/* Regulations Checked */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {t.report.regulationsChecked}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {t.report.cfr101}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {t.report.cfr701}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        FD&C Act Section 403
                      </span>
                      {report.product_category === 'cosmetic' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                          {t.report.cfr700}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Historical Data Check */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {t.report.historicalDataCheck}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className={`rounded-lg p-3 ${
                        wlViolations.length > 0 ? 'bg-orange-100 border border-orange-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Mail className={`h-4 w-4 ${wlViolations.length > 0 ? 'text-orange-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Warning Letters</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${wlViolations.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {wlViolations.length > 0 ? `${wlViolations.length} ${t.report.related}` : t.report.none}
                        </p>
                      </div>
                      
                      <div className={`rounded-lg p-3 ${
                        recallViolations.length > 0 ? 'bg-purple-100 border border-purple-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <RotateCcw className={`h-4 w-4 ${recallViolations.length > 0 ? 'text-purple-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Recalls</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${recallViolations.length > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                          {recallViolations.length > 0 ? `${recallViolations.length} ${t.report.related}` : t.report.none}
                        </p>
                      </div>
                      
                      <div className={`rounded-lg p-3 ${
                        importAlertViolations.length > 0 ? 'bg-cyan-100 border border-cyan-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Ship className={`h-4 w-4 ${importAlertViolations.length > 0 ? 'text-cyan-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Import Alerts</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${importAlertViolations.length > 0 ? 'text-cyan-600' : 'text-green-600'}`}>
                          {importAlertViolations.length > 0 ? `${importAlertViolations.length} ${t.report.related}` : t.report.none}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div className={`rounded-lg p-4 ${
                    riskScore >= 7 
                      ? 'bg-red-100 border border-red-200' 
                      : riskScore >= 2 
                        ? 'bg-amber-100 border border-amber-200' 
                        : 'bg-green-100 border border-green-200'
                  }`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                      {t.report.conclusion}
                    </p>
                    {riskScore >= 7 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-red-800">
                          {t.report.conclusionHigh}
                        </p>
                        <p className="text-sm text-red-700 leading-relaxed">
                          {t.report.conclusionHighDesc(criticalCount, warningCount, wlViolations.length, recallViolations.length, importAlertViolations.length)}
                        </p>
                      </div>
                    ) : riskScore >= 2 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-amber-800">
                          {t.report.conclusionMedium}
                        </p>
                        <p className="text-sm text-amber-700 leading-relaxed">
                          {t.report.conclusionMediumDesc(warningCount, wlViolations.length === 0 && recallViolations.length === 0 && importAlertViolations.length === 0)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-green-800">
                          {t.report.conclusionLow}
                        </p>
                        <p className="text-sm text-green-700 leading-relaxed">
                          {t.report.conclusionLowDesc(wlViolations.length === 0 && recallViolations.length === 0 && importAlertViolations.length === 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── CFR VIOLATIONS SECTION ───────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {t.report.cfrComplianceDetail}
                </h2>
              </div>

              {cfrViolations.length === 0 && contrastViolations.length === 0 ? (
                <Card className="bg-white border-slate-200 p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {t.report.noCfrViolations}
                  </h3>
                  <p className="text-slate-500">
                    {t.report.labelCompliant}
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
                      t={t}
                    />
                  ))}

                  {/* Contrast violations merged into main list */}
                  {contrastViolations.map((cv, index) => (
                    <ContrastViolationCard
                      key={`contrast-${index}`}
                      violation={cv}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── WARNING LETTERS SECTION ───────────────────────── */}
            {wlViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-4 w-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.warningLettersSection} ({wlViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {wlViolations.map((violation, index) => (
                    <WarningLetterCard key={`wl-${index}`} violation={violation} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* ── RECALLS SECTION ───────────────────────── */}
            {recallViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <RotateCcw className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.recallsSection} ({recallViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {recallViolations.map((violation, index) => (
                    <RecallCard key={`recall-${index}`} violation={violation} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* ── IMPORT ALERTS SECTION ───────────────────────── */}
            {importAlertViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Ship className="h-4 w-4 text-cyan-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.importAlertsSection} ({importAlertViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {importAlertViolations.map((violation, index) => (
                    <ImportAlertCard key={`ia-${index}`} violation={violation} t={t} />
                  ))}
                </div>
              </div>
            )}


          </div>
        </div>
      </main>
    </div>
  )
}
