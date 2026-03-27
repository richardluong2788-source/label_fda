'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  BookOpen,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import type { Violation } from '@/lib/types'
import type { useTranslation } from '@/lib/i18n'
import { MarkdownContent } from '@/components/audit/shared/markdown-content'
import { SeverityBadge, ViolationIcon } from '@/components/audit/shared/badges'

// ────────────────────────────────────────────────────────────
// Enhanced A/B Comparison Violation Card with Citations
// ────────────────────────────────────────────────────────────

interface ViolationCardProps {
  violation: Violation
  index: number
  t: ReturnType<typeof useTranslation>['t']
  showExpertCta?: boolean
}

export function ViolationCard({ violation, index, t, showExpertCta }: ViolationCardProps) {
  const [showCitations, setShowCitations] = useState(false)
  const isContrast =
    violation.category?.toLowerCase().includes('contrast') ||
    violation.category?.toLowerCase().includes('tuong phan') ||
    violation.category?.toLowerCase().includes('color')

  const getCategoryName = (category: string) => {
    return t.report.categoryNames[category] || t.report.categoryNames[category.toLowerCase()] || category
  }

  const getLocalizedFix = (fix: string | undefined) => {
    if (!fix) return t.report.defaultFix
    return fix
  }

  // Filter out invalid citations (missing section, section="0", or missing text)
  // Also clean up citation text that starts with "0 " or similar artifacts
  const validCitations = (violation.citations || []).filter(cit => cit.section && cit.section !== '0' && cit.text)
    .map(cit => ({
      ...cit,
      // Clean up text that starts with stray "0 " or numbers followed by emoji
      text: cit.text.replace(/^0\s+(?=📋|Per|21)/i, '').trim()
    }))
  const hasCitations = validCitations.length > 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon
            severity={violation.severity}
            type={isContrast ? 'contrast' : violation.source_type}
          />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {getCategoryName(violation.category)}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {violation.regulation_reference && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  {violation.regulation_reference}
                </span>
              )}
              {violation.confidence_score !== undefined && violation.confidence_score > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                  {t.report.aiConfidence}: {Math.round(violation.confidence_score * 100)}%
                </span>
              )}
              {violation.risk_score !== undefined && violation.risk_score > 0 && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                  violation.risk_score >= 7 ? 'bg-red-50 text-red-600 border-red-100' :
                  violation.risk_score >= 4 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  'bg-green-50 text-green-600 border-green-100'
                }`}>
                  {t.report.riskScoreLabel}: {violation.risk_score}/10
                </span>
              )}
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      {/* Enforcement context bar */}
      {((violation.enforcement_frequency && violation.enforcement_frequency > 0) || violation.legal_basis) && (
        <div className="mx-5 mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {violation.enforcement_frequency && typeof violation.enforcement_frequency === 'number' && violation.enforcement_frequency > 0 && (
              <span className="flex items-center gap-1 text-slate-600">
                <ShieldAlert className="h-3 w-3" />
                {t.report.enforcementFrequency(violation.enforcement_frequency)}
              </span>
            )}
            {violation.legal_basis && (
              <span className="flex items-center gap-1 text-slate-500">
                <BookOpen className="h-3 w-3" />
                {violation.legal_basis}
              </span>
            )}
          </div>
        </div>
      )}

      {/* A/B Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Current on label (red) - Use raw_text_on_label (raw OCR) if available, fallback to description */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {t.report.currentOnLabel}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.raw_text_on_label || violation.description}&rdquo;
          </p>
        </div>

        {/* Right: Fix recommendation (green) */}
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.fixGuidance}
          </p>
          <MarkdownContent content={getLocalizedFix(violation.suggested_fix)} />
        </div>
      </div>

      {/* Citations section */}
      {hasCitations && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" />
              {t.report.citationsCount(validCitations.length)}
            </span>
            {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showCitations && (
            <div className="px-5 pb-4 space-y-2">
              {validCitations.map((cit, ci) => (
                <div key={ci} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-medium text-slate-600">{cit.section}</span>
                    {cit.relevance_tier && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        cit.relevance_tier === 'primary' ? 'bg-green-100 text-green-700' :
                        cit.relevance_tier === 'supporting' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {cit.relevance_tier}
                      </span>
                    )}
                    {cit.relevance_score > 0 && (
                      <span className="text-[9px] text-slate-400">{Math.round(cit.relevance_score * 100)}%</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{cit.text}</p>
                  {cit.source && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <ExternalLink className="h-2.5 w-2.5" />{cit.source}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline Expert CTA for critical violations */}
      {showExpertCta && violation.severity === 'critical' && (
        <div className="border-t border-red-100 bg-red-50/30 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-red-700">
            {t.report.criticalNeedsExpert}
          </span>
          <a 
            href="#expert-request-panel" 
            onClick={(e) => { 
              e.preventDefault()
              document.getElementById('expert-request-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) 
            }} 
            className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors"
          >
            {t.report.getExpertHelp}
            <MessageSquare className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  )
}
