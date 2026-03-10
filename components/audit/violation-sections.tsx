'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  ExternalLink,
  Mail,
  RotateCcw,
  Ship,
  Quote,
  BookOpen,
} from 'lucide-react'
import type { Violation } from '@/lib/types'

// ────────────────────────────────────────────────────────────
// HELPER: Simple Markdown Renderer for Remediation Text
// Supports: **bold**, numbered lists, bullet lists, newlines
// ────────────────────────────────────────────────────────────

function SimpleMarkdown({ content }: { content: string }) {
  if (!content) return null
  
  // Split by double newlines for paragraphs, then process each
  const lines = content.split('\n')
  
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (!line.trim()) return null
        
        // Check if it's a numbered list item (①, ②, ③ or 1., 2., 3.)
        const isNumberedItem = /^[①②③④⑤⑥⑦⑧⑨⑩]|\d+\./.test(line.trim())
        // Check if it's a bullet point
        const isBulletItem = /^[•\-\*]/.test(line.trim())
        // Check if it's a warning/risk line
        const isWarning = line.includes('⚠️') || line.toLowerCase().includes('risk') || line.toLowerCase().includes('rủi ro')
        
        // Process bold text (**text** -> <strong>)
        const processedLine = line.split(/\*\*([^*]+)\*\*/g).map((part, i) => 
          i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
        )
        
        if (isWarning) {
          return (
            <div key={idx} className="mt-3 pt-3 border-t border-warning/30">
              <p className="text-sm text-warning font-medium">{processedLine}</p>
            </div>
          )
        }
        
        if (isNumberedItem || isBulletItem) {
          return (
            <div key={idx} className={`text-sm ${isNumberedItem ? 'pl-1' : 'pl-4'}`}>
              {processedLine}
            </div>
          )
        }
        
        return (
          <p key={idx} className="text-sm">
            {processedLine}
          </p>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// SHARED: Single Violation Card
// ────────────────────────────────────────────────────────────

function ViolationConfidence({ score }: { score: number }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Độ tin cậy phân tích:</span>
        <span className="font-medium">{Math.round(score * 100)}%</span>
      </div>
      <Progress value={score * 100} className="h-1" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION: CFR Violations (affects Risk Level)
// ────────────────────────────────────────────────────────────

interface CFRViolationsSectionProps {
  violations: Violation[]
}

export function CFRViolationsSection({ violations }: CFRViolationsSectionProps) {
  const cfrViolations = violations.filter(
    (v) =>
      v.source_type !== 'import_alert' &&
      v.source_type !== 'warning_letter' &&
      v.source_type !== 'recall'
  )
  const criticalCount = cfrViolations.filter((v) => v.severity === 'critical').length
  const warningCount = cfrViolations.filter((v) => v.severity === 'warning').length

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Kiểm tra Tuân thủ Nhãn</h2>
          <Badge variant="secondary">{cfrViolations.length} vi phạm</Badge>
        </div>
        {cfrViolations.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {criticalCount} Nghiêm trọng &bull; {warningCount} Cảnh báo
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6 border-l-2 border-primary/30 pl-3">
        Kết quả kiểm tra tuân thủ nhãn theo quy định{' '}
        <span className="font-medium text-foreground">21 CFR</span>. Mức độ rủi ro được đánh
        giá dựa trên các vi phạm nghiêm trọng bên dưới. Lịch sử Warning Letter và Recall
        được hiển thị riêng ở các tab khác.
      </p>

      {cfrViolations.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Không có vi phạm CFR</h3>
          <p className="text-muted-foreground">
            Nhãn của bạn tuân thủ tất cả các quy định FDA được kiểm tra
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cfrViolations.map((violation, index) => (
            <Card
              key={index}
              className={`p-6 ${
                violation.severity === 'critical'
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-warning/30 bg-warning/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  {violation.severity === 'critical' ? (
                    <div className="rounded-full bg-destructive/10 p-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                  ) : (
                    <div className="rounded-full bg-warning/10 p-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-semibold text-lg">{violation.category}</h3>
                    <Badge
                      variant={violation.severity === 'critical' ? 'destructive' : 'default'}
                      className="shrink-0"
                    >
                      {violation.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                    </Badge>
                  </div>

                  <div className="text-sm mb-4 leading-relaxed">
                    <SimpleMarkdown content={violation.description} />
                  </div>

                  {/* Regulation Reference with quote excerpt */}
                  {violation.regulation_reference && (
                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">
                          Điều khoản áp dụng:
                        </p>
                      </div>
                      <p className="text-sm font-mono text-primary">
                        {violation.regulation_reference}
                      </p>
                    </div>
                  )}

                  {/* Suggested Fix - supports markdown formatting for detailed guidance */}
                  {violation.suggested_fix && (
                    <div className="bg-info/10 rounded-lg p-4 mb-4">
                      <p className="text-xs font-medium text-info mb-2">
                        Hướng dẫn khắc phục (VEXIM):
                      </p>
                      <div className="text-info/80">
                        <SimpleMarkdown content={violation.suggested_fix} />
                      </div>
                    </div>
                  )}

                  {/* Citations - always visible when present, with quote text */}
                  {violation.citations && violation.citations.length > 0 && (
                    <div className="rounded-lg border bg-background p-4 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Quote className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">
                          Trích dẫn từ quy định ({violation.citations.length})
                        </p>
                      </div>
                      <div className="space-y-3">
                        {violation.citations.map((citation, citIdx) => (
                          <div
                            key={citIdx}
                            className="text-xs rounded-lg p-3 border-l-2 border-primary/30 bg-muted/50"
                          >
                            <p className="font-medium mb-1.5 text-foreground">{citation.section}</p>
                            {citation.text && (
                              <blockquote className="text-muted-foreground italic border-l-0 pl-0 leading-relaxed">
                                {'"'}{citation.text}{'"'}
                              </blockquote>
                            )}
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t text-muted-foreground">
                              <span>Nguồn: {citation.source}</span>
                              <span className="text-primary font-medium">
                                Độ liên quan: {(citation.relevance_score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {violation.confidence_score !== undefined && (
                    <ViolationConfidence score={violation.confidence_score} />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION: Warning Letter Patterns
// ────────────────────────────────────────────────────────────

interface WarningLetterSectionProps {
  violations: Violation[]
}

export function WarningLetterSection({ violations }: WarningLetterSectionProps) {
  const wlViolations = violations.filter((v) => v.source_type === 'warning_letter')
  if (wlViolations.length === 0) return null

  return (
    <Card className="p-6 border-purple-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-bold">Mẫu Cảnh báo FDA (Warning Letter)</h2>
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            {wlViolations.length} mẫu phát hiện
          </Badge>
        </div>
      </div>

      <div className="rounded-lg bg-purple-50 border-l-4 border-purple-400 p-4 mb-6">
        <p className="text-sm font-semibold text-purple-900 mb-1">
          Dựa trên lịch sử FDA Warning Letters thực tế
        </p>
        <p className="text-sm text-purple-800 leading-relaxed">
          Các mục này không phải vi phạm CFR mới — chúng là{' '}
          <span className="font-medium">mẫu lỗi lặp lại</span> mà FDA đã gửi Warning Letter
          cho các doanh nghiệp khác với ngôn ngữ tương tự. Đây là tín hiệu rủi ro enforcement
          cao. Không ảnh hưởng đến mức độ rủi ro tổng thể của nhãn.
        </p>
      </div>

      <div className="space-y-4">
        {wlViolations.map((violation, index) => (
          <Card
            key={index}
            className={`p-5 border-purple-200 bg-purple-50/40 ${
              violation.severity === 'critical' ? 'border-l-4 border-l-purple-500' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="rounded-full bg-purple-100 p-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-base">{violation.category}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-purple-600 hover:bg-purple-600 text-background text-xs">
                      Warning Letter
                    </Badge>
                    <Badge
                      variant={violation.severity === 'critical' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {violation.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm mb-3 leading-relaxed">{violation.description}</p>

                {violation.regulation_reference && (
                  <div className="bg-purple-100/60 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-purple-900 mb-0.5">
                      Điều khoản liên quan:
                    </p>
                    <p className="text-xs font-mono text-purple-800">
                      {violation.regulation_reference}
                    </p>
                  </div>
                )}

                {violation.suggested_fix && (
                  <div className="bg-info/10 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-info mb-1">
                      Hướng dẫn khắc phục:
                    </p>
                    <p className="text-xs text-info/80">{violation.suggested_fix}</p>
                  </div>
                )}

                {violation.warning_letter_id && (
                  <a
                    href={`https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/${violation.warning_letter_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple-700 hover:underline"
                  >
                    Xem Warning Letter gốc trên FDA.gov{' '}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {violation.confidence_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Mức tương đồng với Warning Letter:
                      </span>
                      <span className="font-medium">
                        {Math.round(violation.confidence_score * 100)}%
                      </span>
                    </div>
                    <Progress value={violation.confidence_score * 100} className="h-1" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                  Nguồn: Lịch sử Warning Letter của FDA — đây là tín hiệu rủi ro, không phải vi
                  phạm CFR trực tiếp.
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION: Recall Context (Market Intelligence - Freemium Model)
// 
// IMPORTANT: Recalls are market intelligence, NOT violations.
// They do NOT affect risk score.
// 
// FREEMIUM MODEL:
// - FREE: Summary info (product type, reason, time period)
// - PAID: Detailed info (company names, corrective actions, FDA response)
// ────────────────────────────────────────────────────────────

interface RecallSectionProps {
  violations: Violation[]
}

export function RecallSection({ violations }: RecallSectionProps) {
  const recallItems = violations.filter((v) => v.source_type === 'recall')
  if (recallItems.length === 0) return null

  // Extract summary info for free display
  const getSummaryInfo = (item: Violation) => {
    const category = item.category?.replace('Recall Risk: ', '') || 'Unknown'
    // Extract time period from description if available
    const timeMatch = item.description?.match(/(\d{4})/g)
    const timePeriod = timeMatch ? `${timeMatch[0]}${timeMatch.length > 1 ? `-${timeMatch[timeMatch.length - 1]}` : ''}` : 'Gần đây'
    return { category, timePeriod }
  }

  return (
    <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-100 p-1.5">
            <RotateCcw className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Cảnh Báo Thị Trường</h2>
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            {recallItems.length} trường hợp
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
          Market Intelligence
        </Badge>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-100/60 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1 text-amber-900">
              FDA đang giám sát chặt category này
            </p>
            <p className="text-sm leading-relaxed text-amber-800">
              Phát hiện <strong>{recallItems.length} trường hợp thu hồi</strong> cho sản phẩm tương tự. 
              Đây là tín hiệu rủi ro thị trường - bạn nên chuẩn bị hồ sơ chứng minh an toàn thực phẩm.
            </p>
          </div>
        </div>
      </div>

      {/* Free Summary Cards */}
      <div className="space-y-3 mb-6">
        {recallItems.map((item, index) => {
          const summary = getSummaryInfo(item)
          return (
            <Card
              key={index}
              className="p-4 border-amber-200/60 bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">
                      {summary.category}
                    </Badge>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs text-slate-500">{summary.timePeriod}</span>
                  </div>
                  
                  {/* Truncated description - free preview */}
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {item.description?.slice(0, 150)}...
                  </p>
                  
                  {/* Blurred/Hidden details indicator */}
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="blur-[3px] select-none">Chi tiết: Company ABC, Recall #12345, Corrective action...</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* CTA - Upgrade to see full details */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-slate-800 mb-1">
              Xem báo cáo đầy đủ + Nhận tư vấn phòng ngừa
            </h4>
            <p className="text-sm text-slate-600">
              Bao gồm: Mã thu hồi FDA, tên công ty vi phạm, biện pháp khắc phục, và hướng dẫn chuẩn bị hồ sơ từ chuyên gia.
            </p>
          </div>
          <a
            href="https://calendly.com/vexim-consulting/fda-consultation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shrink-0"
          >
            Liên hệ chuyên gia Vexim
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Card>
  )
}

// Keep old export for backward compatibility but it's now unused
export function RecallSectionLegacy({ violations }: RecallSectionProps) {
  const recallViolations = violations.filter((v) => v.source_type === 'recall')
  if (recallViolations.length === 0) return null

  const hasClassI = recallViolations.some(
    (v) => v.category?.includes('Class I') || v.severity === 'critical'
  )

  return (
    <Card className={`p-6 ${hasClassI ? 'border-orange-300' : 'border-warning/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <RotateCcw
            className={`h-5 w-5 ${hasClassI ? 'text-orange-600' : 'text-warning'}`}
          />
          <h2 className="text-xl font-bold">Mẫu Thu hồi FDA (Recall)</h2>
          <Badge
            className={`${
              hasClassI
                ? 'bg-orange-100 text-orange-800'
                : 'bg-warning/20 text-warning-foreground'
            } hover:bg-inherit`}
          >
            {recallViolations.length} mẫu phát hiện
          </Badge>
        </div>
      </div>

      <div
        className={`rounded-lg border-l-4 p-4 mb-6 ${
          hasClassI
            ? 'bg-orange-50 border-orange-400'
            : 'bg-warning/10 border-warning/40'
        }`}
      >
        <p
          className={`text-sm font-semibold mb-1 ${
            hasClassI ? 'text-orange-900' : 'text-warning-foreground'
          }`}
        >
          Nhãn chứa yếu tố tương tự sản phẩm đã bị FDA Recall
        </p>
        <p
          className={`text-sm leading-relaxed ${
            hasClassI ? 'text-orange-800' : 'text-warning-foreground/80'
          }`}
        >
          Các mục này được phát hiện dựa trên cơ sở dữ liệu openFDA Recall. Không có nghĩa sản
          phẩm của bạn sẽ bị recall — nhưng chứa từ khóa, thành phần, hoặc cấu trúc nhãn tương
          đồng với sản phẩm đã bị thu hồi. Không ảnh hưởng đến mức độ rủi ro tổng thể.
        </p>
      </div>

      <div className="space-y-4">
        {recallViolations.map((violation, index) => (
          <Card
            key={index}
            className={`p-5 ${
              violation.severity === 'critical'
                ? 'border-orange-300 bg-orange-50/40 border-l-4 border-l-orange-500'
                : 'border-warning/20 bg-warning/5'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div
                  className={`rounded-full p-2 ${
                    violation.severity === 'critical' ? 'bg-orange-100' : 'bg-warning/10'
                  }`}
                >
                  <RotateCcw
                    className={`h-5 w-5 ${
                      violation.severity === 'critical' ? 'text-orange-600' : 'text-warning'
                    }`}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-base">{violation.category}</h3>
                  <Badge
                    className={`text-xs text-background ${
                      violation.severity === 'critical'
                        ? 'bg-orange-600 hover:bg-orange-600'
                        : 'bg-warning hover:bg-warning'
                    }`}
                  >
                    {violation.severity === 'critical' ? 'Recall Loại I' : 'Mẫu Thu hồi'}
                  </Badge>
                </div>

                <p className="text-sm mb-3 leading-relaxed">{violation.description}</p>

                {violation.regulation_reference && (
                  <div
                    className={`rounded-lg p-3 mb-3 ${
                      violation.severity === 'critical'
                        ? 'bg-orange-100/60'
                        : 'bg-warning/10'
                    }`}
                  >
                    <p className="text-xs font-medium mb-0.5">Nguồn dữ liệu Recall:</p>
                    <p className="text-xs font-mono">{violation.regulation_reference}</p>
                  </div>
                )}

                {violation.suggested_fix && (
                  <div className="bg-info/10 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-info mb-1">
                      Hành động phòng ngừa đề xuất:
                    </p>
                    <p className="text-xs text-info/80">{violation.suggested_fix}</p>
                  </div>
                )}

                {violation.confidence_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Mức tương đồng với sự kiện Recall:
                      </span>
                      <span className="font-medium">
                        {Math.round(violation.confidence_score * 100)}%
                      </span>
                    </div>
                    <Progress value={violation.confidence_score * 100} className="h-1" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                  Nguồn: Cơ sở dữ liệu openFDA Recall — đây là tín hiệu rủi ro, không phải vi
                  phạm CFR trực tiếp.
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION: Import Alert Border Risk
// ────────────────────────────────────────────────────────────

interface ImportAlertSectionProps {
  violations: Violation[]
}

export function ImportAlertSection({ violations }: ImportAlertSectionProps) {
  const importAlertViolations = violations.filter((v) => v.source_type === 'import_alert')
  if (importAlertViolations.length === 0) return null

  const hasCritical = importAlertViolations.some((v) => v.severity === 'critical')

  return (
    <Card className={`p-6 ${hasCritical ? 'border-destructive/30' : 'border-warning/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Ship
            className={`h-5 w-5 ${hasCritical ? 'text-destructive' : 'text-warning'}`}
          />
          <h2 className="text-xl font-bold">Rủi ro Thông quan Biên giới</h2>
          <Badge
            className={`${
              hasCritical
                ? 'bg-destructive hover:bg-destructive'
                : 'bg-warning hover:bg-warning'
            } text-background`}
          >
            {importAlertViolations.length} Import Alert
          </Badge>
        </div>
      </div>

      <div
        className={`rounded-lg border-l-4 p-4 mb-6 ${
          hasCritical
            ? 'bg-destructive/5 border-destructive'
            : 'bg-warning/10 border-warning'
        }`}
      >
        <p
          className={`text-sm font-semibold mb-1 ${
            hasCritical ? 'text-destructive' : 'text-warning-foreground'
          }`}
        >
          Quan trọng: Nhãn đúng luật không đảm bảo hàng qua cảng
        </p>
        <p
          className={`text-sm leading-relaxed ${
            hasCritical ? 'text-destructive/80' : 'text-warning-foreground/80'
          }`}
        >
          Nhãn của bạn có thể <span className="font-medium">đạt</span> toàn bộ kiểm tra CFR
          bên trên, nhưng hàng hóa vẫn có nguy cơ bị giữ tại cảng Mỹ (DWPE — Detention Without
          Physical Examination) nếu sản phẩm hoặc nhà sản xuất thuộc diện Import Alert của FDA.
          Đây là rủi ro biên giới độc lập với tuân thủ nhãn.
        </p>
      </div>

      <div className="space-y-4">
        {importAlertViolations.map((violation, index) => (
          <Card
            key={index}
            className={`p-6 ${
              violation.severity === 'critical'
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-warning/30 bg-warning/5'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div
                  className={`rounded-full p-2 ${
                    violation.severity === 'critical'
                      ? 'bg-destructive/10'
                      : 'bg-warning/10'
                  }`}
                >
                  <Ship
                    className={`h-5 w-5 ${
                      violation.severity === 'critical'
                        ? 'text-destructive'
                        : 'text-warning'
                    }`}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-base">{violation.category}</h3>
                  <Badge
                    className={`text-xs ${
                      violation.severity === 'critical'
                        ? 'bg-destructive hover:bg-destructive'
                        : 'bg-warning hover:bg-warning'
                    } text-background`}
                  >
                    {violation.severity === 'critical' ? 'Rủi ro DWPE' : 'Rủi ro Nhập khẩu'}
                  </Badge>
                </div>

                <p className="text-sm mb-3 leading-relaxed">{violation.description}</p>

                {violation.regulation_reference && (
                  <div
                    className={`rounded-lg p-3 mb-3 flex items-center gap-2 ${
                      violation.severity === 'critical'
                        ? 'bg-destructive/10'
                        : 'bg-warning/10'
                    }`}
                  >
                    <p className="text-xs font-mono font-medium flex-1">
                      {violation.regulation_reference}
                    </p>
                    {violation.import_alert_number && (
                      <a
                        href={`https://www.accessdata.fda.gov/cms_ia/ialist.html#${violation.import_alert_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        Xem trên FDA.gov <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {violation.suggested_fix && (
                  <div className="bg-info/10 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-info mb-1">Khuyến nghị:</p>
                    <p className="text-xs text-info/80">{violation.suggested_fix}</p>
                  </div>
                )}

                {violation.confidence_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Mức liên quan:</span>
                      <span className="font-medium">
                        {Math.round(violation.confidence_score * 100)}%
                      </span>
                    </div>
                    <Progress value={violation.confidence_score * 100} className="h-1" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                  Import Alert là tín hiệu rủi ro biên giới — không phải vi phạm CFR trực tiếp.
                  Không được tính vào mức rủi ro tổng thể của nhãn.
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}
