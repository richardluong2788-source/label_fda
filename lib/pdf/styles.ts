// ── PDF CSS Styles ────────────────────────────────────────────────────
// Extracted from the main generator for maintainability

export const pdfStyles = `
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
  .content-page { padding: 12mm 15mm; position: relative; }
  .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
  .page-header-left { display: flex; align-items: center; gap: 8px; }
  .page-header-logo { width: 28px; height: 28px; background: #1e40af; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: white; }
  .page-header-brand { font-size: 12px; font-weight: 700; color: #1e40af; }
  .page-header-right { font-size: 9px; color: #64748b; text-align: right; }
  .page-footer { position: absolute; bottom: 8mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; font-size: 7px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }

  /* Sections */
  .section { margin-bottom: 18px; }
  .section-title { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #1e40af; display: flex; align-items: center; gap: 8px; }
  .section-number { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: #1e40af; color: white; font-size: 10px; font-weight: 700; border-radius: 6px; }
  .subsection-title { font-size: 10px; font-weight: 600; color: #334155; margin: 12px 0 8px; display: flex; align-items: center; gap: 6px; }

  /* Risk score */
  .risk-score-box { display: flex; align-items: center; gap: 16px; padding: 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px; }
  .risk-score-circle { width: 70px; height: 70px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: 700; }
  .risk-score-value { font-size: 20px; line-height: 1; }
  .risk-score-label { font-size: 8px; opacity: 0.9; margin-top: 2px; }
  .risk-score-details { flex: 1; }
  .risk-level-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 9px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
  .risk-description { font-size: 9px; color: #475569; line-height: 1.5; overflow-wrap: break-word; }

  /* Summary stats */
  .summary-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
  .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-value { font-size: 18px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .stat-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Info grid */
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .info-item { padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; overflow: hidden; }
  .info-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .info-value { font-size: 10px; font-weight: 600; color: #0f172a; overflow-wrap: break-word; }
  .info-item.full-width { grid-column: 1 / -1; }

  /* Violation cards */
  .violation-card { background: white; border-radius: 10px; padding: 14px; margin-bottom: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); page-break-inside: avoid; overflow: hidden; }
  .violation-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
  .severity-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 8px; font-weight: 700; text-transform: uppercase; }
  .violation-title { font-size: 11px; font-weight: 600; color: #0f172a; flex: 1; overflow-wrap: break-word; }
  .violation-meta { display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
  .violation-meta-item { font-size: 8px; color: #64748b; display: flex; align-items: center; gap: 4px; }
  .violation-content { font-size: 9px; color: #475569; line-height: 1.6; margin-bottom: 8px; overflow-wrap: break-word; }
  .violation-fix { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin-top: 8px; overflow: hidden; }
  .violation-fix-label { font-size: 8px; font-weight: 700; color: #166534; margin-bottom: 4px; text-transform: uppercase; }
  .violation-fix-content { font-size: 9px; color: #166534; line-height: 1.6; overflow-wrap: break-word; }

  /* Citations table */
  .citations-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-top: 8px; table-layout: fixed; }
  .citations-table th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; }
  .citations-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; color: #475569; overflow-wrap: break-word; word-break: break-word; }
  .citations-table tr:last-child td { border-bottom: none; }

  /* Import alerts */
  .import-alert-card { background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); border: 1px solid #fecaca; border-radius: 10px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid; overflow: hidden; }
  .import-alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .import-alert-badge { background: #dc2626; color: white; padding: 4px 10px; border-radius: 6px; font-size: 8px; font-weight: 700; }
  .import-alert-title { font-size: 11px; font-weight: 600; color: #991b1b; flex: 1; overflow-wrap: break-word; }

  /* Technical checks */
  .tech-check-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px; background: #f8fafc; border-radius: 6px; margin-bottom: 6px; border: 1px solid #e2e8f0; }
  .tech-check-icon { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
  .tech-check-content { flex: 1; overflow: hidden; }
  .tech-check-label { font-size: 9px; font-weight: 600; color: #334155; overflow-wrap: break-word; }
  .tech-check-value { font-size: 8px; color: #64748b; overflow-wrap: break-word; }

  /* Commercial summary */
  .commercial-box { background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-bottom: 16px; overflow: hidden; }
  .commercial-title { font-size: 11px; font-weight: 700; color: #1e40af; margin-bottom: 10px; }
  .commercial-content { font-size: 10px; color: #334155; line-height: 1.7; overflow-wrap: break-word; }

  /* Expert tip */
  .expert-tip { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin-bottom: 12px; overflow: hidden; }
  .expert-tip-label { font-size: 8px; font-weight: 700; color: #166534; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .expert-tip-content { font-size: 9px; color: #166534; line-height: 1.6; overflow-wrap: break-word; }

  /* Port warning */
  .port-warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin-bottom: 12px; overflow: hidden; }
  .port-warning-label { font-size: 8px; font-weight: 700; color: #92400e; margin-bottom: 4px; text-transform: uppercase; }
  .port-warning-content { font-size: 9px; color: #78350f; line-height: 1.6; overflow-wrap: break-word; }

  /* Action table rows */
  .action-row-critical { background: #fef2f2; }
  .action-row-warning { background: #fffbeb; }
  .action-row-info { background: #eff6ff; }

  /* Signature section */
  .signature-section { margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; }
  .signature-box { padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; }
  .signature-name { font-size: 11px; font-weight: 600; color: #0f172a; margin-bottom: 4px; overflow-wrap: break-word; }
  .signature-title { font-size: 8px; color: #64748b; overflow-wrap: break-word; }

  /* Verification badge */
  .verification-badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; font-size: 11px; font-weight: 600; }
  .verification-badge.verified { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .verification-badge.pending { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }

  /* Disclaimer */
  .disclaimer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 16px; }
  .disclaimer-title { font-size: 9px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; }
  .disclaimer p { font-size: 7px; color: #64748b; line-height: 1.6; overflow-wrap: break-word; }

  /* Watermark */
  .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 60px; font-weight: 800; color: rgba(30, 64, 175, 0.03); transform: rotate(-15deg); pointer-events: none; z-index: 0; }

  /* TOC */
  .toc-item { display: flex; align-items: center; padding: 6px 0; border-bottom: 1px dotted #e2e8f0; }
  .toc-num { width: 28px; height: 28px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #1e40af; margin-right: 10px; }
  .toc-label { font-size: 10px; color: #334155; flex: 1; }

  /* Consequences banner */
  .consequences-banner { background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); border: 1px solid #fecaca; border-radius: 10px; padding: 14px; margin: 12px 0; }
  .consequences-title { font-size: 9px; font-weight: 700; color: #991b1b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .consequences-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .consequence-item { background: white; border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #fecaca; }
  .consequence-icon { font-size: 16px; margin-bottom: 4px; }
  .consequence-label { font-size: 8px; font-weight: 600; color: #991b1b; margin-bottom: 2px; }
  .consequence-desc { font-size: 7px; color: #78350f; }

  /* Product images grid */
  .product-images-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
  .product-image-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center; }
  .product-image-img { width: 100%; height: 120px; object-fit: contain; border-radius: 4px; margin-bottom: 6px; background: white; }
  .product-image-label { font-size: 8px; color: #64748b; }
`
