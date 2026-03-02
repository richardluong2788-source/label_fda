'use client'

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

const ANALYSIS_STEPS = [
  {
    id: 'vision',
    title: 'Phan tich hinh anh bang GPT-4 Vision',
    description: 'Dang quet va trich xuat van ban, mau sac, kich thuoc chu, va layout tu nhan...',
    icon: ScanLine,
    progress: 15,
    details: [
      'Optical Character Recognition (OCR)',
      'Phat hien Nutrition Facts panel',
      'Do luong kich thuoc chu',
      'Phan tich mau sac va contrast',
    ],
  },
  {
    id: 'fda_search',
    title: 'Tra cuu FDA Regulations (Knowledge Base)',
    description: 'Dang tim kiem quy dinh FDA trong Knowledge Base voi RAG AI (Do tuong dong 99%)...',
    icon: Database,
    progress: 35,
    details: [
      '21 CFR Phan 101 - Nhan dinh duong',
      'FALCPA - Luat chat gay di ung',
      'Quy dinh ve Health Claims',
      'Yeu cau liet ke thanh phan',
    ],
  },
  {
    id: 'geometry',
    title: 'Kiem tra hinh hoc va kich thuoc',
    description: 'Dang xac minh kich thuoc panel, font size, va spacing theo quy dinh FDA...',
    icon: FileSearch,
    progress: 55,
    details: [
      'Tinh dien tich Principal Display Panel',
      'Kiem tra minimum font size',
      'Xac minh spacing va margins',
      'Do luong hairlines',
    ],
  },
  {
    id: 'allergen',
    title: 'Phan tich chat gay di ung (Allergens)',
    description: 'Dang kiem tra khai bao allergen theo FALCPA Section 203...',
    icon: Shield,
    progress: 70,
    details: [
      'Milk, Eggs, Fish, Shellfish',
      'Tree nuts, Peanuts, Wheat, Soybeans',
      'Kiem tra "Contains:" statement',
      'Xac minh bold formatting',
    ],
  },
  {
    id: 'nutrition',
    title: 'Xac thuc Nutrition Facts',
    description: 'Dang kiem tra format, rounding, va thu tu nutrients...',
    icon: FileText,
    progress: 85,
    details: [
      'Tuan thu khau phan (Serving size)',
      'Khai bao Calorie',
      'Quy tac lam tron chat dinh duong',
      'Ty le Gia tri Hang ngay (% DV)',
    ],
  },
  {
    id: 'mapping',
    title: 'Anh xa vi pham voi trich dan CFR',
    description: 'Dang tao bao cao thuong mai voi trich dan chinh xac tu FDA...',
    icon: Sparkles,
    progress: 95,
    details: [
      'Dinh dang trich dan thong minh',
      'Anh xa vi pham → CFR',
      'Tao bao cao thuong mai',
      'Khuyen nghi chuyen gia',
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
  const currentStep = ANALYSIS_STEPS[currentStepIndex]
  const StepIcon = currentStep.icon

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
              {report.label_image_url === 'manual-entry' ? 'Xem truoc Nhan' : 'Hinh anh Nhan'}
              {report.label_images && report.label_images.length > 1 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {report.label_images.length} hinh anh
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
                  <div className="text-muted-foreground">Khong co du lieu dinh duong</div>
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
                <h2 className="text-lg font-semibold">Tien trinh phan tich</h2>
                <Badge variant="secondary">{progress}%</Badge>
              </div>
              <Progress value={progress} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                Buoc {currentStepIndex + 1} / {ANALYSIS_STEPS.length}
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
              <h3 className="font-semibold mb-4">Quy trinh phan tich FDA</h3>
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
                          Hoan thanh
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
          Cau hinh phan tich
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
