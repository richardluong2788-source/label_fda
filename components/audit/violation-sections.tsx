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
import { useTranslation } from '@/lib/i18n/useTranslation'

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
// SECTION: Warning Letter Patterns (Market Intelligence - Freemium Model)
// 
// IMPORTANT: Warning Letters are market intelligence, NOT violations.
// They do NOT affect risk score.
// 
// FREEMIUM MODEL:
// - FREE: Summary info (category, warning type)
// - PAID: Detailed info (warning letter ID, specific language, corrective actions)
// ────────────────────────────────────────────────────────────

interface WarningLetterSectionProps {
  violations: Violation[]
}

export function WarningLetterSection({ violations }: WarningLetterSectionProps) {
  const { t } = useTranslation()
  const wlViolations = violations.filter((v) => v.source_type === 'warning_letter')
  if (wlViolations.length === 0) return null

  // Extract summary info for free display
  const getSummaryInfo = (item: Violation) => {
    const category = item.category?.replace('Warning Letter: ', '') || 'Labeling Issue'
    const severity = item.severity === 'critical' ? t.report.riskHigh || 'High Risk' : t.report.riskMedium || 'Medium Risk'
    return { category, severity }
  }

  return (
    <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-100 p-1.5">
            <Mail className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">{t.report.marketWarningTitle || 'Market Warning'}</h2>
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            {wlViolations.length}
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
          {t.report.marketIntelligence || 'Market Intelligence'}
        </Badge>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-100/60 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1 text-amber-900">
              {t.report.warningLetterMarketMessage || 'Label contains language similar to FDA Warning Letter cases.'}
            </p>
          </div>
        </div>
      </div>

      {/* Free Summary Cards */}
      <div className="space-y-3 mb-6">
        {wlViolations.map((item, index) => {
          const summary = getSummaryInfo(item)
          return (
            <Card
              key={index}
              className="p-4 border-amber-200/60 bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100">
                      {t.report.warningLetterBadge || 'FDA Warning Letter'}
                    </Badge>
                    <span className="text-xs text-slate-400">|</span>
                    <Badge variant="outline" className="text-xs">
                      {summary.category}
                    </Badge>
                  </div>
                  
                  {/* Truncated description - free preview */}
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {item.description?.slice(0, 150)}...
                  </p>
                  
                  {/* Blurred/Hidden details indicator */}
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="blur-[3px] select-none">{t.report.lockedForExpert || 'Details for experts only'}</span>
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
              {t.report.getFullReport || 'Get Full Report + Consultation'}
            </h4>
            <p className="text-sm text-slate-600">
              {t.report.warningLetterItem1 || 'Original Warning Letter reference'}, {t.report.warningLetterItem3 || 'FDA-required corrective actions'}
            </p>
          </div>
          <a
            href="https://calendly.com/vexim-consulting/fda-consultation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shrink-0"
          >
            {t.report.contactExpert || 'Contact Vexim Expert'}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
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
  const { t } = useTranslation()
  const recallItems = violations.filter((v) => v.source_type === 'recall')
  if (recallItems.length === 0) return null

  // Extract summary info for free display
  const getSummaryInfo = (item: Violation) => {
    const category = item.category?.replace('Recall Risk: ', '') || t.report.recallSameCategory || 'Unknown'
    // Extract year from description if available (look for 4-digit year between 2000-2030)
    const timeMatch = item.description?.match(/\b(20[0-2][0-9]|2030)\b/g)
    const timePeriod = timeMatch ? `${timeMatch[0]}${timeMatch.length > 1 ? `-${timeMatch[timeMatch.length - 1]}` : ''}` : (t.report.recallRecent || 'Recent')
    return { category, timePeriod }
  }

  return (
    <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-100 p-1.5">
            <RotateCcw className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">{t.report.marketWarningTitle || 'Market Warning'}</h2>
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            {recallItems.length}
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
          {t.report.marketIntelligence || 'Market Intelligence'}
        </Badge>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-100/60 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1 text-amber-900">
              {t.report.marketWarningMessage || 'FDA is closely monitoring this category. Similar products have been recalled.'}
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
                      <span className="blur-[3px] select-none">{t.report.lockedForExpert || 'Details for experts only'}</span>
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
              {t.report.getFullReport || 'Get Full Report + Consultation'}
            </h4>
            <p className="text-sm text-slate-600">
              {t.report.recallCTAMessage || 'To view recall details (recall number, company, preventive actions), please contact our expert team.'}
            </p>
          </div>
          <a
            href="https://calendly.com/vexim-consulting/fda-consultation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shrink-0"
          >
            {t.report.contactExpert || 'Contact Vexim Expert'}
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
// SECTION: Import Alert Border Risk (Market Intelligence - Freemium Model)
// 
// IMPORTANT: Import Alerts are market intelligence, NOT violations.
// They do NOT affect risk score.
// 
// FREEMIUM MODEL:
// - FREE: Summary info (alert type, country/region)
// - PAID: Detailed info (import alert number, DWPE guidance, clearance steps)
// ────────────────────────────────────────────────────────────

interface ImportAlertSectionProps {
  violations: Violation[]
}

export function ImportAlertSection({ violations }: ImportAlertSectionProps) {
  const { t } = useTranslation()
  const importAlertViolations = violations.filter((v) => v.source_type === 'import_alert')
  if (importAlertViolations.length === 0) return null

  // Extract summary info for free display
  const getSummaryInfo = (item: Violation) => {
    const category = item.category?.replace('Import Alert: ', '') || 'Border Risk'
    const severity = item.severity === 'critical' ? 'DWPE Risk' : 'Import Risk'
    return { category, severity }
  }

  return (
    <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-100 p-1.5">
            <Ship className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">{t.report.marketWarningTitle || 'Market Warning'}</h2>
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            {importAlertViolations.length}
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
          {t.report.marketIntelligence || 'Market Intelligence'}
        </Badge>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-100/60 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1 text-amber-900">
              {t.report.importAlertMarketMessage || 'Product or manufacturer on FDA Import Alert list.'}
            </p>
          </div>
        </div>
      </div>

      {/* Free Summary Cards */}
      <div className="space-y-3 mb-6">
        {importAlertViolations.map((item, index) => {
          const summary = getSummaryInfo(item)
          return (
            <Card
              key={index}
              className="p-4 border-amber-200/60 bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="text-xs bg-cyan-100 text-cyan-700 hover:bg-cyan-100">
                      {t.report.importAlertBadge || 'FDA Import Alert'}
                    </Badge>
                    <span className="text-xs text-slate-400">|</span>
                    <Badge variant="outline" className="text-xs">
                      {summary.category}
                    </Badge>
                  </div>
                  
                  {/* Truncated description - free preview */}
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {item.description?.slice(0, 150)}...
                  </p>
                  
                  {/* Blurred/Hidden details indicator */}
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="blur-[3px] select-none">{t.report.lockedForExpert || 'Details for experts only'}</span>
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
              {t.report.getFullReport || 'Get Full Report + Consultation'}
            </h4>
            <p className="text-sm text-slate-600">
              {t.report.importAlertItem1 || 'Official Import Alert number'}, {t.report.importAlertItem4 || 'Border clearance guidance'}
            </p>
          </div>
          <a
            href="https://calendly.com/vexim-consulting/fda-consultation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shrink-0"
          >
            {t.report.contactExpert || 'Contact Vexim Expert'}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION: Combined Market Intelligence (Freemium Model)
// 
// Consolidates Recalls, Warning Letters, Import Alerts into ONE card
// ────────────────────────────────────────────────────────────

interface CombinedMarketIntelligenceSectionProps {
  violations: Violation[]
}

export function CombinedMarketIntelligenceSection({ violations }: CombinedMarketIntelligenceSectionProps) {
  const { t } = useTranslation()
  
  const recalls = violations.filter((v) => v.source_type === 'recall')
  const warningLetters = violations.filter((v) => v.source_type === 'warning_letter')
  const importAlerts = violations.filter((v) => v.source_type === 'import_alert')
  
  const totalCount = recalls.length + warningLetters.length + importAlerts.length
  if (totalCount === 0) return null

  // Extract unique categories for each type
  const getCategories = (items: Violation[], prefix: string) => {
    const categories = items.map(v => v.category?.replace(`${prefix}: `, '') || 'Unknown')
    return [...new Set(categories)].slice(0, 2)
  }

  const recallCategories = getCategories(recalls, 'Recall')
  const wlCategories = getCategories(warningLetters, 'Warning Letter')
  const iaCategories = getCategories(importAlerts, 'Import Alert')

  return (
    <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-100 p-1.5">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">{t.report.marketWarningTitle || 'Cảnh Báo Thị Trường'}</h2>
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            {totalCount}
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
          {t.report.marketIntelligence || 'Market Intelligence'}
        </Badge>
      </div>

      {/* Badges for each type */}
      <div className="flex flex-wrap gap-2 mb-4">
        {recalls.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-500 text-white">
            {t.report.recallBadge || 'FDA Recall'} ({recalls.length})
          </span>
        )}
        {warningLetters.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500 text-white">
            {t.report.warningLetterBadge || 'Warning Letter'} ({warningLetters.length})
          </span>
        )}
        {importAlerts.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500 text-white">
            {t.report.importAlertBadge || 'Import Alert'} ({importAlerts.length})
          </span>
        )}
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-100/60 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-amber-900">
            {recalls.length > 0 
              ? (t.report.marketWarningMessage || 'FDA đang giám sát chặt category này. Sản phẩm tương tự đã bị thu hồi.')
              : warningLetters.length > 0
              ? (t.report.warningLetterMarketMessage || 'Nhãn có ngôn ngữ tương tự đã bị FDA gửi Warning Letter.')
              : (t.report.importAlertMarketMessage || 'Sản phẩm hoặc nhà sản xuất có trong danh sách Import Alert.')}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: Free summary */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            {t.report.freeSummary || 'TÓM TẮT MIỄN PHÍ'}
          </p>
          
          {recalls.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 border border-amber-200/60">
              <RotateCcw className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {recalls.length} {t.report.recallsFound || 'thu hồi liên quan'}
                </p>
                <p className="text-xs text-slate-500">{recallCategories.join(', ')}</p>
              </div>
            </div>
          )}
          
          {warningLetters.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 border border-amber-200/60">
              <Mail className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {warningLetters.length} {t.report.warningLettersFound || 'warning letter tương tự'}
                </p>
                <p className="text-xs text-slate-500">{wlCategories.join(', ')}</p>
              </div>
            </div>
          )}
          
          {importAlerts.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 border border-amber-200/60">
              <Ship className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {importAlerts.length} {t.report.importAlertsFound || 'import alert'}
                </p>
                <p className="text-xs text-slate-500">{iaCategories.join(', ')}</p>
              </div>
            </div>
          )}
          
          {/* Blurred locked content */}
          <div className="relative">
            <div className="p-3 rounded-lg bg-slate-100/80 border border-slate-200 blur-[4px] select-none pointer-events-none">
              <p className="text-xs text-slate-500">Recall #R-XXXX-26 - Company...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 text-white text-xs font-medium shadow-lg">
                {t.report.lockedForExpert || 'Chi tiết dành cho chuyên gia'}
              </span>
            </div>
          </div>
        </div>
        
        {/* RIGHT: CTA */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
            {t.report.fullReportIncludes || 'BÁO CÁO ĐẦY ĐỦ BAO GỒM'}
          </p>
          <ul className="space-y-2 mb-4 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.recallItem1 || 'Mã thu hồi FDA chính thức'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.recallItem2 || 'Tên công ty vi phạm'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.recallItem3 || 'Biện pháp khắc phục chi tiết'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.recallItem4 || 'Hướng dẫn chuẩn bị hồ sơ phòng ngừa'}</span>
            </li>
          </ul>
          <a
            href="https://calendly.com/vexim-consulting/fda-consultation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            {t.report.getFullReport || 'Nhận báo cáo đầy đủ + Tư vấn'}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Card>
  )
}
