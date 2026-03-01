/**
 * openFDA Recall Fetcher
 *
 * Fetches FDA Enforcement Reports (recalls) from the openFDA API.
 * Supports food, drug, device enforcement endpoints.
 *
 * API docs: https://open.fda.gov/apis/food/enforcement/
 *           https://open.fda.gov/apis/drug/enforcement/
 *           https://open.fda.gov/apis/device/enforcement/
 *
 * No API key required for < 1000 requests/day.
 * Rate limit: 240 requests/minute without key, 120,000/day with key.
 */

export type RecallProductType = 'food' | 'drug' | 'device'

export interface OpenFDARecall {
  recall_number: string
  product_description: string
  recalling_firm: string
  reason_for_recall: string
  recall_initiation_date: string // YYYYMMDD format from openFDA
  termination_date?: string
  recall_type?: string
  voluntary_mandated?: string
  classification: string // "Class I" | "Class II" | "Class III"
  product_type: RecallProductType
  product_quantity?: string
  distribution_pattern?: string
  state?: string
  country?: string
  openfda_url?: string
  status?: string // "Ongoing" | "Terminated" | "Completed"
}

const OPENFDA_ENDPOINTS: Record<RecallProductType, string> = {
  food: 'https://api.fda.gov/food/enforcement.json',
  drug: 'https://api.fda.gov/drug/enforcement.json',
  device: 'https://api.fda.gov/device/enforcement.json',
}

/**
 * Format openFDA date (YYYYMMDD) to ISO date (YYYY-MM-DD)
 */
function formatOpenFDADate(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return dateStr
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
}

/**
 * Build date range filter for openFDA API
 * openFDA uses the format: [YYYYMMDD+TO+YYYYMMDD]
 */
function buildDateRange(daysBack: number): string {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - daysBack)

  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }

  return `[${fmt(start)}+TO+${fmt(end)}]`
}

/**
 * Fetch recalls from a single openFDA enforcement endpoint
 */
async function fetchEndpoint(
  productType: RecallProductType,
  daysBack: number,
  limit: number
): Promise<OpenFDARecall[]> {
  const baseUrl = OPENFDA_ENDPOINTS[productType]
  const dateRange = buildDateRange(daysBack)

  // Search for recalls initiated within the date range
  const searchParam = `recall_initiation_date:${dateRange}`
  const url = `${baseUrl}?search=${searchParam}&sort=recall_initiation_date:desc&limit=${limit}`

  console.log(`[openFDA] Fetching ${productType} recalls: ${url}`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FDA-Label-Compliance-Tool/1.0 (Regulatory Compliance Research)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  })

  // openFDA returns 404 when no results found
  if (response.status === 404) {
    console.log(`[openFDA] No ${productType} recalls found in date range`)
    return []
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `openFDA ${productType} endpoint returned ${response.status}: ${response.statusText}. ${errorText.slice(0, 200)}`
    )
  }

  const json = await response.json()
  const results = json.results || []

  console.log(`[openFDA] Retrieved ${results.length} ${productType} recalls (total: ${json.meta?.results?.total || 'unknown'})`)

  return results.map((r: any) => ({
    recall_number: r.recall_number || `UNKNOWN-${Date.now()}`,
    product_description: r.product_description || '',
    recalling_firm: r.recalling_firm || 'Unknown Firm',
    reason_for_recall: r.reason_for_recall || '',
    recall_initiation_date: r.recall_initiation_date
      ? formatOpenFDADate(r.recall_initiation_date)
      : new Date().toISOString().split('T')[0],
    termination_date: r.termination_date
      ? formatOpenFDADate(r.termination_date)
      : undefined,
    recall_type: r.recall_type || undefined,
    voluntary_mandated: r.voluntary_mandated || undefined,
    classification: r.classification || 'Class III',
    product_type: productType,
    product_quantity: r.product_quantity || undefined,
    distribution_pattern: r.distribution_pattern || undefined,
    state: r.state || undefined,
    country: r.country || 'United States',
    openfda_url: `https://api.fda.gov/${productType}/enforcement.json?search=recall_number:"${r.recall_number}"`,
    status: r.status || 'Ongoing',
  }))
}

/**
 * Fetch all recent recalls across food, drug, and device endpoints
 */
export async function fetchAllRecalls(
  daysBack: number = 60,
  limitPerType: number = 25,
  productTypes: RecallProductType[] = ['food', 'drug', 'device']
): Promise<{ recalls: OpenFDARecall[]; errors: { type: RecallProductType; error: string }[] }> {
  const allRecalls: OpenFDARecall[] = []
  const errors: { type: RecallProductType; error: string }[] = []

  // Fetch each endpoint sequentially to be polite to FDA servers
  for (const type of productTypes) {
    try {
      const recalls = await fetchEndpoint(type, daysBack, limitPerType)
      allRecalls.push(...recalls)

      // Small delay between endpoint calls
      if (productTypes.indexOf(type) < productTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (err: any) {
      console.error(`[openFDA] Error fetching ${type} recalls:`, err.message)
      errors.push({ type, error: err.message })
    }
  }

  console.log(`[openFDA] Total recalls fetched: ${allRecalls.length} across ${productTypes.length} endpoints`)
  return { recalls: allRecalls, errors }
}

/**
 * Build extracted_content text from a recall for embedding
 * This creates a rich text representation suitable for vector search
 */
export function buildRecallContent(recall: OpenFDARecall): string {
  const parts = [
    `FDA RECALL: ${recall.recall_number}`,
    `Classification: ${recall.classification}`,
    `Product Type: ${recall.product_type.toUpperCase()}`,
    '',
    `Recalling Firm: ${recall.recalling_firm}`,
    recall.state ? `Location: ${recall.state}, ${recall.country || 'US'}` : '',
    '',
    `Product: ${recall.product_description}`,
    '',
    `Reason for Recall: ${recall.reason_for_recall}`,
    '',
    recall.distribution_pattern ? `Distribution: ${recall.distribution_pattern}` : '',
    recall.product_quantity ? `Quantity: ${recall.product_quantity}` : '',
    recall.voluntary_mandated ? `Type: ${recall.voluntary_mandated}` : '',
    recall.recall_initiation_date ? `Initiated: ${recall.recall_initiation_date}` : '',
    recall.status ? `Status: ${recall.status}` : '',
  ]

  return parts.filter(Boolean).join('\n').trim()
}

/**
 * Validate that a recall has enough useful content for knowledge base import
 */
export function isValidRecallContent(recall: OpenFDARecall): boolean {
  if (!recall.reason_for_recall || recall.reason_for_recall.trim().length < 20) {
    return false
  }
  if (!recall.product_description || recall.product_description.trim().length < 10) {
    return false
  }
  if (!recall.recall_number) {
    return false
  }
  return true
}
