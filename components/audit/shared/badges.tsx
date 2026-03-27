'use client'

import {
  AlertTriangle,
  Info,
  Mail,
  RotateCcw,
  Ship,
} from 'lucide-react'
import type { useTranslation } from '@/lib/i18n'

// ────────────────────────────────────────────────────────────
// Severity Badge (NGHIEM TRONG / CANH BAO)
// ────────────────────────────────────────────────────────────

interface SeverityBadgeProps {
  severity: string
  t: ReturnType<typeof useTranslation>['t']
}

export function SeverityBadge({ severity, t }: SeverityBadgeProps) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-red-500 text-white">
        {t.report.critical}
      </span>
    )
  }
  if (severity === 'info') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-blue-500 text-white">
        {t.report.advisoryBadge}
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

interface ViolationIconProps {
  severity: string
  type?: string
}

export function ViolationIcon({ severity, type }: ViolationIconProps) {
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
// Ingredient Tags
// ────────────────────────────────────────────────────────────

interface IngredientTagsProps {
  ingredientList: string
}

export function IngredientTags({ ingredientList }: IngredientTagsProps) {
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
