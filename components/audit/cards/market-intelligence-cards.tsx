'use client'

import {
  AlertTriangle,
  CheckCircle,
  Mail,
  RotateCcw,
  Ship,
  Landmark,
  MessageSquare,
} from 'lucide-react'
import type { Violation } from '@/lib/types'
import type { useTranslation } from '@/lib/i18n'

// ────────────────────────────────────────────────────────────
// COMBINED Market Intelligence Card (Freemium Model)
// 
// Consolidates all Market Intelligence sources into ONE card:
// - Recalls
// - Warning Letters  
// - Import Alerts
//
// FREEMIUM STRATEGY:
// - FREE: Summary counts and category info
// - PAID: Full details via expert consultation
// 
// These do NOT affect risk score - they are proactive market intelligence.
// ────────────────────────────────────────────────────────────

interface CombinedMarketIntelligenceCardProps {
  recalls: Violation[]
  warningLetters: Violation[]
  importAlerts: Violation[]
  t: ReturnType<typeof useTranslation>['t']
}

export function CombinedMarketIntelligenceCard({ recalls, warningLetters, importAlerts, t }: CombinedMarketIntelligenceCardProps) {
  const totalCount = recalls.length + warningLetters.length + importAlerts.length
  if (totalCount === 0) return null

  // Extract unique categories for each type
  const getCategories = (items: Violation[], prefix: string) => {
    const categories = items.map(v => v.category?.replace(`${prefix}: `, '') || 'Unknown')
    return [...new Set(categories)].slice(0, 2) // Max 2 unique categories
  }

  const recallCategories = getCategories(recalls, 'Recall')
  const wlCategories = getCategories(warningLetters, 'Warning Letter')
  const iaCategories = getCategories(importAlerts, 'Import Alert')

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3 border-b border-amber-200/60">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2.5 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-amber-900 leading-tight">
              {t.report.marketWarningTitle || 'Cảnh Báo Thị Trường'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
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
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300">
                Market Intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner - NOT a violation notice */}
      <div className="mx-5 mt-4 mb-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-800">
              ĐÂY LÀ THÔNG TIN THAM KHẢO - Không phải vi phạm trên nhãn của bạn
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Các cảnh báo bên dưới liên quan đến sản phẩm CÙNG LOẠI đã bị thu hồi hoặc cảnh báo. Sử dụng thông tin này để phòng ngừa rủi ro.
            </p>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mx-5 mb-3 p-3 rounded-lg bg-amber-100/80 border border-amber-200">
        <p className="text-sm text-amber-800 font-medium">
          {recalls.length > 0 
            ? (t.report.marketWarningMessage || 'FDA đang giám sát chặt category này. Sản phẩm tương tự đã bị thu hồi.')
            : warningLetters.length > 0
            ? (t.report.warningLetterMarketMessage || 'Nhãn có ngôn ngữ tương tự đã bị FDA gửi Warning Letter.')
            : (t.report.importAlertMarketMessage || 'Sản phẩm hoặc nhà sản xuất có trong danh sách Import Alert.')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* LEFT: Free summary info */}
        <div className="p-5 bg-white/60 border-t border-r border-amber-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-4">
            {t.report.freeSummary || 'TÓM TẮT MIỄN PHÍ'}
          </p>
          
          {/* Condensed summary for each type */}
          <div className="space-y-3">
            {recalls.length > 0 && (
              <div className="flex items-start gap-2">
                <RotateCcw className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {recalls.length} {t.report.recallsFound || 'thu hồi liên quan'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {recallCategories.join(', ')}
                  </p>
                </div>
              </div>
            )}
            
            {warningLetters.length > 0 && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {warningLetters.length} {t.report.warningLettersFound || 'warning letter tương tự'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {wlCategories.join(', ')}
                  </p>
                </div>
              </div>
            )}
            
            {importAlerts.length > 0 && (
              <div className="flex items-start gap-2">
                <Ship className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {importAlerts.length} {t.report.importAlertsFound || 'import alert'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {iaCategories.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Blurred preview of locked content */}
          <div className="relative mt-4">
            <div className="p-3 rounded-lg bg-slate-100/80 border border-slate-200 blur-[4px] select-none pointer-events-none">
              <p className="text-xs text-slate-500">Recall #R-XXXX-26 - Company Details...</p>
              <p className="text-xs text-slate-400 mt-1">Full corrective action guidance...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 text-white text-xs font-medium shadow-lg">
                <Landmark className="h-3 w-3" />
                {t.report.lockedForExpert || 'Chi tiết dành cho chuyên gia'}
              </span>
            </div>
          </div>
        </div>
        
        {/* RIGHT: CTA */}
        <div className="p-5 bg-white/60 border-t border-amber-200/60">
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
            href="#expert-request-panel" 
            onClick={(e) => {
              e.preventDefault()
              const panel = document.getElementById('expert-request-panel')
              if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' })
                panel.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
                setTimeout(() => panel.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000)
              }
            }}
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {t.report.getFullReport || 'Nhận báo cáo đầy đủ + Tư vấn'}
          </a>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Warning Letter Card (Legacy - kept for backward compatibility)
// ────────────────────────────────────────────────────────────

interface WarningLetterCardProps {
  violation: Violation
  t: ReturnType<typeof useTranslation>['t']
}

export function WarningLetterCard({ violation, t }: WarningLetterCardProps) {
  // Extract category for display
  const category = violation.category?.replace('Warning Letter: ', '') || 'Labeling Issue'
  
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50 overflow-hidden">
      {/* Header with warning styling */}
      <div className="flex items-start justify-between p-5 pb-3 border-b border-amber-200/60">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2.5 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-amber-900 leading-tight">
              {t.report.marketWarningTitle || 'Cảnh Báo Thị Trường'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500 text-white">
                {t.report.warningLetterBadge || 'FDA Warning Letter'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300">
                Market Intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning message - stronger tone */}
      <div className="mx-5 mt-4 mb-3 p-3 rounded-lg bg-amber-100/80 border border-amber-200">
        <p className="text-sm text-amber-800 font-medium">
          {t.report.warningLetterMarketMessage || 'Nhãn có ngôn ngữ tương tự đã bị FDA gửi Warning Letter.'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* LEFT: Free summary info */}
        <div className="p-5 bg-white/60 border-t border-r border-amber-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-3">
            {t.report.freeSummary || 'Tóm tắt miễn phí'}
          </p>
          
          {/* Free info: category, violation type */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24">{t.report.recallCategory || 'Category'}:</span>
              <span className="text-sm font-medium text-slate-800">{category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24">{t.report.recallSignal || 'Signal'}:</span>
              <span className="text-sm font-medium text-amber-700">{t.report.recallHighRisk || 'High Risk'}</span>
            </div>
          </div>
          
          {/* Blurred preview of locked content */}
          <div className="relative">
            <div className="p-3 rounded-lg bg-slate-100/80 border border-slate-200 blur-[5px] select-none pointer-events-none">
              <p className="text-xs text-slate-500">Warning Letter #WL-XXXX-26 - Company Name Inc.</p>
              <p className="text-xs text-slate-400 mt-1">Violation Language: Full details here...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 text-white text-xs font-medium shadow-lg">
                <Landmark className="h-3 w-3" />
                {t.report.lockedForExpert || 'Chi tiết dành cho chuyên gia'}
              </span>
            </div>
          </div>
        </div>
        
        {/* RIGHT: CTA - stronger value proposition */}
        <div className="p-5 bg-white/60 border-t border-amber-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
            {t.report.fullReportIncludes || 'Báo cáo đầy đủ bao gồm'}
          </p>
          <ul className="space-y-2 mb-4 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.warningLetterItem1 || 'Original Warning Letter reference'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.warningLetterItem2 || 'Specific violating language'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.warningLetterItem3 || 'FDA-required corrective actions'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.warningLetterItem4 || 'Guidance to avoid repeat violations'}</span>
            </li>
          </ul>
          <a 
            href="#expert-request-panel" 
            onClick={(e) => {
              e.preventDefault()
              const panel = document.getElementById('expert-request-panel')
              if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' })
                panel.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
                setTimeout(() => panel.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000)
              }
            }}
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {t.report.getFullReport || 'Nhận báo cáo đầy đủ + Tư vấn'}
          </a>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Recall Card (Market Intelligence - Freemium Model)
// ────────────────────────────────────────────────────────────

interface RecallCardProps {
  violation: Violation
  t: ReturnType<typeof useTranslation>['t']
}

export function RecallCard({ violation, t }: RecallCardProps) {
  // Extract category for display
  const category = violation.category?.replace('Recall Risk: ', '') || t.report.recallSameCategory || 'same category'
  // Extract year from description if available (look for 4-digit year between 2000-2030)
  const timeMatch = violation.description?.match(/\b(20[0-2][0-9]|2030)\b/g)
  const timePeriod = timeMatch ? timeMatch[0] : (t.report.recallRecent || 'Recent')
  
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50 overflow-hidden">
      {/* Header with warning styling */}
      <div className="flex items-start justify-between p-5 pb-3 border-b border-amber-200/60">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2.5 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-amber-900 leading-tight">
              {t.report.marketWarningTitle || 'Cảnh Báo Thị Trường'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500 text-white">
                FDA Recall
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300">
                Market Intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning message - stronger tone */}
      <div className="mx-5 mt-4 mb-3 p-3 rounded-lg bg-amber-100/80 border border-amber-200">
        <p className="text-sm text-amber-800 font-medium">
          {t.report.marketWarningMessage || 'FDA đang giám sát chặt category này. Sản phẩm tương tự đã bị thu hồi.'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* LEFT: Free summary info */}
        <div className="p-5 bg-white/60 border-t border-r border-amber-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-3">
            {t.report.freeSummary || 'Tóm tắt miễn phí'}
          </p>
          
          {/* Free info: category, time period, risk signal */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24">{t.report.recallCategory || 'Category'}:</span>
              <span className="text-sm font-medium text-slate-800">{category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24">{t.report.recallTimePeriod || 'Time'}:</span>
              <span className="text-sm font-medium text-slate-800">{timePeriod}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24">{t.report.recallSignal || 'Signal'}:</span>
              <span className="text-sm font-medium text-amber-700">{t.report.recallHighRisk || 'High Risk'}</span>
            </div>
          </div>
          
          {/* Blurred preview of locked content */}
          <div className="relative">
            <div className="p-3 rounded-lg bg-slate-100/80 border border-slate-200 blur-[5px] select-none pointer-events-none">
              <p className="text-xs text-slate-500">Recall #R-XXXX-26 - Company Name Inc.</p>
              <p className="text-xs text-slate-400 mt-1">Corrective Action: Full details here...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 text-white text-xs font-medium shadow-lg">
                <Landmark className="h-3 w-3" />
                {t.report.lockedForExpert || 'Chi tiết dành cho chuyên gia'}
              </span>
            </div>
          </div>
        </div>
        
        {/* RIGHT: CTA - stronger value proposition */}
        <div className="p-5 bg-white/60 border-t border-amber-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
            {t.report.fullReportIncludes || 'Báo cáo đầy đủ bao gồm'}
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
            href="#expert-request-panel" 
            onClick={(e) => {
              e.preventDefault()
              const panel = document.getElementById('expert-request-panel')
              if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' })
                panel.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
                setTimeout(() => panel.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000)
              }
            }}
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {t.report.getFullReport || 'Nhận báo cáo đầy đủ + Tư vấn'}
          </a>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Import Alert Card (Market Intelligence - Freemium Model)
// ────────────────────────────────────────────────────────────

interface ImportAlertCardProps {
  violation: Violation
  t: ReturnType<typeof useTranslation>['t']
}

export function ImportAlertCard({ violation, t }: ImportAlertCardProps) {
  // Extract category for display
  const category = violation.category?.replace('Import Alert: ', '') || 'Border Risk'
  
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50 overflow-hidden">
      {/* Header with warning styling */}
      <div className="flex items-start justify-between p-5 pb-3 border-b border-amber-200/60">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2.5 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-amber-900 leading-tight">
              {t.report.marketWarningTitle || 'Cảnh Báo Thị Trường'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500 text-white">
                {t.report.importAlertBadge || 'FDA Import Alert'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300">
                Market Intelligence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning message - stronger tone */}
      <div className="mx-5 mt-4 mb-3 p-3 rounded-lg bg-amber-100/80 border border-amber-200">
        <p className="text-sm text-amber-800 font-medium">
          {t.report.importAlertMarketMessage || 'Sản phẩm hoặc nhà sản xuất có trong danh sách Import Alert.'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* LEFT: Free summary info */}
        <div className="p-5 bg-white/60 border-t border-r border-amber-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-3">
            {t.report.freeSummary || 'Tóm tắt miễn phí'}
          </p>
          
          {/* Free info: category, risk type */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24">{t.report.recallCategory || 'Category'}:</span>
              <span className="text-sm font-medium text-slate-800">{category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24">{t.report.recallSignal || 'Signal'}:</span>
              <span className="text-sm font-medium text-amber-700">DWPE Risk</span>
            </div>
          </div>
          
          {/* Blurred preview of locked content */}
          <div className="relative">
            <div className="p-3 rounded-lg bg-slate-100/80 border border-slate-200 blur-[5px] select-none pointer-events-none">
              <p className="text-xs text-slate-500">Import Alert #IA-XX-XXX - Country/Product Details</p>
              <p className="text-xs text-slate-400 mt-1">DWPE Procedure: Full guidance here...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 text-white text-xs font-medium shadow-lg">
                <Landmark className="h-3 w-3" />
                {t.report.lockedForExpert || 'Chi tiết dành cho chuyên gia'}
              </span>
            </div>
          </div>
        </div>
        
        {/* RIGHT: CTA - stronger value proposition */}
        <div className="p-5 bg-white/60 border-t border-amber-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
            {t.report.fullReportIncludes || 'Báo cáo đầy đủ bao gồm'}
          </p>
          <ul className="space-y-2 mb-4 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.importAlertItem1 || 'Official Import Alert number'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.importAlertItem2 || 'Reason for listing'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.importAlertItem3 || 'DWPE procedure explanation'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{t.report.importAlertItem4 || 'Border clearance guidance'}</span>
            </li>
          </ul>
          <a 
            href="#expert-request-panel" 
            onClick={(e) => {
              e.preventDefault()
              const panel = document.getElementById('expert-request-panel')
              if (panel) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'center' })
                panel.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
                setTimeout(() => panel.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000)
              }
            }}
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {t.report.getFullReport || 'Nhận báo cáo đầy đủ + Tư vấn'}
          </a>
        </div>
      </div>
    </div>
  )
}
