/**
 * VNPay Payment Gateway Helper
 * Docs: https://sandbox.vnpayment.vn/apis/docs/
 *
 * Set these env vars when you get credentials:
 *   VNPAY_TMN_CODE      – Terminal/Merchant code from VNPay dashboard
 *   VNPAY_HASH_SECRET   – Hash secret key from VNPay dashboard
 *   NEXT_PUBLIC_APP_URL – Public URL of this app (e.g. https://yourapp.vercel.app)
 *
 * Until credentials are set, the helper operates in DEMO mode and returns a
 * simulated QR / payment URL so the rest of the UI can be developed/tested.
 */

import crypto from 'crypto'

// ─── Config ──────────────────────────────────────────────────────────────────

export const VNPAY_CONFIG = {
  tmnCode:    process.env.VNPAY_TMN_CODE    ?? '',
  hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
  /**
   * Switch between sandbox (dev/testing) and production when you have live creds.
   * Sandbox:    https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
   * Production: https://pay.vnpay.vn/vpcpay.html
   */
  payUrl: process.env.VNPAY_PAY_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/vnpay/callback`,
  ipnUrl:    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/vnpay/ipn`,
  version:   '2.1.0',
  command:   'pay',
  currCode:  'VND',
  locale:    'vn',
}

export const IS_DEMO_MODE = !VNPAY_CONFIG.tmnCode || !VNPAY_CONFIG.hashSecret

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePaymentParams {
  txnRef:       string   // Unique transaction reference (max 20 chars)
  amount:       number   // Amount in VND (no decimals)
  orderInfo:    string   // Order description shown to user
  ipAddr:       string   // User's IP address
  bankCode?:    string   // Optional: pre-select bank (e.g. 'NCB', 'VCB')
  orderType?:   string   // Order type (default 'other')
}

export interface VNPayCallbackParams {
  vnp_Amount:           string
  vnp_BankCode:         string
  vnp_BankTranNo:       string
  vnp_CardType:         string
  vnp_OrderInfo:        string
  vnp_PayDate:          string
  vnp_ResponseCode:     string
  vnp_TmnCode:          string
  vnp_TransactionNo:    string
  vnp_TransactionStatus: string
  vnp_TxnRef:           string
  vnp_SecureHash:       string
}

export interface PaymentResult {
  payUrl:     string
  txnRef:     string
  isDemoMode: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sort object keys alphabetically and build query string for signing */
function sortedQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&')
}

/** HMAC-SHA512 signature as required by VNPay */
export function createHmac512(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex')
}

/** Format date as yyyyMMddHHmmss (VNPay format) */
function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}` +
    `${pad(date.getDate())}` +
    `${pad(date.getHours())}` +
    `${pad(date.getMinutes())}` +
    `${pad(date.getSeconds())}`
  )
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Build a VNPay payment URL.
 * In DEMO mode, returns a fake URL so the app can be tested without credentials.
 */
export function createPaymentUrl(params: CreatePaymentParams): PaymentResult {
  const { txnRef, amount, orderInfo, ipAddr, bankCode, orderType } = params

  if (IS_DEMO_MODE) {
    const demoUrl =
      `/checkout/demo?txnRef=${txnRef}` +
      `&amount=${amount}` +
      `&orderInfo=${encodeURIComponent(orderInfo)}`
    return { payUrl: demoUrl, txnRef, isDemoMode: true }
  }

  const now       = new Date()
  const expireAt  = new Date(now.getTime() + 15 * 60 * 1000) // 15 min window

  const vnpParams: Record<string, string> = {
    vnp_Version:       VNPAY_CONFIG.version,
    vnp_Command:       VNPAY_CONFIG.command,
    vnp_TmnCode:       VNPAY_CONFIG.tmnCode,
    vnp_Amount:        String(amount * 100),           // VNPay expects amount × 100
    vnp_CurrCode:      VNPAY_CONFIG.currCode,
    vnp_TxnRef:        txnRef,
    vnp_OrderInfo:     orderInfo,
    vnp_OrderType:     orderType ?? 'other',
    vnp_Locale:        VNPAY_CONFIG.locale,
    vnp_ReturnUrl:     VNPAY_CONFIG.returnUrl,
    vnp_IpAddr:        ipAddr,
    vnp_CreateDate:    formatDate(now),
    vnp_ExpireDate:    formatDate(expireAt),
  }

  if (bankCode) vnpParams.vnp_BankCode = bankCode

  const signData = sortedQueryString(vnpParams)
  const secureHash = createHmac512(signData, VNPAY_CONFIG.hashSecret)

  const finalQuery = sortedQueryString(vnpParams) + `&vnp_SecureHash=${secureHash}`
  const payUrl = `${VNPAY_CONFIG.payUrl}?${finalQuery}`

  return { payUrl, txnRef, isDemoMode: false }
}

/**
 * Verify VNPay callback / IPN signature.
 * Returns true if the hash is valid (i.e. data was not tampered with).
 */
export function verifyCallbackSignature(query: Record<string, string>): boolean {
  if (IS_DEMO_MODE) return true

  const { vnp_SecureHash, ...rest } = query
  // Remove any extra secure hash fields VNPay may add
  delete rest.vnp_SecureHashType

  const signData   = sortedQueryString(rest)
  const checkHash  = createHmac512(signData, VNPAY_CONFIG.hashSecret)
  return checkHash === vnp_SecureHash
}

/**
 * Decode VNPay response code into human-readable message.
 */
export function decodeResponseCode(code: string): { success: boolean; message: string } {
  const codes: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công nhưng nghi ngờ giao dịch (liên quan đến gian lận)',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
    '10': 'Xác thực thông tin thẻ/TK không đúng quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán — vui lòng thực hiện lại giao dịch',
    '12': 'Thẻ/Tài khoản bị khóa',
    '13': 'Mã OTP không chính xác — vui lòng thực hiện lại giao dịch',
    '24': 'Giao dịch bị hủy bởi khách hàng',
    '51': 'Tài khoản không đủ số dư',
    '65': 'Tài khoản vượt hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng đang bảo trì',
    '79': 'Sai mật khẩu thanh toán quá số lần quy định',
    '99': 'Lỗi không xác định',
  }
  return {
    success: code === '00',
    message: codes[code] ?? `Mã lỗi không xác định: ${code}`,
  }
}

/** Generate a unique transaction reference (max 20 chars, only alphanumeric) */
export function generateTxnRef(prefix = 'SUB'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random    = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`.slice(0, 20)
}
