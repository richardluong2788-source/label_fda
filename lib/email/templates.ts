import { emailLayout, button, badge, divider, infoRow } from './layout'
import { APP_URL } from './client'

type Lang = 'vi' | 'en'

// ─────────────────────────────────────────────────────────────────────────────
// 1. WELCOME EMAIL — sau khi đăng ký thành công
// ─────────────────────────────────────────────────────────────────────────────
export function welcomeEmailTemplate({ email, lang = 'en' }: { email: string; lang?: Lang }) {
  const t = {
    en: {
      subject: 'Welcome to FDA Label Checker',
      preview: 'Your account is ready. Start checking your label for FDA compliance.',
      heading: 'Welcome to FDA Label Checker',
      p1: "Your account has been created successfully. You're now ready to analyze your product labels for FDA compliance using our AI-powered system.",
      whatNext: 'What you can do:',
      features: [
        '<strong>Upload label images</strong> — PDP, Nutrition Facts, Ingredients, and other panels',
        '<strong>AI analysis in seconds</strong> — Powered by GPT-4o Vision + FDA Knowledge Base (21 CFR)',
        '<strong>Expert Review</strong> — Request a human expert to verify your label',
      ],
      cta: 'Start checking your label',
      tip: 'Tip: Read the User Guide for best results. Upload each panel as a separate image for the most accurate analysis.',
      guideLink: 'View User Guide',
    },
    vi: {
      subject: 'Chào mừng bạn đến với FDA Label Checker',
      preview: 'Tài khoản của bạn đã sẵn sàng. Bắt đầu kiểm tra nhãn sản phẩm ngay hôm nay.',
      heading: 'Chào mừng đến với FDA Label Checker',
      p1: 'Tài khoản của bạn đã được tạo thành công. Bạn có thể bắt đầu phân tích nhãn sản phẩm theo tiêu chuẩn FDA bằng hệ thống AI của chúng tôi.',
      whatNext: 'Bạn có thể làm gì:',
      features: [
        '<strong>Upload ảnh nhãn</strong> — Mặt trước (PDP), Bảng Nutrition Facts, Thành phần, và các mặt khác',
        '<strong>Phân tích AI trong vài giây</strong> — Được hỗ trợ bởi GPT-4o Vision + FDA Knowledge Base (21 CFR)',
        '<strong>Expert Review</strong> — Yêu cầu chuyên gia xem xét nhãn của bạn',
      ],
      cta: 'Bắt đầu kiểm tra nhãn',
      tip: 'Mẹo: Đọc Hướng dẫn sử dụng để có kết quả tốt nhất. Upload từng mặt nhãn riêng biệt để AI phân tích chính xác hơn.',
      guideLink: 'Xem Hướng dẫn sử dụng',
    },
  }[lang]

  const body = /* html */ `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">${t.whatNext}</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#334155;font-size:14px;line-height:2;">
      ${t.features.map(f => `<li>${f}</li>`).join('')}
    </ul>

    ${button(t.cta, `${APP_URL}/analyze`)}

    <div style="margin-top:28px;padding:16px 20px;background-color:#f8fafc;border-left:3px solid #0f172a;border-radius:4px;">
      <p style="margin:0 0 8px;color:#334155;font-size:13px;line-height:1.6;">${t.tip}</p>
      <a href="${APP_URL}/guide" style="color:#0f172a;font-size:13px;font-weight:600;text-decoration:underline;">${t.guideLink} &rarr;</a>
    </div>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXPERT REVIEW SUBMITTED — xác nhận cho user khi gửi yêu cầu
// ─────────────────────────────────────────────────────────────────────────────
export function expertRequestConfirmTemplate({
  email,
  productName,
  requestId,
  isPaid,
  lang = 'en',
}: {
  email: string
  productName: string
  requestId: string
  isPaid: boolean
  lang?: Lang
}) {
  const t = {
    en: {
      subject: 'Expert Review Request Received',
      preview: `Your expert review request for "${productName}" has been received.`,
      heading: 'Expert Review Request Received',
      p1: `We have received your expert review request for <strong>${productName}</strong>. Our team will assign a qualified FDA compliance expert to review your label.`,
      detailsTitle: 'Request Details',
      requestIdLabel: 'Request ID',
      productLabel: 'Product',
      typeLabel: 'Type',
      statusLabel: 'Status',
      statusValue: 'Pending Assignment',
      typeValue: isPaid ? 'Paid Review' : 'Plan-Included Review',
      timeline: isPaid
        ? 'Expected turnaround: <strong>2–3 business days</strong>'
        : 'Expected turnaround: <strong>3–5 business days</strong>',
      cta: 'View Request Status',
      note: 'You will receive an email notification when your review is complete.',
    },
    vi: {
      subject: 'Yêu cầu Expert Review đã được nhận',
      preview: `Yêu cầu expert review cho "${productName}" đã được nhận.`,
      heading: 'Yêu cầu Expert Review đã được nhận',
      p1: `Chúng tôi đã nhận được yêu cầu expert review cho sản phẩm <strong>${productName}</strong>. Đội ngũ của chúng tôi sẽ phân công chuyên gia FDA phù hợp để xem xét nhãn của bạn.`,
      detailsTitle: 'Chi tiết yêu cầu',
      requestIdLabel: 'Mã yêu cầu',
      productLabel: 'Sản phẩm',
      typeLabel: 'Loại',
      statusLabel: 'Trạng thái',
      statusValue: 'Đang chờ phân công',
      typeValue: isPaid ? 'Review mua thêm' : 'Review trong gói',
      timeline: isPaid
        ? 'Thời gian dự kiến: <strong>2–3 ngày làm việc</strong>'
        : 'Thời gian dự kiến: <strong>3–5 ngày làm việc</strong>',
      cta: 'Xem trạng thái yêu cầu',
      note: 'Bạn sẽ nhận được email thông báo khi chuyên gia hoàn thành đánh giá.',
    },
  }[lang]

  const body = /* html */ `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="padding:20px;background-color:#f8fafc;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 12px;color:#0f172a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${t.detailsTitle}</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${infoRow(t.requestIdLabel, `<code style="font-family:monospace;font-size:12px;background:#e2e8f0;padding:2px 6px;border-radius:4px;">${requestId.slice(0, 8).toUpperCase()}</code>`)}
        ${infoRow(t.productLabel, productName)}
        ${infoRow(t.typeLabel, t.typeValue)}
        ${infoRow(t.statusLabel, badge(t.statusValue, 'blue'))}
      </table>
    </div>

    <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">${t.timeline}</p>

    ${button(t.cta, `${APP_URL}/history`)}

    <p style="margin-top:24px;color:#94a3b8;font-size:13px;line-height:1.6;">${t.note}</p>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b. EXPERT REVIEW ASSIGNED — thông báo user khi expert nhận request
// ─────────────────────────────────────────────────────────────────────────────
export function expertReviewAssignedTemplate({
  email,
  productName,
  requestId,
  lang = 'en',
}: {
  email: string
  productName: string
  requestId: string
  lang?: Lang
}) {
  const t = {
    en: {
      subject: `Expert Review In Progress — ${productName}`,
      preview: `Your expert review for "${productName}" has been assigned to a specialist.`,
      heading: 'Expert Review In Progress',
      p1: `Great news! Your expert review request for <strong>${productName}</strong> has been assigned to an FDA compliance specialist. Our expert is now reviewing your label.`,
      detailsTitle: 'Request Status',
      requestIdLabel: 'Request ID',
      productLabel: 'Product',
      statusLabel: 'Status',
      statusValue: 'In Review',
      timeline: 'Expected completion: <strong>1–3 business days</strong>',
      cta: 'View Request Status',
      note: 'You will receive another email notification when the expert review is complete.',
    },
    vi: {
      subject: `Expert Review đang được xử lý — ${productName}`,
      preview: `Yêu cầu expert review cho "${productName}" đã được phân công cho chuyên gia.`,
      heading: 'Expert Review đang được xử lý',
      p1: `Tin vui! Yêu cầu expert review cho sản phẩm <strong>${productName}</strong> đã được phân công cho chuyên gia FDA. Chuyên gia của chúng tôi đang xem xét nhãn của bạn.`,
      detailsTitle: 'Trạng thái yêu cầu',
      requestIdLabel: 'Mã yêu cầu',
      productLabel: 'Sản phẩm',
      statusLabel: 'Trạng thái',
      statusValue: 'Đang xem xét',
      timeline: 'Dự kiến hoàn thành: <strong>1–3 ngày làm việc</strong>',
      cta: 'Xem trạng thái yêu cầu',
      note: 'Bạn sẽ nhận được email thông báo khi chuyên gia hoàn thành đánh giá.',
    },
  }[lang]

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Đang xử lý' : 'In Progress', 'blue')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="padding:20px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0 0 12px;color:#1e40af;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${t.detailsTitle}</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${infoRow(t.requestIdLabel, `<code style="font-family:monospace;font-size:12px;background:#dbeafe;padding:2px 6px;border-radius:4px;">${requestId.slice(0, 8).toUpperCase()}</code>`)}
        ${infoRow(t.productLabel, productName)}
        ${infoRow(t.statusLabel, badge(t.statusValue, 'blue'))}
      </table>
    </div>

    <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">${t.timeline}</p>

    ${button(t.cta, `${APP_URL}/history`)}

    <p style="margin-top:24px;color:#94a3b8;font-size:13px;line-height:1.6;">${t.note}</p>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPERT REVIEW COMPLETE — thông báo cho user khi expert xong
// ─────────────────────────────────────────────────────────────────────────────
export function expertReviewCompleteTemplate({
  email,
  productName,
  reportId,
  expertName,
  expertSummary,
  lang = 'en',
}: {
  email: string
  productName: string
  reportId: string
  expertName: string
  expertSummary: string
  lang?: Lang
}) {
  const t = {
    en: {
      subject: `Expert Review Complete — ${productName}`,
      preview: `Your expert review for "${productName}" is ready.`,
      heading: 'Expert Review Complete',
      p1: `Good news! Your expert review for <strong>${productName}</strong> has been completed and signed off by <strong>${expertName}</strong>.`,
      summaryTitle: 'Expert Summary',
      cta: 'View Full Expert Review',
      note: 'The full review includes detailed violation analysis, regulatory citations, and recommended corrective actions.',
    },
    vi: {
      subject: `Expert Review hoàn thành — ${productName}`,
      preview: `Expert review cho "${productName}" của bạn đã sẵn sàng.`,
      heading: 'Expert Review đã hoàn thành',
      p1: `Tin vui! Expert review cho sản phẩm <strong>${productName}</strong> đã được hoàn thành và ký duyệt bởi chuyên gia <strong>${expertName}</strong>.`,
      summaryTitle: 'Tóm tắt từ chuyên gia',
      cta: 'Xem đầy đủ Expert Review',
      note: 'Báo cáo đầy đủ bao gồm phân tích vi phạm chi tiết, trích dẫn quy định và các hành động khắc phục được đề xuất.',
    },
  }[lang]

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Hoàn thành' : 'Completed', 'green')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="padding:20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#15803d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${t.summaryTitle}</p>
      <p style="margin:0;color:#166534;font-size:14px;line-height:1.7;">${expertSummary.slice(0, 400)}${expertSummary.length > 400 ? '...' : ''}</p>
    </div>

    ${button(t.cta, `${APP_URL}/audit/${reportId}`)}

    <p style="margin-top:24px;color:#94a3b8;font-size:13px;line-height:1.6;">${t.note}</p>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXPERT REVIEW CANCELLED — thông báo cho user khi bị huỷ
// ─────────────────────────────────────────────────────────────────────────────
export function expertReviewCancelledTemplate({
  email,
  productName,
  lang = 'en',
}: {
  email: string
  productName: string
  lang?: Lang
}) {
  const t = {
    en: {
      subject: `Expert Review Cancelled — ${productName}`,
      preview: `Your expert review request for "${productName}" has been cancelled.`,
      heading: 'Expert Review Cancelled',
      p1: `Your expert review request for <strong>${productName}</strong> has been cancelled. If you believe this is an error or would like to submit a new request, please contact our support team.`,
      cta: 'Submit New Request',
    },
    vi: {
      subject: `Expert Review đã bị huỷ — ${productName}`,
      preview: `Yêu cầu expert review cho "${productName}" đã bị huỷ.`,
      heading: 'Expert Review đã bị huỷ',
      p1: `Yêu cầu expert review cho sản phẩm <strong>${productName}</strong> đã bị huỷ. Nếu bạn cho rằng đây là lỗi hoặc muốn gửi yêu cầu mới, vui lòng liên hệ đội hỗ trợ.`,
      cta: 'Gửi yêu cầu mới',
    },
  }[lang]

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Đã huỷ' : 'Cancelled', 'red')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>
    ${button(t.cta, `${APP_URL}/history`)}
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN ALERT — có expert review request mới
// ─────────────────────────────────────────────────────────────────────────────
export function adminNewExpertRequestTemplate({
  userEmail,
  productName,
  requestId,
  isPaid,
  planId,
}: {
  userEmail: string
  productName: string
  requestId: string
  isPaid: boolean
  planId: string
}) {
  const subject = `[ADMIN] New Expert Review Request — ${productName}`
  const preview = `${userEmail} submitted an expert review request for ${productName}`

  const body = /* html */ `
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;">New Expert Review Request</h1>

    <div style="padding:20px;background-color:#f8fafc;border-radius:8px;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${infoRow('Request ID', `<code style="font-family:monospace;font-size:12px;background:#e2e8f0;padding:2px 6px;border-radius:4px;">${requestId.slice(0, 8).toUpperCase()}</code>`)}
        ${infoRow('User', userEmail)}
        ${infoRow('Product', productName)}
        ${infoRow('Plan', planId)}
        ${infoRow('Type', isPaid ? badge('Paid Add-on', 'green') : badge('Plan-Included', 'blue'))}
      </table>
    </div>

    ${button('Open Admin Queue', `${APP_URL}/admin/expert-queue`)}
  `

  return {
    subject,
    html: emailLayout({ title: subject, previewText: preview, body }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. VNPAY PAYMENT CONFIRMATION — xác nhận thanh toán thành công
// ─────������───────���──────────────────────────────────────────────────────────────
export function paymentSuccessTemplate({
  email,
  planName,
  amountVnd,
  txnRef,
  periodEnd,
  isAddon,
  lang = 'en',
}: {
  email: string
  planName: string
  amountVnd: number
  txnRef: string
  periodEnd?: string
  isAddon?: boolean
  lang?: Lang
}) {
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountVnd)
  const formattedDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const t = {
    en: {
      subject: 'Payment Confirmed — FDA Label Checker',
      preview: `Your payment of ${formattedAmount} has been confirmed.`,
      heading: 'Payment Confirmed',
      p1: isAddon
        ? `Your add-on Expert Review purchase has been confirmed. A review request has been automatically created.`
        : `Your subscription to <strong>${planName}</strong> has been activated successfully.`,
      detailsTitle: 'Payment Details',
      txnLabel: 'Transaction Ref',
      amountLabel: 'Amount',
      planLabel: isAddon ? 'Add-on' : 'Plan',
      renewalLabel: 'Next Renewal',
      cta: isAddon ? 'View Review Request' : 'Go to Dashboard',
      note: 'Please keep this email as your payment receipt.',
    },
    vi: {
      subject: 'Xác nhận thanh toán — FDA Label Checker',
      preview: `Thanh toán ${formattedAmount} của bạn đã được xác nhận.`,
      heading: 'Xác nhận thanh toán thành công',
      p1: isAddon
        ? `Giao dịch mua add-on Expert Review của bạn đã được xác nhận. Yêu cầu review đã được tạo tự động.`
        : `Gói <strong>${planName}</strong> của bạn đã được kích hoạt thành công.`,
      detailsTitle: 'Chi tiết thanh toán',
      txnLabel: 'Mã giao dịch',
      amountLabel: 'Số tiền',
      planLabel: isAddon ? 'Add-on' : 'Gói',
      renewalLabel: 'Gia hạn tiếp theo',
      cta: isAddon ? 'Xem yêu cầu Review' : 'Về Dashboard',
      note: 'Vui lòng lưu email này làm biên lai thanh toán của bạn.',
    },
  }[lang]

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Thanh toán thành công' : 'Payment Successful', 'green')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    <div style="padding:20px;background-color:#f8fafc;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0 0 12px;color:#0f172a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${t.detailsTitle}</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${infoRow(t.txnLabel, `<code style="font-family:monospace;font-size:12px;background:#e2e8f0;padding:2px 6px;border-radius:4px;">${txnRef}</code>`)}
        ${infoRow(t.planLabel, planName)}
        ${infoRow(t.amountLabel, `<strong style="color:#15803d;">${formattedAmount}</strong>`)}
        ${formattedDate ? infoRow(t.renewalLabel, formattedDate) : ''}
      </table>
    </div>

    ${button(t.cta, `${APP_URL}/dashboard`)}

    <p style="margin-top:24px;color:#94a3b8;font-size:13px;line-height:1.6;">${t.note}</p>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7a. QUOTA EXHAUSTED — đã hết lượt phân tích hoàn toàn
// ─────────────────────────────────────────────────────────────────────────────
export function quotaExhaustedTemplate({
  email,
  reportsUsed,
  reportsLimit,
  planName,
  periodEnd,
  lang = 'en',
}: {
  email: string
  reportsUsed: number
  reportsLimit: number
  planName: string
  periodEnd: string
  lang?: Lang
}) {
  const formattedDate = new Date(periodEnd).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const t = {
    en: {
      subject: 'Analysis Credits Exhausted — Upgrade to Continue',
      preview: `You have used all ${reportsLimit} label analyses on your ${planName} plan.`,
      heading: 'Your Analysis Credits Are Used Up',
      p1: `You have used all <strong>${reportsLimit} of ${reportsLimit}</strong> label analyses on your <strong>${planName}</strong> plan this month. To continue analyzing labels, please upgrade your plan.`,
      quota: `${reportsUsed}/${reportsLimit} used (100%)`,
      resetLabel: 'Quota resets on',
      upgradeTitle: 'Upgrade Options',
      upgradeDesc: 'Get more analyses with our paid plans:',
      starterDesc: '<strong>Starter</strong> — 5 analyses/month',
      proDesc: '<strong>Pro</strong> — 20 analyses/month',
      enterpriseDesc: '<strong>Enterprise</strong> — Unlimited analyses',
      cta: 'View Upgrade Plans',
      ctaSecondary: 'Go to Dashboard',
      note: `Your quota will automatically reset on ${formattedDate}. Upgrade now if you need immediate access.`,
    },
    vi: {
      subject: 'Đã hết lượt phân tích — Nâng cấp để tiếp tục',
      preview: `Bạn đã dùng hết ${reportsLimit} lượt phân tích nhãn trong gói ${planName}.`,
      heading: 'Đã hết lượt phân tích',
      p1: `Bạn đã sử dụng hết <strong>${reportsLimit}/${reportsLimit}</strong> lượt phân tích nhãn trong gói <strong>${planName}</strong> tháng này. Để tiếp tục phân tích, vui lòng nâng cấp gói.`,
      quota: `${reportsUsed}/${reportsLimit} đã dùng (100%)`,
      resetLabel: 'Quota reset vào',
      upgradeTitle: 'Gói nâng cấp',
      upgradeDesc: 'Nhận thêm lượt phân tích với các gói trả phí:',
      starterDesc: '<strong>Starter</strong> — 5 lượt/tháng',
      proDesc: '<strong>Pro</strong> — 20 lượt/tháng',
      enterpriseDesc: '<strong>Enterprise</strong> — Không giới hạn',
      cta: 'Xem các gói nâng cấp',
      ctaSecondary: 'Về Dashboard',
      note: `Quota sẽ tự động reset vào ${formattedDate}. Nâng cấp ngay nếu bạn cần phân tích thêm.`,
    },
  }[lang]

  const progressBar = /* html */ `
<div style="margin:20px 0;background-color:#e2e8f0;border-radius:100px;height:8px;overflow:hidden;">
  <div style="width:100%;background-color:#ef4444;height:8px;border-radius:100px;"></div>
</div>
<p style="margin:0 0 4px;color:#ef4444;font-size:13px;font-weight:600;">${t.quota}</p>
<p style="margin:0;color:#94a3b8;font-size:12px;">${t.resetLabel}: ${formattedDate}</p>`

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Het luot' : 'Exhausted', 'red')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    ${progressBar}

    <div style="margin-top:24px;padding:20px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#991b1b;font-size:13px;font-weight:600;">${t.upgradeTitle}</p>
      <p style="margin:0 0 8px;color:#7f1d1d;font-size:13px;">${t.upgradeDesc}</p>
      <ul style="margin:0;padding-left:20px;color:#7f1d1d;font-size:13px;line-height:2;">
        <li>${t.starterDesc}</li>
        <li>${t.proDesc}</li>
        <li>${t.enterpriseDesc}</li>
      </ul>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
      <tr>
        <td style="background-color:#0f172a;border-radius:8px;">
          <a href="${APP_URL}/pricing" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${t.cta}</a>
        </td>
        <td style="padding-left:12px;">
          <a href="${APP_URL}/dashboard" style="color:#0f172a;font-size:14px;font-weight:500;text-decoration:underline;">${t.ctaSecondary}</a>
        </td>
      </tr>
    </table>

    <p style="margin-top:24px;color:#94a3b8;font-size:13px;line-height:1.6;">${t.note}</p>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7b. LOW CREDITS WARNING — sắp hết lượt phân tích
// ─────────────────────────────────────────────────────────────────────────────
export function lowCreditsTemplate({
  email,
  reportsUsed,
  reportsLimit,
  planName,
  periodEnd,
  lang = 'en',
}: {
  email: string
  reportsUsed: number
  reportsLimit: number
  planName: string
  periodEnd: string
  lang?: Lang
}) {
  const remaining = reportsLimit - reportsUsed
  const pct = Math.round((reportsUsed / reportsLimit) * 100)
  const formattedDate = new Date(periodEnd).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const t = {
    en: {
      subject: `Low Credits Warning — ${remaining} analysis left`,
      preview: `You have used ${pct}% of your monthly label analysis quota.`,
      heading: 'Running Low on Analysis Credits',
      p1: `You have used <strong>${reportsUsed} of ${reportsLimit}</strong> label analyses on your <strong>${planName}</strong> plan this month. Only <strong>${remaining} ${remaining === 1 ? 'check' : 'checks'} remaining</strong>.`,
      quota: `${reportsUsed}/${reportsLimit} used (${pct}%)`,
      resetLabel: 'Quota resets on',
      cta: 'Upgrade Plan',
      ctaSecondary: 'Go to Dashboard',
      note: `If you need more analyses before ${formattedDate}, consider upgrading your plan.`,
    },
    vi: {
      subject: `Sắp hết lượt phân tích — còn ${remaining} lượt`,
      preview: `Bạn đã dùng ${pct}% quota phân tích nhãn trong tháng này.`,
      heading: 'Lượt phân tích sắp hết',
      p1: `Bạn đã sử dụng <strong>${reportsUsed}/${reportsLimit}</strong> lượt phân tích nhãn trong gói <strong>${planName}</strong> tháng này. Chỉ còn <strong>${remaining} lượt</strong>.`,
      quota: `${reportsUsed}/${reportsLimit} đã dùng (${pct}%)`,
      resetLabel: 'Quota reset vào',
      cta: 'Nâng cấp gói',
      ctaSecondary: 'Về Dashboard',
      note: `Nếu bạn cần thêm lượt trước ngày ${formattedDate}, hãy nâng cấp gói.`,
    },
  }[lang]

  // Progress bar
  const progressBar = /* html */ `
<div style="margin:20px 0;background-color:#e2e8f0;border-radius:100px;height:8px;overflow:hidden;">
  <div style="width:${pct}%;background-color:${pct >= 90 ? '#ef4444' : '#f97316'};height:8px;border-radius:100px;"></div>
</div>
<p style="margin:0 0 4px;color:#334155;font-size:13px;font-weight:600;">${t.quota}</p>
<p style="margin:0;color:#94a3b8;font-size:12px;">${t.resetLabel}: ${formattedDate}</p>`

  const body = /* html */ `
    <div style="margin-bottom:20px;">${badge(lang === 'vi' ? 'Cảnh báo' : 'Warning', 'orange')}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${t.heading}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${email}</p>
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${t.p1}</p>

    ${progressBar}

    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
      <tr>
        <td style="background-color:#0f172a;border-radius:8px;">
          <a href="${APP_URL}/pricing" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${t.cta}</a>
        </td>
        <td style="padding-left:12px;">
          <a href="${APP_URL}/dashboard" style="color:#0f172a;font-size:14px;font-weight:500;text-decoration:underline;">${t.ctaSecondary}</a>
        </td>
      </tr>
    </table>

    <p style="margin-top:24px;color:#94a3b8;font-size:13px;line-height:1.6;">${t.note}</p>
  `

  return {
    subject: t.subject,
    html: emailLayout({ title: t.subject, previewText: t.preview, body, lang }),
  }
}
