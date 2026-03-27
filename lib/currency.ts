/**
 * Currency Configuration & Utilities
 * 
 * Centralized currency handling for international expansion.
 * 
 * Strategy:
 * - VND is the primary currency (Vietnam market)
 * - USD display is for international users (reference only for now)
 * - Future: Add price_usd column to subscription_plans for strategic USD pricing
 */

// Exchange rate configuration
// TODO: In the future, this can be fetched from an API or database
export const EXCHANGE_RATES = {
  VND_TO_USD: 25500, // 1 USD = 25,500 VND (updated March 2026)
  
  // Last updated timestamp for reference
  lastUpdated: '2026-03-06',
  
  // Source of the rate
  source: 'manual', // Options: 'manual', 'api', 'database'
} as const

// Supported currencies
export type CurrencyCode = 'VND' | 'USD'

export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  name: string
  locale: string
  decimals: number
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  VND: {
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese Dong',
    locale: 'vi-VN',
    decimals: 0,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
  },
}

/**
 * Convert VND to USD
 */
export function vndToUsd(vnd: number): number {
  return vnd / EXCHANGE_RATES.VND_TO_USD
}

/**
 * Convert USD to VND
 */
export function usdToVnd(usd: number): number {
  return usd * EXCHANGE_RATES.VND_TO_USD
}

/**
 * Format price in VND
 */
export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN')
}

/**
 * Format price in USD
 */
export function formatUSD(amount: number, showDecimals = true): string {
  if (showDecimals) {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }
  return Math.round(amount).toLocaleString('en-US')
}

/**
 * Format price based on currency code
 */
export function formatPrice(amount: number, currency: CurrencyCode): string {
  const config = CURRENCIES[currency]
  
  if (currency === 'VND') {
    return `${formatVND(amount)}${config.symbol}`
  }
  
  return `${config.symbol}${formatUSD(amount)}`
}

/**
 * Get display price for a given locale
 * - Vietnamese locale: show VND
 * - Other locales: show USD (converted from VND)
 */
export function getDisplayPrice(
  priceVnd: number, 
  locale: string,
  priceUsd?: number // Optional: use strategic USD price if available
): { amount: number; currency: CurrencyCode; formatted: string } {
  const isVietnamese = locale === 'vi' || locale.startsWith('vi-')
  
  if (isVietnamese) {
    return {
      amount: priceVnd,
      currency: 'VND',
      formatted: formatPrice(priceVnd, 'VND'),
    }
  }
  
  // For international users
  // Use strategic USD price if provided, otherwise convert from VND
  const usdAmount = priceUsd ?? vndToUsd(priceVnd)
  
  return {
    amount: usdAmount,
    currency: 'USD',
    formatted: formatPrice(usdAmount, 'USD'),
  }
}

/**
 * Get price per period string
 */
export function getPricePerPeriod(
  priceVnd: number,
  period: 'month' | 'year',
  locale: string,
  priceUsd?: number
): string {
  const { formatted, currency } = getDisplayPrice(priceVnd, locale, priceUsd)
  
  if (locale === 'vi' || locale.startsWith('vi-')) {
    return `${formatted}/${period === 'month' ? 'tháng' : 'năm'}`
  }
  
  return `${formatted}/${period}`
}

/**
 * Calculate monthly equivalent from annual price
 */
export function getMonthlyEquivalent(annualPrice: number): number {
  return Math.round(annualPrice / 12)
}

/**
 * Calculate savings percentage between monthly and annual
 */
export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  const yearlyIfMonthly = monthlyPrice * 12
  const savings = yearlyIfMonthly - annualPrice
  return Math.round((savings / yearlyIfMonthly) * 100)
}
