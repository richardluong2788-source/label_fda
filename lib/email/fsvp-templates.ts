import { emailLayout, button, badge, divider, infoRow } from './layout'
import { APP_URL } from './client'

type Lang = 'vi' | 'en'

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER PORTAL DOCUMENT REQUEST EMAIL
// ─────────────────────────────────────────────────────────────────────────────
export function supplierPortalRequestTemplate({
  supplierEmail,
  supplierName,
  importerCompany,
  productName,
  requestedDocuments,
  dueDate,
  notes,
  portalUrl,
  priority,
  lang = 'en',
}: {
  supplierEmail: string
  supplierName?: string
  importerCompany: string
  productName: string
  requestedDocuments: string[]
  dueDate?: string
  notes?: string
  portalUrl: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  lang?: Lang
}) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return lang === 'vi' ? 'Không giới hạn' : 'No deadline'
    return new Date(dateStr).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const docTypeLabels: Record<string, { en: string; vi: string }> = {
    haccp_plan: { en: 'HACCP Plan', vi: 'Kế hoạch HACCP' },
    food_safety_cert: { en: 'Food Safety Certificate', vi: 'Chứng chỉ An toàn Thực phẩm' },
    audit_report: { en: 'Third-Party Audit Report', vi: 'Báo cáo Audit bên thứ ba' },
    allergen_control: { en: 'Allergen Control Plan', vi: 'Kế hoạch Kiểm soát Dị ứng' },
    spec_sheet: { en: 'Product Specification Sheet', vi: 'Bảng Thông số Sản phẩm' },
    coa: { en: 'Certificate of Analysis', vi: 'Giấy Chứng nhận Phân tích' },
    supplier_questionnaire: { en: 'Supplier Questionnaire', vi: 'Bảng câu hỏi Nhà cung cấp' },
    insurance_cert: { en: 'Insurance Certificate', vi: 'Chứng chỉ Bảo hiểm' },
    export_license: { en: 'Export License', vi: 'Giấy phép Xuất khẩu' },
    lab_test: { en: 'Lab Test Results', vi: 'Kết quả Xét nghiệm' },
    process_flow: { en: 'Process Flow Diagram', vi: 'Sơ đồ Quy trình' },
    other: { en: 'Other Document', vi: 'Tài liệu khác' },
  }

  const getDocLabel = (docType: string) => {
    return docTypeLabels[docType]?.[lang] || docType
  }

  const getPriorityBadge = () => {
    switch (priority) {
      case 'urgent': return badge(lang === 'vi' ? 'Khẩn cấp' : 'Urgent', 'red')
      case 'high': return badge(lang === 'vi' ? 'Cao' : 'High Priority', 'orange')
      case 'normal': return badge(lang === 'vi' ? 'Bình thường' : 'Normal', 'blue')
      case 'low': return badge(lang === 'vi' ? 'Thấp' : 'Low Priority', 'gray')
      default: return badge('Normal', 'blue')
    }
  }

  const t = {
    en: {
      subject: priority === 'urgent' 
        ? `URGENT: Document Request for ${productName} from ${importerCompany}`
        : `Document Request for ${productName} from ${importerCompany}`,
      preview: `${importerCompany} has requested documents for ${productName}. Please upload via the secure portal.`,
      greeting: supplierName ? `Dear ${supplierName},` : 'Dear Supplier,',
      heading: 'Document Request',
      p1: `<strong>${importerCompany}</strong> has sent you a document request for FDA FSVP compliance verification.`,
      productLabel: 'Product',
      deadlineLabel: 'Deadline',
      requestedDocs: 'Requested Documents',
      notesLabel: 'Additional Notes',
      ctaTitle: 'Upload Your Documents',
      ctaDesc: 'Click the button below to access the secure upload portal. You can sign in or continue as a guest.',
      cta: 'Open Document Portal',
      securityNote: 'This is a secure link generated specifically for you. Please do not share this link.',
      helpText: 'If you have questions about this request, please contact the importer directly.',
      footer: 'This email was sent via VeXIM FDA Compliance Platform.',
    },
    vi: {
      subject: priority === 'urgent'
        ? `KHẨN CẤP: Yêu cầu Tài liệu cho ${productName} từ ${importerCompany}`
        : `Yêu cầu Tài liệu cho ${productName} từ ${importerCompany}`,
      preview: `${importerCompany} đã yêu cầu tài liệu cho ${productName}. Vui lòng tải lên qua cổng bảo mật.`,
      greeting: supplierName ? `Kính gửi ${supplierName},` : 'Kính gửi Nhà cung cấp,',
      heading: 'Yêu cầu Tài liệu',
      p1: `<strong>${importerCompany}</strong> đã gửi cho bạn yêu cầu tài liệu để xác minh tuân thủ FDA FSVP.`,
      productLabel: 'Sản phẩm',
      deadlineLabel: 'Thời hạn',
      requestedDocs: 'Tài liệu yêu cầu',
      notesLabel: 'Ghi chú bổ sung',
      ctaTitle: 'Tải lên Tài liệu',
      ctaDesc: 'Nhấn nút bên dưới để truy cập cổng tải lên bảo mật. Bạn có thể đăng nhập hoặc tiếp tục với tư cách khách.',
      cta: 'Mở Cổng Tài liệu',
      securityNote: 'Đây là liên kết bảo mật được tạo riêng cho bạn. Vui lòng không chia sẻ liên kết này.',
      helpText: 'Nếu bạn có câu hỏi về yêu cầu này, vui lòng liên hệ trực tiếp với nhà nhập khẩu.',
      footer: 'Email này được gửi qua Nền tảng Tuân thủ FDA VeXIM.',
    },
  }[lang]

  const documentsHtml = requestedDocuments.map(doc => `
    <li style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
      <span style="color:#0f172a;font-weight:500;">${getDocLabel(doc)}</span>
    </li>
  `).join('')

  const body = /* html */ `
    <div style="margin-bottom:20px;">
      ${badge(lang === 'vi' ? 'Yêu cầu Tài liệu FSVP' : 'FSVP Document Request', 'blue')}
      ${getPriorityBadge()}
    </div>
    
    <p style="margin:0 0 20px;color:#334155;font-size:15px;">${t.greeting}</p>
    
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
      ${infoRow(t.productLabel, productName)}
      ${infoRow(t.deadlineLabel, formatDate(dueDate))}
    </div>

    <div style="margin-bottom:20px;">
      <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">${t.requestedDocs}:</p>
      <ul style="margin:0;padding:0;list-style:none;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
        ${documentsHtml}
      </ul>
    </div>

    ${notes ? `
    <div style="margin-bottom:20px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;">
      <p style="margin:0 0 8px;color:#92400e;font-size:13px;font-weight:600;">${t.notesLabel}:</p>
      <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">${notes}</p>
    </div>
    ` : ''}

    <div style="margin-bottom:24px;padding:20px;background:#eff6ff;border-radius:8px;text-align:center;">
      <p style="margin:0 0 8px;color:#1e40af;font-size:14px;font-weight:600;">${t.ctaTitle}</p>
      <p style="margin:0 0 16px;color:#3b82f6;font-size:13px;">${t.ctaDesc}</p>
      ${button(t.cta, portalUrl)}
    </div>

    <div style="padding:12px 16px;background:#fef2f2;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#991b1b;font-size:12px;">
        🔒 ${t.securityNote}
      </p>
    </div>

    <p style="margin:0;color:#64748b;font-size:13px;">${t.helpText}</p>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER PORTAL EMAIL VERIFICATION CODE
// ─────────────────────────────────────────────────────────────────────────────
export function supplierPortalVerificationTemplate({
  email,
  code,
  productName,
  importerCompany,
  lang = 'en',
}: {
  email: string
  code: string
  productName: string
  importerCompany: string
  lang?: Lang
}) {
  const t = {
    en: {
      subject: `Your Verification Code: ${code}`,
      preview: `Use this code to access the document request for ${productName}.`,
      heading: 'Verify Your Email',
      p1: `Enter the code below to access the document request from <strong>${importerCompany}</strong> for <strong>${productName}</strong>.`,
      codeLabel: 'Your Verification Code',
      expiryNote: 'This code expires in 15 minutes.',
      securityNote: 'If you did not request this code, please ignore this email.',
    },
    vi: {
      subject: `Mã Xác minh của bạn: ${code}`,
      preview: `Sử dụng mã này để truy cập yêu cầu tài liệu cho ${productName}.`,
      heading: 'Xác minh Email',
      p1: `Nhập mã bên dưới để truy cập yêu cầu tài liệu từ <strong>${importerCompany}</strong> cho <strong>${productName}</strong>.`,
      codeLabel: 'Mã Xác minh',
      expiryNote: 'Mã này hết hạn sau 15 phút.',
      securityNote: 'Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.',
    },
  }[lang]

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Xác minh' : 'Verification', 'blue')}</div>
    
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;">${t.codeLabel}:</p>
      <div style="display:inline-block;padding:16px 32px;background:#0f172a;border-radius:8px;">
        <span style="font-family:monospace;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:8px;">${code}</span>
      </div>
      <p style="margin:12px 0 0;color:#64748b;font-size:12px;">${t.expiryNote}</p>
    </div>

    <div style="padding:12px 16px;background:#f8fafc;border-radius:8px;">
      <p style="margin:0;color:#64748b;font-size:12px;">
        ${t.securityNote}
      </p>
    </div>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

interface SupplierAlert {
  name: string
  country: string
  dueDate: string | null
  isSAHCODHA?: boolean
}

interface AuditSupplierAlert {
  name: string
  country: string
  dueDate: string | null
  hazards: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FSVP VERIFICATION/DOCUMENT EXPIRY ALERT
// ─────────────────────────────────────────────────────────────────────────────
export function fsvpExpiryAlertTemplate({
  email,
  suppliers,
  alertType,
  lang = 'en',
}: {
  email: string
  suppliers: SupplierAlert[]
  alertType: 'verification' | 'document'
  lang?: Lang
}) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const daysUntil = (dateStr: string | null) => {
    if (!dateStr) return 0
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const t = {
    en: {
      subject: alertType === 'verification' 
        ? `FSVP Alert: ${suppliers.length} Supplier Verification(s) Due Soon`
        : `FSVP Alert: ${suppliers.length} Document(s) Expiring Soon`,
      preview: `Action required: Your FSVP ${alertType === 'verification' ? 'verifications' : 'documents'} are expiring within 30 days.`,
      heading: alertType === 'verification'
        ? 'Supplier Verification Due Soon'
        : 'FSVP Documents Expiring Soon',
      p1: alertType === 'verification'
        ? `The following supplier verification(s) are due within the next 30 days. Per 21 CFR 1.506, you must re-evaluate your foreign suppliers periodically.`
        : `The following FSVP document(s) are expiring within the next 30 days. Expired documents may result in compliance gaps.`,
      tableHeaders: {
        supplier: alertType === 'verification' ? 'Supplier' : 'Document',
        country: alertType === 'verification' ? 'Country' : 'Supplier',
        dueDate: 'Expiry Date',
        daysLeft: 'Days Left',
        risk: 'Risk Level',
      },
      urgentWarning: 'SAHCODHA Product - Annual Audit Required',
      cta: 'Review FSVP Records',
      regulation: 'Reference: 21 CFR Part 1, Subpart L (Foreign Supplier Verification Programs)',
      footer: 'This automated alert helps you maintain FDA FSVP compliance. Failure to complete verifications on time may result in regulatory action.',
    },
    vi: {
      subject: alertType === 'verification'
        ? `FSVP: ${suppliers.length} Supplier cần xác minh sắp đến hạn`
        : `FSVP: ${suppliers.length} Tài liệu sắp hết hạn`,
      preview: `Cần xử lý: ${alertType === 'verification' ? 'Xác minh supplier' : 'Tài liệu FSVP'} sắp hết hạn trong 30 ngày.`,
      heading: alertType === 'verification'
        ? 'Xác minh Supplier sắp đến hạn'
        : 'Tài liệu FSVP sắp hết hạn',
      p1: alertType === 'verification'
        ? `Các supplier dưới đây cần được xác minh lại trong vòng 30 ngày tới. Theo 21 CFR 1.506, bạn phải định kỳ đánh giá lại nhà cung cấp nước ngoài.`
        : `Các tài liệu FSVP dưới đây sắp hết hạn trong 30 ngày tới. Tài liệu hết hạn có thể gây ra lỗ hổng tuân thủ.`,
      tableHeaders: {
        supplier: alertType === 'verification' ? 'Nhà cung cấp' : 'Tài liệu',
        country: alertType === 'verification' ? 'Quốc gia' : 'Nhà cung cấp',
        dueDate: 'Ngày hết hạn',
        daysLeft: 'Còn lại',
        risk: 'Mức rủi ro',
      },
      urgentWarning: 'Sản phẩm SAHCODHA - Yêu cầu Audit hàng năm',
      cta: 'Xem hồ sơ FSVP',
      regulation: 'Tham chiếu: 21 CFR Part 1, Subpart L (Foreign Supplier Verification Programs)',
      footer: 'Cảnh báo tự động này giúp bạn duy trì tuân thủ FDA FSVP. Không hoàn thành xác minh đúng hạn có thể dẫn đến hành động pháp lý.',
    },
  }[lang]

  const getRiskBadge = (days: number, isSAHCODHA?: boolean) => {
    if (isSAHCODHA) return badge('SAHCODHA', 'red')
    if (days <= 7) return badge(lang === 'vi' ? 'Khẩn cấp' : 'Urgent', 'red')
    if (days <= 14) return badge(lang === 'vi' ? 'Cao' : 'High', 'orange')
    return badge(lang === 'vi' ? 'Sắp đến hạn' : 'Due Soon', 'yellow')
  }

  const supplierRows = suppliers.map(s => {
    const days = daysUntil(s.dueDate)
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:500;">${s.name}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${s.country}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;">${formatDate(s.dueDate)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:${days <= 7 ? '#dc2626' : '#334155'};font-weight:${days <= 7 ? '700' : '400'};">${days} ${lang === 'vi' ? 'ngày' : 'days'}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${getRiskBadge(days, s.isSAHCODHA)}</td>
      </tr>
    `
  }).join('')

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Cảnh báo FSVP' : 'FSVP Alert', 'orange')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="overflow-x:auto;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width:500px;background:#f8fafc;border-radius:8px;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t.tableHeaders.supplier}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t.tableHeaders.country}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t.tableHeaders.dueDate}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t.tableHeaders.daysLeft}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;">${t.tableHeaders.risk}</th>
          </tr>
        </thead>
        <tbody>
          ${supplierRows}
        </tbody>
      </table>
    </div>

    ${button(t.cta, `${APP_URL}/dashboard/fsvp-supplier`)}

    <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;">
      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
        <strong>⚠️ ${t.regulation}</strong><br/>
        ${t.footer}
      </p>
    </div>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FSVP ANNUAL AUDIT DUE ALERT (SAHCODHA)
// ─────────────────────────────────────────────────────────────────────────────
export function fsvpAuditDueTemplate({
  email,
  suppliers,
  lang = 'en',
}: {
  email: string
  suppliers: AuditSupplierAlert[]
  lang?: Lang
}) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const daysUntil = (dateStr: string | null) => {
    if (!dateStr) return 0
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const t = {
    en: {
      subject: `URGENT: ${suppliers.length} SAHCODHA Annual Audit(s) Due Within 30 Days`,
      preview: 'SAHCODHA products require annual on-site audits. Action required immediately.',
      heading: 'SAHCODHA Annual Audit Due',
      p1: `The following suppliers provide SAHCODHA (high-risk) products and require <strong>annual on-site audits</strong> per 21 CFR 1.506(d)(1). These audits are <strong>MANDATORY</strong> - failure to complete them may result in FDA enforcement action.`,
      sahcodhaExplain: 'SAHCODHA = Sprouts, Aquatic Animals (Seafood), Heat-treated acidified foods, Cheeses (soft-ripened), Other foods requiring time/temp control, Deli-type salads, Hot-held items, Acidified foods',
      tableHeaders: {
        supplier: 'Supplier',
        country: 'Country',
        dueDate: 'Audit Due',
        daysLeft: 'Days Left',
        hazards: 'SAHCODHA Hazards',
      },
      cta: 'Schedule Audits Now',
      urgentNote: 'These suppliers handle high-risk products. On-site audit is REQUIRED annually per 21 CFR 1.506(d)(1).',
    },
    vi: {
      subject: `KHẨN CẤP: ${suppliers.length} Audit SAHCODHA hàng năm đến hạn trong 30 ngày`,
      preview: 'Sản phẩm SAHCODHA yêu cầu audit tại chỗ hàng năm. Cần xử lý ngay.',
      heading: 'Audit SAHCODHA hàng năm đến hạn',
      p1: `Các nhà cung cấp sau cung cấp sản phẩm SAHCODHA (rủi ro cao) và yêu cầu <strong>audit tại chỗ hàng năm</strong> theo 21 CFR 1.506(d)(1). Các audit này là <strong>BẮT BUỘC</strong> - không hoàn thành có thể dẫn đến hành động pháp lý của FDA.`,
      sahcodhaExplain: 'SAHCODHA = Rau mầm, Thủy sản, Thực phẩm axit xử lý nhiệt, Phô mai mềm, Thực phẩm cần kiểm soát thời gian/nhiệt độ, Salad deli, Thực phẩm giữ nóng, Thực phẩm axit hóa',
      tableHeaders: {
        supplier: 'Nhà cung cấp',
        country: 'Quốc gia',
        dueDate: 'Hạn Audit',
        daysLeft: 'Còn lại',
        hazards: 'Mối nguy SAHCODHA',
      },
      cta: 'Lên lịch Audit ngay',
      urgentNote: 'Các supplier này xử lý sản phẩm rủi ro cao. Audit tại chỗ là BẮT BUỘC hàng năm theo 21 CFR 1.506(d)(1).',
    },
  }[lang]

  const supplierRows = suppliers.map(s => {
    const days = daysUntil(s.dueDate)
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:500;">${s.name}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${s.country}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#334155;">${formatDate(s.dueDate)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:700;">${days} ${lang === 'vi' ? 'ngày' : 'days'}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">
          ${s.hazards.slice(0, 3).map(h => `<span style="display:inline-block;padding:2px 8px;background:#fee2e2;color:#991b1b;border-radius:4px;font-size:11px;margin:2px;">${h}</span>`).join('')}
          ${s.hazards.length > 3 ? `<span style="color:#64748b;font-size:11px;">+${s.hazards.length - 3} more</span>` : ''}
        </td>
      </tr>
    `
  }).join('')

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge('SAHCODHA', 'red')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#dc2626;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="margin-bottom:20px;padding:12px 16px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
      <p style="margin:0;color:#991b1b;font-size:12px;line-height:1.5;">
        <strong>SAHCODHA:</strong> ${t.sahcodhaExplain}
      </p>
    </div>

    <div style="overflow-x:auto;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width:600px;background:#f8fafc;border-radius:8px;">
        <thead>
          <tr style="background:#fecaca;">
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;">${t.tableHeaders.supplier}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;">${t.tableHeaders.country}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;">${t.tableHeaders.dueDate}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;">${t.tableHeaders.daysLeft}</th>
            <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;">${t.tableHeaders.hazards}</th>
          </tr>
        </thead>
        <tbody>
          ${supplierRows}
        </tbody>
      </table>
    </div>

    ${button(t.cta, `${APP_URL}/dashboard/fsvp-supplier?tab=sahcodha`)}

    <div style="margin-top:24px;padding:16px;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;">
      <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.6;font-weight:500;">
        🚨 ${t.urgentNote}
      </p>
    </div>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FSVP LINKED FROM LABEL SCAN
// ─────────────────────────────────────────────────────────────────────────────
export function fsvpLinkedFromLabelTemplate({
  email,
  productName,
  reportId,
  supplierId,
  hazardAnalysisId,
  detectedProducts,
  isSAHCODHA,
  hazards,
  lang = 'en',
}: {
  email: string
  productName: string
  reportId: string
  supplierId?: string
  hazardAnalysisId?: string
  detectedProducts: string[]
  isSAHCODHA: boolean
  hazards: string[]
  lang?: Lang
}) {
  const t = {
    en: {
      subject: isSAHCODHA 
        ? `SAHCODHA Product Detected: ${productName} - FSVP Action Required`
        : `FSVP Record Created: ${productName}`,
      preview: `AI detected ${isSAHCODHA ? 'SAHCODHA' : 'imported'} ingredients. FSVP hazard analysis created.`,
      heading: isSAHCODHA 
        ? 'SAHCODHA Product Detected from Label Scan'
        : 'FSVP Hazard Analysis Created',
      p1: isSAHCODHA
        ? `Our AI system scanned your product label for <strong>${productName}</strong> and detected <strong>SAHCODHA ingredients</strong>. Per 21 CFR 1.506(d)(1), these require annual on-site supplier audits.`
        : `Our AI system scanned your product label for <strong>${productName}</strong> and detected imported ingredients that require FSVP compliance.`,
      detectedTitle: 'Detected Ingredients',
      hazardsTitle: 'Required Hazard Controls',
      actionTitle: 'Next Steps',
      actions: isSAHCODHA ? [
        'Review the auto-generated hazard analysis',
        'Link or create supplier records for the detected ingredients',
        'Schedule annual on-site audits for SAHCODHA suppliers',
        'Upload supplier verification documents (certificates, audit reports)',
      ] : [
        'Review the auto-generated hazard analysis',
        'Link or create supplier records',
        'Set up periodic verification activities',
        'Upload supplier documentation',
      ],
      cta: 'Review FSVP Records',
      ctaLabel: 'View Label Analysis',
    },
    vi: {
      subject: isSAHCODHA 
        ? `Phát hiện sản phẩm SAHCODHA: ${productName} - Yêu cầu xử lý FSVP`
        : `Đã tạo hồ sơ FSVP: ${productName}`,
      preview: `AI phát hiện thành phần ${isSAHCODHA ? 'SAHCODHA' : 'nhập khẩu'}. Đã tạo phân tích mối nguy FSVP.`,
      heading: isSAHCODHA
        ? 'Phát hiện sản phẩm SAHCODHA từ quét nhãn'
        : 'Đã tạo Phân tích Mối nguy FSVP',
      p1: isSAHCODHA
        ? `Hệ thống AI đã quét nhãn sản phẩm <strong>${productName}</strong> và phát hiện <strong>thành phần SAHCODHA</strong>. Theo 21 CFR 1.506(d)(1), những sản phẩm này yêu cầu audit tại chỗ nhà cung cấp hàng năm.`
        : `Hệ thống AI đã quét nhãn sản phẩm <strong>${productName}</strong> và phát hiện thành phần nhập khẩu cần tuân thủ FSVP.`,
      detectedTitle: 'Thành phần phát hiện',
      hazardsTitle: 'Kiểm soát mối nguy bắt buộc',
      actionTitle: 'Các bước tiếp theo',
      actions: isSAHCODHA ? [
        'Xem lại phân tích mối nguy được tạo tự động',
        'Liên kết hoặc tạo hồ sơ nhà cung cấp cho các thành phần phát hiện',
        'Lên lịch audit tại chỗ hàng năm cho supplier SAHCODHA',
        'Tải lên tài liệu xác minh supplier (chứng chỉ, báo cáo audit)',
      ] : [
        'Xem lại phân tích mối nguy được tạo tự động',
        'Liên kết hoặc tạo hồ sơ nhà cung cấp',
        'Thiết lập hoạt động xác minh định kỳ',
        'Tải lên tài liệu nhà cung cấp',
      ],
      cta: 'Xem hồ sơ FSVP',
      ctaLabel: 'Xem phân tích nhãn',
    },
  }[lang]

  const body = /* html */ `
    <div style="margin-bottom:20px;">
      ${isSAHCODHA ? badge('SAHCODHA', 'red') : badge('FSVP', 'blue')}
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${isSAHCODHA ? '#dc2626' : '#0f172a'};letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="padding:16px;background:${isSAHCODHA ? '#fef2f2' : '#eff6ff'};border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 8px;color:${isSAHCODHA ? '#991b1b' : '#1e40af'};font-size:13px;font-weight:600;">${t.detectedTitle}:</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${detectedProducts.map(p => `<span style="display:inline-block;padding:4px 12px;background:${isSAHCODHA ? '#fee2e2' : '#dbeafe'};color:${isSAHCODHA ? '#991b1b' : '#1e40af'};border-radius:4px;font-size:13px;font-weight:500;">${p}</span>`).join('')}
      </div>
    </div>

    ${hazards.length > 0 ? `
    <div style="padding:16px;background:#fef3c7;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 8px;color:#92400e;font-size:13px;font-weight:600;">${t.hazardsTitle}:</p>
      <ul style="margin:0;padding-left:20px;color:#92400e;font-size:13px;line-height:1.8;">
        ${hazards.map(h => `<li>${h}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div style="padding:16px;background:#f8fafc;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0 0 12px;color:#0f172a;font-size:13px;font-weight:600;">${t.actionTitle}:</p>
      <ol style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:2;">
        ${t.actions.map(a => `<li>${a}</li>`).join('')}
      </ol>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      ${button(t.cta, `${APP_URL}/dashboard/fsvp-supplier`)}
      ${button(t.ctaLabel, `${APP_URL}/audit/${reportId}`, 'secondary')}
    </div>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}
