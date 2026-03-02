'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  FileSearch,
  Shield,
  Sparkles,
  Database,
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

// ────────────────────────────────────────────────────────────
// Report Summary Header (3-column grid in results view)
// ────────────────────────────────────────────────────────────

interface ReportSummaryProps {
  report: AuditReport
  violationsCount: number
  citationsCount: number
  importAlertCount: number
}

export function ReportSummary({
  report,
  violationsCount,
  citationsCount,
  importAlertCount,
}: ReportSummaryProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-6 mb-8">
      {/* Label Display */}
      <Card className="lg:col-span-1">
        <div className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            {report.label_image_url === 'manual-entry' ? 'Xem truoc Nhan' : 'Hinh anh Nhan'}
            {report.label_images && report.label_images.length > 1 && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {report.label_images.length} hinh anh
              </Badge>
            )}
          </h2>
          {report.label_image_url === 'manual-entry' ? (
            <div className="rounded-lg overflow-hidden bg-muted p-4 flex items-center justify-center">
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
            />
          )}
          {report.product_name && (
            <h3 className="text-xl font-bold mt-4">{report.product_name}</h3>
          )}

          {/* Analysis Settings Summary */}
          {(report.target_market ||
            report.packaging_format ||
            report.product_type ||
            report.pdp_dimensions) && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Cau hinh phan tich da ap dung
                </span>
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
                    <span className="font-medium">
                      {report.label_language.join(', ').toUpperCase()}
                    </span>
                  </div>
                )}
                {report.packaging_format && (
                  <div className="flex items-center gap-2 text-xs">
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Bao bi:</span>
                    <span className="font-medium">
                      {report.packaging_format.replace(/_/g, ' ')}
                    </span>
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
                      {report.pdp_dimensions.width} x {report.pdp_dimensions.height}{' '}
                      {report.pdp_dimensions.unit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Analysis Detail */}
      <Card className="lg:col-span-2">
        <div className="p-6">
          <h2 className="font-semibold text-lg mb-4">Chi tiet Phan tich</h2>

          {/* Status Overview */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6 pb-6 border-b">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Trang thai:</span>
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
                    ? 'Dang xu ly'
                    : report.status === 'ai_completed'
                    ? 'Cho Xem xet'
                    : 'Da Xac minh'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Ngay tao:</span>
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
                <span className="text-muted-foreground text-sm">Vi pham CFR:</span>
                <span className="font-semibold text-sm">{violationsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Trich dan CFR:</span>
                <span className="font-semibold text-sm">{citationsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Rui ro Import Alert:</span>
                <span
                  className={`font-semibold text-sm ${
                    importAlertCount > 0 ? 'text-warning' : 'text-success'
                  }`}
                >
                  {importAlertCount > 0 ? `${importAlertCount} canh bao` : 'Khong co'}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {(report as any).pdp_area_square_inches && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Dien tich PDP:</span>
                  <span className="font-medium text-sm">
                    {(report as any).pdp_area_square_inches.toFixed(2)} sq in
                  </span>
                </div>
              )}
              {(report as any).pixels_per_inch && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Do phan giai:</span>
                  <span className="font-medium text-sm">
                    {(report as any).pixels_per_inch.toFixed(0)} PPI
                  </span>
                </div>
              )}
              {report.product_category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Danh muc:</span>
                  <span className="font-medium text-sm">{report.product_category}</span>
                </div>
              )}
              {report.ocr_confidence !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Do tin cay OCR:</span>
                  <span className="font-medium text-sm">
                    {Math.round(report.ocr_confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI Extracted Content */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Du lieu Nhan AI trich xuat</h3>
            </div>

            {/* Nutrition Facts */}
            {report.nutrition_facts && report.nutrition_facts.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-success" />
                  <h4 className="font-medium text-sm">Thanh phan Dinh duong</h4>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {report.nutrition_facts.length} nutrients
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {report.nutrition_facts.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs py-1 px-2 rounded bg-muted/50"
                    >
                      <span className="text-muted-foreground">{item.name}:</span>
                      <span className="font-medium">
                        {item.value}
                        {item.unit}
                        {item.daily_value && (
                          <span className="text-muted-foreground ml-1">
                            ({item.daily_value}% DV)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Info */}
            <div className="grid sm:grid-cols-2 gap-3">
              {(report.product_name ||
                (report as any).brand_name ||
                (report as any).net_quantity) && (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileSearch className="h-4 w-4 text-primary" />
                    <h4 className="font-medium text-sm">Thong tin San pham</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(report as any).brand_name && (
                      <div>
                        <span className="text-muted-foreground">Thuong hieu:</span>
                        <p className="font-medium mt-0.5">{(report as any).brand_name}</p>
                      </div>
                    )}
                    {report.product_name && (
                      <div>
                        <span className="text-muted-foreground">San pham:</span>
                        <p className="font-medium mt-0.5">{report.product_name}</p>
                      </div>
                    )}
                    {(report as any).net_quantity && (
                      <div>
                        <span className="text-muted-foreground">Khoi luong tinh:</span>
                        <p className="font-medium mt-0.5">{(report as any).net_quantity}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {report.ingredient_list && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="h-4 w-4 text-purple-600" />
                    <h4 className="font-medium text-sm">Thanh phan</h4>
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
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-warning" />
                    <h4 className="font-medium text-sm">Chat gay Di ung</h4>
                  </div>
                  <p className="text-xs">{report.allergen_declaration}</p>
                </div>
              )}

              {(report as any).health_claims &&
                (report as any).health_claims.length > 0 && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h4 className="font-medium text-sm">Cong bo Suc khoe</h4>
                    </div>
                    <div className="space-y-1">
                      {(report as any).health_claims.map((claim: string, idx: number) => (
                        <p key={idx} className="text-xs text-purple-800">
                          {'- '}
                          {claim}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Detected Languages */}
            {(report as any).detected_languages &&
              (report as any).detected_languages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Ngon ngu phat hien:</span>
                  <div className="flex gap-1">
                    {(report as any).detected_languages.map(
                      (lang: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Needs expert review alert */}
        {report.needs_expert_review && (
          <div className="mx-6 mb-6 p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">
                  Bao cao nay can chuyen gia xac minh
                </h3>
                <p className="text-sm text-muted-foreground">
                  {violationsCount > 0
                    ? `Nhan nay co ${violationsCount} vi pham can duoc sua truoc khi phan phoi.`
                    : 'Phan tich AI hoan tat. Khuyen nghi chuyen gia xem xet de phe duyet cuoi cung.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pass result alert */}
        {report.overall_result === 'pass' && (
          <div className="mx-6 mb-6 p-4 rounded-lg bg-success/10 border border-success/30">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Danh gia tong the</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {violationsCount === 0
                    ? 'Nhan nay tuan thu cac quy dinh FDA. Khong phat hien vi pham.'
                    : `Nhan nay co ${violationsCount} vi pham can duoc sua truoc khi phan phoi.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
