/**
 * VNPay Payment Gateway Helper
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * Cấu hình environment variables:
 *   VNPAY_TMN_CODE      – Mã TmnCode từ VNPay dashboard
 *   VNPAY_HASH_SECRET   – Hash secret key từ VNPay dashboard
 *   NEXT_PUBLIC_APP_URL – URL công khai của app (e.g. https://yourapp.vercel.app)
 *   VNPAY_PAY_URL       – (Tùy chọn) Mặc định sandbox; đặt thành production khi go-live
 *
 * Khi chưa có credentials, helper chạy ở DEMO MODE và trả về URL giả lập.
 *
 * ─── QUAN TRỌNG (theo spec VNPay) ───────────────────────────────────────────
 * 1. signData được build bằng cách sắp xếp key theo alphabet, sau đó nối
 *    "key=value" KHÔNG encode, rồi ký bằng HMAC-SHA512.
 * 2. URL thanh toán dùng encodeURIComponent cho value (thay %20 → +).
 * 3. vnp_Amount = số tiền VND × 100 (bỏ phần thập phân).
 * 4. IPN phản hồi JSON { RspCode, Message } — không redirect.
 */

import crypto from 'crypto'

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * Dùng function thay vì const để env vars luôn được đọc tại runtime,
 * tránh trường hợp module được cache khi env chưa có giá trị.
 */
export function getVnpayConfig() {
  return {
    tmnCode:    process.env.VNPAY_TMN_CODE    ?? '',
    hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
    payUrl:     process.env.VNPAY_PAY_URL     ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl:  `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/vnpay/callback`,
    ipnUrl:     `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/vnpay/ipn`,
    version:    '2.1.0',
    command:    'pay',
    currCode:   'VND',
    locale:     'vn',
    expireMinutes: 15,
  }
}

/** Kiểm tra demo mode tại runtime — không cache ở module level */
export function isDemoMode(): boolean {
  const cfg = getVnpayConfig()
  return !cfg.tmnCode || !cfg.hashSecret
}

// Giữ lại export cũ để không break các import hiện có
export const VNPAY_CONFIG = getVnpayConfig()
export const IS_DEMO_MODE = isDemoMode()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePaymentParams {
  txnRef:       string   // Mã tham chiếu giao dịch, duy nhất trong ngày (max 100 chars)
  amount:       number   // Số tiền VND (không có phần thập phân, chưa nhân 100)
  orderInfo:    string   // Nội dung thanh toán — tiếng Việt không dấu, không ký tự đặc biệt
  ipAddr:       string   // IP của khách hàng
  bankCode?:    string   // Tùy chọn: VNPAYQR | VNBANK | INTCARD hoặc mã ngân hàng cụ thể
  orderType?:   string   // Danh mục hàng hóa (default: 'other')
  locale?:      'vn' | 'en'  // Ngôn ngữ giao diện VNPay (default: 'vn')
}

export interface VNPayCallbackParams {
  vnp_Amount:            string
  vnp_BankCode:          string
  vnp_BankTranNo:        string
  vnp_CardType:          string
  vnp_OrderInfo:         string
  vnp_PayDate:           string
  vnp_ResponseCode:      string
  vnp_TmnCode:           string
  vnp_TransactionNo:     string
  vnp_TransactionStatus: string
  vnp_TxnRef:            string
  vnp_SecureHash:        string
  vnp_SecureHashType?:   string
}

export interface PaymentResult {
  payUrl:     string
  txnRef:     string
  isDemoMode: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sắp xếp object theo key alphabet.
 * Theo spec VNPay: "Dữ liệu checksum được thành lập dựa trên việc sắp xếp
 * tăng dần của tên tham số (QueryString)"
 */
function sortObject(params: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {}
  Object.keys(params)
    .sort()
    .forEach((key) => { sorted[key] = params[key] })
  return sorted
}

/**
 * Build signData string — KHÔNG encode key hay value.
 * Đây là chuỗi dùng để tính HMAC-SHA512.
 * Theo NodeJS sample chính thức của VNPay:
 *   qs.stringify(vnp_Params, { encode: false })
 * → Tất cả value phải giữ nguyên, KHÔNG encode bất kỳ ký tự nào.
 */
function buildSignData(params: Record<string, string>): string {
  return Object.entries(sortObject(params))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

/**
 * Build query string cho URL thanh toán — encode giống PHP urlencode().
 *
 * Theo NodeJS sample chính thức: encode: false (không encode).
 * Tuy nhiên thực tế:
 *  - signData KHÔNG encode (dùng để tính HMAC)
 *  - URL phải encode khoảng trắng thành '+' và encode ký tự đặc biệt
 *    → đây là hành vi của PHP urlencode() và querystring.escape() mặc định.
 *
 * sanitizeOrderInfo() đã loại bỏ mọi ký tự đặc biệt, chỉ còn chữ/số/khoảng trắng.
 * Khoảng trắng trong URL phải được encode → dùng encodeURIComponent (space → %20).
 * VNPay server sẽ decode %20 → space trước khi tính hash → khớp với signData.
 */
function buildQueryString(params: Record<string, string>): string {
  return Object.entries(sortObject(params))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

/** HMAC-SHA512 signature theo yêu cầu của VNPay.
 *  QUAN TRỌNG: padStart(128, '0') để đảm bảo luôn đủ 128 ký tự hex.
 *  Node.js digest('hex') có thể bỏ leading zeros → hash 126 chars → VNPay báo "Sai chữ ký".
 */
export function createHmac512(data: string, secret: string): string {
  return crypto
    .createHmac('sha512', secret)
    .update(Buffer.from(data, 'utf-8'))
    .digest('hex')
    .padStart(128, '0')
}

/** Format date as yyyyMMddHHmmss theo timezone GMT+7 (VNPay format) */
function formatDate(date: Date): string {
  // Chuyển sang GMT+7
  const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${gmt7.getUTCFullYear()}` +
    `${pad(gmt7.getUTCMonth() + 1)}` +
    `${pad(gmt7.getUTCDate())}` +
    `${pad(gmt7.getUTCHours())}` +
    `${pad(gmt7.getUTCMinutes())}` +
    `${pad(gmt7.getUTCSeconds())}`
  )
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Tạo VNPay payment URL.
 * DEMO mode: trả URL nội bộ để test mà không cần credentials.
 * LIVE mode: tạo URL hợp lệ theo đúng spec VNPay 2.1.0.
 */
export function createPaymentUrl(params: CreatePaymentParams): PaymentResult {
  const { txnRef, amount, orderInfo, ipAddr, bankCode, orderType, locale } = params
  const cfg = getVnpayConfig()

  if (isDemoMode()) {
    const demoUrl =
      `/checkout/demo?txnRef=${encodeURIComponent(txnRef)}` +
      `&amount=${amount}` +
      `&orderInfo=${encodeURIComponent(orderInfo)}`
    return { payUrl: demoUrl, txnRef, isDemoMode: true }
  }

  const now      = new Date()
  const expireAt = new Date(now.getTime() + cfg.expireMinutes * 60 * 1000)

  const vnpParams: Record<string, string> = {
    vnp_Version:    cfg.version,
    vnp_Command:    cfg.command,
    vnp_TmnCode:    cfg.tmnCode,
    vnp_Amount:     String(amount * 100),
    vnp_CurrCode:   cfg.currCode,
    vnp_TxnRef:     txnRef,
    vnp_OrderInfo:  sanitizeOrderInfo(orderInfo), // VNPay yêu cầu không dấu, không ký tự đặc biệt
    vnp_OrderType:  orderType ?? 'other',
    vnp_Locale:     locale ?? cfg.locale,
    vnp_ReturnUrl:  cfg.returnUrl,
    vnp_IpAddr:     ipAddr,
    vnp_CreateDate: formatDate(now),
    vnp_ExpireDate: formatDate(expireAt),
  }

  if (bankCode) vnpParams.vnp_BankCode = bankCode

  const signData   = buildSignData(vnpParams)
  const secureHash = createHmac512(signData, cfg.hashSecret)

  const queryString = buildQueryString(vnpParams) + `&vnp_SecureHash=${secureHash}`
  const payUrl      = `${cfg.payUrl}?${queryString}`

  console.log('[v0] VNPAY signData:', signData)
  console.log('[v0] VNPAY secureHash length:', secureHash.length, '| value:', secureHash)
  console.log('[v0] VNPAY returnUrl:', vnpParams.vnp_ReturnUrl)
  console.log('[v0] VNPAY payUrl:', payUrl)

  return { payUrl, txnRef, isDemoMode: false }
}

/**
 * Xác minh chữ ký từ VNPay callback / IPN.
 * Trả về true nếu hash hợp lệ (dữ liệu không bị giả mạo).
 *
 * Theo spec VNPay:
 * - Loại bỏ vnp_SecureHash và vnp_SecureHashType khỏi tập tham số
 * - Sắp xếp key theo alphabet
 * - Build signData KHÔNG encode
 * - So sánh HMAC-SHA512
 */
export function verifyCallbackSignature(query: Record<string, string>): boolean {
  if (isDemoMode()) return true

  const cfg = getVnpayConfig()
  const params = { ...query }
  const receivedHash = params['vnp_SecureHash'] ?? ''

  delete params['vnp_SecureHash']
  delete params['vnp_SecureHashType']

  const signData  = buildSignData(params)
  const checkHash = createHmac512(signData, cfg.hashSecret)

  return checkHash.toLowerCase() === receivedHash.toLowerCase()
}

/**
 * Giải mã mã phản hồi VNPay thành thông báo tiếng Việt.
 * Tham khảo: https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/
 */
export function decodeResponseCode(code: string): { success: boolean; message: string } {
  const codes: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan đến gian lận, giao dịch bất thường)',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
    '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
  }
  return {
    success: code === '00',
    message: codes[code] ?? `Lỗi không xác định. Mã lỗi: ${code}`,
  }
}

/**
 * Loại bỏ ký tự đặc biệt khỏi orderInfo theo yêu cầu VNPay.
 * VNPay yêu cầu: chỉ chữ cái, số, khoảng trắng — KHÔNG dấu tiếng Việt, KHÔNG ký tự đặc biệt.
 * Nếu orderInfo có ký tự lạ, signData sẽ khác với những gì VNPay nhận → "Sai chữ ký".
 */
export function sanitizeOrderInfo(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tổ hợp (à → a, ê → e, ...)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')  // thay ký tự đặc biệt bằng khoảng trắng
    .replace(/\s+/g, ' ')             // gộp nhiều khoảng trắng thành 1
    .trim()
    .slice(0, 255)                    // giới hạn độ dài
}

/**
 * Tạo mã tham chiếu giao dịch duy nhất.
 * VNPay yêu cầu: alphanumeric, không trùng lặp trong ngày, max 100 chars.
 */
export function generateTxnRef(prefix = 'SUB'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random    = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`.slice(0, 20)
}
