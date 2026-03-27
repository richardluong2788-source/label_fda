/**
 * FDA Warning Letter Scraper
 * 
 * Fetches Warning Letters from FDA's public website.
 * Strategy:
 *   1. Fetch the FDA search results page to get a list of recent letters
 *   2. For each letter, fetch the individual page and extract text content
 * 
 * FDA Search URL pattern:
 *   https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters?combine=&field_letterissue_value[min]=YYYY-MM-DD&field_letterissue_value[max]=YYYY-MM-DD&items_per_page=40
 * 
 * Individual letter pages contain the full text in the page body.
 */

export type ProductCategory = 'food' | 'drug' | 'cosmetic' | 'device' | 'tobacco' | 'veterinary' | 'biologics' | 'unknown'

export interface FDALetterListing {
  letter_id: string
  company_name: string
  subject: string
  issue_date: string
  fda_url: string
  issuing_office: string
  product_type?: ProductCategory
}

export interface FDALetterContent {
  letter_id: string
  company_name: string
  subject: string
  issue_date: string
  fda_url: string
  issuing_office: string
  product_type?: ProductCategory
  content: string
  content_length: number
}

/**
 * Classify an FDA Warning Letter into a product category.
 *
 * Classification priority:
 *   1. issuing_office  — the most reliable signal (parsed directly from FDA page)
 *   2. subject         — often contains product keywords
 *   3. content snippet — keyword scan on first 2 000 chars for further confirmation
 *
 * FDA Issuing Office → Category mapping:
 *   CFSAN (Center for Food Safety and Applied Nutrition)  → food / cosmetic
 *   CDER  (Center for Drug Evaluation and Research)       → drug
 *   CDRH  (Center for Devices and Radiological Health)    → device
 *   CTP   (Center for Tobacco Products)                   → tobacco
 *   CVM   (Center for Veterinary Medicine)                → veterinary
 *   CBER  (Center for Biologics Evaluation and Research)  → biologics
 */
export function classifyProductCategory(
  issuingOffice: string,
  subject: string = '',
  contentSnippet: string = '',
): ProductCategory {
  const office = (issuingOffice || '').toLowerCase()
  const sub    = (subject        || '').toLowerCase()
  const snip   = (contentSnippet || '').toLowerCase().slice(0, 2000)

  // ── 1. Issuing office (authoritative) ──────────────────────────────────────
  if (office.includes('cfsan')) {
    // CFSAN covers both food AND cosmetics. Distinguish via subject/content.
    if (
      sub.includes('cosmetic') || sub.includes('makeup') || sub.includes('lotion') ||
      sub.includes('shampoo') || sub.includes('cream') || sub.includes('serum') ||
      snip.includes('cosmetic') || snip.includes('personal care product')
    ) return 'cosmetic'
    return 'food'
  }
  if (office.includes('cder'))  return 'drug'
  if (office.includes('cdrh'))  return 'device'
  if (office.includes('ctp') || office.includes('tobacco')) return 'tobacco'
  if (office.includes('cvm') || office.includes('veterinary')) return 'veterinary'
  if (office.includes('cber') || office.includes('biologics')) return 'biologics'

  // Broader office text matches
  if (office.includes('food safety') || office.includes('nutrition')) return 'food'
  if (office.includes('drug'))        return 'drug'
  if (office.includes('device') || office.includes('radiological')) return 'device'

  // ── 2. Subject line keywords ───────────────────────────────────────────────
  const FOOD_KW      = ['food', 'dietary supplement', 'nutrition', 'beverage', 'infant formula', 'seafood', 'produce', 'listeria', 'salmonella', 'e. coli', 'aflatoxin']
  const DRUG_KW      = ['drug', 'pharmaceutical', 'medication', 'tablet', 'capsule', 'injection', 'api', 'active pharmaceutical', 'cgmp', 'usp', 'dosage form', 'otc', 'rx', 'prescription']
  const COSMETIC_KW  = ['cosmetic', 'makeup', 'lotion', 'shampoo', 'conditioner', 'moisturizer', 'sunscreen', 'lipstick', 'mascara', 'perfume', 'fragrance', 'personal care']
  const DEVICE_KW    = ['device', 'medical device', 'implant', 'diagnostic', '510(k)', 'pma', 'instrument', 'equipment', 'sterilization', 'udi']
  const TOBACCO_KW   = ['tobacco', 'cigarette', 'e-cigarette', 'vape', 'nicotine', 'cigar']
  const VET_KW       = ['veterinary', 'animal feed', 'animal drug', 'livestock', 'pet food']
  const BIOLOGICS_KW = ['biologic', 'vaccine', 'blood', 'tissue', 'gene therapy', 'cellular therapy']

  const matches = (keywords: string[], text: string) => keywords.some(k => text.includes(k))

  const combined = `${sub} ${snip}`

  if (matches(TOBACCO_KW,   combined)) return 'tobacco'
  if (matches(VET_KW,       combined)) return 'veterinary'
  if (matches(BIOLOGICS_KW, combined)) return 'biologics'
  if (matches(DEVICE_KW,    combined)) return 'device'
  if (matches(COSMETIC_KW,  combined)) return 'cosmetic'
  if (matches(DRUG_KW,      combined)) return 'drug'
  if (matches(FOOD_KW,      combined)) return 'food'

  return 'unknown'
}

const FDA_BASE_URL = 'https://www.fda.gov'
const FDA_SEARCH_PATH = '/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters'

/**
 * Fetch the list of recent Warning Letters from FDA's listing page
 * Parses the HTML table to extract letter metadata and URLs
 */
export async function fetchFDALetterListings(
  daysBack: number = 30,
  maxResults: number = 40
): Promise<FDALetterListing[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  const minDate = formatDate(startDate)
  const maxDate = formatDate(endDate)

  const searchUrl = `${FDA_BASE_URL}${FDA_SEARCH_PATH}?combine=&field_letterissue_value%5Bmin%5D=${minDate}&field_letterissue_value%5Bmax%5D=${maxDate}&items_per_page=${maxResults}`

  console.log(`[FDA Scraper] Fetching listings from: ${searchUrl}`)

  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'FDA-Label-Compliance-Tool/1.0 (Regulatory Compliance Research)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`FDA search page returned ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()
  return parseListingHTML(html)
}

/**
 * Parse the FDA listing page HTML to extract letter entries from the table
 * The FDA page has a table with columns: Posted Date, Company, Subject, Issuing Office, Response Letter
 */
function parseListingHTML(html: string): FDALetterListing[] {
  const letters: FDALetterListing[] = []

  // Match table rows containing letter data
  // Each row has: date, company link, subject, issuing office
  const rowRegex = /<tr[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  const rows = html.match(rowRegex) || []

  console.log(`[FDA Scraper] Found ${rows.length} table rows to parse`)

  // If no rows found with strict regex, try looser pattern
  if (rows.length === 0) {
    console.log('[FDA Scraper] No rows found with strict pattern, trying looser pattern')
    const looseRows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
    console.log(`[FDA Scraper] Found ${looseRows.length} rows with loose pattern`)
    
    // Also log a sample of the HTML to debug structure
    const htmlSample = html.substring(0, 2000)
    console.log('[FDA Scraper] HTML sample:', htmlSample)
  }

  for (const row of rows) {
    try {
      // Extract date (first <time> or <td> with date pattern)
      const dateMatch = row.match(/<time[^>]*datetime="([^"]*)"[^>]*>/) ||
                        row.match(/(\d{2}\/\d{2}\/\d{4})/)
      
      // Extract company name and URL from the link
      const linkMatch = row.match(/<a[^>]*href="(\/inspections-compliance-enforcement-and-criminal-investigations\/warning-letters\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/)

      if (!linkMatch) continue

      const letterPath = linkMatch[1]
      const companyName = stripHTML(linkMatch[2]).trim()
      const fdaUrl = `${FDA_BASE_URL}${letterPath}`

      // Extract date
      let issueDate = ''
      if (dateMatch) {
        issueDate = dateMatch[1]
        // Normalize date format to YYYY-MM-DD
        if (issueDate.includes('/')) {
          const parts = issueDate.split('/')
          if (parts.length === 3) {
            issueDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
          }
        } else if (issueDate.includes('T')) {
          issueDate = issueDate.split('T')[0]
        }
      }

      // Extract subject (second link or text in subject column)
      const subjectMatch = row.match(/<td[^>]*class="[^"]*views-field-field-letter-subject[^"]*"[^>]*>([\s\S]*?)<\/td>/)
      const subject = subjectMatch ? stripHTML(subjectMatch[1]).trim() : ''

      // Extract issuing office
      const officeMatch = row.match(/<td[^>]*class="[^"]*views-field-field-letter-issuing-office[^"]*"[^>]*>([\s\S]*?)<\/td>/)
      const issuingOffice = officeMatch ? stripHTML(officeMatch[1]).trim() : ''

      // Generate letter_id from URL path
      const letterId = letterPath.split('/').pop() || `fda-${Date.now()}`

      if (companyName && fdaUrl) {
        letters.push({
          letter_id: letterId,
          company_name: companyName,
          subject: subject || companyName,
          issue_date: issueDate,
          fda_url: fdaUrl,
          issuing_office: issuingOffice,
        })
      }
    } catch (err) {
      console.warn('[FDA Scraper] Error parsing row:', err)
      continue
    }
  }

  // If no letters found, try extracting all warning letter links from the page
  if (letters.length === 0) {
    console.log('[FDA Scraper] No letters parsed from rows, trying to extract all warning letter links')
    const linkRegex = /<a[^>]*href="(\/inspections-compliance-enforcement-and-criminal-investigations\/warning-letters\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    let match
    
    while ((match = linkRegex.exec(html)) !== null) {
      const letterPath = match[1]
      const linkText = stripHTML(match[2]).trim()
      
      // Filter out informational/navigation pages
      if (isInformationalPage(linkText, letterPath)) {
        console.log(`[FDA Scraper] Skipping informational page: ${linkText}`)
        continue
      }
      
      // Try to parse date and company from link text or surrounding HTML
      const company = linkText.split(/\s+–\s+/)[0] || 'Unknown Company'
      const letterId = letterPath.split('/').pop() || `fda-${Date.now()}`
      
      letters.push({
        letter_id: letterId,
        company_name: company,
        subject: linkText,
        issue_date: new Date().toISOString().split('T')[0],
        fda_url: `${FDA_BASE_URL}${letterPath}`,
        issuing_office: 'Unknown',
      })
    }
    
    console.log(`[FDA Scraper] Extracted ${letters.length} letters from direct link search`)
  }

  console.log(`[FDA Scraper] Parsed ${letters.length} letters from listing page`)
  return letters
}

/**
 * Fetch and extract the full text content of an individual Warning Letter page
 */
export async function fetchLetterContent(fdaUrl: string): Promise<string> {
  console.log(`[FDA Scraper] Fetching letter content from: ${fdaUrl}`)

  const response = await fetch(fdaUrl, {
    headers: {
      'User-Agent': 'FDA-Label-Compliance-Tool/1.0 (Regulatory Compliance Research)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Letter page returned ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()
  return extractLetterText(html)
}

/**
 * Extract the main letter text from an FDA Warning Letter page HTML
 * The letter content is typically in the main content area with specific CSS classes
 */
function extractLetterText(html: string): string {
  // Strategy: Try multiple selectors in order of specificity

  // 1. Try the main article body content
  const bodyFieldMatch = html.match(
    /<div[^>]*class="[^"]*field--name-body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div[^>]*class="[^"]*field--name)/i
  )

  // 2. Try the layout content area
  const layoutMatch = html.match(
    /<div[^>]*class="[^"]*layout__region--content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i
  )

  // 3. Try article body
  const articleMatch = html.match(
    /<article[^>]*>([\s\S]*?)<\/article>/i
  )

  // 4. Broad content region
  const contentMatch = html.match(
    /<div[^>]*id="block-mainpagecontent"[^>]*>([\s\S]*?)<\/div>\s*<\/main>/i
  ) || html.match(
    /<main[^>]*>([\s\S]*?)<\/main>/i
  )

  const rawContent = bodyFieldMatch?.[1] || layoutMatch?.[1] || articleMatch?.[1] || contentMatch?.[1] || ''

  if (!rawContent) {
    console.warn('[FDA Scraper] Could not find letter content in page HTML')
    // Fallback: extract all paragraph text from the page
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
    const fallbackText = paragraphs
      .map(p => stripHTML(p).trim())
      .filter(t => t.length > 50) // Filter out short nav/footer text
      .join('\n\n')
    return cleanText(fallbackText)
  }

  return cleanText(stripHTML(rawContent))
}

// ====== Validation Functions ======

/**
 * Validate that fetched content is an actual warning letter (not empty, has violation keywords)
 */
export function isValidWarningLetterContent(content: string): boolean {
  if (!content || content.trim().length < 200) {
    return false
  }

  // Check for warning letter-specific keywords indicating violations/compliance issues
  const letterKeywords = [
    'violation',
    'violate',
    'non-compliant',
    'noncompliant',
    'non-compliance',
    'failure',
    'failed',
    'required',
    'requirement',
    'fda regulations',
    'code of federal regulations',
    'cfr',
    'corrective action',
    'warning letter',
    'compliance',
    'unlawful',
    'prohibited',
  ]

  const lowerContent = content.toLowerCase()
  const keywordMatches = letterKeywords.filter(kw => lowerContent.includes(kw)).length

  // Need at least 3 violation-related keywords for it to be a valid warning letter
  return keywordMatches >= 3
}

// ====== Utility Functions ======

function stripHTML(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, '--')
    .replace(/&ndash;/g, '-')
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .trim()
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Check if a link is an informational/navigation page rather than an actual warning letter
 */
function isInformationalPage(linkText: string, letterPath: string): boolean {
  const lowerText = linkText.toLowerCase()
  const lowerPath = letterPath.toLowerCase()
  
  // Common navigation/informational page patterns
  const informationalPatterns = [
    'warning letters',
    'view all',
    'see all',
    'more information',
    'about warning letters',
    'search',
    'archive',
    'index',
    'browse',
    'filter',
    'results',
  ]
  
  // Check if link text matches informational patterns
  for (const pattern of informationalPatterns) {
    if (lowerText.includes(pattern)) {
      return true
    }
  }
  
  // Check if path looks like an informational page (too short or generic)
  if (lowerPath === '/inspections-compliance-enforcement-and-criminal-investigations/warning-letters' ||
      lowerPath === '/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/') {
    return true
  }
  
  // Valid warning letters typically have company names (longer text)
  if (linkText.trim().length < 3) {
    return true
  }
  
  return false
}
