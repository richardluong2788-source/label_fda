'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  TrendingDown,
  Lightbulb,
  Ruler,
  Palette,
  Languages,
  FileText,
} from 'lucide-react'
import type { AuditReport } from '@/lib/types'

// ────────────────────────────────────────────────────────────
// Risk Assessment + Expert Tips
// ────────────────────────────────────────────────────────────

interface RiskAssessmentProps {
  report: AuditReport
}

export function RiskAssessmentSection({ report }: RiskAssessmentProps) {
  if (
    report.overall_risk_score === undefined &&
    (!report.expert_tips || report.expert_tips.length === 0)
  ) {
    return null
  }

  return (
    <div
      className={`grid gap-6 ${
        report.expert_tips && report.expert_tips.length > 0
          ? 'md:grid-cols-2'
          : 'grid-cols-1'
      }`}
    >
      {/* Risk Score Card */}
      {report.overall_risk_score !== undefined && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Rui ro Thuc thi FDA</h2>
          </div>

          <div className="flex items-center gap-8 mb-5">
            {/* Circular gauge */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(report.overall_risk_score / 10) * 264} 264`}
                  className={
                    report.overall_risk_score >= 7
                      ? 'text-destructive'
                      : report.overall_risk_score >= 4
                      ? 'text-warning'
                      : 'text-success'
                  }
                  stroke="currentColor"
                />
              </svg>
              <span
                className={`absolute text-2xl font-bold ${
                  report.overall_risk_score >= 7
                    ? 'text-destructive'
                    : report.overall_risk_score >= 4
                    ? 'text-warning'
                    : 'text-success'
                }`}
              >
                {report.overall_risk_score.toFixed(1)}
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Muc do rui ro</span>
                <Badge
                  className={`${
                    report.risk_assessment === 'Critical' || report.risk_assessment === 'High'
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/10'
                      : report.risk_assessment === 'Medium-High' ||
                        report.risk_assessment === 'Medium'
                      ? 'bg-warning/20 text-warning-foreground hover:bg-warning/20'
                      : 'bg-success/20 text-success hover:bg-success/20'
                  }`}
                >
                  {report.risk_assessment || 'N/A'}
                </Badge>
              </div>

              {report.projected_risk_score !== undefined &&
                report.projected_risk_score < report.overall_risk_score && (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-success shrink-0" />
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Sau khi sua loi nghiem trong:{' '}
                      </span>
                      <span className="font-semibold text-success">
                        {report.projected_risk_score.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                )}

              <p className="text-sm text-muted-foreground leading-relaxed">
                Diem risk dua tren muc do vi pham, lich su enforcement cua FDA, va Warning
                Letters lien quan.
              </p>
            </div>
          </div>

          {/* Risk Scale Legend */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-0.5 mb-1.5">
              <div className="flex-1 h-2 rounded-l-full bg-success" />
              <div className="flex-1 h-2 bg-success/70" />
              <div className="flex-1 h-2 bg-warning/70" />
              <div className="flex-1 h-2 bg-warning" />
              <div className="flex-1 h-2 bg-destructive/70" />
              <div className="flex-1 h-2 rounded-r-full bg-destructive" />
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-muted-foreground">Thap (0)</span>
              <span className="text-[11px] text-muted-foreground">Trung binh (5)</span>
              <span className="text-[11px] text-muted-foreground">Nghiem trong (10)</span>
            </div>
          </div>
        </Card>
      )}

      {/* Expert Tips Card */}
      {report.expert_tips && report.expert_tips.length > 0 && (
        <Card className="p-6 border-info/30 bg-info/5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-info" />
            <h2 className="font-semibold text-lg">Loi khuyen tu Chuyen gia</h2>
          </div>
          <div className="space-y-3">
            {report.expert_tips.map((tip: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-background border border-info/20"
              >
                <span className="text-info font-bold text-sm shrink-0 mt-0.5">
                  {idx + 1}.
                </span>
                <p className="text-sm leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Visual & Technical Checks (Geometry, Contrast, Multi-language)
// ────────────────────────────────────────────────────────────

interface TechnicalChecksProps {
  report: AuditReport
}

export function TechnicalChecksSection({ report }: TechnicalChecksProps) {
  const hasGeometry = report.geometry_violations && report.geometry_violations.length > 0
  const hasContrast = report.contrast_violations && report.contrast_violations.length > 0
  const hasMultilang =
    report.multilanguage_issues && report.multilanguage_issues.length > 0

  if (!hasGeometry && !hasContrast && !hasMultilang) return null

  const count = [hasGeometry, hasContrast, hasMultilang].filter(Boolean).length
  const gridClass =
    count === 1 ? 'grid-cols-1' : count === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {/* Geometry Violations */}
      {hasGeometry && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-4 w-4 text-violet-600" />
            <h3 className="font-semibold text-sm">Kiem tra Hinh hoc</h3>
            <Badge variant="secondary" className="text-xs ml-auto">
              {report.geometry_violations!.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {report.geometry_violations!.map((gv: any, idx: number) => (
              <div
                key={idx}
                className={`rounded-lg p-3 border text-xs ${
                  gv.severity === 'critical'
                    ? 'border-destructive/30 bg-destructive/5'
                    : gv.severity === 'warning'
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-info/30 bg-info/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium capitalize">
                    {gv.type?.replace(/_/g, ' ')}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      gv.severity === 'critical'
                        ? 'border-destructive/50 text-destructive'
                        : gv.severity === 'warning'
                        ? 'border-warning/50 text-warning-foreground'
                        : 'border-info/50 text-info'
                    }`}
                  >
                    {gv.severity === 'critical'
                      ? 'Nghiem trong'
                      : gv.severity === 'warning'
                      ? 'Canh bao'
                      : 'Thong tin'}
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">{gv.description}</p>
                {gv.regulation && (
                  <p className="font-mono text-[10px] text-muted-foreground mt-1.5">
                    {gv.regulation}
                  </p>
                )}
                {(gv.expected || gv.actual) && (
                  <div className="flex gap-3 mt-2 pt-2 border-t">
                    {gv.expected && (
                      <span className="text-success">Chuan: {gv.expected}</span>
                    )}
                    {gv.actual && (
                      <span className="text-destructive">Thuc te: {gv.actual}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Contrast Violations */}
      {hasContrast && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-pink-600" />
            <h3 className="font-semibold text-sm">Tuong phan Mau sac</h3>
            <Badge variant="secondary" className="text-xs ml-auto">
              {report.contrast_violations!.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {report.contrast_violations!.map((cv: any, idx: number) => (
              <div
                key={idx}
                className="rounded-lg p-3 border border-warning/30 bg-warning/5 text-xs"
              >
                <p className="font-medium mb-1.5">{cv.description}</p>
                {cv.ratio !== undefined && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-muted-foreground">Ty le:</span>
                    <span
                      className={`font-bold ${
                        cv.ratio >= 4.5
                          ? 'text-success'
                          : cv.ratio >= 3
                          ? 'text-warning'
                          : 'text-destructive'
                      }`}
                    >
                      {cv.ratio.toFixed(2)}:1
                    </span>
                    <span className="text-muted-foreground">(toi thieu 4.5:1)</span>
                  </div>
                )}
                {cv.colors && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: cv.colors.foreground }}
                      />
                      <span className="font-mono text-[10px]">{cv.colors.foreground}</span>
                    </div>
                    <span className="text-muted-foreground">/</span>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: cv.colors.background }}
                      />
                      <span className="font-mono text-[10px]">{cv.colors.background}</span>
                    </div>
                  </div>
                )}
                {cv.recommendation && (
                  <p className="text-muted-foreground mt-2 pt-2 border-t">
                    {cv.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Multi-language Issues */}
      {hasMultilang && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="h-4 w-4 text-teal-600" />
            <h3 className="font-semibold text-sm">Kiem tra Da ngon ngu</h3>
            <Badge variant="secondary" className="text-xs ml-auto">
              {report.multilanguage_issues!.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {report.multilanguage_issues!.map((ml: any, idx: number) => (
              <div
                key={idx}
                className={`rounded-lg p-3 border text-xs ${
                  ml.hasIssue ? 'border-warning/30 bg-warning/5' : 'border-info/30 bg-info/5'
                }`}
              >
                <p className="font-medium mb-2">{ml.description}</p>
                {ml.detectedLanguages && ml.detectedLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {ml.detectedLanguages.map((lang: string, langIdx: number) => (
                      <Badge key={langIdx} variant="outline" className="text-[10px]">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                )}
                {ml.missingFields && ml.missingFields.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Thieu ban dich:</p>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      {ml.missingFields.map((field: string, fIdx: number) => (
                        <li key={fIdx}>{field}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Commercial Summary Report
// ────────────────────────────────────────────────────────────

interface CommercialSummaryProps {
  summary: string
}

export function CommercialSummarySection({ summary }: CommercialSummaryProps) {
  return (
    <Card className="p-6">
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Bao cao Thuong mai Tong hop</h2>
          </div>
          <Badge variant="outline" className="group-open:hidden">
            Nhan de xem chi tiet
          </Badge>
        </summary>
        <div className="mt-4 pt-4 border-t prose prose-sm max-w-none">
          {summary.split('\n').map((line: string, idx: number) => {
            if (line.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-base font-bold mt-4 mb-2">
                  {line.replace(/^### /, '').replace(/[^\w\s.,;:!?()[\]{}'"\/\-–—&@#%+=<>|\\`~^$*_]/g, '').trim()}
                </h3>
              )
            }
            if (line.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-lg font-bold mt-4 mb-2">
                  {line.replace(/^## /, '')}
                </h2>
              )
            }
            if (line.startsWith('**') && line.endsWith('**')) {
              return (
                <p key={idx} className="font-semibold mt-2">
                  {line.replace(/\*\*/g, '')}
                </p>
              )
            }
            if (line.startsWith('- ')) {
              return (
                <p key={idx} className="text-sm pl-4 py-0.5 text-muted-foreground">
                  {line.replace(/^- /, '')}
                </p>
              )
            }
            if (line.trim() === '') return <div key={idx} className="h-2" />
            return (
              <p key={idx} className="text-sm">
                {line.replace(/\*\*/g, '')}
              </p>
            )
          })}
        </div>
      </details>
    </Card>
  )
}
