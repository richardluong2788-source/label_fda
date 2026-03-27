import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Lock,
  Zap,
  Shield,
  TrendingDown,
  Eye,
  FileText,
  Users,
  Clock,
  Award,
  HelpCircle,
  Image as ImageIcon,
  Sparkles,
  Target,
} from 'lucide-react'
import type { LabelImageEntry } from '@/lib/types'
import Link from 'next/link'

// Always render fresh — never cache. This is critical so that when a report
// is unlocked (report_unlocked = true), the redirect to /audit/[id] fires
// immediately instead of serving a stale cached preview.
export const dynamic = 'force-dynamic'

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: report, error } = await supabase
    .from('audit_reports')
    .select(`
      *,
      violations,
      overall_risk_score,
      projected_risk_score
    `)
    .eq('id', id)
    .single()

  if (error || !report) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Báo cáo không tìm thấy</h2>
          <p className="text-muted-foreground mb-4">
            Báo cáo bạn đang tìm không tồn tại.
          </p>
          <Button asChild>
            <Link href="/dashboard">Quay lại Dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (report.report_unlocked || report.payment_status === 'paid') {
    redirect(`/audit/${id}`)
  }

  // Stats
  const violationCount = report.violations?.length || 0
  const criticalCount =
    report.violations?.filter((v: any) => v.severity === 'critical').length || 0
  const warningCount =
    report.violations?.filter((v: any) => v.severity === 'warning').length || 0
  const infoCount =
    report.violations?.filter((v: any) => v.severity === 'info').length || 0

  const currentRisk = Number((report.overall_risk_score || 0).toFixed(1))
  const projectedRisk = Number((report.projected_risk_score || 0).toFixed(1))
  const riskReduction =
    currentRisk > 0
      ? Math.round(((currentRisk - projectedRisk) / currentRisk) * 100)
      : 0
  const riskPercent = Math.round((currentRisk / 10) * 100)

  const { count: kbDocCount } = await supabase
    .from('compliance_knowledge')
    .select('*', { count: 'exact', head: true })
  const kbTotal = kbDocCount ?? 0
  const kbLabel =
    kbTotal > 0
      ? `${kbTotal.toLocaleString()} tài liệu FDA`
      : '21 CFR Regulations'

  const sampleViolation =
    report.violations && report.violations.length > 0
      ? report.violations[0]
      : null

  // Label images
  const labelImages: LabelImageEntry[] = report.label_images || []
  const hasImages =
    labelImages.length > 0 ||
    (report.label_image_url && report.label_image_url !== 'manual-entry')

  const riskColor =
    currentRisk >= 7
      ? 'text-destructive'
      : currentRisk >= 4
        ? 'text-orange-600'
        : 'text-green-600'
  const riskBg =
    currentRisk >= 7
      ? 'bg-destructive/10'
      : currentRisk >= 4
        ? 'bg-orange-500/10'
        : 'bg-green-500/10'
  const riskProgressColor =
    currentRisk >= 7
      ? '[&>div]:bg-destructive'
      : currentRisk >= 4
        ? '[&>div]:bg-orange-500'
        : '[&>div]:bg-green-500'

  return (
    <main className="pb-16">
      {/* Hero banner */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3 ${riskBg}`}>
                <Shield className={`h-7 w-7 ${riskColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold text-balance">
                    {report.product_name || 'Phân tích Nhãn sản phẩm'}
                  </h1>
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary text-[10px] uppercase tracking-wider"
                  >
                    Xem trước
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {'Phân tích sơ bộ hoàn tất \u2022 Đăng ký gói để mở khóa báo cáo đầy đủ'}
                </p>
              </div>
            </div>
            <Button size="lg" className="gap-2 shrink-0" asChild>
              <Link href="/pricing">
                <Zap className="h-4 w-4" />
                Mở khóa Báo cáo
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product label images */}
            {hasImages && (
              <Card className="overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold text-sm">
                      Hình ảnh Nhãn đã tải lên
                    </h2>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {labelImages.length || 1} ảnh
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {labelImages.length > 0
                      ? labelImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="group relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted/40"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={`Label ${img.type}`}
                              className="object-contain w-full h-full"
                            />
                            <Badge
                              variant="secondary"
                              className="absolute bottom-2 left-2 text-[10px] capitalize"
                            >
                              {img.type === 'pdp'
                                ? 'PDP'
                                : img.type === 'nutrition'
                                  ? 'Nutrition Facts'
                                  : img.type === 'ingredients'
                                    ? 'Ingredients'
                                    : 'Other'}
                            </Badge>
                          </div>
                        ))
                      : report.label_image_url &&
                        report.label_image_url !== 'manual-entry' && (
                          <div className="group relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted/40 col-span-2 sm:col-span-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={report.label_image_url}
                              alt="Product label"
                              className="object-contain w-full h-full"
                            />
                          </div>
                        )}
                  </div>
                </div>
              </Card>
            )}

            {/* Risk score card */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold">
                    Đánh giá Rủi ro Tuân thủ
                  </h2>
                  <Badge variant="outline" className="text-[10px]">
                    <Award className="h-3 w-3 mr-1" />
                    AI&nbsp;Analysis
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Current risk */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rủi ro hiện tại
                    </p>
                    <div className="flex items-end gap-1.5">
                      <span className={`text-5xl font-extrabold tabular-nums ${riskColor}`}>
                        {currentRisk}
                      </span>
                      <span className="text-lg text-muted-foreground mb-2">
                        / 10
                      </span>
                    </div>
                    <Progress
                      value={riskPercent}
                      className={`h-2 ${riskProgressColor}`}
                    />
                    <div className="flex items-center gap-1.5">
                      {currentRisk >= 7 ? (
                        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : currentRisk >= 4 ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      )}
                      <span className={`text-xs font-medium ${riskColor}`}>
                        {currentRisk >= 7
                          ? 'Rủi ro Cao - Cần Xử lý'
                          : currentRisk >= 4
                            ? 'Rủi ro Trung bình'
                            : 'Rủi ro Thấp'}
                      </span>
                    </div>
                  </div>

                  {/* Projected risk */}
                  <div className="space-y-3 md:border-l md:pl-6">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sau khi Khắc phục
                    </p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-5xl font-extrabold tabular-nums text-green-600">
                        {projectedRisk}
                      </span>
                      <span className="text-lg text-muted-foreground mb-2">
                        / 10
                      </span>
                    </div>
                    <Progress
                      value={Math.round((projectedRisk / 10) * 100)}
                      className="h-2 [&>div]:bg-green-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-600">
                        {'↓'} {riskReduction}% Giảm Rủi ro
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {kbTotal > 0
                    ? `Phân tích bởi AI được đào tạo trên ${kbLabel}`
                    : 'Phân tích dựa trên 21 CFR Regulations'}
                </div>
              </div>
            </Card>

            {/* Violation counters */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center border-destructive/20">
                <div className="text-3xl font-bold text-destructive tabular-nums">
                  {criticalCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nghiêm trọng
                </p>
              </Card>
              <Card className="p-4 text-center border-orange-300/40">
                <div className="text-3xl font-bold text-orange-600 tabular-nums">
                  {warningCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cảnh báo
                </p>
              </Card>
              <Card className="p-4 text-center border-primary/20">
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {infoCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Thông tin
                </p>
              </Card>
            </div>

            {/* Extracted data */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">
                    Thông tin Trích xuất từ Nhãn
                  </h2>
                  {report.ocr_confidence && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      Độ chính xác: {Math.round(report.ocr_confidence * 100)}%
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  {(report.brand_name ||
                    report.product_name ||
                    report.net_quantity) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {report.brand_name && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                            Thương hiệu
                          </p>
                          <p className="text-sm font-medium">
                            {report.brand_name}
                          </p>
                        </div>
                      )}
                      {report.product_name && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                            Sản phẩm
                          </p>
                          <p className="text-sm font-medium">
                            {report.product_name}
                          </p>
                        </div>
                      )}
                      {report.net_quantity && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                            Khối lượng tịnh
                          </p>
                          <p className="text-sm font-medium">
                            {report.net_quantity}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {report.nutrition_facts &&
                    report.nutrition_facts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">
                          Thành phần Dinh dưỡng
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {report.nutrition_facts
                            .slice(0, 8)
                            .map((fact: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2 rounded bg-muted/30 text-xs"
                              >
                                <span className="text-muted-foreground">
                                  {fact.name}:
                                </span>{' '}
                                <span className="font-medium">
                                  {fact.value}
                                  {fact.unit}
                                </span>
                              </div>
                            ))}
                        </div>
                        {report.nutrition_facts.length > 8 && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            +{report.nutrition_facts.length - 8} thành phần khác
                            trong báo cáo đầy đủ
                          </p>
                        )}
                      </div>
                    )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.ingredient_list && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                          Danh sách Thành phần
                        </p>
                        <p className="text-xs line-clamp-2">
                          {report.ingredient_list}
                        </p>
                      </div>
                    )}
                    {report.allergen_declaration && (
                      <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <p className="text-[10px] text-orange-900 font-medium uppercase tracking-wider mb-0.5">
                          Chất gây dị ứng
                        </p>
                        <p className="text-xs text-orange-800">
                          {report.allergen_declaration}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-primary">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      Hệ thống đã trích xuất tự động từ hình ảnh. Trong báo cáo đầy đủ, bạn có thể chỉnh sửa và phân tích lại nếu phát hiện sai sót.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Sample violation */}
            {sampleViolation && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold">
                      Ví dụ Vi phạm được Phát hiện
                    </h2>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      1 / {violationCount}
                    </Badge>
                  </div>

                  <div className="rounded-lg border p-4 bg-muted/20">
                    <div className="flex items-start gap-3">
                      {sampleViolation.severity === 'critical' ? (
                        <div className="rounded-full bg-destructive/10 p-1.5 mt-0.5">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                      ) : sampleViolation.severity === 'warning' ? (
                        <div className="rounded-full bg-orange-500/10 p-1.5 mt-0.5">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </div>
                      ) : (
                        <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                          <AlertCircle className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h4 className="font-semibold text-sm">
                            {sampleViolation.category}
                          </h4>
                          <Badge
                            variant={
                              sampleViolation.severity === 'critical'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {sampleViolation.severity === 'critical'
                              ? 'Nghiêm trọng'
                              : sampleViolation.severity === 'warning'
                                ? 'Cảnh báo'
                                : 'Thông tin'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {sampleViolation.description}
                        </p>
                        <div className="text-xs text-muted-foreground bg-background rounded p-2 border">
                          <span className="font-medium">Quy định:</span>{' '}
                          {sampleViolation.regulation_reference ||
                            '21 CFR 101.x'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Locked remaining violations */}
                  {violationCount > 1 && (
                    <div className="mt-4 relative rounded-lg border border-dashed border-muted-foreground/25 p-4 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background/95 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
                        <div className="rounded-full bg-muted p-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">
                          +{violationCount - 1} vi phạm khác trong báo cáo đầy đủ
                        </p>
                      </div>
                      {/* Fake blurred content */}
                      <div className="space-y-3 opacity-40 select-none" aria-hidden>
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="rounded-full bg-muted p-1.5">
                              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 bg-muted rounded w-2/3" />
                              <div className="h-2.5 bg-muted rounded w-full" />
                              <div className="h-2.5 bg-muted rounded w-4/5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Methodology */}
            <Card>
              <div className="p-6">
                <h2 className="font-semibold mb-4">
                  Phương pháp Phân tích
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: 'Phân tích hình ảnh Nhãn của bạn',
                      desc: 'Trích xuất thông tin dinh dưỡng, thành phần, allergens từ nhãn sản phẩm',
                    },
                    {
                      step: 2,
                      title:
                        kbTotal > 0
                          ? `Đối chiếu với ${kbLabel} thực tế từ FDA`
                          : 'Đối chiếu với 21 CFR Regulations',
                      desc: 'So sánh với các trường hợp vi phạm đã bị FDA xử phạt và 21 CFR regulations',
                    },
                    {
                      step: 3,
                      title:
                        'Đánh giá Mức độ Rủi ro & Khuyến nghị Xử lý',
                      desc: 'Xác định vấn đề nghiêm trọng và cung cấp hướng dẫn sửa chữa cụ thể',
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* FAQ */}
            <Card>
              <div className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Câu hỏi Thường gặp
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      q: 'Độ chính xác của phân tích AI như thế nào?',
                      a:
                        kbTotal > 0
                          ? `AI của chúng tôi được đào tạo trên ${kbLabel} thực tế và liên tục được cập nhật. Tỷ lệ phát hiện vi phạm đạt 95%+, tương đương với chuyên gia compliance.`
                          : 'AI của chúng tôi sử dụng 21 CFR Regulations để phân tích. Tỷ lệ phát hiện vi phạm đạt 95%+.',
                    },
                    {
                      q: 'Tôi có thể yêu cầu chuyên gia review không?',
                      a: 'Có! Sau khi xem báo cáo AI, bạn có thể yêu cầu chuyên gia FDA compliance review chi tiết và giải đáp thắc mắc cụ thể.',
                    },
                    {
                      q: 'Nếu tôi không đồng ý với kết quả phân tích?',
                      a: 'Chúng tôi có chính sách hoàn tiền 100% trong vòng 30 ngày nếu bạn không hài lòng. Bạn cũng có thể yêu cầu review lại miễn phí.',
                    },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <p className="text-sm font-medium mb-1">{item.q}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - sticky wrapper contains both cards so CTA never overlaps expert card */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-6">
            {/* CTA Card */}
            <Card className="border-primary/30 shadow-lg shadow-primary/5 overflow-hidden">
              {/* coloured top strip */}
              <div className="h-1 bg-primary" />
              <div className="p-6">
                <h3 className="font-semibold mb-4">
                  Báo cáo Chi tiết bao gồm:
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {[
                    `Phân tích chi tiết ${violationCount} vi phạm`,
                    'Trích dẫn chính xác 21 CFR regulations',
                    'So sánh với FDA Warning Letters',
                    'Hướng dẫn khắc phục từng bước',
                    'Ma trận ưu tiên xử lý',
                    'Xuất PDF để lưu trữ / chia sẻ',
                  ].map((txt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{txt}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-5 border-t space-y-3">
                  <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-center">
                    <p className="text-[10px] text-orange-900 leading-relaxed">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      FDA cập nhật cảnh báo liên tục. Kết quả này chỉ được lưu trong 7 ngày.
                    </p>
                  </div>

                  <Button className="w-full gap-2" size="lg" asChild>
                    <Link href="/pricing">
                      <Zap className="h-4 w-4" />
                      Xem gói & Mở khóa Báo cáo
                    </Link>
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Đăng ký gói Subscription để mở khóa tất cả báo cáo. Hủy bất cứ lúc nào.
                  </p>
                </div>
              </div>
            </Card>

            {/* Expert card */}
            <Card className="border-primary/15 bg-gradient-to-b from-primary/[0.03] to-transparent">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-sm">
                    Cần Tư vấn Chuyên sâu?
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Mở khóa báo cáo để yêu cầu chuyên gia FDA compliance review chi tiết và đề xuất wording sửa cụ thể.
                </p>
                <ul className="space-y-2 text-xs mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    Phân tích bối cảnh sản phẩm cụ thể
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    Hướng dẫn sửa chi tiết + wording chính xác
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    SLA: phản hồi trong 48h làm việc
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    Đội ngũ chuyên gia tuân thủ FDA
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  asChild
                >
                  <Link href="/pricing#expert-review">
                    <Target className="h-3.5 w-3.5" />
                    Xem gói có Tư vấn Chuyên gia
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
