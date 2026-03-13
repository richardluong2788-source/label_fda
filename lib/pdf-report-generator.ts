import type { AuditReport, Violation, Citation } from './types'
import type { PDFReportData, SupportedLang, PDFLabels } from './pdf/types'
import { getPDFLabels } from './pdf/i18n'
import { pdfStyles } from './pdf/styles'
import {
  escapeHtml,
  formatNutrientValue,
  markdownToHtml,
  formatDate,
  getSeverityColor,
  getRiskColor,
  getRiskLabel,
  getSeverityLabel,
  translateCategory,
  confidenceBar,
  translateImageType,
  pageHeader,
} from './pdf/utils'

// Re-export types for backward compatibility
export type { PDFReportData, SupportedLang, PDFLabels, ExpertReviewData } from './pdf/types'

// ── Main Generator ────────────────────────────────────────────────────
// Note: i18n labels have been moved to ./pdf/i18n/
// Note: Utility functions have been moved to ./pdf/utils.ts
// Note: CSS styles have been moved to ./pdf/styles.ts

// Legacy reference for PDF_LABELS (now imported from ./pdf/i18n)
// const PDF_LABELS = ... is now getPDFLabels(lang)

// ════════════════════════════════════════════════════════════════════════
// IMPORTANT: The following ~500 lines of PDF_LABELS have been extracted to:
//   - lib/pdf/i18n/vi.ts (Vietnamese labels)
//   - lib/pdf/i18n/en.ts (English labels)
//   - lib/pdf/i18n/index.ts (exports)
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// LEGACY CODE REMOVED - The following sections have been extracted:
// - i18n labels (~500 lines) -> lib/pdf/i18n/vi.ts, lib/pdf/i18n/en.ts
// - Utility functions (~200 lines) -> lib/pdf/utils.ts  
// - CSS styles (~170 lines) -> lib/pdf/styles.ts
// - Types (~50 lines) -> lib/pdf/types.ts
// 
// Total reduction: ~920 lines removed from this file
// ════════════════════════════════════════════════════════════════════════

// The main generatePDFReportHTML function starts below
// Labels are now imported from './pdf/i18n' via getPDFLabels()

// ── Main Generator ────────────────────────────────────────────────────
// Labels: imported from './pdf/i18n' via getPDFLabels()
// Utilities: imported from './pdf/utils'
// Styles: imported from './pdf/styles'

export function generatePDFReportHTML(data: PDFReportData): string {
  const { report, violations, generatedAt, generatedBy, companyInfo, lang = 'vi', expertReview } = data
  const L = getPDFLabels(lang)

  const importAlertViolations = violations.filter(v => v.source_type === 'import_alert')
  // IMPORTANT: Exclude recall items from standard violations - they are "market intelligence" only.
  // Recalls are displayed in a separate "Tham khảo" section and do NOT affect risk score.
  const standardViolations = violations.filter(v => v.source_type !== 'import_alert' && v.source_type !== 'recall')
  const recallViolations = violations.filter(v => v.source_type === 'recall')

  const criticalCount = standardViolations.filter(v => v.severity === 'critical').length
  const warningCount = standardViolations.filter(v => v.severity === 'warning').length
  const infoCount = standardViolations.filter(v => v.severity === 'info').length
  const totalCitations = standardViolations.reduce((sum, v) => sum + (v.citations?.length || 0), 0)

  const riskScore = report.overall_risk_score ?? 0
  const projectedRisk = report.projected_risk_score ?? 0

  const productCategory = (report.product_category || '').toLowerCase()
  const productType = (report.product_type || '').toLowerCase()
  const isCosmetic = productCategory.includes('cosmetic') || 
                     productCategory.includes('mỹ phẩm') ||
                     productType.includes('cosmetic') ||
                     productType.includes('skincare') ||
                     productType.includes('cream') ||
                     productType.includes('lotion') ||
                     productType.includes('elixir')

  const sortedViolations = [...standardViolations].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  })

  const resultLabel = report.overall_result === 'pass' ? L.pass : report.overall_result === 'fail' ? L.fail : L.pending
  const resultColor = report.overall_result === 'pass' ? '#16a34a' : report.overall_result === 'fail' ? '#dc2626' : '#f59e0b'

  const defaultAssessment = criticalCount > 0
    ? (L.defaultRiskHigh as Function)(riskScore.toFixed(1), criticalCount)
    : (L.defaultRiskLow as Function)(riskScore.toFixed(1))

  const defaultExpertTip = criticalCount > 0 ? L.expertTipCritical : warningCount > 0 ? L.expertTipWarning : L.expertTipPass

  // ── Report Reference Number (VXG-[TYPE]-[YEAR]-[SEQ]) ────────────────
  // Format: VXG = Vexim Global, TYPE = FD/DS/CP/OTC, YEAR = year, SEQ = last 4 of ID
  const domainTypeCode = (() => {
    const cat = (report.product_category || report.product_type || '').toLowerCase()
    if (cat.includes('supplement') || cat.includes('vitamin') || cat.includes('thực phẩm chức năng')) return 'DS'
    if (cat.includes('cosmetic') || cat.includes('mỹ phẩm') || cat.includes('skincare')) return 'CP'
    if (cat.includes('otc') || cat.includes('drug') || cat.includes('thuốc')) return 'OTC'
    return 'FD' // Food (default)
  })()
  const reportYear = new Date(generatedAt).getFullYear()
  const reportSeq = report.id.slice(-4).toUpperCase()
  const reportRefNumber = `VXG-${domainTypeCode}-${reportYear}-${reportSeq}`

  const shortId = reportRefNumber
  const dateFormatted = formatDate(generatedAt, lang)

  // Data from report (with safe access)
  const healthClaims = (report as any).health_claims as string[] | undefined
  // Deduplicate special claims case-insensitively (e.g., "USDA ORGANIC" vs "USDA Organic")
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
  const enforcementInsights = report.enforcement_insights || []

  // Dynamic section numbering
  let sectionNum = 0
  const nextSection = () => { sectionNum++; return String(sectionNum).padStart(2, '0') }

  // Table of Contents entries
  const tocEntries: { num: string; label: string }[] = []
  const toc = (label: string) => { const num = nextSection(); tocEntries.push({ num, label }); return num }

  // Pre-calculate section numbers
  const secOverview = toc(L.overview)
  const secProduct = toc(L.productInfo)
  const secAuditScope = toc(L.auditScope)
  const secFindings = toc(L.findingsDetail)
  const secImportAlerts = importAlertViolations.length > 0 ? toc(L.importAlerts) : null
  const hasTech = (report.geometry_violations && report.geometry_violations.length > 0) ||
    (report.contrast_violations && report.contrast_violations.length > 0) ||
    (report.multilanguage_issues && report.multilanguage_issues.length > 0)
  const secTechnical = hasTech ? toc(L.technicalChecks) : null
  const secCommercial = toc(L.commercialSummary) // Always show commercial summary with fallback
  const secExpert = toc(L.expertRecommendations)
  const secAction = toc(L.actionItems)

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${L.downloadTitle} - ${escapeHtml(report.product_name || 'Label Analysis')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a2e; background: #ffffff; line-height: 1.6; font-size: 10pt; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
  
  /* Download bar */
  .download-bar { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .download-bar-title { color: #ffffff; font-size: 14px; font-weight: 600; }
  .download-btn { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
  .download-btn:hover { background: #1d4ed8; }
  .download-btn svg { width: 18px; height: 18px; }
  .page-content-wrapper { padding-top: 60px; }
  @media print { .download-bar { display: none !important; } .page-content-wrapper { padding-top: 0; } }

  /* Page layout */
  .page { width: 210mm; min-height: auto; margin: 0 auto; padding: 0; background: white; overflow: hidden; }
  @media print { body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { margin: 0; padding: 0; width: 100%; box-shadow: none; min-height: auto; overflow: hidden; } .page-break { page-break-before: always; } .no-break { page-break-inside: avoid; } .content-page { min-height: auto; } }
  /* Use @page-level margins so PDF engines (Chrome, wkhtmltopdf, Puppeteer) respect them.
     Do NOT rely on padding-only when margin:0 — content can be clipped. */
  @page { size: A4 portrait; margin: 12mm 15mm; }

  /* Cover page */
  .cover-page { min-height: auto; display: flex; flex-direction: column; position: relative; background: #ffffff; color: #0f172a; padding: 15mm 20mm; overflow: hidden; }
  .cover-accent { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #1e40af 0%, #2563eb 40%, #3b82f6 70%, #60a5fa 100%); }
  .cover-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
  .cover-logo { display: flex; align-items: center; gap: 12px; }
  .cover-logo-icon { width: 48px; height: 48px; background: #1e40af; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: white; }
  .cover-logo-text { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #0f172a; }
  .cover-logo-sub { font-size: 11px; color: #64748b; font-weight: 400; letter-spacing: 2px; text-transform: uppercase; }
  .cover-badge { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; font-size: 11px; color: #475569; font-weight: 600; }
  .cover-title { font-size: 28px; font-weight: 800; line-height: 1.3; margin-bottom: 10px; letter-spacing: -0.5px; color: #0f172a; overflow-wrap: break-word; }
  .cover-subtitle { font-size: 15px; color: #64748b; font-weight: 500; margin-bottom: 20px; overflow-wrap: break-word; }
  .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
  .cover-meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; overflow: hidden; }
  .cover-meta-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
  .cover-meta-value { font-size: 13px; font-weight: 600; color: #0f172a; overflow-wrap: break-word; }
  .cover-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #64748b; }

  /* Content pages */
  .content-page { padding: 12mm 18mm; min-height: auto; overflow: hidden; }
  .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
  .page-header-left { display: flex; align-items: center; gap: 8px; }
  .page-header-logo { width: 28px; height: 28px; background: #1e40af; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; color: white; }
  .page-header-brand { font-size: 12px; font-weight: 600; color: #334155; }
  .page-header-right { font-size: 9px; color: #94a3b8; text-align: right; }
  .page-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 7.5px; color: #94a3b8; }

  /* Sections */
  .section { margin-bottom: 16px; }
  .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 3px solid #1e40af; display: flex; align-items: center; gap: 8px; }
  .section-number { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: #1e40af; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }

  /* Executive summary */
  .exec-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .exec-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
  .exec-card-value { font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
  .exec-card-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }

  /* Risk section */
  .risk-section { display: flex; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
  .risk-gauge { text-align: center; min-width: 100px; }
  .risk-score-circle { width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; font-size: 24px; font-weight: 800; color: white; }
  .risk-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .risk-details { flex: 1; min-width: 0; }
  .risk-details h4 { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #334155; }
  .risk-details p { font-size: 9.5px; color: #64748b; margin-bottom: 6px; overflow-wrap: break-word; }

  /* Violation cards */
  .violation-card { border: 1px solid; border-radius: 10px; padding: 16px; margin-bottom: 14px; page-break-inside: avoid; overflow: hidden; }
  .violation-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; gap: 8px; }
  .violation-title { font-size: 12px; font-weight: 700; flex: 1; min-width: 0; overflow-wrap: break-word; }
  .severity-badge { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
  .violation-description { font-size: 9.5px; color: #334155; margin-bottom: 10px; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; }
  .violation-box { background: rgba(255,255,255,0.8); border-radius: 6px; padding: 10px; margin-bottom: 8px; overflow: hidden; }
  .violation-box-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
  .violation-box-value { font-size: 9.5px; color: #1e293b; line-height: 1.5; overflow-wrap: break-word; word-break: break-word; }
  .violation-meta { display: flex; gap: 12px; font-size: 8px; color: #64748b; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06); flex-wrap: wrap; }

  /* Tables */
  .citations-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-top: 8px; table-layout: fixed; }
  .citations-table th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; }
  .citations-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; color: #475569; vertical-align: top; overflow-wrap: break-word; word-break: break-word; }
  .citations-table tr:nth-child(even) td { background: #fafbfc; }
  .relevance-bar { display: inline-block; width: 30px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; vertical-align: middle; margin-right: 3px; }
  .relevance-bar-fill { height: 100%; background: #2563eb; border-radius: 2px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; table-layout: fixed; }
  .info-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; font-size: 9.5px; overflow-wrap: break-word; word-break: break-word; }
  .info-table td:first-child { font-weight: 600; color: #64748b; width: 32%; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Callout boxes */
  .expert-tip { background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 12px 14px; margin-bottom: 10px; font-size: 9.5px; color: #1e40af; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; }
  .expert-tip-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 4px; }
  .port-warning { background: #FEF3C7; border: 1px solid #f59e0b; border-left: 4px solid #d97706; border-radius: 0 8px 8px 0; padding: 12px 14px; margin-bottom: 10px; font-size: 9.5px; color: #92400e; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; }
  .port-warning-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin-bottom: 4px; }
  .consequence-box { background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 10px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid; }
  .consequence-title { font-size: 10px; font-weight: 800; color: #991B1B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .consequence-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .consequence-item { background: white; border: 1px solid #FECACA; border-radius: 8px; padding: 10px; text-align: center; }
  .consequence-item-icon { font-size: 18px; margin-bottom: 4px; }
  .consequence-item-title { font-size: 9px; font-weight: 700; color: #991B1B; margin-bottom: 3px; }
  .consequence-item-desc { font-size: 7.5px; color: #64748b; line-height: 1.4; }

  /* Health claims */
  .health-claim-tag { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 9px; font-weight: 600; margin: 2px 4px 2px 0; }
  .health-claim-danger { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
  .health-claim-normal { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
  .special-claim-tag { display: inline-block; background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; padding: 3px 10px; border-radius: 4px; font-size: 9px; font-weight: 600; margin: 2px 4px 2px 0; }

  /* Technical checks */
  .tech-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 14px; }
  .tech-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; page-break-inside: avoid; width: 100%; overflow: hidden; }
  .tech-card-title { font-size: 9.5px; font-weight: 700; color: #334155; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .tech-card-badge { font-size: 7.5px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #64748b; }
  .tech-item { padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 8.5px; }
  .tech-item:last-child { border-bottom: none; }
  .tech-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
  .tech-item-type { font-weight: 600; color: #334155; text-transform: capitalize; }
  .tech-item-desc { color: #64748b; line-height: 1.5; overflow-wrap: break-word; }
  .tech-item-values { display: flex; gap: 10px; margin-top: 3px; font-size: 7.5px; }
  .color-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid #d1d5db; vertical-align: middle; margin-right: 4px; }

  /* Data boxes */
  .data-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 14px; font-size: 9.5px; line-height: 1.6; color: #334155; overflow-wrap: break-word; word-break: break-word; overflow: hidden; }
  .data-box-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 6px; }

  /* Signature */
  .signature-section { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e2e8f0; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 16px; }
  .signature-box { border-top: 2px solid #334155; padding-top: 8px; }
  .signature-name { font-size: 11px; font-weight: 600; color: #334155; }
  .signature-title { font-size: 9px; color: #64748b; }
  .disclaimer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 7.5px; color: #64748b; line-height: 1.6; margin-top: 20px; overflow-wrap: break-word; word-break: break-word; }
  .disclaimer-title { font-size: 8px; font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }

  /* Verification */
  .verification-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .verification-badge.verified { background: #16a34a; color: white; }
  .verification-badge.pending { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }

  /* Watermark */
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; font-weight: 800; color: rgba(0,0,0,0.02); pointer-events: none; z-index: 0; white-space: nowrap; }

  /* TOC */
  .toc-entry { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .toc-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 4px; background: #1e40af; color: white; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .toc-label { font-size: 11px; color: #334155; font-weight: 500; }

  /* Action table severity rows */
  .action-row-critical { background: #FEF2F2; }
  .action-row-warning { background: #FFFBEB; }
  .action-row-info { background: #F0F9FF; }

  /* Product images layout */
  .product-layout { display: flex; gap: 20px; margin-bottom: 16px; }
  .product-images { flex: 0 0 180px; min-width: 0; }
  .product-details { flex: 1; min-width: 0; }
  .product-image-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f8fafc; }
  .product-image-wrapper { width: 100%; aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #ffffff; padding: 8px; }
  .product-image-wrapper img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
  .product-image-label { padding: 6px 10px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 7.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
  .product-thumbs { display: flex; gap: 6px; margin-top: 8px; }
  .product-thumb { width: 50px; height: 50px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 3px; }
  .product-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .product-thumb-label { font-size: 6px; color: #94a3b8; text-align: center; margin-top: 2px; text-transform: uppercase; }
  @media print { .product-image-wrapper img, .product-thumb img { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<!-- Download Bar -->
<div class="download-bar">
  <div class="download-bar-title">${L.downloadTitle} - ${escapeHtml(report.product_name || 'Label Analysis')}</div>
  <button class="download-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    ${L.downloadBtn}
  </button>
</div>

<div class="page-content-wrapper">

<!-- ═════════════��═���═══════ COVER PAGE ═══════════════════════ -->
<div class="page cover-page">
  <div class="cover-accent"></div>
  <div class="cover-header">
    <div class="cover-logo">
      <div class="cover-logo-icon">V</div>
      <div>
        <div class="cover-logo-text">VEXIM</div>
        <div class="cover-logo-sub">Compliance AI</div>
      </div>
    </div>
    <div class="cover-badge">CONFIDENTIAL</div>
  </div>

  <div style="margin-top: 10px;">
    <div class="cover-title">${L.coverTitle}</div>
    <div class="cover-subtitle">${escapeHtml(report.product_name || L.defaultProduct)}</div>

    <div class="cover-meta" style="margin-top: 24px;">
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.reportId}</div>
        <div class="cover-meta-value">${escapeHtml(shortId)}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.dateCreated}</div>
        <div class="cover-meta-value">${dateFormatted}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.result}</div>
        <div class="cover-meta-value" style="color: ${resultColor}; font-weight: 700;">${resultLabel}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">${L.riskScore}</div>
        <div class="cover-meta-value" style="color: ${getRiskColor(riskScore)}; font-weight: 700;">${riskScore.toFixed(1)} / 10</div>
      </div>
    </div>

    <!-- Quick Summary -->
    <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">${L.quickSummary}</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${criticalCount}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.critical}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #f59e0b;">${warningCount}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.warning}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${infoCount}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.info}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #6366f1;">${totalCitations > 0 ? totalCitations : '—'}</div>
          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">${L.cfrCitations}</div>
        </div>
      </div>
      ${sortedViolations.length > 0 ? `
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px;">
        <div style="font-size: 8px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">${L.mainReasons}</div>
        ${sortedViolations.slice(0, 3).map(v => `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: ${v.severity === 'critical' ? '#dc2626' : v.severity === 'warning' ? '#f59e0b' : '#2563eb'};"></span>
          <span style="font-size: 9px; color: #334155;">${escapeHtml(translateCategory(v.category, L))}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>

    <!-- Table of Contents -->
    <div style="margin-top: 20px; padding: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${L.tableOfContents}</div>
      ${tocEntries.map(e => `
      <div class="toc-entry">
        <span class="toc-num">${e.num}</span>
        <span class="toc-label">${escapeHtml(e.label)}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="cover-footer">
    <div>${companyInfo.name} | ${companyInfo.website}</div>
    <div>${L.generatedBy}: ${escapeHtml(generatedBy)}</div>
  </div>
</div>

<!-- ═══════════════════════ EXECUTIVE SUMMARY PAGE ═══════════════════════ -->
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}

  <div class="section">
    <div class="section-title"><span class="section-number">${secOverview}</span>${L.overview}</div>
    <div class="exec-grid">
      <div class="exec-card"><div class="exec-card-value" style="color: #DC2626">${criticalCount}</div><div class="exec-card-label">${L.critical}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #F59E0B">${warningCount}</div><div class="exec-card-label">${L.warning}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #2563eb">${infoCount}</div><div class="exec-card-label">${L.info}</div></div>
      <div class="exec-card"><div class="exec-card-value" style="color: #6366f1">${totalCitations}</div><div class="exec-card-label">${L.cfrCitations}</div></div>
    </div>

    <!-- Risk Gauge -->
    <div class="risk-section">
      <div class="risk-gauge">
        <div class="risk-score-circle" style="background: ${getRiskColor(riskScore)}">${riskScore.toFixed(1)}</div>
        <div class="risk-label" style="color: ${getRiskColor(riskScore)}">${getRiskLabel(riskScore, L)}</div>
        <div style="font-size: 8px; color: #94a3b8; margin-top: 4px;">${L.riskLevel}</div>
      </div>
      <div class="risk-details">
        <h4>${L.overallAssessment}</h4>
        <p>${escapeHtml(report.risk_assessment || defaultAssessment)}</p>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;">
          <div style="font-size:9px;color:#64748b;min-width:80px;">${L.currentRisk}</div>
          <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${riskScore * 10}%;background:${getRiskColor(riskScore)};border-radius:4px;"></div></div>
          <div style="font-size:9px;font-weight:600;min-width:30px;text-align:right;color:${getRiskColor(riskScore)};">${riskScore.toFixed(1)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
          <div style="font-size:9px;color:#64748b;min-width:80px;">${L.afterFix}</div>
          <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${projectedRisk * 10}%;background:${getRiskColor(projectedRisk)};border-radius:4px;"></div></div>
          <div style="font-size:9px;font-weight:600;min-width:30px;text-align:right;color:${getRiskColor(projectedRisk)};">${projectedRisk.toFixed(1)}</div>
        </div>
      </div>
    </div>

    <!-- Confidence Metrics -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${L.confidenceMetrics}</div>
      ${confidenceBar(L.ocrConfidence, report.ocr_confidence)}
      ${confidenceBar(L.extractionConfidence, report.extraction_confidence)}
      ${confidenceBar(L.legalConfidence, report.legal_reasoning_confidence)}
    </div>

    <!-- Consequences Banner (only if critical issues exist) -->
    ${criticalCount > 0 ? `
    <div class="consequence-box">
      <div class="consequence-title">
        <span style="font-size:16px;">&#9888;</span>
        ${L.consequencesTitle}
      </div>
      <div class="consequence-grid">
        <div class="consequence-item">
          <div class="consequence-item-icon">&#128274;</div>
          <div class="consequence-item-title">${L.consequenceDetention}</div>
          <div class="consequence-item-desc">${L.consequenceDetentionDesc}</div>
        </div>
        <div class="consequence-item">
          <div class="consequence-item-icon">&#128196;</div>
          <div class="consequence-item-title">${L.consequenceRelabeling}</div>
          <div class="consequence-item-desc">${L.consequenceRelabelingDesc}</div>
        </div>
        <div class="consequence-item">
          <div class="consequence-item-icon">&#9888;</div>
          <div class="consequence-item-title">${L.consequenceRecall}</div>
          <div class="consequence-item-desc">${L.consequenceRecallDesc}</div>
        </div>
      </div>
    </div>` : ''}
  </div>

  <!-- ═══════════════ PRODUCT INFO (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secProduct}</span>${L.productInfo}</div>
    ${(() => {
      // Gather all available images
      const allImages: { url: string; type: string }[] = []
      if (report.label_images && report.label_images.length > 0) {
        report.label_images.forEach(img => allImages.push({ url: img.url, type: img.type }))
      } else if (report.label_image_url) {
        allImages.push({ url: report.label_image_url, type: 'pdp' })
      }
      const primaryImage = allImages[0]
      const thumbImages = allImages.slice(1)

      const imagesHTML = primaryImage ? `
        <div class="product-images">
          <div class="product-image-card">
            <div class="product-image-wrapper">
              <img src="${escapeHtml(primaryImage.url)}" alt="${escapeHtml(report.product_name || 'Product')}" crossorigin="anonymous" />
            </div>
            <div class="product-image-label">${translateImageType(primaryImage.type, L)}</div>
          </div>
          ${thumbImages.length > 0 ? `
          <div class="product-thumbs">
            ${thumbImages.map(img => `
            <div style="text-align:center;">
              <div class="product-thumb">
                <img src="${escapeHtml(img.url)}" alt="${translateImageType(img.type, L)}" crossorigin="anonymous" />
              </div>
              <div class="product-thumb-label">${translateImageType(img.type, L)}</div>
            </div>`).join('')}
          </div>` : ''}
        </div>` : ''

      const infoTableHTML = `
        <div class="${primaryImage ? 'product-details' : ''}">
          <table class="info-table">
            ${report.product_name ? `<tr><td>${L.productName}</td><td>${escapeHtml(report.product_name)}</td></tr>` : ''}
            ${report.brand_name ? `<tr><td>${L.brandName}</td><td>${escapeHtml(report.brand_name)}</td></tr>` : ''}
            ${report.product_category ? `<tr><td>${L.category}</td><td>${escapeHtml(report.product_category)}</td></tr>` : ''}
            ${report.product_type ? `<tr><td>${L.productType}</td><td>${escapeHtml(report.product_type)}</td></tr>` : ''}
            ${report.packaging_format ? `<tr><td>${L.packageFormat}</td><td>${escapeHtml(report.packaging_format)}</td></tr>` : ''}
            ${report.net_content ? `<tr><td>${L.netContent}</td><td>${report.net_content.value} ${report.net_content.unit}</td></tr>` : ''}
            ${report.pdp_area_square_inches ? `<tr><td>${L.pdpArea}</td><td>${report.pdp_area_square_inches.toFixed(2)} sq in</td></tr>` : ''}
            ${report.manufacturer_info?.company_name ? `<tr><td>${L.manufacturer}</td><td>${escapeHtml(report.manufacturer_info.company_name)}</td></tr>` : ''}
            ${report.manufacturer_info?.country_of_origin ? `<tr><td>${L.origin}</td><td>${escapeHtml(report.manufacturer_info.country_of_origin)}</td></tr>` : ''}
            ${report.target_market ? `<tr><td>${L.targetMarket}</td><td>${escapeHtml(report.target_market)}</td></tr>` : ''}
            ${report.detected_languages && report.detected_languages.length > 0 ? `<tr><td>${L.detectedLangs}</td><td>${report.detected_languages.map((l: string) => escapeHtml(l)).join(', ')}</td></tr>` : ''}
            <tr><td>${L.analysisDate}</td><td>${formatDate(report.created_at, lang)}</td></tr>
          </table>
        </div>`

      if (primaryImage) {
        return `<div class="product-layout">${imagesHTML}${infoTableHTML}</div>`
      }
      return infoTableHTML
    })()}
  </div>

  <!-- Allergen Declaration -->
  ${report.allergen_declaration ? `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#92400E;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.allergenDeclaration}</div>
    <div style="background: #FEF3C7; border: 1px solid #FBBF24; border-radius: 8px; padding: 12px; font-size: 9.5px; color: #92400E; overflow-wrap: break-word;">
      <strong>${L.allergens}:</strong> ${escapeHtml(report.allergen_declaration)}
    </div>
  </div>` : ''}

  <!-- Health Claims -->
  ${healthClaims && healthClaims.length > 0 ? `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#991B1B;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.healthClaims}</div>
    <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:12px;overflow-wrap:break-word;">${healthClaims.map((claim: string) => {
        const isDanger = /prevent|cure|treat|disease|diagnos/i.test(claim)
        return `<span class="health-claim-tag ${isDanger ? 'health-claim-danger' : 'health-claim-normal'}">${isDanger ? '&#9888; ' : ''}${escapeHtml(claim)}</span>`
      }).join('')}
      ${healthClaims.some((c: string) => /prevent|cure|treat|disease|diagnos/i.test(c)) ? `
      <div style="margin-top:10px;font-size:8px;color:#991B1B;font-weight:600;border-top:1px solid #FECACA;padding-top:8px;">&#9888; ${L.healthClaimsWarning}</div>` : ''}
    </div>
  </div>` : ''}

  <!-- Verified Nutrient Claims (from special_claims that match nutrient patterns) -->
  ${(() => {
    // Filter special claims that are nutrient content claims (Low-Fat, Fat Free, etc.)
    const nutrientClaimPatterns = /low[- ]?fat|fat[- ]?free|reduced[- ]?fat|lite|light|lean|extra lean|low[- ]?calorie|calorie[- ]?free|low[- ]?sodium|sodium[- ]?free|low[- ]?cholesterol|cholesterol[- ]?free|sugar[- ]?free|no sugar|low[- ]?sugar|\d+%\s*milk\s*fat/i
    const verifiedNutrientClaims = specialClaims.filter((claim: string) => nutrientClaimPatterns.test(claim))
    
    if (verifiedNutrientClaims.length === 0) return ''
    
    return `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#16a34a;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.verifiedNutrientClaims}</div>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;">
      ${verifiedNutrientClaims.map((claim: string) => `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
        <span style="color:#16a34a;font-size:14px;">&#10003;</span>
        <div>
          <span style="font-weight:600;color:#166534;font-size:10px;">${escapeHtml(claim)}</span>
          <div style="font-size:8px;color:#15803d;margin-top:2px;">&#10003; ${L.verifiedCompliant}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>`
  })()}

  <!-- Special Claims (non-nutrient) -->
  ${(() => {
    // Filter out nutrient content claims from special claims
    const nutrientClaimPatterns = /low[- ]?fat|fat[- ]?free|reduced[- ]?fat|lite|light|lean|extra lean|low[- ]?calorie|calorie[- ]?free|low[- ]?sodium|sodium[- ]?free|low[- ]?cholesterol|cholesterol[- ]?free|sugar[- ]?free|no sugar|low[- ]?sugar|\d+%\s*milk\s*fat/i
    const nonNutrientClaims = specialClaims.filter((claim: string) => !nutrientClaimPatterns.test(claim))
    
    if (nonNutrientClaims.length === 0) return ''
    
    return `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#1E40AF;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.specialClaims}</div>
    <div style="padding:4px 0;">
      ${nonNutrientClaims.map((claim: string) => `<span class="special-claim-tag">${escapeHtml(claim)}</span>`).join('')}
    </div>
  </div>`
  })()}

  <!-- Ingredient List -->
  ${report.ingredient_list ? `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.ingredientList}</div>
    <div class="data-box">
      <div class="data-box-label">${L.ingredientDetected}</div>
      ${escapeHtml(report.ingredient_list)}
    </div>
  </div>` : ''}

  <!-- Nutrition Facts - show multi-column OR single-column, not both -->
  ${!isCosmetic ? (() => {
    const hasMultiColumn = (report as any).nutrition_facts_columns && (report as any).nutrition_facts_columns.length > 1
    if (hasMultiColumn) {
      // Multi-column NF: render table in Product Info section
      const allColumns: any[] = (report as any).nutrition_facts_columns
      const nutrientNames = Array.from(
        new Set(allColumns.flatMap((col: any) => (col.nutritionFacts || []).map((n: any) => n.name as string)))
      )
      return `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">${L.multiColumnNF}</div>
    <div style="font-size:9px;color:#64748b;margin-bottom:10px;">${L.multiColumnNFDesc}</div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:8.5px;table-layout:fixed;">
        <colgroup>
          <col style="width:22%;" />
          ${allColumns.map(() => '<col style="width:' + Math.floor(78 / allColumns.length) + '%;" />').join('')}
        </colgroup>
        <thead>
          <tr style="background:#1e40af;color:white;">
            <th style="padding:7px 8px;text-align:left;font-weight:700;">Nutrient</th>
            ${allColumns.map((col: any) => '<th style="padding:7px 8px;text-align:center;font-weight:700;font-size:8px;">' + escapeHtml(col.columnName || col.name || L.multiColumnVariant) + '</th>').join('')}
          </tr>
          <tr style="background:#dbeafe;">
            <td style="padding:5px 8px;font-size:7.5px;font-weight:600;color:#334155;">${L.multiColumnServingSize}</td>
            ${allColumns.map((col: any) => '<td style="padding:5px 8px;text-align:center;font-size:7.5px;color:#475569;">' + escapeHtml(col.servingSize || '—') + '</td>').join('')}
          </tr>
        </thead>
        <tbody>
          ${nutrientNames.map((nutrientName, rowIdx) => {
            const bg = rowIdx % 2 === 0 ? 'background:#f8fafc;' : ''
            return '<tr style="' + bg + '">' +
              '<td style="padding:5px 8px;font-weight:600;color:#334155;font-size:8px;text-transform:capitalize;">' + escapeHtml(nutrientName) + '</td>' +
              allColumns.map((col: any) => {
                const fact = (col.nutritionFacts || []).find((n: any) => n.name === nutrientName)
                const val = fact ? (fact.value ?? '') + (fact.unit ? fact.unit : '') + (fact.dailyValue != null ? ' <span style="color:#94a3b8;">(' + fact.dailyValue + '%)</span>' : '') : '<span style="color:#d1d5db;">—</span>'
                return '<td style="padding:5px 8px;text-align:center;color:#475569;font-size:8px;">' + val + '</td>'
              }).join('') +
            '</tr>'
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`
    } else {
      // Single-column NF or fallback
      // Debug: Log nutrition facts data
      console.log('[PDF Generator] nutrition_facts:', report.nutrition_facts, 'count:', report.nutrition_facts?.length)
      
      return `
  <div class="section">
    <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.nutritionInfo}</div>
    <div class="data-box">
      <div class="data-box-label">${L.nutritionDetected}</div>
      ${report.nutrition_facts && report.nutrition_facts.length > 0 ? `
      <table class="info-table" style="margin: 0;">
        ${report.nutrition_facts.map((item: any) => {
          return `<tr><td>${escapeHtml(item.nutrient || item.name || '')}</td><td>${item.value !== undefined && item.value !== null ? formatNutrientValue(item.value) : ''} ${item.unit || ''}</td></tr>`
        }).join('')}
      </table>` : `
      <div style="padding:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#92400e;font-size:8.5px;text-align:center;">
        ${lang === 'vi'
          ? 'Không thể đọc bảng dinh dưỡng từ hình ảnh. Vui lòng upload ảnh Nutrition Facts rõ hơn.'
          : 'Could not extract nutrition facts from the provided image. Please upload a clearer Nutrition Facts panel image.'}
      </div>`}
    </div>
  </div>`
    }
  })() : ''}

  <!-- ═══════════════ AUDIT SCOPE (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secAuditScope}</span>${L.auditScope}</div>

    <table class="info-table" style="margin-bottom:12px;">
      <tr><td>${L.auditScopeReviewDate}</td><td>${dateFormatted}</td></tr>
      <tr><td>${L.auditScopeCfrVersion}</td><td>${L.auditScopeCfrVersionValue}</td></tr>
      <tr><td>${L.auditScopeOcrMethod}</td><td>${L.auditScopeOcrMethodValue}</td></tr>
      <tr><td>${L.auditScopePanels}</td><td>${L.auditScopePanelsValue}</td></tr>
      <tr><td>${L.auditScopeImages}</td><td>${((report.label_images && report.label_images.length > 0) ? report.label_images.length : 1)} image(s) analyzed</td></tr>
      <tr>
        <td>${L.auditScopeRegulations}</td>
        <td>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101 — Food Labeling</span>
          ${!isCosmetic ? `<span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101.9 — Nutrition Facts</span>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101.4 — Ingredient Listing</span>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §101.2 — Mandatory Label Statements</span>
          <span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">FD&amp;C Act §403 — Misbranding</span>` : ''}
          ${isCosmetic ? `<span style="display:inline-block;background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;padding:2px 8px;border-radius:4px;font-size:8.5px;font-weight:600;margin:2px 4px 2px 0;">21 CFR §701 — Cosmetic Labeling</span>` : ''}
        </td>
      </tr>
    </table>

    <!-- What was NOT checked (scope boundaries) -->
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:10px 12px;font-size:8.5px;color:#92400E;line-height:1.5;">
      <div style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;color:#B45309;">Out of Scope — Not Reviewed</div>
      <ul style="margin:0 0 0 12px;padding:0;list-style:disc;">
        <li>Product formulation and ingredient safety</li>
        <li>Manufacturing practices (GMP / 21 CFR §111)</li>
        <li>Clinical or structure/function claim substantiation</li>
        <li>Supply chain and distribution compliance</li>
        <li>State/local labeling requirements (California Prop 65, etc.)</li>
      </ul>
    </div>
  </div>
</div>

<!-- ═══════════════════════ FINDINGS PAGE ═══════════════════════ -->
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}
  
  <!-- ═══════════════ FINDINGS DETAIL (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secFindings}</span>${L.findingsDetail}</div>
    ${sortedViolations.length === 0 ? `
      <div style="text-align: center; padding: 30px; color: #16a34a;">
        <div style="font-size: 36px; margin-bottom: 10px;">&#10003;</div>
        <div style="font-size: 14px; font-weight: 700;">${L.noViolations}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 6px;">${L.noViolationsDesc}</div>
      </div>
    ` : sortedViolations.map((v, i) => {
      const colors = getSeverityColor(v.severity)
      return `
      <div class="violation-card no-break" style="border-color: ${colors.border}; background: ${colors.bg};">
        <div class="violation-header">
          <div class="violation-title" style="color: ${colors.text}">${i + 1}. ${escapeHtml(translateCategory(v.category, L))}</div>
          <span class="severity-badge" style="background: ${colors.text}; color: white;">${getSeverityLabel(v.severity, L)}</span>
        </div>
        <div class="violation-description">${escapeHtml(v.description)}</div>
        ${v.regulation_reference ? `
        <div class="violation-box" style="border-left: 3px solid ${colors.border};">
          <div class="violation-box-label">${L.legalBasis}</div>
          <div class="violation-box-value" style="font-family: monospace; color: #2563eb; font-size: 9px; overflow-wrap: break-word;">${escapeHtml(v.regulation_reference)}</div>
          ${v.legal_basis ? `<div class="violation-box-value" style="margin-top: 4px;">${escapeHtml(v.legal_basis)}</div>` : ''}
        </div>` : ''}
        ${v.suggested_fix ? `
        <div class="violation-box" style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e;">
          <div class="violation-box-label" style="color: #16a34a;">${L.fixGuidance}</div>
          <div class="violation-box-value">${markdownToHtml(v.suggested_fix)}</div>
        </div>` : ''}
        ${v.enforcement_context ? `
        <div class="violation-box" style="background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444;">
          <div class="violation-box-label" style="color: #dc2626;">${L.enforcementHistory}</div>
          <div class="violation-box-value">${markdownToHtml(v.enforcement_context)}</div>
        </div>` : ''}
        <div class="violation-meta">
          ${v.confidence_score !== undefined ? `<span>${L.aiConfidenceLabel}: ${Math.round(v.confidence_score * 100)}%</span>` : ''}
          ${v.risk_score !== undefined ? `<span>${L.riskScoreLabel}: ${v.risk_score.toFixed(1)}/10</span>` : ''}
          ${v.enforcement_frequency ? `<span>${L.enforcementFreq}: ${v.enforcement_frequency}x</span>` : ''}
          ${v.citations?.length ? `<span>${L.citationsLabel}: ${v.citations.length}</span>` : ''}
        </div>
        ${v.citations && v.citations.length > 0 ? `
        <table class="citations-table" style="margin-top: 10px; table-layout: fixed; width: 100%;">
          <colgroup>
            <col style="width:18%;" />
            <col style="width:48%;" />
            <col style="width:18%;" />
            <col style="width:16%;" />
          </colgroup>
          <thead><tr><th>${L.cfrSection}</th><th>${L.citationContent}</th><th>${L.source}</th><th>${L.relevance}</th></tr></thead>
          <tbody>
            ${v.citations.map((c: Citation) => `
            <tr>
              <td style="font-family: monospace; font-size: 7.5px; overflow-wrap: break-word;">${escapeHtml(c.section)}</td>
              <td style="overflow-wrap: break-word; word-break: break-word;">${escapeHtml(c.text.slice(0, 150))}${c.text.length > 150 ? '...' : ''}</td>
              <td style="overflow-wrap: break-word;">${escapeHtml(c.source)}</td>
              <td><span class="relevance-bar"><span class="relevance-bar-fill" style="width: ${Math.round(c.relevance_score * 100)}%"></span></span>${Math.round(c.relevance_score * 100)}%</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}
      </div>`
    }).join('')}
  </div>
</div>

<!-- ═══════════════════════ IMPORT ALERTS PAGE ═══════════════════════ -->
${importAlertViolations.length > 0 ? `
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}
  <!-- ═══════════════ IMPORT ALERTS (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secImportAlerts}</span>${L.importAlerts}</div>
    <div class="port-warning" style="background: #FEF3C7; border-left-color: #dc2626; margin-bottom: 20px;">
      <div class="port-warning-label" style="color: #dc2626;">${L.portRiskLabel}</div>
      ${L.portRiskDesc}
    </div>
    ${importAlertViolations.map((ia, i) => {
      const isEntityMatch = ia.severity === 'critical'
      return `
    <div class="violation-card no-break" style="border-color: ${isEntityMatch ? '#f87171' : '#fbbf24'}; background: ${isEntityMatch ? '#FEE2E2' : '#FEF3C7'};">
      <div class="violation-header">
        <div class="violation-title" style="color: ${isEntityMatch ? '#991B1B' : '#92400E'}">${i + 1}. ${escapeHtml(translateCategory(ia.category, L))}</div>
        <span class="severity-badge" style="background: ${isEntityMatch ? '#DC2626' : '#F59E0B'}; color: white;">${isEntityMatch ? L.dwpeRedList : L.categoryRisk}</span>
      </div>
      <div class="violation-description">${escapeHtml(ia.description)}</div>
      ${ia.regulation_reference ? `
      <div class="violation-box" style="border-left: 3px solid ${isEntityMatch ? '#f87171' : '#fbbf24'};">
        <div class="violation-box-label">${L.importAlertRef}</div>
        <div class="violation-box-value" style="font-family: monospace; color: #2563eb;">${escapeHtml(ia.regulation_reference)}</div>
        ${ia.import_alert_number ? `<div class="violation-box-value" style="margin-top: 4px; font-size: 9px;"><a href="https://www.accessdata.fda.gov/cms_ia/importalert_${escapeHtml(ia.import_alert_number.replace(/-/g, ''))}.html" style="color: #2563eb;">${L.viewOnFda} &rarr;</a></div>` : ''}
      </div>` : ''}
      ${ia.suggested_fix ? `
      <div class="violation-box" style="background: rgba(34, 197, 94, 0.08); border-left: 3px solid #22c55e;">
        <div class="violation-box-label" style="color: #16a34a;">${L.remediationSteps}</div>
        <div class="violation-box-value">${markdownToHtml(ia.suggested_fix)}</div>
      </div>` : ''}
      <div class="violation-meta">
        <span>${L.matchConfidence}: ${ia.confidence_score !== undefined ? Math.round(ia.confidence_score * 100) + '%' : 'N/A'}</span>
        <span style="color: #64748b; font-style: italic;">${L.referenceOnly}</span>
      </div>
    </div>`
    }).join('')}
  </div>
</div>` : ''}

${hasTech ? `
<!-- ═══════════════════════ TECHNICAL CHECKS PAGE ═══════════════════════ -->
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}
  
  <!-- ═══════════════ TECHNICAL CHECKS (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secTechnical}</span>${L.technicalChecks}</div>
    <div class="tech-grid">
      ${report.geometry_violations && report.geometry_violations.length > 0 ? `
      <div class="tech-card">
        <div class="tech-card-title">${L.geometryLayout}<span class="tech-card-badge">${report.geometry_violations.length} ${L.issueCount}</span></div>
        ${report.geometry_violations.map((gv: any) => `
        <div class="tech-item">
          <div class="tech-item-header">
            <span class="tech-item-type">${escapeHtml((gv.type || '').replace(/_/g, ' '))}</span>
            <span class="severity-badge" style="background: ${getSeverityColor(gv.severity).text}; color: white; font-size: 7px; padding: 2px 6px;">${getSeverityLabel(gv.severity || '', L)}</span>
          </div>
          <div class="tech-item-desc">${escapeHtml(gv.description || '')}</div>
          ${gv.regulation ? `<div style="font-family: monospace; font-size: 8px; color: #2563eb; margin-top: 3px;">${escapeHtml(gv.regulation)}</div>` : ''}
          ${(gv.expected || gv.actual) ? `
          <div class="tech-item-values">
            ${gv.expected ? `<span style="color: #16a34a;">${L.expected}: ${escapeHtml(String(gv.expected))}</span>` : ''}
            ${gv.actual ? `<span style="color: #dc2626;">${L.actual}: ${escapeHtml(String(gv.actual))}</span>` : ''}
          </div>` : ''}
        </div>`).join('')}
      </div>` : ''}
      ${report.contrast_violations && report.contrast_violations.length > 0 ? `
      <div class="tech-card">
        <div class="tech-card-title">${L.colorContrast}<span class="tech-card-badge">${report.contrast_violations.length} ${L.issueCount}</span></div>
        ${report.contrast_violations.map((cv: any) => `
        <div class="tech-item">
          <div class="tech-item-desc">${escapeHtml(cv.description || '')}</div>
          ${cv.ratio !== undefined ? `
          <div style="margin-top: 4px; font-size: 9px;">
            ${L.contrastRatio}: <strong style="color: ${cv.ratio >= (cv.requiredMinRatio || 4.5) ? '#16a34a' : cv.ratio >= 3 ? '#f59e0b' : '#dc2626'}">${cv.ratio.toFixed(2)}:1</strong>
            <span style="color: #94a3b8;">(${L.minimum} ${(cv.requiredMinRatio || 3.0).toFixed(1)}:1${cv.textSize === 'large' ? ' — large text' : ''}${cv.elementRole === 'brand' ? ' — brand/decorative' : ''})</span>
          </div>` : ''}
          ${cv.colors ? `
          <div style="margin-top: 4px; font-size: 8px; display: flex; align-items: center; gap: 8px;">
            <span><span class="color-swatch" style="background: ${cv.colors.foreground};"></span>${escapeHtml(cv.colors.foreground)}</span>
            <span style="color: #94a3b8;">${L.on}</span>
            <span><span class="color-swatch" style="background: ${cv.colors.background};"></span>${escapeHtml(cv.colors.background)}</span>
          </div>` : ''}
          ${cv.recommendation ? `<div style="margin-top: 4px; font-size: 8px; color: #16a34a;">${escapeHtml(cv.recommendation)}</div>` : ''}
        </div>`).join('')}
        <div style="margin-top:10px;padding:8px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:8px;color:#92400e;">
          ${L.contrastDesignNote}
        </div>
      </div>` : ''}
    </div>
    ${report.multilanguage_issues && report.multilanguage_issues.length > 0 ? `
    <div class="tech-card" style="margin-bottom: 16px;">
      <div class="tech-card-title">${L.multiLangCompliance}<span class="tech-card-badge">${report.multilanguage_issues.length} ${L.checks}</span></div>
      ${report.multilanguage_issues.map((ml: any) => `
      <div class="tech-item">
        <div class="tech-item-desc">${escapeHtml(ml.description || '')}</div>
        ${ml.detectedLanguages && ml.detectedLanguages.length > 0 ? `
        <div style="margin-top: 4px; font-size: 8px;">${L.detected}: ${ml.detectedLanguages.map((l: string) => `<span style="background: #f1f5f9; padding: 1px 6px; border-radius: 3px; margin-right: 4px;">${escapeHtml(l)}</span>`).join('')}</div>` : ''}
        ${ml.missingFields && ml.missingFields.length > 0 ? `
        <div style="margin-top: 4px; font-size: 8px; color: #dc2626;">${L.missingTranslations}: ${ml.missingFields.map((f: string) => escapeHtml(f)).join(', ')}</div>` : ''}
      </div>`).join('')}
    </div>` : ''}
  </div>
</div>` : ''}

<!-- ═════���═════════════════ COMMERCIAL SUMMARY PAGE ═══════════════════════ -->
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}

${(() => {
  // Always generate localized commercial summary - never use raw English boilerplate
  // This ensures Vietnamese users see Vietnamese content in the PDF
  const criticalCount = sortedViolations.filter(v => v.severity === 'critical').length
  const warningCount = sortedViolations.filter(v => v.severity === 'warning').length
  const infoCount = sortedViolations.filter(v => v.severity === 'info').length
  const isPassing = report.overall_result === 'pass' || report.overall_result === 'approved'
  
  // Generate contextual summary based on violations
  let summaryContent = ''
  if (isPassing && criticalCount === 0) {
    if (lang === 'vi') {
      summaryContent = `**Nhãn sản phẩm tuân thủ tất cả các quy định FDA được kiểm tra.**

Vexim AI không phát hiện vi phạm nghi��m trọng nào trong quá trình kiểm tra. Nhãn tuân thủ các quy định về ghi nhãn theo 21 CFR. Không tìm thấy Warning Letter, Recall hoặc Import Alert liên quan trong cơ sở dữ liệu FDA. Sản phẩm có thể được phân phối tại thị trường Hoa Kỳ với rủi ro pháp lý thấp.`
    } else {
      summaryContent = `**Your label complies with all FDA regulations checked.**

Vexim AI did not find any critical violations during the inspection process. The label complies with labeling regulations under 21 CFR. No Warning Letters, Recalls, or Import Alerts were found in the FDA database. The product can be distributed in the US market with low legal risk.`
    }
  } else if (criticalCount > 0) {
    if (lang === 'vi') {
      summaryContent = `**Phát hiện ${criticalCount} vấn đề nghiêm trọng cần khắc phục ngay.**

Nhãn sản phẩm không đáp ứng một số yêu cầu FDA quan trọng. Các vi phạm này có thể dẫn đến giữ hàng tại cảng, thư cảnh báo FDA, hoặc thu hồi sản phẩm. Vui lòng xem Chi Tiết Phát Hiện và Danh Sách Hành Động để biết các bước khắc phục cụ thể.

**Lưu ý:** Khắc phục tất cả vấn đề nghiêm trọng trước khi xuất khẩu sang thị trường Hoa Kỳ.`
    } else {
      summaryContent = `**${criticalCount} critical issue(s) require immediate attention.**

The product label does not meet certain important FDA requirements. These violations may lead to port detention, FDA Warning Letters, or product recalls. Please see Findings Detail and Action Items for specific remediation steps.

**Note:** Address all critical issues before exporting to the US market.`
    }
  } else if (warningCount > 0) {
    if (lang === 'vi') {
      summaryContent = `**Nhãn sản phẩm đáp ứng yêu cầu FDA tối thiểu nhưng có ${warningCount} điểm cần cải thiện.**

Không có vi phạm nghiêm trọng, nhưng một số cảnh báo cần được xem xét để giảm rủi ro. Khuyến nghị xem lại và khắc phục trước khi phân phối để đảm bảo tuân thủ tối ưu.`
    } else {
      summaryContent = `**The product label meets minimum FDA requirements but has ${warningCount} areas for improvement.**

No critical violations found, but some warnings should be addressed to reduce risk. We recommend reviewing and addressing these before distribution for optimal compliance.`
    }
  } else {
    if (lang === 'vi') {
      summaryContent = 'Nhãn sản phẩm đáp ứng các yêu cầu ghi nhãn FDA theo 21 CFR Part 101. Không phát hiện vi phạm nghiêm trọng. Sản phẩm có thể phân phối tại thị trường Hoa Kỳ với rủi ro pháp lý thấp.'
    } else {
      summaryContent = 'The product label meets FDA labeling requirements under 21 CFR Part 101. No critical violations detected. The product may be distributed in the US market with low legal risk.'
    }
  }
  
  const fallbackContent = summaryContent
    
    // Always render with localized content - never use raw English boilerplate
  return `<!-- ═══════════════ COMMERCIAL SUMMARY (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secCommercial}</span>${L.commercialSummary}</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;overflow-wrap:break-word;">
      ${markdownToHtml(fallbackContent)}
      
      <!-- FDA Enforcement History Section -->
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${L.fdaEnforcementHistory}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#9993;</span> ${L.warningLetters}
            </div>
            <div style="font-size:11px;font-weight:700;color:#16a34a;">${L.none}</div>
          </div>
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#128260;</span> ${L.recalls}
            </div>
            <div style="font-size:11px;font-weight:700;color:#16a34a;">${L.none}</div>
          </div>
          <div style="flex:1;min-width:100px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:8px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;">&#128274;</span> ${L.importAlertsLabel}
            </div>
            <div style="font-size:11px;font-weight:700;color:${importAlertViolations.length > 0 ? '#f59e0b' : '#16a34a'};">${importAlertViolations.length > 0 ? importAlertViolations.length : L.none}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`
})()} 
</div>

${expertReview && expertReview.status === 'completed' ? `
  <!-- ═══════════════════════ EXPERT CONSULTATION (flows from previous) ════════════���══════════ -->
<div class="page content-page"><!-- No page-break: flows naturally -->
  ${pageHeader(L, shortId, dateFormatted)}

  <!-- Expert Consultation Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding:14px 18px;background:linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%);border-radius:10px;color:white;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">&#128101;</div>
      <div>
        <div style="font-size:14px;font-weight:700;">${L.expertConsultation}</div>
        <div style="font-size:9px;opacity:0.85;">${L.requestSentAt}: ${formatDate(expertReview.created_at, lang)}</div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.2);padding:6px 12px;border-radius:6px;font-size:9px;font-weight:600;">&#10003; ${L.resultsAvailable}</div>
  </div>

  <!-- Expert Overview Assessment -->
  ${expertReview.expert_summary ? `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:14px;">&#10024;</span> ${L.expertOverview}
    </div>
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;font-size:10px;color:#1e40af;line-height:1.7;overflow-wrap:break-word;">
      ${escapeHtml(expertReview.expert_summary)}
    </div>
  </div>` : ''}

  <!-- Fix Guidance per Violation -->
  ${expertReview.violation_reviews && expertReview.violation_reviews.length > 0 ? `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:14px;">&#128221;</span> ${L.violationFixGuide}
    </div>
    <div style="space-y:10px;">
      ${expertReview.violation_reviews.map((vr) => {
        const isConfirmed = vr.confirmed
        const bgColor = isConfirmed ? '#FEF2F2' : '#F0FDF4'
        const borderColor = isConfirmed ? '#FECACA' : '#BBF7D0'
        const iconColor = isConfirmed ? '#DC2626' : '#16A34A'
        const icon = isConfirmed ? '&#9888;' : '&#10003;'
        return `
      <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:14px;margin-bottom:10px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="color:${iconColor};font-size:12px;">${icon}</span>
          <span style="font-size:10px;font-weight:600;color:#334155;">
            Violation #${vr.violation_index + 1} — ${isConfirmed ? L.violationConfirmed : L.violationNotConfirmed}
          </span>
        </div>
        ${vr.wording_fix ? `
        <div style="margin-top:8px;">
          <div style="font-size:8px;color:#64748b;margin-bottom:4px;">${L.suggestedWording}</div>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:10px;color:#0f172a;line-height:1.6;overflow-wrap:break-word;">
            ${escapeHtml(vr.wording_fix)}
          </div>
        </div>` : ''}
        ${vr.legal_note ? `
        <div style="margin-top:8px;font-size:9px;color:#64748b;font-style:italic;overflow-wrap:break-word;">
          ${escapeHtml(vr.legal_note)}
        </div>` : ''}
      </div>`
      }).join('')}
    </div>
  </div>` : ''}

  <!-- Priority Actions -->
  ${expertReview.recommended_actions && expertReview.recommended_actions.length > 0 ? `
  <div class="section">
    <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
      <span style="font-size:14px;">&#10145;</span> ${L.expertPriorityActions}
    </div>
    <div>
      ${expertReview.recommended_actions.map((ra) => {
        const priorityColor = ra.priority === 'high' ? '#DC2626' : ra.priority === 'medium' ? '#F59E0B' : '#64748B'
        const priorityBg = ra.priority === 'high' ? '#FEE2E2' : ra.priority === 'medium' ? '#FEF3C7' : '#F1F5F9'
        const priorityLabel = ra.priority === 'high' ? L.priorityUrgent : ra.priority === 'medium' ? L.priorityHigh : L.priorityMedium
        return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:8px;font-weight:700;color:${priorityColor};background:${priorityBg};padding:3px 8px;border-radius:4px;white-space:nowrap;">${priorityLabel}</span>
        <span style="font-size:10px;color:#334155;flex:1;overflow-wrap:break-word;">${escapeHtml(ra.action)}</span>
        ${ra.cfr_reference ? `<span style="font-size:8px;color:#64748b;white-space:nowrap;">(${escapeHtml(ra.cfr_reference)})</span>` : ''}
      </div>`
      }).join('')}
    </div>
  </div>` : ''}

  <!-- Sign Off -->
  ${expertReview.sign_off_name ? `
  <div style="margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;font-size:9px;color:#64748b;">
    <span style="font-size:12px;">&#128100;</span>
    <span>${L.signedOffBy} <strong style="color:#0f172a;">${escapeHtml(expertReview.sign_off_name)}</strong></span>
    <span>•</span>
    <span>${formatDate(expertReview.sign_off_at || expertReview.created_at, lang)}</span>
  </div>` : ''}

  <div class="page-footer">
    <div>${L.pageFooter} | ${companyInfo.name}</div>
    <div>${L.reportId}: ${escapeHtml(shortId)}</div>
  </div>
</div>` : ''}

  <!-- ═══════════════ EXPERT RECOMMENDATIONS (inline section) ═══════════════ -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secExpert}</span>${L.expertRecommendations}</div>
    <!-- Only show default expert tip if no tips already exist in commercial_summary -->
    ${report.expert_tips && report.expert_tips.length > 0 && !report.commercial_summary?.includes('Vexim Tip') ? `
      ${report.expert_tips.map((tip: string, idx: number) => `
      <div class="expert-tip">
        <div class="expert-tip-label">${L.recommendation} ${idx + 1}</div>
        ${markdownToHtml(tip)}
      </div>`).join('')}
    ` : !report.commercial_summary?.includes('Vexim Tip') ? `
      <div class="expert-tip">
        <div class="expert-tip-label">${L.veximAdvice}</div>
        ${defaultExpertTip}
      </div>
    ` : `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:9px;color:#166534;">
        ${lang === 'vi' ? 'Xem khuyến nghị chuyên gia trong phần Tóm Tắt Phân Tích Thương Mại ở trên.' : 'See expert recommendations in the Commercial Analysis Summary section above.'}
      </div>
    `}

    <!-- Enforcement Insights -->
    ${enforcementInsights.length > 0 ? `
    <div style="margin-top:12px;">
      <div style="font-size:9px;font-weight:700;color:#b45309;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${L.enforcementInsights}</div>
      ${enforcementInsights.map((insight: string) => `
      <div class="port-warning" style="margin-bottom:6px;">
        ${markdownToHtml(insight)}
      </div>`).join('')}
    </div>` : ''}

    ${criticalCount > 0 ? `
    <div class="port-warning">
      <div class="port-warning-label">${L.portWarning}</div>
      ${L.portWarningDesc}
    </div>` : ''}

    ${report.review_notes ? `
    <div class="expert-tip">
      <div class="expert-tip-label">${L.expertReviewNotes}</div>
      ${markdownToHtml(report.review_notes)}
    </div>` : ''}
  </div>

  <div class="page-footer">
    <div>${L.pageFooter} | ${companyInfo.name}</div>
    <div>${L.reportId}: ${escapeHtml(shortId)}</div>
  </div>
</div>

<!-- ═══════════════════════ ACTION ITEMS & SIGNATURE PAGE ═══════════════════════ -->
<div class="page content-page page-break">
  ${pageHeader(L, shortId, dateFormatted)}

  <!-- Action Items -->
  <div class="section">
    <div class="section-title"><span class="section-number">${secAction}</span>${L.actionItems}</div>
    <table class="citations-table" style="table-layout:fixed;width:100%;">
      <colgroup>
        <col style="width:5%;" />
        <col style="width:10%;" />
        <col style="width:12%;" />
        <col style="width:20%;" />
        <col style="width:53%;" />
      </colgroup>
      <thead><tr><th>#</th><th>${L.actionPriority}</th><th>${L.actionSeverity}</th><th>${L.actionIssue}</th><th>${L.actionRequired}</th></tr></thead>
      <tbody>
        ${sortedViolations.map((v, i) => {
          const rowClass = v.severity === 'critical' ? 'action-row-critical' : v.severity === 'warning' ? 'action-row-warning' : 'action-row-info'
          const priority = v.severity === 'critical' ? L.priorityImmediate : v.severity === 'warning' ? L.priorityHigh : L.priorityMedium
          const priorityColor = v.severity === 'critical' ? '#dc2626' : v.severity === 'warning' ? '#f59e0b' : '#2563eb'
          return `
        <tr class="${rowClass}">
          <td style="font-weight:600;">${i + 1}</td>
          <td><span style="font-size:7px;font-weight:700;color:${priorityColor};text-transform:uppercase;">${priority}</span></td>
          <td><span class="severity-badge" style="background: ${getSeverityColor(v.severity).text}; color: white; font-size: 7px; padding: 2px 6px;">${getSeverityLabel(v.severity, L)}</span></td>
          <td style="overflow-wrap:break-word;word-break:break-word;">${escapeHtml(translateCategory(v.category, L))}</td>
          <td style="overflow-wrap:break-word;word-break:break-word;">${(() => {
            // Clean markdown from suggested_fix for table display
            const rawFix = v.suggested_fix || L.seeDetails
            const cleanFix = rawFix
              .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove **bold**
              .replace(/\*(.+?)\*/g, '$1')      // Remove *italic*
              .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')  // Remove circled numbers
              .replace(/⚠️?/g, '')              // Remove warning emoji
              .trim()
            return escapeHtml(cleanFix.slice(0, 120)) + (cleanFix.length > 120 ? '...' : '')
          })()}</td>
        </tr>`
        }).join('')}
        ${sortedViolations.length === 0 ? `
        <tr>
          <td colspan="5" style="text-align:center;padding:20px;color:#16a34a;font-size:9px;font-weight:600;">
            <span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 24px;">
              ✓ ${lang === 'vi' ? 'Không có hành động nào cần thực hiện. Duy trì ti��u chuẩn ghi nhãn hiện tại.' : 'No actions required. Maintain current labeling standards.'}
            </span>
          </td>
        </tr>` : ''}
      </tbody>
    </table>
  </div>

  <!-- Verification Status - Only show "verified" badge if expert review was actually completed -->
  <div style="display: flex; justify-content: center; margin: 14px 0;">
    ${expertReview && expertReview.status === 'completed'
      ? `<div class="verification-badge verified"><span style="font-size: 14px;">&#10003;</span>${L.reportVerified}</div>`
      : `<div class="verification-badge pending"><span style="font-size: 14px;">&#9888;</span>${L.pendingVerification}</div>`
    }
  </div>

  ${!(expertReview && expertReview.status === 'completed') ? `
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #2563eb 100%); border-radius: 12px; padding: 20px; margin: 16px 0; color: white; text-align: center;">
    <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">${L.upgradeTitle}</div>
    <div style="font-size: 10px; opacity: 0.9; margin-bottom: 12px; line-height: 1.6;">${L.upgradeDesc}<br/>${L.upgradeDesc2}</div>
    <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
      <a href="https://ailabelpro.com/pricing" style="display: inline-block; background: white; color: #1e40af; padding: 10px 20px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none;">${L.requestVerification}</a>
      <a href="mailto:support@veximglobal.com" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 10px 20px; border-radius: 8px; font-size: 11px; font-weight: 600; text-decoration: none; border: 1px solid rgba(255,255,255,0.3);">${L.contactConsulting}</a>
    </div>
    <div style="margin-top: 8px; font-size: 9px; opacity: 0.8;">Hotline: +84 (373) 685634 | Email: support@veximglobal.com</div>
  </div>` : ''}

  <!-- Signature Section -->
  <div class="signature-section">
    <div style="font-size: 10px; font-weight: 600; color: #334155; margin-bottom: 4px;">${L.certification}</div>
    <div style="font-size: 8px; color: #64748b; margin-bottom: 12px; overflow-wrap: break-word;">
      ${L.certificationDesc} ${expertReview && expertReview.status === 'completed' ? L.verifiedByExpert : L.pendingExpertVerification}.
      ${L.certificationDesc2}
    </div>
    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-name">${escapeHtml(generatedBy)}</div>
        <div class="signature-title">${expertReview && expertReview.status === 'completed' ? L.fdaComplianceExpert : L.veximAiSystem}</div>
        <div class="signature-title">${formatDate(generatedAt, lang)}</div>
      </div>
      <div class="signature-box">
        <div class="signature-name">${companyInfo.name}</div>
        <div class="signature-title">${L.certId}: ${companyInfo.certificationId}</div>
        <div class="signature-title">${companyInfo.website}</div>
      </div>
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    <div class="disclaimer-title">${L.disclaimer}</div>
    <p>${L.disclaimerText}</p>
  </div>

  <div class="page-footer">
    <div>${L.pageFooter} | ${companyInfo.name}</div>
    <div>${L.reportId}: ${escapeHtml(shortId)}</div>
  </div>
</div>

<div class="watermark">VEXIM</div>

</div><!-- End page-content-wrapper -->

</body>
</html>`
}
