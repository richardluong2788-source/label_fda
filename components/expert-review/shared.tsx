'use client'

// ────────────────────────────────────────────────────────────
// Expert Review - Shared Components
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// Risk Score Circular Gauge
// ────────────────────────────────────────────────────────────

interface RiskScoreGaugeProps {
  score: number
  size?: 'sm' | 'md'
}

export function RiskScoreGauge({ score, size = 'md' }: RiskScoreGaugeProps) {
  const color =
    score >= 7 ? '#ef4444' : score >= 4 ? '#f59e0b' : '#22c55e'
  const circumference = 2 * Math.PI * 42
  const dashLength = (score / 10) * circumference
  const sizeClass = size === 'sm' ? 'h-16 w-16' : 'h-24 w-24'
  const textClass = size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg viewBox="0 0 100 100" className={`${sizeClass} -rotate-90`}>
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
        />
      </svg>
      <span className={`absolute ${textClass} font-bold`} style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Confidence Bar
// ────────────────────────────────────────────────────────────

interface ConfidenceBarProps {
  label: string
  value: number
}

export function ConfidenceBar({ label, value }: ConfidenceBarProps) {
  const pct = Math.round(value * 100)
  const barColor =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  const textColor =
    pct >= 80 ? 'text-green-700' : pct >= 60 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${textColor}`}>
        {pct}%
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Severity Badge
// ────────────────────────────────────────────────────────────

interface SeverityBadgeProps {
  severity: string
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-red-500 text-white">
        Critical
      </span>
    )
  }
  if (severity === 'warning') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-amber-500 text-white">
        Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-blue-500 text-white">
      Info
    </span>
  )
}
