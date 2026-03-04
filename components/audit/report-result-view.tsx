'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Loader2,
  Info,
  Expand,
  Shield,
  Mail,
  RotateCcw,
  Ship,
  FileText,
  Languages,
  RefreshCw,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Ruler,
  Package,
  ShieldAlert,
  BookOpen,
  ExternalLink,
  Utensils,
  MessageSquare,
  Landmark,
} from 'lucide-react'
import type { AuditReport, Violation, LabelImageEntry, GeometryViolation } from '@/lib/types'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { LabelPreview } from '@/components/label-preview'
import { getLabelConfig } from '@/lib/label-field-config'
import { useTranslation } from '@/lib/i18n'
import { useTranslateViolations } from '@/hooks/use-translate-violations'

// ────────────────────────────────────────────────────────────
// Simple Markdown Renderer for AI-generated content
// ────────────────────────────────────────────────────────────

function MarkdownContent({ content, className }: { content: string; className?: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType === 'ol' ? 'ol' : 'ul'
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 space-y-1 text-sm text-slate-700`}
        >
          {listItems}
        </ListTag>
      )
      listItems = []
      listType = null
    }
  }

  const formatInline = (text: string) => {
    // Handle **bold** and *italic*
    const parts: React.ReactNode[] = []
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      if (match[1]) {
        parts.push(<strong key={match.index} className="font-semibold text-slate-800">{match[1]}</strong>)
      } else if (match[2]) {
        parts.push(<em key={match.index}>{match[2]}</em>)
      }
      lastIndex = regex.lastIndex
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    return parts.length > 0 ? parts : [text]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) {
      flushList()
      continue
    }

    // Headers: ### / ## / #
    const h3Match = line.match(/^###\s+(.+)/)
    if (h3Match) {
      flushList()
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-3 mb-1.5">
          {formatInline(h3Match[1].replace(/#+$/, '').trim())}
        </h4>
      )
      continue
    }

    const h2Match = line.match(/^##\s+(.+)/)
    if (h2Match) {
      flushList()
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">
          {formatInline(h2Match[1].replace(/#+$/, '').trim())}
        </h3>
      )
      continue
    }

    const h1Match = line.match(/^#\s+(.+)/)
    if (h1Match) {
      flushList()
      elements.push(
        <h3 key={`h1-${i}`} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">
          {formatInline(h1Match[1].replace(/#+$/, '').trim())}
        </h3>
      )
      continue
    }

    // Unordered list: - item
    const ulMatch = line.match(/^[-*]\s+(.+)/)
    if (ulMatch) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {formatInline(ulMatch[1])}
        </li>
      )
      continue
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^\d+[.)]\s+(.+)/)
    if (olMatch) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {formatInline(olMatch[1])}
        </li>
      )
      continue
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p key={`p-${i}`} className="text-sm text-slate-700 leading-relaxed">
        {formatInline(line)}
      </p>
    )
  }

  flushList()

  return <div className={`space-y-2 ${className || ''}`}>{elements}</div>
}

// ────────────────────────────────────────────────────────────
// Risk Score Circular Gauge - Vexim Compliance AI
// ────────────────────────────────────────────────────────────

function RiskScoreGauge({ score, size = 'lg', label }: { score: number; size?: 'sm' | 'lg'; label?: string }) {
  const color =
    score >= 7 ? '#ef4444' : score >= 4 ? '#f59e0b' : '#22c55e'
  const circumference = 2 * Math.PI * 42
  const dashLength = (score / 10) * circumference
  const sizeClass = size === 'sm' ? 'h-16 w-16' : 'h-24 w-24'
  const textClass = size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 100 100" className={`${sizeClass} -rotate-90`}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${dashLength} ${circumference}`}
          />
        </svg>
        <span className={`absolute ${textClass} font-bold`} style={{ color }}>
          {score.toFixed(1)}
        </span>
      </div>
      {label && <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// OCR Confidence Bar
// ────────────────────────────────────────────────────────────

function OcrConfidenceBar({ confidence }: { confidence: number }) {
  const { t } = useTranslation()
  const pct = Math.round(confidence * 100)
  const barColor =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{t.report.ocrConfidence}</span>
      </div>
      <span className="text-lg font-bold text-slate-800">{pct}%</span>
      <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Mini Confidence Bar (for extraction/legal reasoning)
// ────────────────────────────────────────────────────────────

function MiniConfidenceBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const barColor =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium text-slate-600 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Ingredient Tags
// ────────────────────────────────────────────────────────────

function IngredientTags({ ingredientList }: { ingredientList: string }) {
  const ingredients = ingredientList
    .split(/,|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8)

  return (
    <div className="flex flex-wrap gap-1.5">
      {ingredients.map((ing, i) => (
        <span
          key={i}
          className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700"
        >
          {ing}
        </span>
      ))}
      {ingredientList.split(/,|;/).length > 8 && (
        <span className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-400">
          +{ingredientList.split(/,|;/).length - 8}
        </span>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Severity Badge (NGHIEM TRONG / CANH BAO)
// ────────────────────────────────────────────────────────────

function SeverityBadge({ severity, t }: { severity: string; t: ReturnType<typeof useTranslation>['t'] }) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-red-500 text-white">
        {t.report.critical}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-amber-500 text-white">
      {t.report.warning}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Violation Icon
// ────────────────────────────────────────────────────────────

function ViolationIcon({ severity, type }: { severity: string; type?: string }) {
  if (type === 'contrast' || type === 'color_contrast') {
    return (
      <div className="rounded-full bg-blue-100 p-2.5 shrink-0">
        <Info className="h-5 w-5 text-blue-600" />
      </div>
    )
  }
  if (type === 'warning_letter') {
    return (
      <div className="rounded-full bg-orange-100 p-2.5 shrink-0">
        <Mail className="h-5 w-5 text-orange-600" />
      </div>
    )
  }
  if (type === 'recall') {
    return (
      <div className="rounded-full bg-purple-100 p-2.5 shrink-0">
        <RotateCcw className="h-5 w-5 text-purple-600" />
      </div>
    )
  }
  if (type === 'import_alert') {
    return (
      <div className="rounded-full bg-cyan-100 p-2.5 shrink-0">
        <Ship className="h-5 w-5 text-cyan-600" />
      </div>
    )
  }
  if (severity === 'critical') {
    return (
      <div className="rounded-full bg-red-100 p-2.5 shrink-0">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>
    )
  }
  return (
    <div className="rounded-full bg-amber-100 p-2.5 shrink-0">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Enhanced A/B Comparison Violation Card with Citations
// ────────────────────────────────────────────────────────────

function ViolationCard({ violation, index, t, showExpertCta }: { violation: Violation; index: number; t: ReturnType<typeof useTranslation>['t']; showExpertCta?: boolean }) {
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

  const hasCitations = violation.citations && violation.citations.length > 0

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
      {(violation.enforcement_frequency || violation.legal_basis) && (
        <div className="mx-5 mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {violation.enforcement_frequency && violation.enforcement_frequency > 0 && (
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
        {/* Left: Current on label (red) */}
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {t.report.currentOnLabel}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
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
              {t.report.citationsCount(violation.citations.length)}
            </span>
            {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showCitations && (
            <div className="px-5 pb-4 space-y-2">
              {violation.citations.map((cit, ci) => (
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
          <a href="#expert-request" className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors">
            {t.report.getExpertHelp}
            <MessageSquare className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Warning Letter Violation Card
// ────────────────────────────────────────────────────────────

function WarningLetterCard({ violation, t }: { violation: Violation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="warning_letter" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.warningLetterTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-orange-100 text-orange-700 border border-orange-200">
                FDA Warning Letter
              </span>
              {violation.regulation_reference && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  {violation.regulation_reference}
                </span>
              )}
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-orange-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-3">
            {t.report.violationContent}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.veximRecommendation}
          </p>
          <MarkdownContent content={violation.suggested_fix || t.report.warningLetterDefaultFix} />
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Recall Card
// ────────────────────────────────────────────────────────────

function RecallCard({ violation, t }: { violation: Violation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-purple-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="recall" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.recallTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-purple-100 text-purple-700 border border-purple-200">
                FDA Recall
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-purple-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-3">
            {t.report.recallInfo}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.veximRecommendation}
          </p>
          <MarkdownContent content={violation.suggested_fix || t.report.recallDefaultFix} />
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Import Alert Card
// ────────────────────────────────────────────────────────────

function ImportAlertCard({ violation, t }: { violation: Violation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-cyan-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <ViolationIcon severity={violation.severity} type="import_alert" />
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.importAlertTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-100 text-cyan-700 border border-cyan-200">
                Import Alert
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-cyan-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 mb-3">
            {t.report.importAlertContent}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
                  {t.report.veximRecommendation}
                  </p>
                  <MarkdownContent content={violation.suggested_fix || t.report.importAlertDefaultFix} />
                  </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Contrast Violation Card (merged into main list per spec)
// ────────────────────────────────────────────────────────────

function ContrastViolationCard({
  violation,
  t,
}: {
  violation: {
    type: string
    severity: 'critical' | 'warning' | 'info'
    description: string
    ratio?: number
    recommendation?: string
    colors?: { foreground: string; background: string }
  }
  t: ReturnType<typeof useTranslation>['t']
}) {
  const ratioText = violation.ratio
    ? t.report.contrastRatio(violation.ratio)
    : violation.description

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
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
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                {t.report.fdaReadabilityReq}
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity === 'critical' ? 'critical' : 'warning'} t={t} />
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

// ────────────────────────────────────────────────────────────
// Geometry Violation Card
// ────────────────────────────────────────────────────────────

function GeometryViolationCard({ violation, t }: { violation: GeometryViolation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-indigo-100 p-2.5 shrink-0">
            <Ruler className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {violation.description}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100">
                {violation.regulation}
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={violation.severity} t={t} />
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-red-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-3">
            {t.report.actualValue}
          </p>
          <p className="text-sm text-slate-700 font-mono">{violation.actual}</p>
        </div>
        <div className="p-5 bg-emerald-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
            {t.report.expectedValue}
          </p>
          <p className="text-sm text-slate-700 font-mono">{violation.expected}</p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Report Result View
// ────────────────────────────────────────────────────────────

interface ReportResultViewProps {
  report: AuditReport
  onDownloadPdf: () => void
  pdfLoading: boolean
}

export function ReportResultView({
  report,
  onDownloadPdf,
  pdfLoading,
}: ReportResultViewProps) {
  const router = useRouter()
  const { t, locale } = useTranslation()
  const [showExpertTips, setShowExpertTips] = useState(true)

  const rawViolations: Violation[] = (report as any).findings || report.violations || []
  
  // Use translation hook for AI-generated content
  const {
    translatedViolations,
    isTranslating,
    translationError,
    sourceLanguage,
    retryTranslation,
  } = useTranslateViolations(rawViolations, locale, report.id)
  
  const allViolations = translatedViolations
  
  // Filter violations by source type
  const cfrViolations = allViolations.filter(
    (v) =>
      v.source_type !== 'import_alert' &&
  v.source_type !== 'warning_letter' &&
  v.source_type !== 'recall'
  )
  const wlViolations = allViolations.filter((v) => v.source_type === 'warning_letter')
  const recallViolations = allViolations.filter((v) => v.source_type === 'recall')
  const importAlertViolations = allViolations.filter((v) => v.source_type === 'import_alert')
  
  const contrastViolations = report.contrast_violations || []
  const geometryViolations = report.geometry_violations || []

  const riskScore = report.overall_risk_score ?? 5
  const projectedRiskScore = report.projected_risk_score
  const riskLabel =
    riskScore >= 7
      ? t.report.riskHigh
      : riskScore >= 4
        ? t.report.riskMediumHigh
        : riskScore >= 2
          ? t.report.riskMedium
          : t.report.riskLow

  const criticalCount =
    allViolations.filter((v) => v.severity === 'critical').length +
    contrastViolations.filter((v) => v.severity === 'critical').length
  const warningCount =
    allViolations.filter((v) => v.severity === 'warning').length +
    contrastViolations.filter((v) => v.severity === 'warning' || v.severity === 'info').length

  const descParts: string[] = []
  if (criticalCount > 0) descParts.push(`${criticalCount} ${t.report.criticalViolations}`)
  if (warningCount > 0) descParts.push(`${warningCount} ${t.report.warnings}`)

  const expertTips = report.expert_tips || []
  const commercialSummary = report.commercial_summary
  const enforcementInsights = report.enforcement_insights || []
  const nutritionFacts = report.nutrition_facts || []
  const allergenDeclaration = report.allergen_declaration
  const healthClaims = (report as any).health_claims as string[] | undefined
  const detectedLanguages = (report as any).detected_languages as string[] | undefined
  const netQuantity = (report as any).net_quantity as string | undefined
  const packagingFormat = report.packaging_format
  const specialClaims = report.special_claims || []

  return (
    <div className="bg-slate-50">
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-600 font-medium">FDA Pipeline: Connected</span>
            </div>
            
            {isTranslating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
                <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                <span className="text-xs text-blue-600 font-medium">
                  {t.report.translating || 'Translating...'}
                </span>
              </div>
            )}
            
            {translationError && !isTranslating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                <Languages className="h-3 w-3 text-amber-600" />
                <span className="text-xs text-amber-600 font-medium">
                  {t.report.translationFailed || 'Translation unavailable'}
                </span>
                <button
                  onClick={retryTranslation}
                  className="ml-1 p-0.5 rounded hover:bg-amber-100 transition-colors"
                  title={t.report.retry || 'Retry'}
                >
                  <RefreshCw className="h-3 w-3 text-amber-600" />
                </button>
              </div>
            )}
            
            {sourceLanguage && sourceLanguage !== locale && !isTranslating && !translationError && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                <Languages className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  {t.report.translatedFrom || 'Translated from'} {sourceLanguage === 'vi' ? 'Vietnamese' : 'English'}
                </span>
              </div>
            )}
          </div>
          <Button
            onClick={onDownloadPdf}
            disabled={pdfLoading}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 text-sm font-semibold"
            size="sm"
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {pdfLoading ? t.report.generating : t.report.exportReport}
          </Button>
        </div>
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* ── LEFT SIDEBAR ───────────────────────────────── */}
          <aside className="space-y-4">
            {/* Label Images Card */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                    <Expand className="h-4 w-4 text-slate-500" />
                    {t.report.labelImages}
                  </h2>
                  {report.label_images && report.label_images.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] uppercase font-bold tracking-wider border-0">
                      {report.label_images.length} {t.report.images}
                    </Badge>
                  )}
                </div>

                {report.label_image_url === 'manual-entry' ? (
                  <div className="rounded-lg overflow-hidden bg-slate-100 p-3 flex items-center justify-center min-h-[180px]">
                    {report.form_data && report.product_category ? (
                      <LabelPreview
                        config={getLabelConfig(report.product_category)}
                        formData={report.form_data}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {t.common.noData}
                      </p>
                    )}
                  </div>
                ) : (
                  <LabelImageGallery
                    images={(report.label_images as LabelImageEntry[]) || []}
                    fallbackUrl={report.label_image_url}
                  />
                )}
              </div>
            </Card>

            {/* Product Info Card (Enhanced) */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-4 w-4 text-slate-500" />
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {t.report.productInfoAI}
                  </h2>
                </div>

                <div className="space-y-3">
                  {(report as any).brand_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.brand}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {(report as any).brand_name}
                      </p>
                    </div>
                  )}

                  {report.product_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.productName}
                      </p>
                      <p className="text-sm font-medium text-slate-700 italic">
                        {report.product_name}
                      </p>
                    </div>
                  )}

                  {/* Net Quantity (NEW) */}
                  {netQuantity && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.netQuantity}
                      </p>
                      <p className="text-sm font-medium text-slate-700">{netQuantity}</p>
                    </div>
                  )}

                  {report.ingredient_list && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                        {t.report.extractedIngredients}
                      </p>
                      <IngredientTags ingredientList={report.ingredient_list} />
                    </div>
                  )}

                  {/* Allergen Declaration (NEW) */}
                  {allergenDeclaration && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-[11px] text-amber-700 uppercase tracking-wider font-bold mb-1">
                        {t.report.allergenDeclaration}
                      </p>
                      <p className="text-xs text-amber-900 leading-relaxed">{allergenDeclaration}</p>
                    </div>
                  )}

                  {/* Health Claims (NEW) */}
                  {healthClaims && healthClaims.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-[11px] text-red-700 uppercase tracking-wider font-bold mb-1.5">
                        {t.report.healthClaimsTitle}
                      </p>
                      <div className="space-y-1">
                        {healthClaims.map((claim, idx) => (
                          <p key={idx} className="text-xs text-red-800 flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            {claim}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Claims (NEW) */}
                  {specialClaims.length > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                        {t.report.specialClaimsTitle}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {specialClaims.map((claim, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                            {claim}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.product_category && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.category}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.product_category}
                      </p>
                    </div>
                  )}

                  {/* Packaging Format (NEW) */}
                  {packagingFormat && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.packagingFormatLabel}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        <Package className="h-3 w-3 mr-1" />
                        {packagingFormat.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}

                  {report.target_market && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.market}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.target_market}
                      </p>
                    </div>
                  )}

                  {/* Detected Languages (NEW) */}
                  {detectedLanguages && detectedLanguages.length > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                        {t.report.detectedLanguagesTitle}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedLanguages.map((lang, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium flex items-center gap-1">
                            <Languages className="h-2.5 w-2.5" />
                            {lang.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Nutrition Facts Card (NEW) */}
            {nutritionFacts.length > 0 && (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Utensils className="h-4 w-4 text-slate-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t.report.nutritionFactsTitle}
                    </h2>
                    <Badge variant="secondary" className="text-[9px] ml-auto">
                      {nutritionFacts.length}
                    </Badge>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider">
                      Nutrition Facts
                    </div>
                    <div className="divide-y divide-slate-100">
                      {nutritionFacts.slice(0, 12).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                          <span className="text-slate-700 font-medium">{item.nutrient || item.name}</span>
                          <span className="text-slate-900 font-semibold">
                            {item.value}{item.unit}
                            {item.dailyValue && (
                              <span className="text-slate-400 font-normal ml-1">({item.dailyValue}% DV)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Confidence Meters (NEW) */}
            {(report.extraction_confidence || report.legal_reasoning_confidence) && (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t.report.confidenceMetrics}
                    </h2>
                  </div>
                  <div className="space-y-2.5">
                    {report.ocr_confidence !== undefined && (
                      <MiniConfidenceBar label={t.report.ocrLabel} value={report.ocr_confidence} />
                    )}
                    {report.extraction_confidence !== undefined && (
                      <MiniConfidenceBar label={t.report.extractionLabel} value={report.extraction_confidence} />
                    )}
                    {report.legal_reasoning_confidence !== undefined && (
                      <MiniConfidenceBar label={t.report.legalLabel} value={report.legal_reasoning_confidence} />
                    )}
                  </div>
                </div>
              </Card>
            )}
          </aside>

          {/* ── MAIN CONTENT ───────────────────────────────── */}
          <div className="space-y-6">
            {/* Risk Score Banner (Enhanced with Projected Score) */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-6 flex items-center gap-6 flex-wrap">
                <RiskScoreGauge score={riskScore} label={t.report.currentRisk} />

                {projectedRiskScore !== undefined && projectedRiskScore !== null && projectedRiskScore < riskScore && (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                      <span className="text-[10px] text-green-600 font-bold">
                        -{((riskScore - projectedRiskScore) / riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <RiskScoreGauge score={projectedRiskScore} size="sm" label={t.report.afterFix} />
                  </>
                )}

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    {t.report.riskLevel}:{' '}
                    <span
                      className={
                        riskScore >= 7
                          ? 'text-red-600'
                          : riskScore >= 4
                            ? 'text-amber-600'
                            : 'text-green-600'
                      }
                    >
                      {riskLabel}
                    </span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {descParts.length > 0
                      ? t.report.riskDescWithIssues(descParts.join(` ${t.report.andWord} `))
                      : t.report.riskDescCompliant}
                  </p>
                  {projectedRiskScore !== undefined && projectedRiskScore !== null && projectedRiskScore < riskScore && (
                    <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {t.report.projectedRiskDesc(projectedRiskScore)}
                    </p>
                  )}
                </div>

                {report.ocr_confidence !== undefined && (
                  <OcrConfidenceBar confidence={report.ocr_confidence} />
                )}
              </div>
            </Card>

            {/* ── EXPERT TIPS & AI SUMMARY (NEW) ─────────────── */}
            {(expertTips.length > 0 || commercialSummary) && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 overflow-hidden">
                <button
                  onClick={() => setShowExpertTips(!showExpertTips)}
                  className="w-full flex items-center justify-between p-5 pb-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-100 p-2.5">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-base font-bold text-slate-900">
                        {t.report.expertInsightsTitle}
                      </h2>
                      <p className="text-xs text-slate-500">{t.report.expertInsightsDesc}</p>
                    </div>
                  </div>
                  {showExpertTips ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {showExpertTips && (
                  <div className="px-5 pb-5 space-y-4">
                    {commercialSummary && (
                      <div className="p-4 rounded-lg bg-white/70 border border-blue-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2">
                          {t.report.aiSummary}
                        </p>
                        <MarkdownContent content={commercialSummary} />
                      </div>
                    )}
                    {expertTips.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                          {t.report.expertTipsLabel}
                        </p>
                        {expertTips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/70 border border-blue-100">
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <MarkdownContent content={tip} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* ── ENFORCEMENT INSIGHTS (NEW) ─────────────────── */}
            {enforcementInsights.length > 0 && (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4 w-4 text-slate-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t.report.enforcementInsightsTitle}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {enforcementInsights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-amber-500 mt-1 shrink-0">{'>'}</span>
                        <MarkdownContent content={insight} />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* ── OVERALL ASSESSMENT FROM VEXIM AI ─────────────────── */}
            <Card className={`overflow-hidden border-2 ${
              riskScore >= 7 
                ? 'border-red-200 bg-red-50' 
                : riskScore >= 2 
                  ? 'border-amber-200 bg-amber-50' 
                  : 'border-green-200 bg-green-50'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`rounded-full p-2.5 ${
                    riskScore >= 7 
                      ? 'bg-red-100' 
                      : riskScore >= 2 
                        ? 'bg-amber-100' 
                        : 'bg-green-100'
                  }`}>
                    {riskScore >= 7 ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : riskScore >= 2 ? (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                    {t.report.overallAssessment}
                  </h2>
                </div>

                {/* Compliance Summary */}
                <div className="space-y-4">
                  {/* Regulations Checked */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {t.report.regulationsChecked}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {t.report.cfr101}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {t.report.cfr701}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {'FD&C Act Section 403'}
                      </span>
                      {report.product_category === 'cosmetic' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                          {t.report.cfr700}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Historical Data Check */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {t.report.historicalDataCheck}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className={`rounded-lg p-3 ${
                        wlViolations.length > 0 ? 'bg-orange-100 border border-orange-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Mail className={`h-4 w-4 ${wlViolations.length > 0 ? 'text-orange-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Warning Letters</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${wlViolations.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {wlViolations.length > 0 ? `${wlViolations.length} ${t.report.related}` : t.report.none}
                        </p>
                      </div>
                      
                      <div className={`rounded-lg p-3 ${
                        recallViolations.length > 0 ? 'bg-purple-100 border border-purple-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <RotateCcw className={`h-4 w-4 ${recallViolations.length > 0 ? 'text-purple-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Recalls</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${recallViolations.length > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                          {recallViolations.length > 0 ? `${recallViolations.length} ${t.report.related}` : t.report.none}
                        </p>
                      </div>
                      
                      <div className={`rounded-lg p-3 ${
                        importAlertViolations.length > 0 ? 'bg-cyan-100 border border-cyan-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Ship className={`h-4 w-4 ${importAlertViolations.length > 0 ? 'text-cyan-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Import Alerts</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${importAlertViolations.length > 0 ? 'text-cyan-600' : 'text-green-600'}`}>
                          {importAlertViolations.length > 0 ? `${importAlertViolations.length} ${t.report.related}` : t.report.none}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div className={`rounded-lg p-4 ${
                    riskScore >= 7 
                      ? 'bg-red-100 border border-red-200' 
                      : riskScore >= 2 
                        ? 'bg-amber-100 border border-amber-200' 
                        : 'bg-green-100 border border-green-200'
                  }`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                      {t.report.conclusion}
                    </p>
                    {riskScore >= 7 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-red-800">
                          {t.report.conclusionHigh}
                        </p>
                        <p className="text-sm text-red-700 leading-relaxed">
                          {t.report.conclusionHighDesc(criticalCount, warningCount, wlViolations.length, recallViolations.length, importAlertViolations.length)}
                        </p>
                      </div>
                    ) : riskScore >= 2 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-amber-800">
                          {t.report.conclusionMedium}
                        </p>
                        <p className="text-sm text-amber-700 leading-relaxed">
                          {t.report.conclusionMediumDesc(warningCount, wlViolations.length === 0 && recallViolations.length === 0 && importAlertViolations.length === 0)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-green-800">
                          {t.report.conclusionLow}
                        </p>
                        <p className="text-sm text-green-700 leading-relaxed">
                          {t.report.conclusionLowDesc(wlViolations.length === 0 && recallViolations.length === 0 && importAlertViolations.length === 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── CONSEQUENCES BANNER (NEW - for high risk) ──────── */}
            {riskScore >= 5 && criticalCount > 0 && (
              <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide">
                      {t.report.consequencesTitle}
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/60 border border-red-100">
                      <p className="text-xs font-bold text-red-700">{t.report.consequenceDetention}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">$5,000-15,000</p>
                      <p className="text-[10px] text-slate-500">{t.report.consequenceDetentionDesc}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/60 border border-red-100">
                      <p className="text-xs font-bold text-red-700">{t.report.consequenceRelabeling}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">$3,000-8,000</p>
                      <p className="text-[10px] text-slate-500">{t.report.consequenceRelabelingDesc}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/60 border border-red-100">
                      <p className="text-xs font-bold text-red-700">{t.report.consequenceRecall}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">$50,000+</p>
                      <p className="text-[10px] text-slate-500">{t.report.consequenceRecallDesc}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <a href="#expert-request" className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
                      {t.report.getExpertHelp}
                      <MessageSquare className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {/* ── CFR VIOLATIONS SECTION ───────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {t.report.cfrComplianceDetail}
                </h2>
              </div>

              {cfrViolations.length === 0 && contrastViolations.length === 0 ? (
                <Card className="bg-white border-slate-200 p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {t.report.noCfrViolations}
                  </h3>
                  <p className="text-slate-500">
                    {t.report.labelCompliant}
                  </p>
                </Card>
              ) : (
                <div className="space-y-5">
                  {/* CFR violations */}
                  {cfrViolations.map((violation, index) => (
                    <ViolationCard
                      key={`cfr-${index}`}
                      violation={violation}
                      index={index}
                      t={t}
                      showExpertCta={riskScore >= 4}
                    />
                  ))}

                  {/* Contrast violations merged into main list */}
                  {contrastViolations.map((cv, index) => (
                    <ContrastViolationCard
                      key={`contrast-${index}`}
                      violation={cv}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── GEOMETRY VIOLATIONS SECTION (NEW) ────────────── */}
            {geometryViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Ruler className="h-4 w-4 text-indigo-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.geometrySection}
                  </h2>
                </div>
                <div className="space-y-5">
                  {geometryViolations.map((gv, index) => (
                    <GeometryViolationCard key={`geo-${index}`} violation={gv} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* ── WARNING LETTERS SECTION ───────────────────────── */}
            {wlViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-4 w-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.warningLettersSection} ({wlViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {wlViolations.map((violation, index) => (
                    <WarningLetterCard key={`wl-${index}`} violation={violation} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* ── RECALLS SECTION ───────────────────────── */}
            {recallViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <RotateCcw className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.recallsSection} ({recallViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {recallViolations.map((violation, index) => (
                    <RecallCard key={`recall-${index}`} violation={violation} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* ── IMPORT ALERTS SECTION ───────────────────────── */}
            {importAlertViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Ship className="h-4 w-4 text-cyan-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.importAlertsSection} ({importAlertViolations.length})
                  </h2>
                </div>
                <div className="space-y-5">
                  {importAlertViolations.map((violation, index) => (
                    <ImportAlertCard key={`ia-${index}`} violation={violation} t={t} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
