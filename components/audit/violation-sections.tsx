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
} from 'lucide-react'
import type { Violation } from '@/lib/types'

// ────────────────────────────────────────────────────────────
// SHARED: Single Violation Card
// ────────────────────────────────────────────────────────────

function ViolationConfidence({ score }: { score: number }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Do tin cay phan tich:</span>
        <span className="font-medium">{Math.round(score * 100)}%</span>
      </div>
      <Progress value={score * 100} className="h-1" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION: CFR Violations (affects Pass/Fail)
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
          <h2 className="text-xl font-bold">Kiem tra Tuan thu Nhan</h2>
          <Badge variant="secondary">{cfrViolations.length} vi pham</Badge>
        </div>
        {cfrViolations.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {criticalCount} Nghiem trong &bull; {warningCount} Canh bao
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6 border-l-2 border-primary/30 pl-3">
        Ket qua kiem tra tuan thu nhan theo quy dinh{' '}
        <span className="font-medium text-foreground">21 CFR</span>. Ket qua Dat/Khong Dat dua
        tren cac vi pham nghiem trong ben duoi. Lich su Warning Letter va Recall duoc hien thi
        rieng o cac tab khac.
      </p>

      {cfrViolations.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Khong co vi pham CFR</h3>
          <p className="text-muted-foreground">
            Nhan cua ban tuan thu tat ca cac quy dinh FDA duoc kiem tra
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
                      {violation.severity === 'critical' ? 'Nghiem trong' : 'Canh bao'}
                    </Badge>
                  </div>

                  <p className="text-sm mb-4 leading-relaxed">{violation.description}</p>

                  {violation.regulation_reference && (
                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Dieu khoan ap dung:
                      </p>
                      <p className="text-sm font-mono text-primary">
                        {violation.regulation_reference}
                      </p>
                    </div>
                  )}

                  {violation.suggested_fix && (
                    <div className="bg-info/10 rounded-lg p-4 mb-4">
                      <p className="text-xs font-medium text-info mb-2">
                        Huong dan khac phuc:
                      </p>
                      <p className="text-sm text-info/80">{violation.suggested_fix}</p>
                    </div>
                  )}

                  {violation.citations && violation.citations.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-primary hover:underline mb-2">
                        Trich dan tu quy dinh ({violation.citations.length}):
                      </summary>
                      <div className="space-y-2 ml-4 mt-2">
                        {violation.citations.map((citation, citIdx) => (
                          <div
                            key={citIdx}
                            className="text-xs bg-background rounded p-3 border"
                          >
                            <p className="font-medium mb-1">{citation.section}</p>
                            <p className="text-muted-foreground italic">{citation.text}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Nguon: {citation.source} (Do lien quan:{' '}
                              {(citation.relevance_score * 100).toFixed(0)}%)
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
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
          <h2 className="text-xl font-bold">Mau Canh bao FDA (Warning Letter)</h2>
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            {wlViolations.length} mau phat hien
          </Badge>
        </div>
      </div>

      <div className="rounded-lg bg-purple-50 border-l-4 border-purple-400 p-4 mb-6">
        <p className="text-sm font-semibold text-purple-900 mb-1">
          Dua tren lich su FDA Warning Letters thuc te
        </p>
        <p className="text-sm text-purple-800 leading-relaxed">
          Cac muc nay khong phai vi pham CFR moi — chung la{' '}
          <span className="font-medium">mau loi lap lai</span> ma FDA da gui Warning Letter
          cho cac doanh nghiep khac voi ngon ngu tuong tu. Day la tin hieu rui ro enforcement
          cao. Khong anh huong den ket qua Pass/Fail cua nhan.
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
                      {violation.severity === 'critical' ? 'Nghiem trong' : 'Canh bao'}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm mb-3 leading-relaxed">{violation.description}</p>

                {violation.regulation_reference && (
                  <div className="bg-purple-100/60 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-purple-900 mb-0.5">
                      Dieu khoan lien quan:
                    </p>
                    <p className="text-xs font-mono text-purple-800">
                      {violation.regulation_reference}
                    </p>
                  </div>
                )}

                {violation.suggested_fix && (
                  <div className="bg-info/10 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-info mb-1">
                      Huong dan khac phuc:
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
                    Xem Warning Letter goc tren FDA.gov{' '}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {violation.confidence_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Muc tuong dong voi Warning Letter:
                      </span>
                      <span className="font-medium">
                        {Math.round(violation.confidence_score * 100)}%
                      </span>
                    </div>
                    <Progress value={violation.confidence_score * 100} className="h-1" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                  Nguon: Lich su Warning Letter cua FDA — day la tin hieu rui ro, khong phai vi
                  pham CFR truc tiep.
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
// SECTION: Recall Patterns
// ────────────────────────────────────────────────────────────

interface RecallSectionProps {
  violations: Violation[]
}

export function RecallSection({ violations }: RecallSectionProps) {
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
          <h2 className="text-xl font-bold">Mau Thu hoi FDA (Recall)</h2>
          <Badge
            className={`${
              hasClassI
                ? 'bg-orange-100 text-orange-800'
                : 'bg-warning/20 text-warning-foreground'
            } hover:bg-inherit`}
          >
            {recallViolations.length} mau phat hien
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
          Nhan chua yeu to tuong tu san pham da bi FDA Recall
        </p>
        <p
          className={`text-sm leading-relaxed ${
            hasClassI ? 'text-orange-800' : 'text-warning-foreground/80'
          }`}
        >
          Cac muc nay duoc phat hien dua tren co so du lieu openFDA Recall. Khong co nghia san
          pham cua ban se bi recall — nhung chua tu khoa, thanh phan, hoac cau truc nhan tuong
          dong voi san pham da bi thu hoi. Khong anh huong den Pass/Fail.
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
                    {violation.severity === 'critical' ? 'Recall Loai I' : 'Mau Thu hoi'}
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
                    <p className="text-xs font-medium mb-0.5">Nguon du lieu Recall:</p>
                    <p className="text-xs font-mono">{violation.regulation_reference}</p>
                  </div>
                )}

                {violation.suggested_fix && (
                  <div className="bg-info/10 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-info mb-1">
                      Hanh dong phong ngua de xuat:
                    </p>
                    <p className="text-xs text-info/80">{violation.suggested_fix}</p>
                  </div>
                )}

                {violation.confidence_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Muc tuong dong voi su kien Recall:
                      </span>
                      <span className="font-medium">
                        {Math.round(violation.confidence_score * 100)}%
                      </span>
                    </div>
                    <Progress value={violation.confidence_score * 100} className="h-1" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                  Nguon: Co so du lieu openFDA Recall — day la tin hieu rui ro, khong phai vi
                  pham CFR truc tiep.
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
          <h2 className="text-xl font-bold">Rui ro Thong quan Bien gioi</h2>
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
          Quan trong: Nhan dung luat khong dam bao hang qua cang
        </p>
        <p
          className={`text-sm leading-relaxed ${
            hasCritical ? 'text-destructive/80' : 'text-warning-foreground/80'
          }`}
        >
          Nhan cua ban co the <span className="font-medium">Pass</span> toan bo kiem tra CFR
          ben tren, nhung hang hoa van co nguy co bi giu tai cang My (DWPE — Detention Without
          Physical Examination) neu san pham hoac nha san xuat thuoc dien Import Alert cua FDA.
          Day la rui ro bien gioi doc lap voi tuan thu nhan.
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
                    {violation.severity === 'critical' ? 'Rui ro DWPE' : 'Rui ro Nhap khau'}
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
                        Xem tren FDA.gov <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {violation.suggested_fix && (
                  <div className="bg-info/10 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-info mb-1">Khuyen nghi:</p>
                    <p className="text-xs text-info/80">{violation.suggested_fix}</p>
                  </div>
                )}

                {violation.confidence_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Muc lien quan:</span>
                      <span className="font-medium">
                        {Math.round(violation.confidence_score * 100)}%
                      </span>
                    </div>
                    <Progress value={violation.confidence_score * 100} className="h-1" />
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic border-t pt-2">
                  Import Alert la tin hieu rui ro bien gioi — khong phai vi pham CFR truc tiep.
                  Khong duoc tinh vao ket qua Pass/Fail cua nhan.
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}
