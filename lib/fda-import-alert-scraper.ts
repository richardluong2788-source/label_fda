/**
 * FDA Import Alert Live Scraper
 *
 * Scrapes real-time Import Alert data from FDA accessdata.fda.gov.
 * Replaces the previous static curated dataset with a live scraper that:
 *   1. Fetches the full alert list from the FDA Import Alerts index page
 *   2. Filters to industry-relevant alerts (food, seafood, supplements, cosmetics, drugs)
 *   3. Scrapes each alert detail page to extract Red List entities, charges, and reasons
 *   4. Returns structured data compatible with the existing DB schema
 *
 * Based on the VeximGlobalFDABot Python scraper, ported to TypeScript with cheerio.
 *
 * FDA Import Alert pages:
 *   Index: https://www.accessdata.fda.gov/cms_ia/ialist.html
 *   Detail: https://www.accessdata.fda.gov/cms_ia/importalert_XXX.html
 */

import * as cheerio from 'cheerio'

// ─── Interfaces (unchanged, compatible with existing DB schema) ────────────

export interface ImportAlertRaw {
  alert_number: string
  alert_title: string
  industry_type: string
  reason_for_alert: string
  action_type: string
  red_list_entities: RedListEntity[]
  effective_date: string | null
  last_updated_date: string | null
  extracted_content: string
  source_url: string
  /**
   * country_scope: if non-empty, this alert ONLY applies to products from these countries.
   * Leave empty [] for category-wide alerts that apply globally.
   * The analyze route uses this to skip false-positive DWPE warnings for non-matching origins.
   */
  country_scope: string[]
}

export interface RedListEntity {
  name: string
  fei_number?: string
  country?: string
  address?: string
  date_added?: string
  date_removed?: string
  is_active: boolean
}

interface FetchResult {
  alerts: ImportAlertRaw[]
  errors: { alert_number: string; error: string }[]
}

interface AlertIndexEntry {
  alert_number: string
  title: string
  detail_url: string
  publish_date: string | null
}

// ─── Constants ─────────────────────────────────────────────────────────────

const FDA_BASE_URL = 'https://www.accessdata.fda.gov'
const FDA_ALERT_LIST_URL = `${FDA_BASE_URL}/cms_ia/ialist.html`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/**
 * Industry-relevant alert prefixes for VN food/supplement/cosmetic/drug exporters.
 * Alerts outside these prefixes are skipped (e.g., medical devices, tobacco, animal drugs).
 */
const RELEVANT_PREFIXES = new Set([
  '03', // Bakery
  '12', // Dairy/Cheese
  '16', // Seafood (CRITICAL for VN)
  '20', // Fruits/Juice
  '21', // Processed Fruits
  '22', // Vine Fruit
  '23', // Nuts/Seeds
  '24', // Vegetables
  '25', // Root vegetables, mushrooms
  '26', // Spices (mustard oil)
  '28', // Spices (pepper)
  '31', // Soursop
  '33', // Candy
  '34', // Cocoa/Confection
  '36', // Honey
  '40', // Infant formula
  '41', // Medical foods
  '45', // Color additives/Sweeteners
  '53', // Cosmetics
  '54', // Dietary supplements
  '55', // Drugs (heparin)
  '62', // Hand sanitizer
  '66', // Drug GMP
  '99', // Cross-category (CRITICAL for VN)
])

/**
 * Prefixes to explicitly skip (medical devices, tobacco, animal drugs, etc.)
 */
const SKIP_PREFIXES = new Set([
  '17', // BSE/Bovine
  '57', // Biologics
  '68', // Animal drugs
  '69', // Medicated feeds
  '71', // Animal food
  '72', // Animal food
  '76', // Medical instruments
  '77', // Medical devices
  '78', // Medical devices
  '79', // Medical devices
  '80', // Medical devices
  '85', // Condoms
  '86', // Ophthalmic devices
  '89', // Device QSR
  '95', // Radiation-emitting products
  '98', // Tobacco
])

// ─── Helper: Fetch with retry and exponential backoff ─────────────────────

async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  baseDelayMs = 2000
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      // Handle rate limiting (429) — wait and retry
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10)
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * Math.pow(2, attempt)
        console.warn(
          `[IA Scraper] Rate limited (429) for ${url}, waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}`
        )
        if (attempt < maxRetries) {
          await sleep(waitMs)
          continue
        }
        throw new Error(`Rate limited (429) after ${maxRetries} retries`)
      }

      // Handle server errors (5xx) — retry with backoff
      if (response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } catch (err: any) {
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const backoffMs = baseDelayMs * Math.pow(2, attempt)
        console.warn(
          `[IA Scraper] Retry ${attempt + 1}/${maxRetries} for ${url} (wait ${backoffMs}ms): ${err.message}`
        )
        await sleep(backoffMs)
      } else {
        throw err
      }
    }
  }
  throw new Error('Unreachable')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Step 1: Fetch all alert codes from FDA index page ─────────────────────

/**
 * Scrapes the FDA Import Alert index page to get all alert codes and titles.
 * Equivalent to Python bot's `get_all_alert_codes()`.
 *
 * The FDA page structure:
 * - An HTML table with rows containing:
 *   - Column 1: Alert Number (e.g., "16-120")
 *   - Column 2: Alert Title (link to detail page)
 *   - Column 3: Published Date
 */
async function fetchAllAlertCodes(): Promise<AlertIndexEntry[]> {
  console.log('[IA Scraper] Fetching FDA Import Alert index...')
  const html = await fetchWithRetry(FDA_ALERT_LIST_URL)
  const $ = cheerio.load(html)

  const entries: AlertIndexEntry[] = []

  // FDA uses a table with rows for each alert
  $('table tr').each((_i, row) => {
    const cells = $(row).find('td')
    if (cells.length < 2) return // skip header or malformed rows

    const firstCell = $(cells[0]).text().trim()
    const link = $(cells[1]).find('a').first()
    const title = link.text().trim() || $(cells[1]).text().trim()
    let href = link.attr('href') || ''

    // Extract alert number from the first cell or title
    const alertMatch = firstCell.match(/(\d{2}-\d+)/) || title.match(/(\d{2}-\d+)/)
    if (!alertMatch) return

    const alertNumber = alertMatch[1]

    // Build full URL
    if (href && !href.startsWith('http')) {
      href = `${FDA_BASE_URL}/cms_ia/${href}`
    }

    // Extract publish date from last cell if available
    const lastCell = $(cells[cells.length - 1]).text().trim()
    const dateMatch = lastCell.match(/\d{2}\/\d{2}\/\d{4}/)
    const publishDate = dateMatch ? dateMatch[0] : null

    entries.push({
      alert_number: alertNumber,
      title: title || `Import Alert ${alertNumber}`,
      detail_url: href || `${FDA_BASE_URL}/cms_ia/importalert_${alertNumber.replace('-', '')}.html`,
      publish_date: publishDate,
    })
  })

  // If table parsing yielded nothing, try parsing list items / links as fallback
  if (entries.length === 0) {
    console.log(
      '[IA Scraper] Table parsing found 0 entries, trying link-based fallback...'
    )
    $('a[href*="importalert_"]').each((_i, el) => {
      const href = $(el).attr('href') || ''
      const text = $(el).text().trim()
      const alertMatch = text.match(/(\d{2}-\d+)/) || href.match(/importalert_(\d+)/)
      if (!alertMatch) return

      let alertNumber = alertMatch[1]
      // Convert importalert_XXX number to XX-XX format if needed
      if (!alertNumber.includes('-') && alertNumber.length >= 3) {
        alertNumber = alertNumber.slice(0, 2) + '-' + alertNumber.slice(2)
      }

      const fullUrl = href.startsWith('http')
        ? href
        : `${FDA_BASE_URL}/cms_ia/${href}`

      entries.push({
        alert_number: alertNumber,
        title: text || `Import Alert ${alertNumber}`,
        detail_url: fullUrl,
        publish_date: null,
      })
    })
  }

  // Deduplicate by alert_number
  const seen = new Set<string>()
  const deduplicated = entries.filter((e) => {
    if (seen.has(e.alert_number)) return false
    seen.add(e.alert_number)
    return true
  })

  console.log(
    `[IA Scraper] Found ${deduplicated.length} total Import Alerts on FDA index`
  )
  return deduplicated
}

// ─── Step 2: Filter to industry-relevant alerts ────────────────────────────

function isRelevantAlert(alertNumber: string): boolean {
  const prefix = alertNumber.split('-')[0]
  if (SKIP_PREFIXES.has(prefix)) return false
  if (RELEVANT_PREFIXES.has(prefix)) return true
  // Unknown prefix — include it to be safe (conservative approach)
  return true
}

// ─── Step 3: Scrape individual alert detail page ───────────────────────────

/**
 * Scrapes an individual FDA Import Alert detail page.
 * Equivalent to Python bot's `scrape_alert_detail()`.
 *
 * Extracts:
 *   - Alert title and metadata
 *   - Reason for alert / charges
 *   - Red List entities (companies on DWPE list)
 *   - Country scope (if title specifies "from [Country]")
 */
async function scrapeAlertDetail(
  entry: AlertIndexEntry
): Promise<ImportAlertRaw> {
  const html = await fetchWithRetry(entry.detail_url)
  const $ = cheerio.load(html)

  // Extract title from page (may be more descriptive than index)
  const pageTitle =
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    entry.title

  // Extract reason for alert / charges section
  let reasonText = ''
  // Try various selectors used by FDA pages
  const reasonSelectors = [
    '#charge_section',
    '.charge-section',
    'h2:contains("Charge")',
    'h3:contains("Charge")',
    'h2:contains("Reason")',
    'h3:contains("Reason")',
    'strong:contains("Charge")',
    'b:contains("Charge")',
  ]

  for (const selector of reasonSelectors) {
    const el = $(selector)
    if (el.length > 0) {
      // Get the element and its following siblings until next heading
      const parent = el.closest('div, section, td')
      if (parent.length > 0) {
        reasonText = parent.text().trim()
      } else {
        reasonText = el.parent().text().trim()
      }
      if (reasonText.length > 20) break
    }
  }

  // Fallback: grab all paragraph text if no structured reason found
  if (reasonText.length < 20) {
    const paragraphs: string[] = []
    $('p').each((_i, el) => {
      const text = $(el).text().trim()
      if (text.length > 30) paragraphs.push(text)
    })
    reasonText = paragraphs.slice(0, 5).join(' ')
  }

  // Extract Red List entities from tables
  const redListEntities = parseRedListTable($)

  // Extract effective date
  let effectiveDate: string | null = null
  let lastUpdatedDate: string | null = null

  const datePatterns = [
    /Published\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /Effective\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /Updated\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /Last\s+(?:Updated|Revised)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  ]

  const bodyText = $('body').text()
  for (const pattern of datePatterns) {
    const match = bodyText.match(pattern)
    if (match) {
      const parsed = parseUSDate(match[1])
      if (!effectiveDate) effectiveDate = parsed
      lastUpdatedDate = parsed
    }
  }

  // Fallback to publish_date from index
  if (!effectiveDate && entry.publish_date) {
    effectiveDate = parseUSDate(entry.publish_date)
    lastUpdatedDate = effectiveDate
  }

  // Determine country scope from title
  const countryScope = extractCountryScope(pageTitle)

  // Determine action type
  const actionType = pageTitle.toLowerCase().includes('without physical examination')
    ? 'DWPE'
    : pageTitle.toLowerCase().includes('surveillance')
      ? 'Surveillance'
      : 'DWPE'

  // Build extracted content (summary for RAG)
  const entitySummary =
    redListEntities.length > 0
      ? ` ${redListEntities.length} firms on Red List.`
      : ''

  const countrySummary =
    countryScope.length > 0
      ? ` Country-scoped: ${countryScope.join(', ')}.`
      : ' Global scope.'

  const extractedContent =
    `Import Alert ${entry.alert_number}: ${pageTitle}. ` +
    `${reasonText.slice(0, 300)}${entitySummary}${countrySummary}`

  return {
    alert_number: entry.alert_number,
    alert_title: pageTitle,
    industry_type: classifyIndustryType(entry.alert_number),
    reason_for_alert: reasonText.slice(0, 2000),
    action_type: actionType,
    red_list_entities: redListEntities,
    effective_date: effectiveDate,
    last_updated_date: lastUpdatedDate,
    extracted_content: extractedContent.slice(0, 5000),
    source_url: entry.detail_url,
    country_scope: countryScope,
  }
}

// ─── Red List Entity Parser ────────────────────────────────────────────────

/**
 * Parses Red List entity tables from FDA Import Alert detail pages.
 * The FDA uses HTML tables with varying structures. The most common pattern:
 *
 * | Firm Name | FEI Number | Country | Address | Product | Date Added |
 *
 * Some alerts use "Green List" (cleared firms) and "Red List" (detained firms).
 * We only capture Red List (active detentions).
 */
function parseRedListTable($: cheerio.CheerioAPI): RedListEntity[] {
  const entities: RedListEntity[] = []

  // Find tables that might contain Red List data
  $('table').each((_tableIdx, table) => {
    const headerRow = $(table).find('tr').first()
    const headerText = headerRow.text().toLowerCase()

    // Look for tables with firm/company columns
    const isFirmTable =
      headerText.includes('firm') ||
      headerText.includes('company') ||
      headerText.includes('manufacturer') ||
      headerText.includes('shipper') ||
      headerText.includes('name') ||
      headerText.includes('fei')

    if (!isFirmTable) return

    // Check if this is specifically a Red List section
    const tableParent = $(table).parent()
    const sectionText = tableParent.prevAll('h2, h3, h4, strong, b').first().text().toLowerCase()
    const isGreenList = sectionText.includes('green list') || sectionText.includes('removal')

    // Skip Green List tables (cleared firms)
    if (isGreenList) return

    // Determine column indices from header
    const headers: string[] = []
    headerRow.find('th, td').each((_i, cell) => {
      headers.push($(cell).text().trim().toLowerCase())
    })

    const nameIdx = headers.findIndex(
      (h) =>
        h.includes('firm') ||
        h.includes('company') ||
        h.includes('manufacturer') ||
        h.includes('shipper') ||
        h.includes('name')
    )
    const feiIdx = headers.findIndex((h) => h.includes('fei'))
    const countryIdx = headers.findIndex((h) => h.includes('country'))
    const addressIdx = headers.findIndex(
      (h) => h.includes('address') || h.includes('city')
    )
    const dateAddedIdx = headers.findIndex(
      (h) => h.includes('date') && h.includes('add')
    )
    const dateRemovedIdx = headers.findIndex(
      (h) => h.includes('date') && (h.includes('remov') || h.includes('delist'))
    )

    // Parse data rows
    $(table)
      .find('tr')
      .slice(1) // skip header
      .each((_rowIdx, row) => {
        const cells = $(row).find('td')
        if (cells.length < 2) return

        const name =
          nameIdx >= 0
            ? $(cells[nameIdx]).text().trim()
            : $(cells[0]).text().trim()

        if (!name || name.length < 2) return

        const entity: RedListEntity = {
          name,
          is_active: true,
        }

        if (feiIdx >= 0 && cells[feiIdx]) {
          entity.fei_number = $(cells[feiIdx]).text().trim() || undefined
        }

        if (countryIdx >= 0 && cells[countryIdx]) {
          entity.country = $(cells[countryIdx]).text().trim() || undefined
        }

        if (addressIdx >= 0 && cells[addressIdx]) {
          entity.address = $(cells[addressIdx]).text().trim() || undefined
        }

        if (dateAddedIdx >= 0 && cells[dateAddedIdx]) {
          const raw = $(cells[dateAddedIdx]).text().trim()
          entity.date_added = raw ? parseUSDate(raw) || raw : undefined
        }

        if (dateRemovedIdx >= 0 && cells[dateRemovedIdx]) {
          const raw = $(cells[dateRemovedIdx]).text().trim()
          if (raw) {
            entity.date_removed = parseUSDate(raw) || raw
            entity.is_active = false
          }
        }

        entities.push(entity)
      })
  })

  // Deduplicate entities by normalized name + country
  // A firm can appear multiple times across different tables on the same page
  const deduplicatedMap = new Map<string, RedListEntity>()
  for (const entity of entities.filter((e) => e.is_active)) {
    const key = normalizeEntityName(entity.name) + '||' + (entity.country || '').toLowerCase().trim()
    const existing = deduplicatedMap.get(key)
    if (!existing) {
      deduplicatedMap.set(key, entity)
    } else {
      // Merge: keep the most complete record (prefer one with FEI, address, etc.)
      if (!existing.fei_number && entity.fei_number) existing.fei_number = entity.fei_number
      if (!existing.address && entity.address) existing.address = entity.address
      if (!existing.date_added && entity.date_added) existing.date_added = entity.date_added
    }
  }

  return Array.from(deduplicatedMap.values())
}

/**
 * Normalizes a firm name for deduplication:
 *   - lowercase, trim whitespace
 *   - collapse multiple spaces
 *   - remove trailing punctuation and common suffixes (CO., LTD, INC, etc.)
 */
function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;]+$/g, '')
    .replace(/\b(co\.?|ltd\.?|inc\.?|corp\.?|llc\.?|joint stock|joint-stock|jsc)\b/gi, '')
    .trim()
}

// ─── Country Scope Extraction ──────────────────────────────────────────────

/**
 * Extracts country scope from alert title.
 * Examples:
 *   "...from China and Hong Kong..." → ['China', 'Hong Kong']
 *   "...from India..." → ['India']
 *   No "from [Country]" → [] (global scope)
 */
function extractCountryScope(title: string): string[] {
  const patterns = [
    /from\s+([\w\s]+?)(?:\s+and\s+([\w\s]+?))?(?:\s+Due|\s+Because|\s+That|\s+for|$)/i,
    /from\s+(Certain\s+Countries)/i,
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      const countries: string[] = []
      const first = match[1]?.trim()

      // Skip generic phrases that aren't actual country names
      if (
        first &&
        !first.match(
          /^(Foreign|Specific|Certain|Firms|Manufacturers|Processors|Importers|Establishments)/i
        )
      ) {
        countries.push(first)
      }

      const second = match[2]?.trim()
      if (
        second &&
        !second.match(
          /^(Foreign|Specific|Certain|Firms|Manufacturers|Processors|Importers|Establishments)/i
        )
      ) {
        countries.push(second)
      }

      if (countries.length > 0) return countries
    }
  }

  return []
}

// ─── Date Parsing ──────────────────────────────────────────────────────────

function parseUSDate(dateStr: string): string | null {
  if (!dateStr) return null
  // MM/DD/YYYY → YYYY-MM-DD
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) {
    return `${match[3]}-${match[1]}-${match[2]}`
  }
  // Try ISO format already
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10)
  }
  return null
}

// ─── Main Export: fetchPriorityAlerts ───────────────────────────────────────

/**
 * Scrapes FDA Import Alerts in real-time.
 * Compatible with existing cron route (same return signature).
 *
 * Flow:
 *   1. Fetch all alert codes from FDA index page
 *   2. Filter to industry-relevant alerts
 *   3. Scrape detail pages with rate limiting
 *   4. Return structured data for DB upsert
 *
 * @param delayMs - Delay between requests to be polite to FDA servers (default 1500ms)
 */
export async function fetchPriorityAlerts(
  delayMs: number = 1500
): Promise<FetchResult> {
  const alerts: ImportAlertRaw[] = []
  const errors: { alert_number: string; error: string }[] = []

  try {
    // Step 1: Get all alert codes from FDA index
    const allEntries = await fetchAllAlertCodes()

    if (allEntries.length === 0) {
      console.error('[IA Scraper] No alerts found on FDA index page')
      return { alerts: [], errors: [{ alert_number: 'INDEX', error: 'No alerts found on FDA index page' }] }
    }

    // Step 2: Filter to relevant industry alerts
    const relevantEntries = allEntries.filter((e) =>
      isRelevantAlert(e.alert_number)
    )

    console.log(
      `[IA Scraper] Filtered to ${relevantEntries.length} industry-relevant alerts (from ${allEntries.length} total)`
    )

    // Step 3: Scrape each alert detail page
    for (let i = 0; i < relevantEntries.length; i++) {
      const entry = relevantEntries[i]

      try {
        console.log(
          `[IA Scraper] Processing ${i + 1}/${relevantEntries.length}: ${entry.alert_number} - ${entry.title.slice(0, 60)}...`
        )

        const alert = await scrapeAlertDetail(entry)
        alerts.push(alert)

        // Rate limit — be polite to FDA servers
        if (delayMs > 0 && i < relevantEntries.length - 1) {
          await sleep(delayMs)
        }
      } catch (err: any) {
        console.error(
          `[IA Scraper] Error scraping ${entry.alert_number}: ${err.message}`
        )
        errors.push({
          alert_number: entry.alert_number,
          error: err.message,
        })
        // Continue with next alert — don't fail entire batch
      }
    }

    console.log(
      `[IA Scraper] Complete: ${alerts.length} alerts scraped, ${errors.length} errors`
    )

    // Log Red List stats
    const totalEntities = alerts.reduce(
      (sum, a) => sum + a.red_list_entities.length,
      0
    )
    console.log(`[IA Scraper] Total Red List entities found: ${totalEntities}`)
  } catch (err: any) {
    console.error('[IA Scraper] Fatal error:', err.message)
    errors.push({ alert_number: 'FATAL', error: err.message })
  }

  return { alerts, errors }
}

// ─── Utility: Classify industry type from alert number prefix ──────────────

export function classifyIndustryType(alertNumber: string): string {
  const prefix = alertNumber.split('-')[0]
  const prefixMap: Record<string, string> = {
    '03': 'food',
    '12': 'food',
    '16': 'food',       // Seafood
    '20': 'food',       // Fruits
    '21': 'food',       // Processed fruits
    '22': 'food',       // Vine fruit
    '23': 'food',       // Nuts/Seeds
    '24': 'food',       // Vegetables
    '25': 'food',       // Root vegetables
    '26': 'food',       // Spices
    '28': 'food',       // Spices
    '31': 'food',       // Soursop
    '33': 'food',       // Candy
    '34': 'food',       // Cocoa
    '36': 'food',       // Honey
    '40': 'food',       // Infant formula
    '41': 'food',       // Medical foods
    '45': 'food',       // Color additives
    '53': 'cosmetic',
    '54': 'dietary-supplement',
    '55': 'drug',       // Heparin
    '62': 'dietary-supplement', // Hand sanitizer
    '66': 'drug',
    '89': 'device',
    '98': 'drug',
    '99': 'food',       // Cross-category
  }
  return prefixMap[prefix] || 'food'
}
