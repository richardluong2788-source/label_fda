'use client'

import { Ruler } from 'lucide-react'
import type { GeometryViolation } from '@/lib/types'
import type { useTranslation } from '@/lib/i18n'
import { SeverityBadge } from '@/components/audit/shared/badges'

// ────────────────────────────────────────────────────────────
// Geometry Violation Card
// ────────────────────────────────────────────────────────────

interface GeometryViolationCardProps {
  violation: GeometryViolation
  t: ReturnType<typeof useTranslation>['t']
}

export function GeometryViolationCard({ violation, t }: GeometryViolationCardProps) {
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
