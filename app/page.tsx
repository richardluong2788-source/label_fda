import PrintButton from "@/components/print-button"

export default function Page() {
  return (
    <>
      {/* Print button - hidden during actual printing */}
      <PrintButton />

      {/* Report content */}
      <div className="print-root font-sans text-[#1a1a1a] bg-white">

        {/* ── PAGE 1 ─────────────────────────────────────────────── */}
        <div className="page">
          {/* Page header stamp */}
          <div className="page-stamp">
            <span>21:52 6/3/26</span>
            <span>AI Label Pro – FDA Food Label Compliance Checker | by Vexim Global</span>
          </div>

          {/* Two-column layout */}
          <div className="two-col">
            {/* LEFT: Product Label Images + Product Info */}
            <div className="col-left">
              {/* Product Label Images */}
              <div className="card">
                <div className="card-header">
                  <span className="section-icon">⊞</span>
                  <span className="section-title">PRODUCT LABEL IMAGES</span>
                  <span className="badge-blue ml-auto">3 IMAGES</span>
                </div>
                <div className="product-image-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VIOz6QMJCif23pJKFkmGrETmqG0KJF.png"
                    alt="Dr. Berg Organic Beetroot Juice Powder label"
                    className="product-main-img"
                  />
                </div>
                <p className="img-caption">1 / 3 label images</p>
                <p className="img-hint">Bấm vào ảnh để phóng to</p>
              </div>

              {/* Product Info */}
              <div className="card mt-3">
                <div className="card-header">
                  <span className="section-icon">ⓘ</span>
                  <span className="section-title">PRODUCT INFO</span>
                </div>
                <div className="info-grid">
                  <div className="info-field">
                    <p className="field-label">BRAND</p>
                    <p className="field-value">Dr. Berg</p>
                  </div>
                  <div className="info-field">
                    <p className="field-label">PRODUCT NAME</p>
                    <p className="field-value text-[#e05c00]">ORGANIC BEETROOT JUICE POWDER</p>
                  </div>
                  <div className="info-field">
                    <p className="field-label">NET QUANTITY</p>
                    <p className="field-value">Net wt 3.18 oz (90 g)</p>
                  </div>

                  {/* Health Claims Warning */}
                  <div className="warning-box">
                    <p className="warning-title">HEALTH CLAIMS (WARNING)</p>
                    {[
                      "Promotes healthy blood flow",
                      "Supports nitric oxide production",
                      "Natural antioxidant",
                      "NO ARTIFICIAL FLAVORS",
                      "NO ARTIFICIAL SWEETENERS",
                      "NO ARTIFICIAL COLORS",
                      "NO ADDED SUGAR",
                      "NO PRESERVATIVES",
                      "SULFATE-FREE",
                      "ALLERGEN-FREE",
                    ].map((claim) => (
                      <p key={claim} className="warning-item">
                        <span className="warn-icon">⚠</span> {claim}
                      </p>
                    ))}
                  </div>

                  <div className="info-field">
                    <p className="field-label">DETECTED LANGUAGES</p>
                    <span className="lang-badge">🌐 ENGLISH</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Risk Level + Expert Insights + Overall Assessment */}
            <div className="col-right">
              {/* Risk Level Card */}
              <div className="card">
                <div className="risk-row">
                  <div className="risk-gauge">
                    <svg viewBox="0 0 80 80" width="72" height="72">
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="30" fill="none"
                        stroke="#f59e0b" strokeWidth="6"
                        strokeDasharray="75 115"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                      <text x="40" y="38" textAnchor="middle" fontSize="14" fontWeight="700" fill="#f59e0b">4.0</text>
                      <text x="40" y="52" textAnchor="middle" fontSize="7" fill="#6b7280">CURRENT</text>
                    </svg>
                  </div>
                  <div className="risk-info">
                    <p className="risk-label">Risk Level: <span className="risk-value">Medium-High</span></p>
                    <p className="risk-desc">Label has 1 warning(s) that need to be fixed before distribution.</p>
                  </div>
                  <div className="ocr-block">
                    <p className="ocr-label">OCR CONFIDENCE</p>
                    <p className="ocr-value">95%</p>
                    <div className="ocr-bar-track">
                      <div className="ocr-bar-fill" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expert Insights */}
              <div className="card mt-3">
                <div className="card-header">
                  <span className="section-icon">✦</span>
                  <span className="section-title">Expert Insights</span>
                </div>
                <p className="section-sub">Commercial summary and expert recommendations based on FDA data</p>

                <div className="commercial-box">
                  <p className="commercial-title">COMMERCIAL SUMMARY</p>
                  <p className="commercial-sub">BÁO CÁO KIỂM TRA NHÃN FDA - VEXIM GLOBAL</p>
                  <div className="canh-bao-row">
                    <span className="dot-orange" />
                    <span className="canh-bao-text">CẢNH BÁO (1)</span>
                  </div>
                  <p className="canh-bao-desc">Các lỗi về trình bày, nên sửa để tránh rủi ro:</p>
                  <p className="violation-heading">1. Health Claims</p>
                  <ul className="violation-list">
                    <li>Structure/function claims detected but required DSHEA disclaimer is missing</li>
                    <li>Add disclaimer: <em>"These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."</em></li>
                  </ul>
                </div>
              </div>

              {/* Overall Assessment */}
              <div className="card mt-3 overall-card">
                <div className="card-header">
                  <span className="section-icon text-[#f59e0b]">⚠</span>
                  <span className="section-title">OVERALL ASSESSMENT BY VEXIM GLOBAL</span>
                </div>

                <p className="field-label mt-2">REGULATIONS CHECKED</p>
                <div className="tags-row">
                  {["21 CFR 101 - Food Labeling", "21 CFR 701 - Cosmetic Labeling", "FD&C Act Section 403"].map(t => (
                    <span key={t} className="reg-tag">{t}</span>
                  ))}
                </div>

                <p className="field-label mt-3">FDA HISTORICAL DATA CHECK</p>
                <div className="fda-check-grid">
                  {[
                    { icon: "✉", label: "Warning Letters", value: "None" },
                    { icon: "↻", label: "Recalls", value: "None" },
                    { icon: "🛡", label: "Import Alerts", value: "None" },
                  ].map(item => (
                    <div key={item.label} className="fda-check-cell">
                      <p className="fda-check-label"><span>{item.icon}</span> {item.label}</p>
                      <p className="fda-check-value">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="conclusion-box">
                  <p className="conclusion-title">CONCLUSION</p>
                  <p className="conclusion-body">Product label has some areas for improvement.</p>
                  <p className="conclusion-detail">
                    Vexim AI found 1 warning(s) that should be reviewed to optimize compliance. No related Warning Letters, Recalls, or Import Alerts found in the FDA database. Recommendation: Review the warnings below to minimize FDA inspection risk.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="page-footer">
            <span>https://ailabelpro.com/audit/f9b7bbc6-8c1d-4706-bacd-14e2fc77df9e</span>
            <span>1/4</span>
          </div>
        </div>

        {/* ── PAGE 2 ─────────────────────────────────────────────── */}
        <div className="page">
          <div className="page-stamp">
            <span>21:52 6/3/26</span>
            <span>AI Label Pro – FDA Food Label Compliance Checker | by Vexim Global</span>
          </div>

          {/* CFR Compliance Details */}
          <div className="card">
            <div className="card-header">
              <span className="section-title">CFR COMPLIANCE DETAILS (21 CFR)</span>
            </div>

            <div className="cfr-violation-card">
              <div className="cfr-top-row">
                <div>
                  <p className="cfr-section-name">Health Claims</p>
                  <p className="cfr-ref">21 CFR 101.93(f)</p>
                </div>
                <div className="cfr-meta">
                  <span className="cfr-confidence">AI Confidence: 100%</span>
                  <span className="cfr-risk">Risk score: 4/10</span>
                  <span className="badge-warning">WARNING</span>
                </div>
              </div>

              <div className="cfr-detail-row">
                <div className="cfr-detail-block">
                  <p className="cfr-detail-label">CURRENT ON LABEL</p>
                  <p className="cfr-detail-value italic">"Structure/function claims detected but required DSHEA disclaimer is missing"</p>
                </div>
                <div className="cfr-detail-block">
                  <p className="cfr-detail-label">FIX GUIDANCE (VEXIM)</p>
                  <p className="cfr-detail-value">
                    Add disclaimer: <em>"These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."</em>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Nutrition Facts */}
          <div className="card mt-4">
            <div className="card-header">
              <span className="section-icon">🍽</span>
              <span className="section-title">NUTRITION FACTS</span>
              <span className="badge-blue ml-auto">4</span>
            </div>
            <div className="nf-table">
              <div className="nf-header-row">
                <span>NUTRITION FACTS</span>
              </div>
              {[
                { name: "Calories", value: "10kcal", highlight: false },
                { name: "Total Carbohydrate", value: "2g (1% DV)", highlight: true },
                { name: "Total Sugars", value: "2g", highlight: true },
                { name: "Beetroot juice powder (Beta vulgaris) (root)", value: "3g", highlight: false },
              ].map(row => (
                <div key={row.name} className={`nf-row ${row.highlight ? "nf-row-blue" : ""}`}>
                  <span>{row.name}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="page-footer">
            <span>https://ailabelpro.com/audit/f9b7bbc6-8c1d-4706-bacd-14e2fc77df9e</span>
            <span>2/4</span>
          </div>
        </div>

        {/* ── PAGE 3 ─────────────────────────────────────────────── */}
        <div className="page">
          <div className="page-stamp">
            <span>21:52 6/3/26</span>
            <span>AI Label Pro – FDA Food Label Compliance Checker | by Vexim Global</span>
          </div>

          {/* Vexim Expert Consultation */}
          <div className="card">
            <div className="card-header">
              <span className="section-title">Vexim Expert Consultation</span>
            </div>
            <p className="field-label mt-1">Request sent at 3/6/2026, 6:42:22 PM — Results available</p>

            <div className="expert-section mt-3">
              <p className="expert-section-title">Expert overview assessment</p>
              <p className="expert-body">
                Nhãn sản phẩm Organic Beetroot Juice Powder có chứa các tuyên bố về lợi ích sức khỏe nhưng thiếu câu miễn trừ theo quy định DSHEA. Điều này có thể dẫn đến việc sản phẩm bị phân loại nhầm thành dược phẩm. Cần bổ sung câu miễn trừ để đảm bảo tuân thủ quy định của FDA.
              </p>
            </div>

            <div className="expert-section mt-3">
              <p className="expert-section-title">Fix guidance per violation</p>
              <div className="violation-fix-box">
                <p className="violation-fix-label">Violation #2 — Confirmed - needs fix</p>
                <p className="violation-fix-sub">Suggested wording:</p>
                <p className="violation-fix-quote">
                  These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.
                </p>
                <p className="expert-body mt-2">
                  Qua rà soát nhãn, hệ thống phát hiện các tuyên bố về lợi ích sức khỏe như &apos;Promotes healthy blood flow; Supports nitric oxide production; Natural antioxidant&apos; mà không có câu miễn trừ DSHEA kèm theo. Theo quy định, các tuyên bố này bắt buộc phải đi kèm câu miễn trừ DSHEA để tránh bị FDA phân loại nhầm thành dược phẩm.
                </p>
              </div>
            </div>

            <div className="expert-section mt-3">
              <p className="expert-section-title">Priority actions</p>
              <div className="priority-box">
                <span className="priority-badge">Urgent</span>
                <p className="priority-action">Bổ sung câu miễn trừ DSHEA vào nhãn sản phẩm</p>
                <p className="priority-ref">(21 CFR 101.93)</p>
              </div>
            </div>

            <div className="signoff-row">
              <span>Signed off by <strong>Luong Van Hoc</strong> • 3/6/2026, 7:59:02 PM</span>
            </div>
          </div>

          <div className="page-footer">
            <span>https://ailabelpro.com/audit/f9b7bbc6-8c1d-4706-bacd-14e2fc77df9e</span>
            <span>3/4</span>
          </div>
        </div>

        {/* ── PAGE 4 ─────────────────────────────────────────────── */}
        <div className="page">
          <div className="page-stamp">
            <span>21:52 6/3/26</span>
            <span>AI Label Pro – FDA Food Label Compliance Checker | by Vexim Global</span>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="section-title">SUMMARY TABLE</span>
            </div>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Regulation</th>
                  <th>Status</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Health Claims</td>
                  <td>21 CFR 101.93(f)</td>
                  <td><span className="badge-warning-sm">WARNING</span></td>
                  <td>4/10</td>
                </tr>
                <tr>
                  <td>Food Labeling</td>
                  <td>21 CFR 101</td>
                  <td><span className="badge-ok">PASS</span></td>
                  <td>0/10</td>
                </tr>
                <tr>
                  <td>Cosmetic Labeling</td>
                  <td>21 CFR 701</td>
                  <td><span className="badge-ok">PASS</span></td>
                  <td>0/10</td>
                </tr>
                <tr>
                  <td>Misbranding</td>
                  <td>FD&amp;C Act Section 403</td>
                  <td><span className="badge-ok">PASS</span></td>
                  <td>0/10</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <span className="section-title">FDA HISTORICAL RECORDS</span>
            </div>
            <div className="fda-check-grid">
              {[
                { icon: "✉", label: "Warning Letters", value: "None" },
                { icon: "↻", label: "Recalls", value: "None" },
                { icon: "🛡", label: "Import Alerts", value: "None" },
              ].map(item => (
                <div key={item.label} className="fda-check-cell">
                  <p className="fda-check-label"><span>{item.icon}</span> {item.label}</p>
                  <p className="fda-check-value">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="report-footer-branding">
            <p className="footer-brand">AI Label Pro — FDA Food Label Compliance Checker</p>
            <p className="footer-sub">by Vexim Global · https://ailabelpro.com</p>
            <p className="footer-conf">This report is confidential and intended for the named recipient only.</p>
          </div>

          <div className="page-footer">
            <span>https://ailabelpro.com/audit/f9b7bbc6-8c1d-4706-bacd-14e2fc77df9e</span>
            <span>4/4</span>
          </div>
        </div>

      </div>

      <style>{`
        /* ── Reset & base ── */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Screen wrapper ── */
        .print-root {
          background: #d1d5db;
          min-height: 100vh;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        /* ── A4 page ── */
        .page {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          padding: 10mm 12mm 12mm;
          box-shadow: 0 2px 16px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          position: relative;
          font-size: 8.5pt;
          line-height: 1.45;
          overflow: hidden;
        }

        /* ── Stamp row at top ── */
        .page-stamp {
          display: flex;
          justify-content: space-between;
          font-size: 7pt;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }

        /* ── Two-column layout ── */
        .two-col {
          display: flex;
          gap: 10px;
          flex: 1;
        }
        .col-left  { width: 44%; display: flex; flex-direction: column; gap: 8px; }
        .col-right { flex: 1; display: flex; flex-direction: column; gap: 8px; }

        /* ── Cards ── */
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 10px;
          background: #fff;
        }
        .overall-card { background: #fffbeb; border-color: #fde68a; }

        .card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .section-icon { font-size: 10pt; color: #4f46e5; }
        .section-title { font-size: 8pt; font-weight: 700; letter-spacing: 0.03em; color: #111827; }
        .section-sub { font-size: 7pt; color: #6b7280; margin-top: -4px; margin-bottom: 6px; }

        /* ── Product image ── */
        .product-image-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 4px 0;
        }
        .product-main-img {
          width: 100%;
          max-height: 120px;
          object-fit: contain;
        }
        .img-caption { font-size: 7pt; color: #6b7280; text-align: center; margin-top: 2px; }
        .img-hint    { font-size: 6.5pt; color: #9ca3af; text-align: center; }

        /* ── Info fields ── */
        .info-grid    { display: flex; flex-direction: column; gap: 5px; }
        .info-field   {}
        .field-label  { font-size: 6.5pt; font-weight: 600; color: #6b7280; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 1px; }
        .field-value  { font-size: 8pt; font-weight: 600; color: #111827; }

        /* ── Warning box ── */
        .warning-box  { border: 1px solid #fca5a5; border-radius: 4px; padding: 6px 8px; background: #fff7f7; }
        .warning-title{ font-size: 7pt; font-weight: 700; color: #dc2626; letter-spacing: 0.04em; margin-bottom: 3px; }
        .warning-item { font-size: 7pt; color: #dc2626; line-height: 1.4; }
        .warn-icon    { font-size: 6pt; }

        /* ── Language badge ── */
        .lang-badge {
          display: inline-block;
          font-size: 7pt;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          padding: 1px 7px;
          margin-top: 2px;
        }

        /* ── Badge ── */
        .badge-blue {
          font-size: 6.5pt;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          border-radius: 3px;
          padding: 1px 5px;
        }
        .badge-warning {
          font-size: 7pt;
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
          border-radius: 3px;
          padding: 1px 6px;
          font-weight: 700;
        }
        .badge-warning-sm { font-size: 6.5pt; background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; border-radius:3px; padding:1px 5px; font-weight:700; }
        .badge-ok         { font-size: 6.5pt; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; border-radius:3px; padding:1px 5px; font-weight:700; }
        .ml-auto { margin-left: auto; }

        /* ── Risk row ── */
        .risk-row     { display: flex; align-items: center; gap: 10px; }
        .risk-gauge   { flex-shrink: 0; }
        .risk-info    { flex: 1; }
        .risk-label   { font-size: 8.5pt; font-weight: 600; color: #111827; }
        .risk-value   { color: #f59e0b; }
        .risk-desc    { font-size: 7pt; color: #6b7280; margin-top: 2px; }
        .ocr-block    { text-align: right; }
        .ocr-label    { font-size: 6.5pt; color: #6b7280; letter-spacing: 0.05em; }
        .ocr-value    { font-size: 14pt; font-weight: 700; color: #111827; }
        .ocr-bar-track{ height: 4px; width: 60px; background: #e5e7eb; border-radius: 2px; margin-top: 2px; margin-left: auto; }
        .ocr-bar-fill { height: 4px; width: 57px; background: #22c55e; border-radius: 2px; }

        /* ── Commercial box ── */
        .commercial-box   { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; }
        .commercial-title { font-size: 7pt; font-weight: 700; color: #2563eb; letter-spacing: 0.05em; margin-bottom: 2px; }
        .commercial-sub   { font-size: 8pt; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .canh-bao-row     { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
        .dot-orange       { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; flex-shrink: 0; }
        .canh-bao-text    { font-size: 7.5pt; font-weight: 700; color: #111827; }
        .canh-bao-desc    { font-size: 7pt; color: #374151; margin-bottom: 4px; }
        .violation-heading{ font-size: 7.5pt; font-weight: 700; color: #111827; margin-bottom: 2px; }
        .violation-list   { padding-left: 14px; }
        .violation-list li{ font-size: 7pt; color: #374151; margin-bottom: 2px; }

        /* ── Regulation tags ── */
        .tags-row  { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
        .reg-tag   { font-size: 6.5pt; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 3px; padding: 1px 5px; }

        /* ── FDA check grid ── */
        .fda-check-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-top: 4px; }
        .fda-check-cell { border: 1px solid #e5e7eb; border-radius: 4px; padding: 6px 8px; }
        .fda-check-label{ font-size: 7pt; color: #374151; margin-bottom: 2px; }
        .fda-check-value{ font-size: 8.5pt; font-weight: 700; color: #15803d; }

        /* ── Conclusion ── */
        .conclusion-box    { background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 7px 9px; margin-top: 6px; }
        .conclusion-title  { font-size: 7pt; font-weight: 700; letter-spacing: 0.05em; color: #92400e; margin-bottom: 2px; }
        .conclusion-body   { font-size: 7.5pt; font-weight: 600; color: #111827; margin-bottom: 2px; }
        .conclusion-detail { font-size: 7pt; color: #b45309; line-height: 1.5; }

        /* ── CFR violation card ── */
        .cfr-violation-card{ border: 1px solid #fed7aa; border-radius: 5px; padding: 8px 10px; background: #fff7ed; }
        .cfr-top-row       { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
        .cfr-section-name  { font-size: 9pt; font-weight: 700; color: #111827; }
        .cfr-ref           { font-size: 7pt; color: #6b7280; }
        .cfr-meta          { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .cfr-confidence    { font-size: 6.5pt; color: #6b7280; }
        .cfr-risk          { font-size: 6.5pt; color: #6b7280; }
        .cfr-detail-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cfr-detail-block  {}
        .cfr-detail-label  { font-size: 6.5pt; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 2px; }
        .cfr-detail-value  { font-size: 7.5pt; color: #374151; line-height: 1.5; }

        /* ── Nutrition Facts ── */
        .nf-table      { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
        .nf-header-row { background: #111827; color: #fff; font-size: 7.5pt; font-weight: 700; padding: 4px 8px; }
        .nf-row        { display: flex; justify-content: space-between; padding: 3px 8px; font-size: 7.5pt; color: #374151; border-top: 1px solid #e5e7eb; }
        .nf-row-blue   { color: #2563eb; }

        /* ── Expert consultation ── */
        .expert-section      {}
        .expert-section-title{ font-size: 8pt; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .expert-body         { font-size: 7.5pt; color: #374151; line-height: 1.55; }

        /* ── Violation fix ── */
        .violation-fix-box   { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; background: #f9fafb; }
        .violation-fix-label { font-size: 7.5pt; font-weight: 700; color: #dc2626; margin-bottom: 3px; }
        .violation-fix-sub   { font-size: 7pt; color: #6b7280; margin-bottom: 2px; }
        .violation-fix-quote { font-size: 7.5pt; font-style: italic; color: #111827; border-left: 3px solid #3b82f6; padding-left: 8px; margin-bottom: 4px; }

        /* ── Priority ── */
        .priority-box    { border: 1px solid #fca5a5; border-radius: 4px; padding: 7px 10px; background: #fff7f7; display: flex; align-items: flex-start; gap: 8px; }
        .priority-badge  { font-size: 6.5pt; background: #dc2626; color: #fff; border-radius: 3px; padding: 1px 6px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
        .priority-action { font-size: 8pt; font-weight: 600; color: #111827; }
        .priority-ref    { font-size: 7pt; color: #6b7280; }

        /* ── Sign-off ── */
        .signoff-row { font-size: 7pt; color: #6b7280; margin-top: 10px; padding-top: 6px; border-top: 1px solid #e5e7eb; }

        /* ── Summary table ── */
        .summary-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
        .summary-table th { background: #f3f4f6; padding: 5px 8px; text-align: left; font-weight: 700; color: #374151; border: 1px solid #e5e7eb; }
        .summary-table td { padding: 5px 8px; border: 1px solid #e5e7eb; color: #374151; }

        /* ── Report footer branding ── */
        .report-footer-branding { margin-top: auto; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer-brand { font-size: 8pt; font-weight: 700; color: #111827; }
        .footer-sub   { font-size: 7pt; color: #6b7280; margin-top: 1px; }
        .footer-conf  { font-size: 6.5pt; color: #9ca3af; margin-top: 4px; font-style: italic; }

        /* ── Page footer ── */
        .page-footer {
          display: flex;
          justify-content: space-between;
          font-size: 6.5pt;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 4px;
          margin-top: 8px;
        }

        .mt-2 { margin-top: 6px; }
        .mt-3 { margin-top: 8px; }
        .mt-4 { margin-top: 12px; }
        .italic { font-style: italic; }

        /* ── Print media ── */
        @media print {
          body, html { background: #fff !important; }
          .print-btn-wrapper { display: none !important; }
          .print-root {
            background: #fff !important;
            padding: 0 !important;
            gap: 0 !important;
          }
          .page {
            box-shadow: none !important;
            page-break-after: always;
            page-break-inside: avoid;
            margin: 0 !important;
          }
          .page:last-child { page-break-after: auto; }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </>
  )
}
