// ────────────────────────────────────────────────────────────
// Localized Commercial Summary Generator
// Always generate summary in current UI language instead of using DB-stored summary
// This ensures the summary language matches the user's current language selection
// ────────────────────────────────────────────────────────────

import type { AuditReport, Violation } from '@/lib/types'
import type { useTranslation } from '@/lib/i18n'

export function generateLocalizedCommercialSummary(
  report: AuditReport, 
  t: ReturnType<typeof useTranslation>['t']
): string {
  const violations = report.violations || []
  // IMPORTANT: Exclude recall items from commercial summary - they are "market intelligence" only.
  // Recalls are displayed in a separate "Tham khảo" section and do NOT affect risk score.
  const violationsForSummary = violations.filter(v => v.source_type !== 'recall')
  const criticalViolations = violationsForSummary.filter(v => v.severity === 'critical')
  const warningViolations = violationsForSummary.filter(v => v.severity === 'warning')
  const infoViolations = violationsForSummary.filter(v => v.severity === 'info')
  
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
export function generateFallbackCommercialSummary(
  report: AuditReport, 
  t: ReturnType<typeof useTranslation>['t']
): string {
  return generateLocalizedCommercialSummary(report, t)
}
