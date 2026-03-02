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
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import type { AuditReport, LabelImageEntry } from '@/lib/types'
import { LabelPreview } from '@/components/label-preview'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { getLabelConfig } from '@/lib/label-field-config'

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function getRiskLabel(result: string | undefined, violationsCount: number) {
  if (result === 'pass' && violationsCount === 0) {
    return { text: 'Rủi ro thấp (Low Risk)', color: 'text-success', icon: ShieldCheck }
  }
  if (result === 'pass') {
    return { text: 'Rủi ro trung bình (Medium Risk)', color: 'text-warning', icon: ShieldAlert }
  }
  if (result === 'fail') {
    return { text: 'Rủi ro cao (High Risk)', color: 'text-destructive', icon: ShieldAlert }
  }
  return { text: 'Đang đánh giá', color: 'text-muted-foreground', icon: ShieldAlert }
}

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
  const risk = getRiskLabel(report.overall_result, violationsCount)
  const RiskIcon = risk.icon

  return (
    <div className="grid lg:grid-cols-3 gap-6 mb-8">
      {/* Label Display */}
      <Card className="lg:col-span-1">
        <div className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            {report.label_image_url === 'manual-entry' ? 'Xem trước Nhãn' : 'Hình ảnh Nhãn'}
            {report.label_images && report.label_images.length > 1 && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {report.label_images.length} hình ảnh
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
          {(report.target_market ||
            report.packaging_format ||
            report.product_type ||
            report.pdp_dimensions) && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Cấu hình phân tích đã áp dụng
                </span>
              </div>
              <div className="space-y-2">
                {report.target_market && (
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Thị trường:</span>
                    <span className="font-medium">{report.target_market}</span>
                  </div>
                )}
                {report.label_language && report.label_language.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Ngôn ngữ:</span>
                    <span className="font-medium">
                      {report.label_language.join(', ').toUpperCase()}
                    </span>
                  </div>
                )}
                {report.packaging_format && (
                  <div className="flex items-center gap-2 text-xs">
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Bao bì:</span>
                    <span className="font-medium">
                      {report.packaging_format.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {report.product_type && (
                  <div className="flex items-center gap-2 text-xs">
                    <FileSearch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Loại SP:</span>
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
          <h2 className="font-semibold text-lg mb-4">Chi tiết Phân tích</h2>

          {/* Status Overview */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6 pb-6 border-b">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Mức độ rủi ro:</span>
                <div className="flex items-center gap-1.5">
                  <RiskIcon className={`h-4 w-4 ${risk.color}`} />
                  <span className={`font-semibold text-sm ${risk.color}`}>
                    {risk.text}
                  </span>
                </div>
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
                <span
                  className={`font-semibold text-sm ${
                    importAlertCount > 0 ? 'text-warning' : 'text-success'
                  }`}
                >
                  {importAlertCount > 0 ? `${importAlertCount} cảnh báo` : 'Không có'}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {(report as any).pdp_area_square_inches && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Diện tích PDP:</span>
                  <span className="font-medium text-sm">
                    {(report as any).pdp_area_square_inches.toFixed(2)} sq in
                  </span>
                </div>
              )}
              {(report as any).pixels_per_inch && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Độ phân giải:</span>
                  <span className="font-medium text-sm">
                    {(report as any).pixels_per_inch.toFixed(0)} PPI
                  </span>
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
              <h3 className="font-semibold">Dữ liệu Nhãn AI trích xuất</h3>
            </div>

            {/* Nutrition Facts */}
            {report.nutrition_facts && report.nutrition_facts.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-success" />
                  <h4 className="font-medium text-sm">Thành phần Dinh dưỡng</h4>
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
                    <h4 className="font-medium text-sm">Thông tin Sản phẩm</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(report as any).brand_name && (
                      <div>
                        <span className="text-muted-foreground">Thương hiệu:</span>
                        <p className="font-medium mt-0.5">{(report as any).brand_name}</p>
                      </div>
                    )}
                    {report.product_name && (
                      <div>
                        <span className="text-muted-foreground">Sản phẩm:</span>
                        <p className="font-medium mt-0.5">{report.product_name}</p>
                      </div>
                    )}
                    {(report as any).net_quantity && (
                      <div>
                        <span className="text-muted-foreground">Khối lượng tịnh:</span>
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
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-warning" />
                    <h4 className="font-medium text-sm">Chất gây Dị ứng</h4>
                  </div>
                  <p className="text-xs">{report.allergen_declaration}</p>
                </div>
              )}

              {(report as any).health_claims &&
                (report as any).health_claims.length > 0 && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h4 className="font-medium text-sm">Công bố Sức khỏe</h4>
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
                  <span>Ngôn ngữ phát hiện:</span>
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
                  Báo cáo này cần chuyên gia xác minh
                </h3>
                <p className="text-sm text-muted-foreground">
                  {violationsCount > 0
                    ? `Nhãn này có ${violationsCount} vi phạm cần được sửa trước khi phân phối.`
                    : 'Phân tích AI hoàn tất. Khuyến nghị chuyên gia xem xét để phê duyệt cuối cùng.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overall conclusion alert */}
        {report.overall_result === 'pass' && (
          <div className="mx-6 mb-6 p-4 rounded-lg bg-success/10 border border-success/30">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Kết luận: Chưa phát hiện vi phạm trọng yếu</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {violationsCount === 0
                    ? 'Nhãn này tuân thủ các quy định FDA được kiểm tra. Rủi ro thấp (Low Risk) — không phát hiện điểm không phù hợp.'
                    : `Nhãn có ${violationsCount} điểm cần lưu ý nhưng không ảnh hưởng nghiêm trọng đến tuân thủ. Khuyến nghị xem xét và khắc phục.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {report.overall_result === 'fail' && !report.needs_expert_review && (
          <div className="mx-6 mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Kết luận: Phát hiện điểm không phù hợp (High Risk)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Nhãn có {violationsCount} vi phạm nghiêm trọng cần khắc phục trước khi phân phối tại thị trường Mỹ. Vui lòng xem chi tiết bên dưới và thực hiện các hướng dẫn khắc phục.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
