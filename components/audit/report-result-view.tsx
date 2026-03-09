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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LabelPreview } from '@/components/label-preview'
import { getLabelConfig } from '@/lib/label-field-config'
import { useTranslation } from '@/lib/i18n'
import { useTranslateViolations } from '@/hooks/use-translate-violations'
import { ClaimsValidator, type NutritionFactData } from '@/lib/claims-validator'

// ────────────────────────────────────────────────────────────
// Claim Tooltips - i18n support for FDA regulation references
// ────────────────────────────────────────────────────────────

type ClaimTooltipInfo = { regulation: string; note: string; needsLabTest?: boolean }

function getClaimTooltips(locale: string): Record<string, ClaimTooltipInfo> {
  const isVi = locale === 'vi'
  
  return {
    // Gluten Free - 21 CFR 101.91
    'gf': {
      regulation: '21 CFR §101.91',
      note: isVi ? '< 20ppm gluten để được gọi là "Gluten-Free"' : '< 20ppm gluten required to label as "Gluten-Free"',
      needsLabTest: true
    },
    'gluten free': {
      regulation: '21 CFR §101.91',
      note: isVi ? '< 20ppm gluten để được gọi là "Gluten-Free"' : '< 20ppm gluten required to label as "Gluten-Free"',
      needsLabTest: true
    },
    'gluten-free': {
      regulation: '21 CFR §101.91',
      note: isVi ? '< 20ppm gluten để được gọi là "Gluten-Free"' : '< 20ppm gluten required to label as "Gluten-Free"',
      needsLabTest: true
    },
    // Keto - Unregulated
    'keto': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định chính thức. Thường hiểu là low-carb, high-fat.' : 'Not officially regulated by FDA. Generally understood as low-carb, high-fat.',
    },
    'keto friendly': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định chính thức. Thường hiểu là low-carb, high-fat.' : 'Not officially regulated by FDA. Generally understood as low-carb, high-fat.',
    },
    // Paleo - Unregulated
    'paleo': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định chính thức.' : 'Not officially regulated by FDA.',
    },
    // Non-GMO
    'non-gmo': {
      regulation: 'USDA Bioengineered (BE) Disclosure',
      note: isVi ? 'Phải tuân thủ National Bioengineered Food Disclosure Standard.' : 'Must comply with National Bioengineered Food Disclosure Standard.',
    },
    'gmo free': {
      regulation: 'USDA Bioengineered (BE) Disclosure',
      note: isVi ? 'Phải tuân thủ National Bioengineered Food Disclosure Standard.' : 'Must comply with National Bioengineered Food Disclosure Standard.',
    },
    // Superfood - Marketing claim
    'superfood': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim marketing không được FDA định nghĩa. Có thể bị coi là misleading nếu không có evidence.' : 'Marketing claim not defined by FDA. May be considered misleading without evidence.',
    },
    // Vegan/Vegetarian
    'vegan': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Khuyến nghị có chứng nhận từ bên thứ ba.' : 'Voluntary claim. Third-party certification recommended.',
    },
    'vegetarian': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Khuyến nghị có chứng nhận từ bên thứ ba.' : 'Voluntary claim. Third-party certification recommended.',
    },
    'plant-based': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA định nghĩa chính thức.' : 'Not officially defined by FDA.',
    },
    // Natural
    'all natural': {
      regulation: 'FDA Policy (no CFR)',
      note: isVi ? 'FDA chưa có định nghĩa chính thức. Nên tránh sử dụng hoặc cần evidence.' : 'FDA has no formal definition. Avoid using or provide evidence.',
    },
    'natural': {
      regulation: 'FDA Policy (no CFR)',
      note: isVi ? 'FDA chưa có định nghĩa chính thức. Nên tránh sử dụng hoặc cần evidence.' : 'FDA has no formal definition. Avoid using or provide evidence.',
    },
    // Organic
    'usda organic': {
      regulation: 'USDA NOP (7 CFR Part 205)',
      note: isVi ? 'Phải có chứng nhận USDA Organic từ certifying agent.' : 'Must have USDA Organic certification from accredited certifying agent.',
    },
    'organic': {
      regulation: 'USDA NOP (7 CFR Part 205)',
      note: isVi ? 'Phải có chứng nhận từ USDA-accredited certifying agent.' : 'Must have certification from USDA-accredited certifying agent.',
    },
    // No Artificial claims
    'no artificial flavors': {
      regulation: '21 CFR §101.22',
      note: isVi ? 'Phải đảm bảo không có artificial flavors theo định nghĩa FDA.' : 'Must ensure no artificial flavors per FDA definition.',
    },
    'no artificial sweeteners': {
      regulation: '21 CFR §101.22',
      note: isVi ? 'Phải đảm bảo không có artificial sweeteners.' : 'Must ensure no artificial sweeteners.',
    },
    'no preservatives': {
      regulation: '21 CFR §101.22',
      note: isVi ? 'Phải đảm bảo không có preservatives theo định nghĩa FDA.' : 'Must ensure no preservatives per FDA definition.',
    },
    // Sugar claims
    'no added sugar': {
      regulation: '21 CFR §101.60(c)',
      note: isVi ? 'Không được thêm đường trong quá trình sản xuất.' : 'No sugar added during processing.',
    },
    'sugar free': {
      regulation: '21 CFR §101.60(c)',
      note: isVi ? '< 0.5g đường mỗi khẩu phần.' : '< 0.5g sugar per serving.',
    },
    // Fat claims
    'fat free': {
      regulation: '21 CFR §101.62(b)',
      note: isVi ? '< 0.5g chất béo mỗi khẩu phần.' : '< 0.5g fat per serving.',
    },
    'low fat': {
      regulation: '21 CFR §101.62(b)',
      note: isVi ? '≤ 3g chất béo mỗi khẩu phần.' : '≤ 3g fat per serving.',
    },
    // Sodium claims
    'low sodium': {
      regulation: '21 CFR §101.61',
      note: isVi ? '≤ 140mg sodium mỗi khẩu phần.' : '≤ 140mg sodium per serving.',
    },
    'sodium free': {
      regulation: '21 CFR §101.61',
      note: isVi ? '< 5mg sodium mỗi khẩu phần.' : '< 5mg sodium per serving.',
    },
    // Religious certifications
    'kosher': {
      regulation: isVi ? 'Chứng nhận Kosher' : 'Kosher Certification',
      note: isVi ? 'Phải có chứng nhận từ tổ chức Kosher được công nhận.' : 'Must have certification from recognized Kosher organization.',
    },
    'halal': {
      regulation: isVi ? 'Chứng nhận Halal' : 'Halal Certification',
      note: isVi ? 'Phải có chứng nhận từ tổ chức Halal được công nhận.' : 'Must have certification from recognized Halal organization.',
    },
    
    // ═══════════════════════════════════════════════════════════
    // COSMETIC CLAIMS (21 CFR 701)
    // ═══════════════════════════════════════════════════════════
    
    // Hypoallergenic - No FDA definition
    'hypoallergenic': {
      regulation: isVi ? 'Không có quy định FDA (21 CFR 701)' : 'No FDA regulation (21 CFR 701)',
      note: isVi ? 'FDA không có định nghĩa hoặc tiêu chuẩn cho "hypoallergenic". Nhà sản xuất tự chịu trách nhiệm.' : 'FDA has no definition or standard for "hypoallergenic". Manufacturer bears responsibility.',
    },
    // Dermatologist tested
    'dermatologist tested': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim cần có bằng chứng về clinical testing. Không có tiêu chuẩn cụ thể.' : 'Claim requires evidence of clinical testing. No specific standard exists.',
    },
    'dermatologically tested': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim cần có bằng chứng về clinical testing. Không có tiêu chuẩn cụ thể.' : 'Claim requires evidence of clinical testing. No specific standard exists.',
    },
    // Non-comedogenic
    'non-comedogenic': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định. Cần clinical evidence để support.' : 'Not regulated by FDA. Requires clinical evidence to support.',
    },
    'noncomedogenic': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định. Cần clinical evidence để support.' : 'Not regulated by FDA. Requires clinical evidence to support.',
    },
    // Fragrance-free
    'fragrance free': {
      regulation: '21 CFR §701.3',
      note: isVi ? 'Sản phẩm không được chứa fragrance ingredients. Masking agents có thể được phép.' : 'Product must not contain fragrance ingredients. Masking agents may be permitted.',
    },
    'fragrance-free': {
      regulation: '21 CFR §701.3',
      note: isVi ? 'Sản phẩm không được chứa fragrance ingredients. Masking agents có thể được phép.' : 'Product must not contain fragrance ingredients. Masking agents may be permitted.',
    },
    'unscented': {
      regulation: '21 CFR §701.3',
      note: isVi ? 'Có thể chứa masking fragrance để neutralize odor. Khác với "fragrance-free".' : 'May contain masking fragrance to neutralize odor. Different from "fragrance-free".',
    },
    // Paraben-free
    'paraben free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa parabens. Claim tự nguyện, cần verify ingredient list.' : 'Product contains no parabens. Voluntary claim, verify ingredient list.',
    },
    'paraben-free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa parabens. Claim tự nguyện, cần verify ingredient list.' : 'Product contains no parabens. Voluntary claim, verify ingredient list.',
    },
    // Sulfate-free
    'sulfate free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa sulfates (SLS, SLES). Claim tự nguyện.' : 'Product contains no sulfates (SLS, SLES). Voluntary claim.',
    },
    'sulfate-free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa sulfates (SLS, SLES). Claim tự nguyện.' : 'Product contains no sulfates (SLS, SLES). Voluntary claim.',
    },
    // Cruelty-free
    'cruelty free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'FDA không quy định animal testing. Nên có chứng nhận từ Leaping Bunny hoặc PETA.' : 'FDA does not regulate animal testing. Certification from Leaping Bunny or PETA recommended.',
    },
    'cruelty-free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'FDA không quy định animal testing. Nên có chứng nhận từ Leaping Bunny hoặc PETA.' : 'FDA does not regulate animal testing. Certification from Leaping Bunny or PETA recommended.',
    },
    'not tested on animals': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'FDA không quy định animal testing. Nên có chứng nhận từ Leaping Bunny hoặc PETA.' : 'FDA does not regulate animal testing. Certification from Leaping Bunny or PETA recommended.',
    },
    // Organic cosmetics
    'certified organic': {
      regulation: 'USDA NOP (7 CFR Part 205)',
      note: isVi ? 'Cosmetics có thể dùng USDA Organic seal nếu đáp ứng tiêu chuẩn food organic.' : 'Cosmetics may use USDA Organic seal if meeting food organic standards.',
    },
    // SPF claims
    'spf': {
      regulation: '21 CFR §201.327 (OTC Drug)',
      note: isVi ? 'Sản phẩm có SPF được quy định như OTC drug. Cần tuân thủ FDA sunscreen monograph.' : 'Products with SPF are regulated as OTC drugs. Must comply with FDA sunscreen monograph.',
      needsLabTest: true
    },
    'broad spectrum': {
      regulation: '21 CFR §201.327',
      note: isVi ? 'Phải pass FDA broad spectrum test. Chỉ SPF 15+ mới được claim "reduce skin cancer risk".' : 'Must pass FDA broad spectrum test. Only SPF 15+ can claim "reduce skin cancer risk".',
      needsLabTest: true
    },
    // Anti-aging claims
    'anti-aging': {
      regulation: isVi ? 'FD&C Act - Drug vs Cosmetic' : 'FD&C Act - Drug vs Cosmetic',
      note: isVi ? 'Claim cần thận trọng. Nếu claim thay đổi cấu trúc da, sản phẩm có thể bị classify là drug.' : 'Use caution. If claiming to alter skin structure, product may be classified as drug.',
    },
    'anti-wrinkle': {
      regulation: isVi ? 'FD&C Act - Drug vs Cosmetic' : 'FD&C Act - Drug vs Cosmetic',
      note: isVi ? 'Claim cần thận trọng. Nếu claim thay đổi cấu trúc da, sản phẩm có thể bị classify là drug.' : 'Use caution. If claiming to alter skin structure, product may be classified as drug.',
    },
    // Sensitive skin
    'for sensitive skin': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA định nghĩa. Nên có clinical testing để support.' : 'Not defined by FDA. Should have clinical testing to support.',
    },
    'sensitive skin': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA định nghĩa. Nên có clinical testing để support.' : 'Not defined by FDA. Should have clinical testing to support.',
    },
    // Alcohol-free
    'alcohol free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Thường nghĩa là không có ethyl alcohol. Fatty alcohols (cetyl, cetearyl) có thể được phép.' : 'Usually means no ethyl alcohol. Fatty alcohols (cetyl, cetearyl) may be permitted.',
    },
    'alcohol-free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Thường nghĩa là không có ethyl alcohol. Fatty alcohols (cetyl, cetearyl) có thể được phép.' : 'Usually means no ethyl alcohol. Fatty alcohols (cetyl, cetearyl) may be permitted.',
    },
    // Oil-free
    'oil free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Verify ingredient list không có oil-based ingredients.' : 'Voluntary claim. Verify ingredient list contains no oil-based ingredients.',
    },
    'oil-free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Verify ingredient list không có oil-based ingredients.' : 'Voluntary claim. Verify ingredient list contains no oil-based ingredients.',
    },
    // Clinically proven
    'clinically proven': {
      regulation: isVi ? 'FTC Act (Substantiation)' : 'FTC Act (Substantiation)',
      note: isVi ? 'Phải có clinical study evidence. FTC có thể yêu cầu substantiation nếu bị challenge.' : 'Must have clinical study evidence. FTC may request substantiation if challenged.',
    },
    'clinically tested': {
      regulation: isVi ? 'FTC Act (Substantiation)' : 'FTC Act (Substantiation)',
      note: isVi ? 'Phải có clinical study evidence. FTC có thể yêu cầu substantiation nếu bị challenge.' : 'Must have clinical study evidence. FTC may request substantiation if challenged.',
    },
  }
}

function getLabTestLabel(locale: string): string {
  return locale === 'vi' ? 'Cần lab test để xác nhận tuân thủ' : 'Lab test required to confirm compliance'
}

// ────────────────────────────────────────────────────────────
// Nutrition Value Parser - Fixes OCR merge bugs like "0mg0"
// ────────────────────────────────────────────────────────────

/**
 * Parse and clean nutrition fact value that may have merged value+unit+dv
 * Fixes OCR bug where "0mg" + "0%" becomes "0mg0" 
 * Pattern: {value}{unit}{number} → separate into value+unit and dailyValue
 */
function parseNutritionValue(fact: any): { displayValue: string; displayDV: string | null } {
  const value = fact.value
  const unit = fact.unit || ''
  let dailyValue = fact.dailyValue
  
  // Handle null/undefined/empty value - show "N/A" when numeric value is missing
  // This fixes display for micronutrients where Vision AI extracted %DV but not numeric value
  // Shows "N/A" instead of just "mg" which looks like a software bug
  if (value === null || value === undefined || value === '') {
    return {
      displayValue: 'N/A',
      displayDV: dailyValue != null ? String(dailyValue) : null
    }
  }
  
  // If value is already a clean number, just format it
  if (typeof value === 'number') {
    return {
      displayValue: `${value}${unit}`,
      displayDV: dailyValue != null ? String(dailyValue) : null
    }
  }
  
  // If value is a string that might have merged unit+dv (e.g., "0mg0" or "330mg14")
  if (typeof value === 'string') {
    // Pattern: number + unit + number (e.g., "0mg0", "330mg14", "2.5g12")
    const mergedPattern = /^(\d+(?:\.\d+)?)\s*(mg|g|mcg|kcal|cal)(\d+)$/i
    const match = value.match(mergedPattern)
    
    if (match) {
      const [, numValue, parsedUnit, dvValue] = match
      return {
        displayValue: `${numValue}${parsedUnit}`,
        displayDV: dvValue
      }
    }
    
    // Check if value already has unit attached but no DV merged
    const valueWithUnit = /^(\d+(?:\.\d+)?)\s*(mg|g|mcg|kcal|cal)?$/i
    const unitMatch = value.match(valueWithUnit)
    if (unitMatch) {
      return {
        displayValue: value,
        displayDV: dailyValue != null ? String(dailyValue) : null
      }
    }
    
    // Default: return as-is
    return {
      displayValue: value + (unit && !value.includes(unit) ? unit : ''),
      displayDV: dailyValue != null ? String(dailyValue) : null
    }
  }
  
  // Fallback for any other type
  return {
    displayValue: String(value) + unit,
    displayDV: dailyValue != null ? String(dailyValue) : null
  }
}

// ────────────────────────────────────────────────────────────
// Localized Commercial Summary Generator
// Always generate summary in current UI language instead of using DB-stored summary
// This ensures the summary language matches the user's current language selection
// ────────────────────────────────────────────────────────────

function generateLocalizedCommercialSummary(report: AuditReport, t: ReturnType<typeof useTranslation>['t']): string {
  const violations = report.violations || []
  const criticalViolations = violations.filter(v => v.severity === 'critical')
  const warningViolations = violations.filter(v => v.severity === 'warning')
  const infoViolations = violations.filter(v => v.severity === 'info')
  
  const criticalCount = criticalViolations.length
  const warningCount = warningViolations.length
  const infoCount = infoViolations.length
  const totalIssues = criticalCount + warningCount + infoCount
  
  let summary = `## ${t.report.commercialSummaryTitle || 'FDA LABEL COMPLIANCE REPORT - VEXIM GLOBAL'}\n\n`
  
  if (totalIssues === 0) {
    // Compliant product - no violations
    summary += `### ✅ ${t.report.commercialCompliantTitle || 'NO CFR VIOLATIONS DETECTED'}\n\n`
    summary += `${t.report.commercialCompliantDesc || 'Your label complies with all FDA regulations checked. Vexim AI did not find any critical violations during the inspection process.'}\n\n`
    summary += `${t.report.commercialCompliantRecommendation || 'The product can be distributed in the US market with low legal risk. We recommend periodic re-inspection when updating label content.'}\n`
  } else {
    // Has violations - categorize by severity
    if (criticalCount > 0) {
      summary += `### 🔴 ${t.report.commercialCriticalLabel || 'CRITICAL ISSUES'} (${criticalCount})\n`
      summary += `${t.report.commercialCriticalNote || 'These issues may result in detention at port:'}\n\n`
      criticalViolations.slice(0, 3).forEach((v, i) => {
        summary += `**${i + 1}. ${v.category || v.description?.slice(0, 50) || 'Violation'}**\n`
        if (v.description) summary += `- ${v.description.slice(0, 150)}${v.description.length > 150 ? '...' : ''}\n`
        if (v.suggested_fix) summary += `- ${v.suggested_fix.slice(0, 100)}${v.suggested_fix.length > 100 ? '...' : ''}\n`
        if (v.regulation_reference) summary += `- ${t.report.commercialLegalBasis || 'Legal basis'}: ${v.regulation_reference}\n`
        summary += '\n'
      })
    }
    
    if (warningCount > 0) {
      summary += `### 🟠 ${t.report.commercialWarningLabel || 'WARNINGS'} (${warningCount})\n`
      summary += `${t.report.commercialWarningNote || 'Presentation issues that should be fixed to avoid risk:'}\n\n`
      warningViolations.slice(0, 3).forEach((v, i) => {
        summary += `**${i + 1}. ${v.category || v.description?.slice(0, 50) || 'Warning'}**\n`
        if (v.description) summary += `- ${v.description.slice(0, 150)}${v.description.length > 150 ? '...' : ''}\n`
        summary += '\n'
      })
    }
    
    if (infoCount > 0) {
      summary += `### 🔵 ${t.report.commercialInfoLabel || 'INFORMATION'} (${infoCount})\n`
      summary += `${t.report.commercialInfoNote || 'Additional notes to improve label:'}\n\n`
      infoViolations.slice(0, 2).forEach((v, i) => {
        summary += `**${i + 1}. ${v.category || v.description?.slice(0, 50) || 'Note'}**\n`
        summary += '\n'
      })
    }
  }
  
  return summary
}

// Legacy fallback (kept for compatibility)
function generateFallbackCommercialSummary(report: AuditReport, t: ReturnType<typeof useTranslation>['t']): string {
  return generateLocalizedCommercialSummary(report, t)
}

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

// ────────────────────────────────���───────────────────────────
// Ingredient Tags
// ───────────────────────────────────────────────────────────��

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
// Recall Card (Reference Only - NOT a violation)
// Recalls are market intelligence context, they do NOT affect risk score.
// Per logic-ng spec: No severity badge, different title, reference note.
// ────────────────────────────────────────────────────────────

function RecallCard({ violation, t }: { violation: Violation; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-amber-50/30 overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-slate-100 p-2.5 shrink-0">
            <RotateCcw className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 leading-tight">
              {t.report.recallHistoryTitle}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                FDA Recall
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                {t.report.referenceOnly}
              </span>
            </div>
          </div>
        </div>
        {/* NO severity badge - recalls are reference data, not violations */}
      </div>

      {/* Reference notice */}
      <div className="mx-5 mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
        <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
          <Info className="h-3 w-3 shrink-0" />
          {t.report.recallReferenceNote}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-5 bg-slate-50/60 border-t border-r border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">
            {t.report.recallInfo}
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            &ldquo;{violation.description}&rdquo;
          </p>
        </div>
        <div className="p-5 bg-slate-50/60 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3">
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
    requiredMinRatio?: number
    textSize?: 'normal' | 'large'
    elementRole?: 'regulatory' | 'brand'
    recommendation?: string
    colors?: { foreground: string; background: string }
    is_design_recommendation?: boolean
    regulation_note?: string
  }
  t: ReturnType<typeof useTranslation>['t']
  }) {
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

// ────────────────────────────────────────────────────��───────
// Geometry Violation Card
// ─────────────────────────────────────���──────────────────────

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
  
  // Filter contrast violations:
  // Brand/decorative elements (logo, product name) with large text meeting WCAG AA 3:1 are EXEMPT.
  // 21 CFR does NOT mandate a specific contrast ratio — only "conspicuous/legible" text.
  // Only show violations that are genuinely problematic for regulatory text OR critically low for any text.
  const contrastViolations = (report.contrast_violations || []).filter((cv: any) => {
    const ratio = cv.ratio ?? 0
    const role = cv.elementRole ?? cv.element_role ?? 'regulatory'
    const textSize = cv.textSize ?? cv.text_size ?? 'normal'

    // Always show regulatory element violations (net quantity, ingredient text, etc.)
    if (role === 'regulatory') return true

    // For brand elements: only show if ratio is critically low (< 2.5:1)
    // A ratio of 2.94:1 on orange brand logo is intentional design — skip it
    if (role === 'brand') {
      return ratio < 2.5
    }

    // For large text of any role: WCAG AA requires 3:1 minimum
    if (textSize === 'large' && ratio >= 3.0) return false

    // For normal text: WCAG AA requires 4.5:1 minimum — show if below threshold
    return true
  })
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

  // NOTE: Contrast violations are DESIGN RECOMMENDATIONS, not FDA violations
  // They should NOT be counted in criticalCount/warningCount as they don't affect compliance
  // FDA 21 CFR does NOT specify contrast ratios - only "conspicuous and legible"
  const criticalCount = allViolations.filter((v) => v.severity === 'critical').length
  const warningCount = allViolations.filter((v) => v.severity === 'warning').length
  const infoCount = allViolations.filter((v) => v.severity === 'info').length
  
  // Track design recommendations separately (contrast violations are always 'info')
  const designRecommendationCount = contrastViolations.length

  const descParts: string[] = []
  if (criticalCount > 0) descParts.push(`${criticalCount} ${t.report.criticalViolations}`)
  if (warningCount > 0) descParts.push(`${warningCount} ${t.report.warnings}`)

  // Commercial Summary - ALWAYS generate in current UI language
  // This ensures the summary language matches user's current language selection
  // instead of using the DB-stored summary which was generated at analysis time
  const commercialSummary = generateLocalizedCommercialSummary(report, t)
  
  // Expert tips with deduplication - remove tips that are already in commercial summary
  // This prevents duplicate content between commercial_summary.expert_recommendations and expert_tips array
  const rawExpertTips = report.expert_tips || []
  const commercialTextLower = (commercialSummary || '').toLowerCase()
  const expertTips = rawExpertTips.filter((tip: string) => {
    // Extract first 50 chars of tip to check for duplication
    const tipKey = tip.toLowerCase().slice(0, 50)
    return !commercialTextLower.includes(tipKey)
  })
  const enforcementInsights = report.enforcement_insights || []
  const nutritionFacts = report.nutrition_facts || []
  const allergenDeclaration = report.allergen_declaration
  const healthClaims = (report as any).health_claims as string[] | undefined
  const detectedLanguages = (report as any).detected_languages as string[] | undefined
  const netQuantity = (report as any).net_quantity as string | undefined
  const packagingFormat = report.packaging_format
  // Deduplicate special claims case-insensitively (e.g., "USDA ORGANIC" and "USDA Organic" -> keep first)
  const specialClaims = (() => {
    const rawClaims = report.special_claims || []
    const seen = new Set<string>()
    return rawClaims.filter((claim: string) => {
      const normalized = claim.toLowerCase().trim()
      if (seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
  })()

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

                  {/* Health Claims (NEW) - Split into Structure/Function vs Factual vs Nutrient Content */}
                  {healthClaims && healthClaims.length > 0 && (() => {
                    // Lifestyle taglines/brand messaging - NOT health claims, should be ignored
                    // These are general marketing slogans, not FDA-regulated claims
                    const lifestyleTaglines = [
                      'eat well', 'be active', 'keep track', 'live well', 'feel good',
                      'stay healthy', 'enjoy life', 'be well', 'live better', 'stay fit',
                      'be healthy', 'think well', 'move more', 'eat smart', 'live smart'
                    ]
                    
                    // Packaging descriptors - NOT claims, just size/quantity descriptions
                    const packagingDescriptors = [
                      'value pack', 'family size', 'party size', 'bulk pack', 'economy size',
                      'mega pack', 'jumbo size', 'king size', 'snack size', 'travel size',
                      'bonus pack', 'twin pack', 'multi-pack', 'variety pack', 'combo pack'
                    ]
                    
                    // Nutrient content claims/statements - These need CROSS-REFERENCE with nutrition facts
                    // Simple quantity statements like "20g Protein" are always compliant
                    // But claims like "Low Fat", "Fat Free" need verification against actual fat values
                    // We route them to otherClaims for smart cross-reference verification
                    const simpleNutrientStatementPatterns = [
                      /^\d+\.?\d*\s*(g|mg|mcg|kcal|cal|oz|ml|%)\s/i,  // "20g Protein", "3g Fiber"
                      /^\d+\.?\d*\s*(grams?|milligrams?|micrograms?|calories?)\s/i,  // "20 grams Protein"
                      /^\d+\s*(vitamins?|minerals?)/i,  // "27 Vitamins & Minerals"
                      /\d+\s*(nutrient|calorie)/i,  // "250 Nutrient Rich Calories"
                      /^(high|good|excellent)\s+source\s+of\s/i,  // "Good Source of Fiber"
                      /for daily nutrition/i,  // "27 Vitamins & Minerals for Daily Nutrition"
                      /\d+%\s*(juice|fruit)/i,  // "100% Juice" - factual statement
                    ]
                    
                    // Nutrient content CLAIMS that need cross-reference verification
                    // These claims have specific FDA limits per 21 CFR 101.60-101.62
                    // They will be routed to otherClaims for smart verification
                    const nutrientContentClaimPatterns = [
                      /\b(low|reduced|less)[\s-]?(fat|sodium|sugar|salt|cholesterol|calorie)/i,
                      /\b(fat|sodium|sugar|salt|cholesterol|calorie)[\s-]?free\b/i,
                      /\bno[\s-]?(fat|sodium|sugar|salt|cholesterol)\b/i,
                      /\bzero[\s-]?(fat|sugar|calorie)/i,
                      /\bno\s+sugar(s)?\s+added/i,
                      /\bwithout\s+added\s+sugar(s)?/i,
                    ]
                    
                    // Combined patterns for simple matching (but NOT for cross-reference claims)
                    const nutrientContentPatterns = simpleNutrientStatementPatterns
                    
                    // Structure/Function indicators that require DSHEA disclaimer
                    // These are phrases that imply a bodily function benefit
                    // "for Muscle Health" is S/F, but "for Daily Nutrition" is just nutrient content claim
                    const structureFunctionKeywords = [
                      'supports', 'maintains', 'promotes', 'helps', 'contributes to', 'assists', 'aids',
                      'healthy blood', 'nitric oxide', 'boosts', 'enhances', 'strengthens', 'fights',
                      'protects', 'reduces risk', 'immune', 'metabolism',
                      'muscle health', 'bone health', 'heart health', 'brain health', 'gut health',
                      'joint health', 'eye health', 'skin health', 'liver health', 'kidney health',
                      'digestive health', 'cognitive', 'mental clarity', 'focus', 'alertness',
                      'stamina', 'endurance', 'recovery', 'performance'
                    ]
                    
                    // Factual/Negative claims that are compliant
                    const factualClaimPatterns = ['no artificial', 'no added', 'no preservatives', 'free', 'organic', 'natural', 'non-gmo', 'gluten-free', 'allergen-free', 'sulfate-free', 'antioxidant', 'source of', 'contains']
                    
                    // Filter out lifestyle taglines and packaging descriptors - they're not claims at all
                    const actualClaims = healthClaims.filter(claim => {
                      const claimLower = claim.toLowerCase().trim()
                      // Exclude exact match lifestyle taglines
                      if (lifestyleTaglines.some(tagline => claimLower === tagline)) return false
                      // Exclude packaging descriptors (exact or partial match)
                      if (packagingDescriptors.some(pd => claimLower === pd || claimLower.includes(pd))) return false
                      return true
                    })
                    
                    // Check if claim contains structure/function keywords
                    const hasStructureFunctionKeyword = (claim: string) => 
                      structureFunctionKeywords.some(keyword => claim.toLowerCase().includes(keyword))
                    
                    // Check if claim is a SIMPLE nutrient content statement (e.g., "20g Protein")
                    // These are always compliant and don't need cross-reference
                    const isSimpleNutrientStatement = (claim: string) => 
                      simpleNutrientStatementPatterns.some(pattern => pattern.test(claim)) && !hasStructureFunctionKeyword(claim)
                    
                    // Check if claim contains nutrient content CLAIMS that need verification
                    // e.g., "Low-Fat", "Fat Free", "No Sugar Added" - these need cross-reference
                    const needsNutrientVerification = (claim: string) =>
                      nutrientContentClaimPatterns.some(pattern => pattern.test(claim))
                    
                    // Structure/Function claims - ONLY if they have S/F keywords
                    const structureFunctionClaims = actualClaims.filter(claim => hasStructureFunctionKeyword(claim))
                    
                    // Simple Nutrient Content statements - always compliant per 21 CFR 101.13
                    // BUT exclude claims that need verification (Low-Fat, Fat Free, etc.)
                    const nutrientContentClaims = actualClaims.filter(claim => 
                      isSimpleNutrientStatement(claim) && !needsNutrientVerification(claim)
                    )
                    
                    // Factual/Negative claims (no artificial, etc.)
                    const factualClaims = actualClaims.filter(claim => 
                      factualClaimPatterns.some(pattern => claim.toLowerCase().includes(pattern)) &&
                      !hasStructureFunctionKeyword(claim) &&
                      !isSimpleNutrientStatement(claim) &&
                      !needsNutrientVerification(claim)
                    )
                    
                    // Other claims - includes nutrient content claims that need cross-reference verification
                    // "Low-Fat Greek Yogurt" will go here and be verified against nutrition facts
                    const otherClaims = actualClaims.filter(claim => 
                      !structureFunctionClaims.includes(claim) && 
                      !factualClaims.includes(claim) &&
                      !nutrientContentClaims.includes(claim)
                    )
                    
                    return (
                      <div className="space-y-2">
                        {/* Structure/Function Claims - Need DSHEA */}
                        {structureFunctionClaims.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                            <p className="text-[11px] text-red-700 uppercase tracking-wider font-bold mb-1.5">
                              {t.report.structureFunctionClaimsTitle || 'STRUCTURE/FUNCTION CLAIMS (NEED DSHEA)'}
                            </p>
                            <div className="space-y-1">
                              {structureFunctionClaims.map((claim, idx) => (
                                <p key={idx} className="text-xs text-red-800 flex items-start gap-1.5">
                                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                  {claim}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Other claims - cross-reference with nutrition facts for smart verification */}
                        {otherClaims.length > 0 && (() => {
                          // Convert nutrition facts to the format expected by ClaimsValidator
                          const nfData: NutritionFactData[] = nutritionFacts.map((nf: any) => ({
                            nutrient: nf.nutrient || nf.name || '',
                            value: nf.value,
                            unit: nf.unit || '',
                            dailyValue: nf.dailyValue
                          }))
                          
                          // Cross-reference claims with nutrition facts for smart verification
                          const claimText = otherClaims.join(' ')
                          const verifications = ClaimsValidator.verifyNutrientContentClaims(claimText, nfData)
                          
                          // Separate verified claims from unverifiable ones
                          const verifiedCompliant = verifications.filter(v => v.status === 'compliant')
                          const verifiedViolations = verifications.filter(v => v.status === 'violation')
                          const needsReview = verifications.filter(v => v.status === 'needs_review')
                          
                          // Claims that couldn't be cross-referenced at all
                          const verifiedClaimTexts = verifications.map(v => v.claim.toLowerCase())
                          const unverifiableClaims = otherClaims.filter(claim => 
                            !verifiedClaimTexts.some(vc => claim.toLowerCase().includes(vc))
                          )
                          
                          return (
                            <>
                              {/* Verified COMPLIANT nutrient content claims */}
                              {verifiedCompliant.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
                                  <p className="text-[11px] text-green-700 uppercase tracking-wider font-bold mb-1.5">
                                    {t.report.verifiedNutrientClaimsTitle || 'VERIFIED NUTRIENT CLAIMS (COMPLIANT)'}
                                  </p>
                                  <div className="space-y-1.5">
                                    {verifiedCompliant.map((v, idx) => (
                                      <div key={idx} className="text-xs text-green-800">
                                        <p className="flex items-start gap-1.5">
                                          <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                          <span className="font-medium">{v.claim.toUpperCase()}</span>
                                        </p>
                                        <p className="ml-4.5 text-[10px] text-green-600 mt-0.5">
                                          {v.nutrient}: {v.actualValue}{v.unit} ≤ {v.limit}{v.unit} ({v.regulation})
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Verified VIOLATION nutrient content claims */}
                              {verifiedViolations.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                                  <p className="text-[11px] text-red-700 uppercase tracking-wider font-bold mb-1.5">
                                    {t.report.nutrientClaimViolationsTitle || 'NUTRIENT CLAIM VIOLATIONS'}
                                  </p>
                                  <div className="space-y-1.5">
                                    {verifiedViolations.map((v, idx) => (
                                      <div key={idx} className="text-xs text-red-800">
                                        <p className="flex items-start gap-1.5">
                                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-600" />
                                          <span className="font-medium">{v.claim.toUpperCase()}</span>
                                        </p>
                                        <p className="ml-4.5 text-[10px] text-red-600 mt-0.5">
                                          {v.nutrient}: {v.actualValue}{v.unit} exceeds {v.limit}{v.unit} limit ({v.regulation})
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Claims needing review (nutrition data not available) */}
                              {(needsReview.length > 0 || unverifiableClaims.length > 0) && (
                                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                  <p className="text-[11px] text-amber-700 uppercase tracking-wider font-bold mb-1.5">
                                    {t.report.otherClaimsTitle || 'OTHER CLAIMS (REVIEW NEEDED)'}
                                  </p>
                                  <div className="space-y-1">
                                    {needsReview.map((v, idx) => (
                                      <div key={`nr-${idx}`} className="text-xs text-amber-800">
                                        <p className="flex items-start gap-1.5">
                                          <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                          <span>{v.claim}</span>
                                        </p>
                                        <p className="ml-4.5 text-[10px] text-amber-600 mt-0.5">
                                          {v.description}
                                        </p>
                                      </div>
                                    ))}
                                    {unverifiableClaims.map((claim, idx) => {
                                      const claimTooltips = getClaimTooltips(locale)
                                      const claimLower = claim.toLowerCase().trim()
                                      const tooltipInfo = claimTooltips[claimLower]
                                      
                                      if (tooltipInfo) {
                                        return (
                                          <TooltipProvider key={`uv-${idx}`}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <p className="text-xs text-amber-800 flex items-start gap-1.5 cursor-help hover:text-amber-900 transition-colors">
                                                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                                  <span className="underline decoration-dotted underline-offset-2">{claim}</span>
                                                </p>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900 text-white border-slate-700">
                                                <div className="space-y-1.5">
                                                  <p className="text-[10px] font-mono text-amber-300">{tooltipInfo.regulation}</p>
                                                  <p className="text-xs">{tooltipInfo.note}</p>
                                                  {tooltipInfo.needsLabTest && (
                                                    <p className="text-[10px] text-blue-300 pt-1 border-t border-slate-700">
                                                      {getLabTestLabel(locale)}
                                                    </p>
                                                  )}
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )
                                      }
                                      
                                      return (
                                        <p key={`uv-${idx}`} className="text-xs text-amber-800 flex items-start gap-1.5">
                                          <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                          {claim}
                                        </p>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                        
                        {/* Nutrient Content Claims - Compliant (21 CFR 101.13) */}
                        {nutrientContentClaims.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-[11px] text-green-700 uppercase tracking-wider font-bold mb-1.5">
                              {t.report.nutrientContentClaimsTitle || 'NUTRIENT CONTENT (COMPLIANT)'}
                            </p>
                            <div className="space-y-1">
                              {nutrientContentClaims.map((claim, idx) => (
                                <p key={idx} className="text-xs text-green-800 flex items-start gap-1.5">
                                  <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                  {claim}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Factual/Negative Claims - Compliant with tooltips */}
                        {factualClaims.length > 0 && (() => {
                          const claimTooltips = getClaimTooltips(locale)
                          
                          return (
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                              <p className="text-[11px] text-slate-600 uppercase tracking-wider font-bold mb-1.5">
                                {t.report.factualClaimsTitle || 'FACTUAL/NEGATIVE CLAIMS (COMPLIANT)'}
                              </p>
                              <div className="space-y-1">
                                {factualClaims.map((claim, idx) => {
                                  const claimLower = claim.toLowerCase().trim()
                                  const tooltipInfo = claimTooltips[claimLower]
                                  
                                  if (tooltipInfo) {
                                    return (
                                      <TooltipProvider key={idx}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <p className="text-xs text-slate-700 flex items-start gap-1.5 cursor-help hover:text-slate-900 transition-colors">
                                              <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                              <span className="underline decoration-dotted underline-offset-2">{claim}</span>
                                            </p>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900 text-white border-slate-700">
                                            <div className="space-y-1.5">
                                              <p className="text-[10px] font-mono text-green-300">{tooltipInfo.regulation}</p>
                                              <p className="text-xs">{tooltipInfo.note}</p>
                                              {tooltipInfo.needsLabTest && (
                                                <p className="text-[10px] text-blue-300 pt-1 border-t border-slate-700">
                                                  {getLabTestLabel(locale)}
                                                </p>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  }
                                  
                                  return (
                                    <p key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                      <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                      {claim}
                                    </p>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })()}

                  {/* Special Claims (NEW) - with tooltips for regulated claims */}
                  {specialClaims.length > 0 && (() => {
                    const claimTooltips = getClaimTooltips(locale)
                    
                    return (
                      <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                          {t.report.specialClaimsTitle}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {specialClaims.map((claim, idx) => {
                            const claimLower = claim.toLowerCase().trim()
                            const tooltipInfo = claimTooltips[claimLower]
                            
                            if (tooltipInfo) {
                              return (
                                <TooltipProvider key={idx}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 border border-green-200 font-medium cursor-help hover:bg-green-100 transition-colors">
                                        {claim}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900 text-white border-slate-700">
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-mono text-green-300">{tooltipInfo.regulation}</p>
                                        <p className="text-xs">{tooltipInfo.note}</p>
                                        {tooltipInfo.needsLabTest && (
                                          <p className="text-[10px] text-blue-300 pt-1 border-t border-slate-700">
                                            {getLabTestLabel(locale)}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            }
                            
                            return (
                              <span key={idx} className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                                {claim}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

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
                    <div className="bg-slate-800 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Nutrition Facts</span>
                      {(report as any).is_multi_column_nutrition && (
                        <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-100 border-amber-400/50">
                          {t.report.multiColumnLabel || 'MULTI-COLUMN'}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Multi-column detection info - differentiate between variety pack and dual column */}
                    {(report as any).is_multi_column_nutrition && !((report as any).nutrition_facts_columns?.length > 0) && (() => {
                      // Detect if this is dual column (as packaged/as prepared) vs variety pack
                      // Check column type from report metadata
                      const columnFormat = (report as any).nutrition_column_format_type
                      const isDualColumn = columnFormat === 'AS_PACKAGED_PREPARED' || columnFormat === 'DUAL_SERVING_CONTAINER'
                      
                      if (isDualColumn) {
                        // This is expected dual-column format, show info (not warning)
                        return (
                          <div className="p-3 bg-blue-50 border-b border-blue-200">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-blue-800">
                                  {t.report.dualColumnDetected || 'Dual-Column Format Detected'}
                                </p>
                                <p className="text-[10px] text-blue-700 mt-0.5">
                                  {t.report.dualColumnDesc || 'The Nutrition Facts panel shows two columns with "as packaged" and "as prepared" values. This is a standard format for products requiring preparation.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      // Variety pack - show warning that only first panel was extracted
                      return (
                        <div className="p-3 bg-amber-50 border-b border-amber-200">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-amber-800">
                                {t.report.multiColumnDetectedNoData || 'Multi-column Nutrition Facts Detected'}
                              </p>
                              <p className="text-[10px] text-amber-700 mt-0.5">
                                {t.report.multiColumnDetectedNoDataDesc || 'This label appears to have multiple Nutrition Facts panels (variety pack format), but only the first panel data was extracted. For complete analysis, please ensure the image clearly shows all panels.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    
                    {/* Multi-column display for variety packs */}
                    {(report as any).is_multi_column_nutrition && (report as any).nutrition_facts_columns?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                              <th className="text-left px-2 py-1.5 font-semibold text-slate-700">Nutrient</th>
                              {((report as any).nutrition_facts_columns as any[]).map((col: any, colIdx: number) => (
                                <th key={colIdx} className="text-center px-2 py-1.5 font-semibold text-slate-700 border-l border-slate-200">
                                  <div className="text-[10px] leading-tight">{col.columnName}</div>
                                  {col.servingSize && (
                                    <div className="text-[9px] text-slate-500 font-normal">{col.servingSize}</div>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {/* Get all unique nutrients across columns */}
                            {(() => {
                              const columns = (report as any).nutrition_facts_columns as any[]
                              const allNutrients = new Set<string>()
                              columns.forEach((col: any) => {
                                col.nutritionFacts?.forEach((f: any) => allNutrients.add(f.name || f.nutrient))
                              })
                              return Array.from(allNutrients).slice(0, 15).map((nutrientName, rowIdx) => (
                                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                  <td className="px-2 py-1 font-medium text-slate-700">{nutrientName}</td>
                                  {columns.map((col: any, colIdx: number) => {
                                    const fact = col.nutritionFacts?.find((f: any) => 
                                      (f.name || f.nutrient) === nutrientName
                                    )
                                    const isMissing = !fact || fact.value === null || fact.value === undefined
                                    return (
                                      <td 
                                        key={colIdx} 
                                        className={`text-left px-2 py-1 border-l border-slate-200 ${
                                          isMissing ? 'bg-amber-50 text-amber-600' : 'text-slate-900'
                                        }`}
                                      >
                                        {isMissing ? (
                                          <span className="text-[9px]">—</span>
                                        ) : (
                                          (() => {
                                            const { displayValue, displayDV } = parseNutritionValue(fact)
                                            return (
                                              <span className="whitespace-nowrap">
                                                <span className="font-medium">{displayValue}</span>
                                                {displayDV && (
                                                  <span className="text-slate-400 text-[10px] ml-1">({displayDV}%)</span>
                                                )}
                                              </span>
                                            )
                                          })()
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))
                            })()}
                          </tbody>
                        </table>
                        
                        {/* Multi-column validation warnings */}
                        {(report as any).multi_column_validation?.warnings?.length > 0 && (
                          <div className="p-2 bg-amber-50 border-t border-amber-200">
                            <p className="text-[10px] text-amber-700 font-medium mb-1">
                              {t.report.multiColumnWarnings || 'Column Inconsistencies Detected:'}
                            </p>
                            {((report as any).multi_column_validation.warnings as string[]).slice(0, 2).map((warning: string, idx: number) => (
                              <p key={idx} className="text-[9px] text-amber-600 leading-tight">• {warning}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Single-column display */
                      <div className="divide-y divide-slate-100">
                        {nutritionFacts.map((item: any, idx: number) => {
                          const { displayValue, displayDV } = parseNutritionValue(item)
                          return (
                            <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                              <span className="text-slate-700 font-medium">{item.nutrient || item.name}</span>
                              <span className="text-slate-900 font-semibold">
                                {displayValue}
                                {displayDV != null && (
                                  <span className="text-slate-400 font-normal ml-1">({displayDV}%)</span>
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
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
{/* Risk description logic:
                   - Critical/warnings count toward actual compliance issues
                   - Info count = advisory notes (CFR-related info)
                   - Design recommendations (contrast) are shown separately and don't affect compliance
                */}
                {descParts.length > 0 && (infoCount > 0 || designRecommendationCount > 0)
                ? t.report.riskDescWithAdvisory(
                    descParts.join(` ${t.report.andWord} `), 
                    designRecommendationCount > 0 
                      ? `${designRecommendationCount} ${t.report.designRecommendations || 'khuyến nghị thiết kế'}`
                      : `${infoCount} ${t.report.advisoryNotes}`
                  )
                : descParts.length > 0
                ? t.report.riskDescWithIssues(descParts.join(` ${t.report.andWord} `))
                : designRecommendationCount > 0
                ? t.report.riskDescAdvisoryOnly(`${designRecommendationCount} ${t.report.designRecommendations || 'khuyến nghị thiết kế'} (không ảnh hưởng tuân thủ FDA)`)
                : infoCount > 0
                ? t.report.riskDescAdvisoryOnly(`${infoCount} ${t.report.advisoryNotes}`)
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

            {/* ── EXPERT TIPS & AI SUMMARY (NEW) ──────────────�� */}
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

            {/* ── CFR VIOLATIONS SECTION ────���──────────────────── */}
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

            {/* ── RECALLS SECTION (Reference Only) ───────────────────────── */}
            {/* Per logic-ng spec: Recalls are market intelligence, NOT violations. */}
            {/* They do NOT affect risk score. Displayed separately as reference data. */}
            {recallViolations.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-slate-500" />
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      {t.report.recallsReferenceSection} ({recallViolations.length})
                    </h2>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                    {t.report.marketIntelligence}
                  </span>
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
