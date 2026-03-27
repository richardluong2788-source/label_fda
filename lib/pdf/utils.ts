import type { SupportedLang, PDFLabels } from './types'

// ── HTML Escape ───────────────────────────────────────────────────────
export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Nutrient Value Formatting ─────────────────────────────────────────
/**
 * Formats a nutrition field value for display in the PDF.
 * Handles merged OCR strings like "0mg0", "11g14", "0.1mcg0"
 * Returns clean HTML like "11g <span>(14%)</span>"
 */
export function formatNutrientValue(rawValue: any): string {
  if (rawValue == null) return '—'
  const str = String(rawValue)
  // Pattern: number + unit + number (merged DV) e.g. "0g0", "11g14", "630mg27"
  const mergedMatch = str.match(/^(\d+(?:\.\d+)?)\s*(mg|g|mcg|kcal|cal)\s*(\d+)$/i)
  if (mergedMatch) {
    const [, val, unit, dv] = mergedMatch
    return dv === '0'
      ? `${val}${unit} <span style="color:#94a3b8;font-size:8px;">(0%)</span>`
      : `${val}${unit} <span style="color:#94a3b8;font-size:8px;">(${dv}%)</span>`
  }
  return escapeHtml(str)
}

// ── Markdown to HTML ──────────────────────────────────────────────────
/** Convert markdown text to styled HTML. Handles ## / ### headings, **bold**, *italic*, - bullets, 1. numbered lists. */
export function markdownToHtml(md: string | undefined | null): string {
  if (!md) return ''
  const lines = md.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  const inlineFmt = (t: string): string => {
    let s = escapeHtml(t)
    // **bold**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // *italic*
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
    return s
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { closeList(); continue }

    // ### subheading
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) {
      closeList()
      const txt = h3[1].replace(/#+$/, '').trim()
      // Detect severity for color coding
      let style = 'color:#334155;'
      if (/NGHIÊM TRỌNG|CRITICAL|LỖI NGHIÊM TRỌNG/i.test(txt)) style = 'color:#991B1B;background:#FEE2E2;border:1px solid #F87171;border-radius:6px;padding:6px 10px;'
      else if (/CẢNH BÁO|WARNING/i.test(txt)) style = 'color:#92400E;background:#FEF3C7;border:1px solid #FBBF24;border-radius:6px;padding:6px 10px;'
      else if (/THÔNG TIN|INFO/i.test(txt)) style = 'color:#1E40AF;background:#DBEAFE;border:1px solid #60A5FA;border-radius:6px;padding:6px 10px;'
      else if (/LỜI KHUYÊN|ADVICE|KHUYẾN NGHỊ|RECOMMENDATION/i.test(txt)) style = 'color:#065F46;background:#D1FAE5;border:1px solid #34D399;border-radius:6px;padding:6px 10px;'
      out.push(`<div style="font-size:11px;font-weight:600;margin:12px 0 6px;${style}">${inlineFmt(txt)}</div>`)
      continue
    }

    // ## heading
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      closeList()
      out.push(`<div style="font-size:12px;font-weight:700;color:#0f172a;margin:14px 0 6px;">${inlineFmt(h2[1].replace(/#+$/, '').trim())}</div>`)
      continue
    }

    // # heading
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) {
      closeList()
      out.push(`<div style="font-size:13px;font-weight:700;color:#0f172a;margin:14px 0 6px;">${inlineFmt(h1[1].replace(/#+$/, '').trim())}</div>`)
      continue
    }

    // - bullet
    const ul = line.match(/^[-*]\s+(.+)/)
    if (ul) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul style="margin:4px 0 4px 16px;padding:0;list-style:disc;">'); inUl = true }
      out.push(`<li style="font-size:10px;color:#475569;line-height:1.6;margin-bottom:2px;">${inlineFmt(ul[1])}</li>`)
      continue
    }

    // 1. numbered
    const ol = line.match(/^\d+[.)]\s+(.+)/)
    if (ol) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol style="margin:4px 0 4px 16px;padding:0;list-style:decimal;">'); inOl = true }
      out.push(`<li style="font-size:10px;color:#475569;line-height:1.6;margin-bottom:2px;">${inlineFmt(ol[1])}</li>`)
      continue
    }

    // Regular paragraph
    closeList()
    out.push(`<div style="font-size:10px;color:#475569;line-height:1.6;margin-bottom:4px;">${inlineFmt(line)}</div>`)
  }
  closeList()
  return out.join('\n')
}

// ── Date Formatting ───────────────────────────────────────────────────
export function formatDate(dateStr: string, lang: SupportedLang): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Severity Colors ───────────────────────────────────────────────────
export function getSeverityColor(severity: string): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'critical':
      return { bg: '#FEE2E2', text: '#991B1B', border: '#F87171' }
    case 'warning':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FBBF24' }
    case 'info':
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#60A5FA' }
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' }
  }
}

// ── Risk Colors ───────────────────────────────────────────────────────
export function getRiskColor(score: number): string {
  if (score >= 7) return '#DC2626'
  if (score >= 4) return '#F59E0B'
  return '#16A34A'
}

export function getRiskLabel(score: number, L: PDFLabels): string {
  if (score >= 8) return L.riskHigh
  if (score >= 6) return L.riskMedHigh
  if (score >= 4) return L.riskMed
  return L.riskLow
}

// ── Severity Label ────────────────────────────────────────────────────
export function getSeverityLabel(severity: string, L: PDFLabels): string {
  switch (severity) {
    case 'critical': return L.sevCritical
    case 'warning': return L.sevWarning
    case 'info': return L.sevInfo
    default: return severity.toUpperCase()
  }
}

// ── Category Translation ──────────────────────────────────────────────
export function translateCategory(category: string, L: PDFLabels): string {
  const map: Record<string, string> = {
    'Health Claims': L.catHealthClaims,
    'Ingredient Order': L.catIngredientOrder,
    'Ingredient Listing': L.catIngredientListing,
    'Nutrition Facts': L.catNutritionFacts,
    'Allergen Declaration': L.catAllergenDeclaration,
    'Net Content': L.catNetContent,
    'Country of Origin': L.catCountryOfOrigin,
    'Manufacturer Info': L.catManufacturerInfo,
    'Font Size': L.catFontSize,
    'Label Prominence': L.catLabelProminence,
    'Color Contrast': L.catColorContrast,
    'Language Requirements': L.catLangRequirements,
    'Missing Required Statement': L.catMissingStatement,
    'Prohibited Claims': L.catProhibitedClaims,
    'Drug Claims': L.catDrugClaims,
    'Disease Claims': L.catDiseaseClaims,
    'Structure/Function Claims': L.catStructureClaims,
    'Nutrient Content Claims': L.catNutrientClaims,
    'Serving Size': L.catServingSize,
    'Daily Value': L.catDailyValue,
    'Barcode Issues': L.catBarcodeIssues,
    'Packaging Compliance': L.catPackagingCompliance,
    'Import Alert Match': L.catImportAlertMatch,
    'Warning Letter Citation': L.catWarningLetterCitation,
    'Recall Association': L.catRecallAssociation,
  }
  return map[category] || category
}

// ── Confidence Bar ────────────────────────────────────────────────────
export function confidenceBar(label: string, value: number | undefined | null): string {
  if (value === undefined || value === null) return ''
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#f59e0b' : '#dc2626'
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="font-size:9px;color:#64748b;min-width:120px;">${label}</div>
      <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div>
      </div>
      <div style="font-size:9px;font-weight:600;min-width:32px;text-align:right;color:${color};">${pct}%</div>
    </div>`
}

// ── Image Type Translation ────────────────────────────────────────────
export function translateImageType(type: string, L: PDFLabels): string {
  const map: Record<string, string> = {
    pdp: L.imageTypePdp,
    nutrition: L.imageTypeNutrition,
    ingredients: L.imageTypeIngredients,
    other: L.imageTypeOther,
  }
  return map[type] || L.imageTypeOther
}

// ── Page Header ───────────────────────────────────────────────────────
export function pageHeader(L: PDFLabels, reportId: string, dateStr: string): string {
  return `
  <div class="page-header">
    <div class="page-header-left">
      <div class="page-header-logo">V</div>
      <div class="page-header-brand">VEXIM Compliance AI</div>
    </div>
    <div class="page-header-right">
      ${L.reportId} ${escapeHtml(reportId)}<br/>${dateStr}
    </div>
  </div>`
}
