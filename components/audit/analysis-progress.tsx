'use client'

import { useEffect, useRef, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  ScanLine,
  Database,
  Shield,
  FileText,
  FileSearch,
  Sparkles,
  Settings,
  Globe,
  Languages,
  Package,
  Ruler,
} from 'lucide-react'
import type { AuditReport, LabelImageEntry } from '@/lib/types'
import { LabelPreview } from '@/components/label-preview'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { getLabelConfig } from '@/lib/label-field-config'
import { useTranslation } from '@/lib/i18n'

// Progress thresholds define the START point of each step.
// Steps are distributed EVENLY so fake progress cycles through ALL steps
// while waiting for server. This gives users visual feedback that work is progressing.
// NOTE: Text content is now provided via i18n - see getLocalizedSteps()
const ANALYSIS_STEP_CONFIG = [
  { id: 'vision', icon: ScanLine, progress: 0 },
  { id: 'fda_search', icon: Database, progress: 20 },
  { id: 'geometry', icon: FileSearch, progress: 40 },
  { id: 'allergen', icon: Shield, progress: 55 },
  { id: 'nutrition', icon: FileText, progress: 70 },
  { id: 'mapping', icon: Sparkles, progress: 85 },
]

// Build localized steps from i18n
function getLocalizedSteps(t: ReturnType<typeof useTranslation>['t']) {
  const ap = t.analysisProgress
  return [
    {
      id: 'vision',
      title: ap.visionTitle,
      description: ap.visionDesc,
      icon: ScanLine,
      progress: 0,
      details: [ap.visionDetail1, ap.visionDetail2, ap.visionDetail3, ap.visionDetail4],
    },
    {
      id: 'fda_search',
      title: ap.fdaSearchTitle,
      description: ap.fdaSearchDesc,
      icon: Database,
      progress: 20,
      details: [ap.fdaSearchDetail1, ap.fdaSearchDetail2, ap.fdaSearchDetail3, ap.fdaSearchDetail4],
    },
    {
      id: 'geometry',
      title: ap.geometryTitle,
      description: ap.geometryDesc,
      icon: FileSearch,
      progress: 40,
      details: [ap.geometryDetail1, ap.geometryDetail2, ap.geometryDetail3, ap.geometryDetail4],
    },
    {
      id: 'allergen',
      title: ap.allergenTitle,
      description: ap.allergenDesc,
      icon: Shield,
      progress: 55,
      details: [ap.allergenDetail1, ap.allergenDetail2, ap.allergenDetail3, ap.allergenDetail4],
    },
    {
      id: 'nutrition',
      title: ap.nutritionTitle,
      description: ap.nutritionDesc,
      icon: FileText,
      progress: 70,
      details: [ap.nutritionDetail1, ap.nutritionDetail2, ap.nutritionDetail3, ap.nutritionDetail4],
    },
    {
      id: 'mapping',
      title: ap.mappingTitle,
      description: ap.mappingDesc,
      icon: Sparkles,
      progress: 85,
      details: [ap.mappingDetail1, ap.mappingDetail2, ap.mappingDetail3, ap.mappingDetail4],
    },
  ]
}

// Legacy export for compatibility (uses Vietnamese hardcoded)
const ANALYSIS_STEPS = [
  {
    id: 'vision',
    title: 'Phân tích hình ảnh bằng GPT-4 Vision',
    description: 'Đang quét và trích xuất văn bản, màu sắc, kích thước chữ, và layout từ nhãn...',
    icon: ScanLine,
    progress: 0,
    details: [
      'Optical Character Recognition (OCR)',
      'Phát hiện Nutrition Facts panel',
      'Đo lường kích thước chữ',
      'Phân tích màu sắc và contrast',
    ],
  },
  {
    id: 'fda_search',
    title: 'Tra cứu FDA Regulations (Knowledge Base)',
    description: 'Đang tìm kiếm quy định FDA trong Knowledge Base với RAG AI (Độ tương đồng 99%)...',
    icon: Database,
    progress: 20,
    details: [
      '21 CFR Phần 101 - Nhãn dinh dưỡng',
      'FALCPA - Luật chất gây dị ứng',
      'Quy định về Health Claims',
      'Yêu cầu liệt kê thành phần',
    ],
  },
  {
    id: 'geometry',
    title: 'Kiểm tra hình học và kích thước',
    description: 'Đang xác minh kích thước panel, font size, và spacing theo quy định FDA...',
    icon: FileSearch,
    progress: 40,
    details: [
      'Tính diện tích Principal Display Panel',
      'Kiểm tra minimum font size',
      'Xác minh spacing và margins',
      'Đo lường hairlines',
    ],
  },
  {
    id: 'allergen',
    title: 'Phân tích chất gây dị ứng (Allergens)',
    description: 'Đang kiểm tra khai báo allergen theo FALCPA Section 203...',
    icon: Shield,
    progress: 55,
    details: [
      'Milk, Eggs, Fish, Shellfish',
      'Tree nuts, Peanuts, Wheat, Soybeans',
      'Kiểm tra "Contains:" statement',
      'Xác minh bold formatting',
    ],
  },
  {
    id: 'nutrition',
    title: 'Xác thực Nutrition Facts',
    description: 'Đang kiểm tra format, rounding, và thứ tự nutrients...',
    icon: FileText,
    progress: 70,
    details: [
      'Tuân thủ khẩu phần (Serving size)',
      'Khai báo Calorie',
      'Quy tắc làm tròn chất dinh dưỡng',
      'Tỷ lệ Giá trị Hàng ngày (% DV)',
    ],
  },
  {
    id: 'mapping',
    title: 'Ánh xạ vi phạm với trích dẫn CFR',
    description: 'Đang tạo báo cáo thương mại với trích dẫn chính xác từ FDA...',
    icon: Sparkles,
    progress: 85,
    details: [
      'Định dạng trích dẫn thông minh',
      'Ánh xạ vi phạm → CFR',
      'Tạo báo cáo thương mại',
      'Khuyến nghị chuyên gia',
    ],
  },
]

interface AnalysisProgressViewProps {
  report: AuditReport
  progress: number
  currentStepIndex: number
  scanPosition: number
  analyzing: boolean
  onBack: () => void
}

export function AnalysisProgressView({
  report,
  progress,
  currentStepIndex,
  scanPosition,
  analyzing,
  onBack,
}: AnalysisProgressViewProps) {
  const { t } = useTranslation()
  const ap = t.analysisProgress
  
  // Get localized steps based on current language
  const localizedSteps = useMemo(() => getLocalizedSteps(t), [t])
  const currentStep = localizedSteps[currentStepIndex]
  const StepIcon = currentStep.icon

  // Auto-scroll: giữ bước active hiển thị ở cuối danh sách
  const stepListRef = useRef<HTMLDivElement>(null)
  const activeStepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = stepListRef.current
    const activeEl  = activeStepRef.current
    if (!container || !activeEl) return

    const containerTop    = container.getBoundingClientRect().top
    const activeBottom    = activeEl.getBoundingClientRect().bottom
    const containerHeight = container.clientHeight
    const targetScrollTop = container.scrollTop + (activeBottom - containerTop) - containerHeight + 8

    container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' })
  }, [currentStepIndex])

  return (
    <div className="flex-1">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Badge variant="outline" className="font-mono text-xs">
            ID: {report.id?.slice(0, 8)}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Label Preview with Scanning Animation */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              {report.label_image_url === 'manual-entry' ? ap.labelPreview : ap.labelImages}
              {report.label_images && report.label_images.length > 1 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {report.label_images.length} {ap.images}
                </Badge>
              )}
            </h2>
            {report.label_image_url === 'manual-entry' ? (
              <div className="relative rounded-lg overflow-hidden bg-muted p-4 flex items-center justify-center">
                {report.form_data && report.product_category ? (
                  <LabelPreview
                    config={getLabelConfig(report.product_category)}
                    formData={report.form_data}
                  />
                ) : (
                  <div className="text-muted-foreground">{ap.noNutritionData}</div>
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

            <AnalysisConfigBadges report={report} />
          </Card>

          {/* Analysis Progress */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{ap.title}</h2>
                <Badge variant="secondary">{Math.round(progress)}%</Badge>
              </div>
              <Progress value={progress} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                {ap.step} {currentStepIndex + 1} {ap.of} {localizedSteps.length}
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
              <h3 className="font-semibold mb-4">{ap.fdaProcessTitle}</h3>
              <div
                ref={stepListRef}
                className="space-y-3 max-h-72 overflow-y-auto pr-1 scroll-smooth"
              >
                {localizedSteps.map((step, idx) => {
                  const Icon = step.icon
                  const isCompleted = idx < currentStepIndex
                  const isCurrent = idx === currentStepIndex
                  const isPending = idx > currentStepIndex

                  return (
                    <div
                      key={step.id}
                      ref={isCurrent ? activeStepRef : null}
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
                            ? 'bg-green-500 text-background'
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
                          {ap.completed}
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

/** Shared badge strip showing the analysis configuration applied */
export function AnalysisConfigBadges({ report }: { report: AuditReport }) {
  const { t } = useTranslation()
  
  if (
    !report.target_market &&
    !report.packaging_format &&
    !report.product_type &&
    !report.pdp_dimensions
  ) {
    return null
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {t.analysisProgress.analysisConfig}
        </span>
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
            {report.pdp_dimensions.width} x {report.pdp_dimensions.height}{' '}
            {report.pdp_dimensions.unit}
          </Badge>
        )}
      </div>
    </div>
  )
}

export { ANALYSIS_STEPS }
