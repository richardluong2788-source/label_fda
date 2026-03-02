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

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-red-500 text-white">
        NGHIÊM TRỌNG
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-amber-500 text-white">
      CẢNH BÁO
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

function ViolationCard({ violation, index }: { violation: Violation; index: number }) {
  const isContrast =
    violation.category?.toLowerCase().includes('contrast') ||
    violation.category?.toLowerCase().includes('tương phản') ||
    violation.category?.toLowerCase().includes('color')

  // Translate category name to proper Vietnamese
  const getCategoryName = (category: string) => {
    const translations: Record<string, string> = {
      'Health Claims': 'Tuyên bố sức khỏe',
      'health claims': 'Tuyên bố sức khỏe',
      'Ingredient Order': 'Thứ tự nguyên liệu',
      'ingredient order': 'Thứ tự nguyên liệu',
      'Color Contrast': 'Độ tương phản màu sắc',
      'color contrast': 'Độ tương phản màu sắc',
      'Missing Information': 'Thiếu thông tin bắt buộc',
      'missing information': 'Thiếu thông tin bắt buộc',
      'Net Weight': 'Khối lượng tịnh',
      'net weight': 'Khối lượng tịnh',
      'Font Size': 'Kích thước chữ',
      'font size': 'Kích thước chữ',
      'Allergen Warning': 'Cảnh báo dị ứng',
      'allergen warning': 'Cảnh báo dị ứng',
      'Nutrition Facts': 'Thông tin dinh dưỡng',
      'nutrition facts': 'Thông tin dinh dưỡng',
    }
    return translations[category] || category
  }

  // Translate suggested fix to Vietnamese if it's in English
  const getVietnameseFix = (fix: string | undefined, category: string) => {
    if (!fix) return 'Liên hệ chuyên gia Vexim để được tư vấn chi tiết.'
    
    // Common English fix patterns -> Vietnamese
    const fixTranslations: Record<string, string> = {
      'Remove all disease treatment/cure claims. Only FDA-approved health claims are allowed.':
        'Loại bỏ từ "prevent", "cure", "treat". Sử dụng các từ mô tả chức năng mỹ phẩm như "reduces friction", "soothes skin".',
      'Ensure ingredients are listed in descending order by weight':
        'Đối chiếu danh sách nguyên liệu với công thức sản xuất. Sắp xếp lại theo thứ tự giảm dần về khối lượng (ingredient chiếm % cao nhất đứng đầu).',
    }
    
    // Return Vietnamese translation if exists, otherwise return original
    return fixTranslations[fix] || fix
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
        <SeverityBadge severity={violation.severity} />
      </div>

      {/* A/B Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Current on label (red) */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            HIỆN TẠI TRÊN NHÃN
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>

        {/* Right: Fix recommendation (green) */}
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            HƯỚNG DẪN KHẮC PHỤC (VEXIM)
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {getVietnameseFix(violation.suggested_fix, violation.category)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Warning Letter Violation Card
// ────────────────────────────────────────────────────────────

function WarningLetterCard({ violation }: { violation: Violation }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="warning_letter" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              Cảnh báo từ FDA Warning Letter
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
        <SeverityBadge severity={violation.severity} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-orange-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-3">
            NỘI DUNG VI PHẠM
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            KHUYẾN NGHỊ TỪ VEXIM
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.suggested_fix || 'Xem xét lại nhãn để tránh các lỗi tương tự đã bị FDA cảnh báo trước đây.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Recall Card
// ────────────────────────────────────────────────────────────

function RecallCard({ violation }: { violation: Violation }) {
  return (
    <div className="rounded-xl border border-purple-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="recall" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              Liên quan đến sản phẩm bị thu hồi
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-purple-100 text-purple-700 border border-purple-200">
                FDA Recall
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-purple-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-3">
            THÔNG TIN THU HỒI
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            KHUYẾN NGHỊ TỪ VEXIM
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.suggested_fix || 'Kiểm tra xem sản phẩm của bạn có thành phần hoặc đặc điểm tương tự với sản phẩm bị thu hồi không.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Import Alert Card
// ────────────────────────────────────────────────────────────

function ImportAlertCard({ violation }: { violation: Violation }) {
  return (
    <div className="rounded-xl border border-cyan-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="import_alert" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              Cảnh báo nhập khẩu FDA
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-100 text-cyan-700 border border-cyan-200">
                Import Alert
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-cyan-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 mb-3">
            NỘI DUNG CẢNH BÁO
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            KHUYẾN NGHỊ TỪ VEXIM
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.suggested_fix || 'Đảm bảo sản phẩm tuân thủ đầy đủ quy định để tránh bị giữ tại cảng nhập khẩu.'}
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
    ? `Tỷ lệ tương phản ${violation.ratio.toFixed(2)}:1 (Yêu cầu tối thiểu 4.5:1)`
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
              Độ tương phản màu sắc thấp
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                Yêu cầu FDA về độ rõ ràng của nhãn
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
            HIỆN TẠI TRÊN NHÃN
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
            HƯỚNG DẪN KHẮC PHỤC (VEXIM)
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {violation.recommendation ||
              'Tăng độ đậm của chữ hoặc thay đổi màu nền để đảm bảo tính dễ đọc.'}
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

  // Risk label with proper Vietnamese
  const riskScore = report.overall_risk_score ?? 5
  const riskLabel =
    riskScore >= 7
      ? 'Cao'
      : riskScore >= 4
        ? 'Trung bình - Cao'
        : riskScore >= 2
          ? 'Trung bình'
          : 'Thấp'

  const criticalCount =
    allViolations.filter((v) => v.severity === 'critical').length +
    contrastViolations.filter((v) => v.severity === 'critical').length
  const warningCount =
    allViolations.filter((v) => v.severity === 'warning').length +
    contrastViolations.filter((v) => v.severity === 'warning' || v.severity === 'info').length

  // Description sentence
  const descParts: string[] = []
  if (criticalCount > 0) descParts.push(`${criticalCount} vi phạm nghiêm trọng`)
  if (warningCount > 0) descParts.push(`${warningCount} cảnh báo`)

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
                THỊ TRƯỜNG: HOA KỲ (FDA)
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
              {pdfLoading ? 'Đang tạo...' : 'Xuất Báo Cáo'}
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
                    Hình ảnh nhãn
                  </h2>
                  {report.label_images && report.label_images.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] uppercase font-bold tracking-wider border-0">
                      {report.label_images.length} HÌNH ẢNH
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
                        Không có dữ liệu
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
                    THÔNG TIN SẢN PHẨM (AI)
                  </h2>
                </div>

                <div className="space-y-3">
                  {(report as any).brand_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        THƯƠNG HIỆU
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {(report as any).brand_name}
                      </p>
                    </div>
                  )}

                  {report.product_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        TÊN SẢN PHẨM
                      </p>
                      <p className="text-sm font-medium text-slate-700 italic">
                        {report.product_name}
                      </p>
                    </div>
                  )}

                  {report.ingredient_list && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                        THÀNH PHẦN TRÍCH XUẤT
                      </p>
                      <IngredientTags ingredientList={report.ingredient_list} />
                    </div>
                  )}

                  {report.product_category && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        DANH MỤC
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.product_category}
                      </p>
                    </div>
                  )}

                  {report.target_market && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        THỊ TRƯỜNG
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
                    Mức độ rủi ro:{' '}
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
                      ? `Nhãn có ${descParts.join(' và ')} cần được sửa trước khi phân phối.`
                      : 'Nhãn tuân thủ các quy định FDA được kiểm tra. Rủi ro thấp.'}
                  </p>
                </div>

                {report.ocr_confidence !== undefined && (
                  <OcrConfidenceBar confidence={report.ocr_confidence} />
                )}
              </div>
            </Card>

            {/* ── CFR VIOLATIONS SECTION ───────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  CHI TIẾT KIỂM TRA TUÂN THỦ (21 CFR)
                </h2>
              </div>

              {cfrViolations.length === 0 && contrastViolations.length === 0 ? (
                <Card className="bg-white border-slate-200 p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Không có vi phạm CFR
                  </h3>
                  <p className="text-slate-500">
                    Nhãn của bạn tuân thủ tất cả các quy định FDA được kiểm tra
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

            {/* ── WARNING LETTERS SECTION ───────────────────────── */}
            {wlViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-4 w-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    CẢNH BÁO TỪ FDA WARNING LETTERS ({wlViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {wlViolations.map((violation, index) => (
                    <WarningLetterCard key={`wl-${index}`} violation={violation} />
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
                    LIÊN QUAN ĐẾN SẢN PHẨM BỊ THU HỒI ({recallViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {recallViolations.map((violation, index) => (
                    <RecallCard key={`recall-${index}`} violation={violation} />
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
                    CẢNH BÁO NHẬP KHẨU FDA ({importAlertViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {importAlertViolations.map((violation, index) => (
                    <ImportAlertCard key={`ia-${index}`} violation={violation} />
                  ))}
                </div>
              </div>
            )}

            {/* ── EXPERT CTA - Just a hint to scroll down ────── */}
            {(report.needs_expert_review || allViolations.length > 0) && (
              <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="rounded-full bg-blue-600/20 p-3 shrink-0">
                    <Search className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      Cần hỗ trợ từ chuyên gia?
                    </h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-lg">
                      Hệ thống phát hiện các điểm cần chuyên gia xem xét kỹ hơn để tối ưu hóa khả năng thông quan và tránh bị FDA Warning Letter.
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
                  Xem chi tiết tư vấn
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
