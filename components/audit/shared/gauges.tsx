'use client'

import { useTranslation } from '@/lib/i18n'

// ────────────────────────────────────────────────────────────
// Risk Score Circular Gauge - Vexim Compliance AI
// ────────────────────────────────────────────────────────────

interface RiskScoreGaugeProps {
  score: number
  size?: 'sm' | 'lg'
  label?: string
}

export function RiskScoreGauge({ score, size = 'lg', label }: RiskScoreGaugeProps) {
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

interface OcrConfidenceBarProps {
  confidence: number
}

export function OcrConfidenceBar({ confidence }: OcrConfidenceBarProps) {
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

interface MiniConfidenceBarProps {
  label: string
  value: number
}

export function MiniConfidenceBar({ label, value }: MiniConfidenceBarProps) {
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
