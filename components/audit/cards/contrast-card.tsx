'use client'

import { Info } from 'lucide-react'
import type { useTranslation } from '@/lib/i18n'
import { MarkdownContent } from '@/components/audit/shared/markdown-content'

// ────────────────────────────────────────────────────────────
// Contrast Violation Card (merged into main list per spec)
// ────────────────────────────────────────────────────────────

export interface ContrastViolation {
  type: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  ratio?: number
  requiredMinRatio?: number
  textSize?: 'normal' | 'large'
  elementRole?: 'regulatory' | 'brand'
  recommendation?: string
  colors?: { foreground: string; background: string }
  is_design_recommendation?: boolean
  regulation_note?: string
}

interface ContrastViolationCardProps {
  violation: ContrastViolation
  t: ReturnType<typeof useTranslation>['t']
}

export function ContrastViolationCard({ violation, t }: ContrastViolationCardProps) {
  const ratioText = violation.ratio
    ? t.report.contrastRatio(violation.ratio, violation.requiredMinRatio)
    : violation.description

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header - Blue theme for design recommendation */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-100 p-2.5 shrink-0">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.lowContrastTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Clarify this is a design recommendation, NOT FDA requirement */}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {t.report.designRecommendation || 'Khuyến nghị thiết kế'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
                {t.report.notFdaRequired || 'Không bắt buộc theo CFR'}
              </span>
            </div>
          </div>
        </div>
        {/* Custom badge for design recommendation - always blue/info style */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
          {t.report.designNote || 'GỢI Ý'}
        </span>
      </div>

      {/* A/B Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Current (red) */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {t.report.currentOnLabel}
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
            {t.report.fixGuidance}
          </p>
          <MarkdownContent content={violation.recommendation || t.report.contrastDefaultFix} />
        </div>
      </div>
    </div>
  )
}
