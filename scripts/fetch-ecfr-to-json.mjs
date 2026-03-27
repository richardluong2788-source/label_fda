#!/usr/bin/env node
/**
 * fetch-ecfr-to-json.mjs  v2.0
 *
 * Fetches 21 CFR Parts from the eCFR public API and converts HTML into
 * structured JSON compatible with the Vexim bulk-import pipeline.
 *
 * v2.0 improvements over v1:
 *   - HTML <table> → Markdown table  (critical for Part 101 nutrition data)
 *   - <img> → descriptive alt-text placeholders
 *   - Versioning: stores lastAmendedDate, can compare with existing DB data
 *
 * Usage:
 *   node scripts/fetch-ecfr-to-json.mjs 740
 *   node scripts/fetch-ecfr-to-json.mjs 101 111 117
 *   node scripts/fetch-ecfr-to-json.mjs --all
 *   node scripts/fetch-ecfr-to-json.mjs --check-updates   (version check only)
 *
 * Output: scripts/output/21cfr{part}.json
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, 'output')

// ─────────────────────────────────────────────────────────────────────────────
// 1. HTML TABLE → MARKDOWN TABLE
//    This is the most critical conversion. FDA tables (Nutrition Facts, food
//    additive limits, etc.) must preserve their columnar structure so the AI
//    can correctly interpret numeric values.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a single <table> HTML string into a Markdown table.
 * Handles <thead>/<tbody>, <th>/<td>, rowspan/colspan (basic), nested tables.
 *
 * Example output:
 *   | Nutrient | Daily Value |
 *   |----------|-------------|
 *   | Fat      | 78g         |
 */
function htmlTableToMarkdown(tableHtml) {
  // Parse rows: find all <tr>...</tr>
  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  if (rowMatches.length === 0) return stripHtml(tableHtml)

  const rows = []
  let isFirstRow = true
  let hasExplicitHeader = tableHtml.includes('<thead') || tableHtml.includes('<th')

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1]
    // Extract cells: both <th> and <td>
    const cellMatches = [...rowHtml.matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi)]
    const cells = cellMatches.map(m => {
      let cellText = m[2]
      // Recursively handle nested tables
      if (cellText.includes('<table')) {
        cellText = cellText.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (nested) =>
          htmlTableToMarkdown(nested)
        )
      }
      // Strip remaining HTML inside cell, preserve line structure
      return stripHtml(cellText).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim()
    })

    if (cells.length === 0) continue

    const isHeader = cellMatches.some(m => m[1].toLowerCase() === 'th') ||
                     (isFirstRow && hasExplicitHeader)

    rows.push({ cells, isHeader })
    isFirstRow = false
  }

  if (rows.length === 0) return stripHtml(tableHtml)

  // Determine column count (max cells in any row)
  const numCols = Math.max(...rows.map(r => r.cells.length))

  // Build markdown
  const lines = []
  let headerEmitted = false

  for (const row of rows) {
    // Pad cells to numCols
    const paddedCells = [...row.cells]
    while (paddedCells.length < numCols) paddedCells.push('')

    lines.push('| ' + paddedCells.join(' | ') + ' |')

    // Emit separator after first header row
    if (row.isHeader && !headerEmitted) {
      lines.push('| ' + paddedCells.map(c => '---').join(' | ') + ' |')
      headerEmitted = true
    }
  }

  // If no explicit header was found, add separator after first row
  if (!headerEmitted && lines.length > 0) {
    const sepLine = '| ' + Array(numCols).fill('---').join(' | ') + ' |'
    lines.splice(1, 0, sepLine)
  }

  return '\n\n' + lines.join('\n') + '\n\n'
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. IMAGE → ALT-TEXT PLACEHOLDER
//    FDA regulations occasionally include label layout diagrams. Since we can't
//    embed images into text embeddings, we generate descriptive alt-text that
//    tells the AI (and the user) what the image shows and where to find it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace <img> tags with descriptive text placeholders.
 * Preserves the alt attribute if present, adds eCFR reference URL.
 */
function convertImagesToAltText(html, partNumber) {
  return html.replace(/<img\b([^>]*)>/gi, (fullMatch, attrs) => {
    const altMatch = attrs.match(/alt\s*=\s*["']([^"']+)["']/i)
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i)

    const altText = altMatch ? altMatch[1].trim() : null
    const src = srcMatch ? srcMatch[1].trim() : null

    // Build descriptive placeholder
    let description = ''
    if (altText) {
      description = altText
    } else if (src) {
      // Try to infer from filename
      const fileName = src.split('/').pop()?.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') || 'diagram'
      description = `FDA regulatory diagram: ${fileName}`
    } else {
      description = 'FDA regulatory illustration'
    }

    const refUrl = `https://www.ecfr.gov/current/title-21/part-${partNumber}`
    return `\n\n[FIGURE: ${description}. See official eCFR at ${refUrl} for the visual diagram.]\n\n`
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VERSIONING
//    Uses the eCFR Versioner API to get the last amendment date for each Part.
//    Stores it in meta.lastAmendedDate so we can compare with the DB later.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the latest amendment date for a Part from the eCFR Versioner API.
 * Returns ISO date string (e.g. "2024-11-15") or null if unavailable.
 */
async function fetchLastAmendedDate(partNumber) {
  try {
    const url = `https://www.ecfr.gov/api/versioner/v1/versions/title-21?part=${partNumber}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VeximGlobal-CFR-Fetcher/2.0' },
    })

    if (!response.ok) {
      console.log(`[fetch-ecfr] WARNING: Versioner API returned ${response.status} for Part ${partNumber}`)
      return null
    }

    const data = await response.json()

    // The API returns an array of version objects, each with a "date" field
    // The last entry is the most recent version
    if (data.content_versions && data.content_versions.length > 0) {
      const sorted = data.content_versions
        .map(v => v.date || v.amendment_date)
        .filter(Boolean)
        .sort()
      return sorted[sorted.length - 1] || null
    }

    return null
  } catch (err) {
    console.log(`[fetch-ecfr] WARNING: Could not fetch version info for Part ${partNumber}:`, err.message)
    return null
  }
}

/**
 * Compare current amendment date with previously saved JSON file.
 * Returns { needsUpdate, oldDate, newDate }.
 */
function checkIfUpdateNeeded(partNumber, newDate) {
  const filePath = join(OUTPUT_DIR, `21cfr${partNumber}.json`)
  if (!existsSync(filePath)) {
    return { needsUpdate: true, oldDate: null, newDate, reason: 'No local file exists' }
  }

  try {
    const existing = JSON.parse(readFileSync(filePath, 'utf-8'))
    const oldDate = existing.meta?.lastAmendedDate || null

    if (!oldDate) {
      return { needsUpdate: true, oldDate: null, newDate, reason: 'Old file has no version info' }
    }
    if (!newDate) {
      return { needsUpdate: false, oldDate, newDate: null, reason: 'Could not fetch new version info' }
    }
    if (newDate > oldDate) {
      return { needsUpdate: true, oldDate, newDate, reason: `Updated: ${oldDate} → ${newDate}` }
    }

    return { needsUpdate: false, oldDate, newDate, reason: 'Already up to date' }
  } catch {
    return { needsUpdate: true, oldDate: null, newDate, reason: 'Could not read existing file' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML → TEXT (improved: converts tables first, then strips remaining HTML)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple strip of HTML tags + entity decode (used inside table cells etc.)
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2019;/g, '\u2019')
    .replace(/&#xA7;/g, '\u00A7')
    .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1))))
    .trim()
}

/**
 * Full HTML → text conversion with proper table and image handling.
 * Order matters:
 *   1. Convert <table> → Markdown table (preserves numeric data structure)
 *   2. Convert <img> → alt-text placeholders
 *   3. Convert block-level elements → newlines
 *   4. Strip remaining tags and decode entities
 */
function htmlToText(html, partNumber = '0') {
  let text = html

  // STEP 1: Convert all <table>...</table> to Markdown before stripping
  text = text.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, match =>
    htmlTableToMarkdown(match)
  )

  // STEP 2: Convert images to alt-text
  text = convertImagesToAltText(text, partNumber)

  // STEP 3: Replace block-level elements with double newlines
  text = text.replace(/<\/?(p|div|br|li|h[1-6]|blockquote|pre|section|article)[^>]*>/gi, '\n\n')

  // STEP 4: Handle list items
  text = text.replace(/<li[^>]*>/gi, '\n- ')

  // STEP 5: Strip remaining tags
  text = text.replace(/<[^>]+>/g, '')

  // STEP 6: Decode entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2019;/g, '\u2019')
    .replace(/&#xA7;/g, '\u00A7')
    .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1))))

  // STEP 7: Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')       // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')    // max 2 consecutive newlines
    .trim()

  return text
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse subsections from a section's content text.
 * Looks for patterns like (a), (b), (1), (2), etc. at paragraph starts.
 */
function parseSubsections(sectionId, content) {
  const subPattern = /(?:^|\n\n)\s*\(([a-z])\)\s+/g
  const matches = [...content.matchAll(subPattern)]

  if (matches.length < 2) return []

  const subsections = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const letter = match[1]
    const startIdx = match.index + match[0].length
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : content.length
    const subContent = content.slice(startIdx, endIdx).trim()

    subsections.push({
      id: `${sectionId}(${letter})`,
      title: `(${letter})`,
      content: subContent,
    })
  }

  return subsections
}

/**
 * Fetch and parse a single CFR Part from the eCFR API.
 */
async function fetchAndParsePart(partNumber) {
  const url = `https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-21?part=${partNumber}`
  console.log(`\n[fetch-ecfr] Fetching Part ${partNumber} from: ${url}`)

  const response = await fetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'VeximGlobal-CFR-Fetcher/2.0',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for Part ${partNumber}`)
  }

  const html = await response.text()
  console.log(`[fetch-ecfr] Received ${(html.length / 1024).toFixed(1)} KB of HTML`)

  // Count tables and images for stats
  const tableCount = (html.match(/<table/gi) || []).length
  const imgCount = (html.match(/<img/gi) || []).length
  console.log(`[fetch-ecfr] Contains ${tableCount} table(s), ${imgCount} image(s)`)

  // Convert HTML → text with table/image preservation
  const fullText = htmlToText(html, partNumber)

  // Fetch version info
  const lastAmendedDate = await fetchLastAmendedDate(partNumber)
  console.log(`[fetch-ecfr] Last amended date: ${lastAmendedDate || 'unknown'}`)

  // Split on section headers: "§ NNN.NNN ..."
  const sectionPattern = new RegExp(
    `(\\u00A7\\s*${partNumber}\\.\\d+[a-z]?(?:\\s*[-\u2013\u2014]\\s*${partNumber}\\.\\d+[a-z]?)?\\s+[^\\n]+)`,
    'g'
  )

  let sectionHeaders = [...fullText.matchAll(sectionPattern)]
  console.log(`[fetch-ecfr] Found ${sectionHeaders.length} section headers`)

  if (sectionHeaders.length === 0) {
    console.log('[fetch-ecfr] Trying fallback pattern...')
    const fallbackPattern = /(\u00A7\s*\d+\.\d+[a-z]?\s+[^\n]+)/g
    sectionHeaders = [...fullText.matchAll(fallbackPattern)]
    console.log(`[fetch-ecfr] Fallback found ${sectionHeaders.length} section headers`)

    if (sectionHeaders.length === 0) {
      console.log('[fetch-ecfr] No section headers found, creating single section')
      return {
        meta: {
          title: `21 CFR Part ${partNumber}`,
          part: partNumber,
          fetched_at: new Date().toISOString(),
          lastAmendedDate,
          source_url: url,
          tables_converted: tableCount,
          images_converted: imgCount,
        },
        sections: [{
          id: `${partNumber}.0`,
          title: `Part ${partNumber} - Full Text`,
          content: fullText,
          subsections: [],
        }],
      }
    }
  }

  return buildResult(partNumber, url, fullText, sectionHeaders, lastAmendedDate, tableCount, imgCount)
}

function buildResult(partNumber, url, fullText, sectionHeaders, lastAmendedDate, tableCount, imgCount) {
  const sections = []
  const partTitleMatch = fullText.match(/PART\s+\d+\s*[-\u2013\u2014]\s*([^\n]+)/i)
  const partTitle = partTitleMatch
    ? `21 CFR Part ${partNumber} - ${partTitleMatch[1].trim()}`
    : `21 CFR Part ${partNumber}`

  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i]
    const title = header[1].trim()

    const idMatch = title.match(/\u00A7\s*(\d+\.\d+[a-z]?)/)
    const id = idMatch ? idMatch[1] : `${partNumber}.unknown_${i}`

    const startIdx = header.index + header[0].length
    const endIdx = i + 1 < sectionHeaders.length
      ? sectionHeaders[i + 1].index
      : fullText.length

    let content = fullText.slice(startIdx, endIdx).trim()

    // Clean trailing metadata
    content = content
      .replace(/\n\s*Authority:[\s\S]*$/i, '')
      .replace(/\n\s*Source:[\s\S]*$/i, '')
      .replace(/\n\s*Effective Date Note:[\s\S]*$/i, '')
      .trim()

    content = content.replace(/\[([^\]]{1,80})\]/g, '$1')

    const subsections = parseSubsections(id, content)

    // Detect if this section contains tables (useful for metadata)
    const hasTable = content.includes('| ') && content.includes(' | ')

    sections.push({
      id,
      title: `\u00A7 ${id} ${title.replace(/\u00A7\s*\d+\.\d+[a-z]?\s*/, '').trim()}`.trim(),
      content,
      subsections,
      ...(hasTable ? { contains_table: true } : {}),
    })
  }

  console.log(`[fetch-ecfr] Parsed ${sections.length} sections for Part ${partNumber}`)

  // Deduplicate
  const seen = new Set()
  const dedupedSections = sections.filter(s => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })

  if (dedupedSections.length < sections.length) {
    console.log(`[fetch-ecfr] Deduped: ${sections.length} -> ${dedupedSections.length} sections`)
  }

  return {
    meta: {
      title: partTitle,
      part: partNumber,
      fetched_at: new Date().toISOString(),
      lastAmendedDate,
      source_url: url,
      total_sections: dedupedSections.length,
      tables_converted: tableCount,
      images_converted: imgCount,
    },
    sections: dedupedSections,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL VEXIM PARTS
// ─────────────────────────────────────────────────────────────────────────────

const ALL_VEXIM_PARTS = [
  // General / Registration / Recalls
  '1', '7',
  // Food Labeling
  '101', '102',
  // Dietary Supplements cGMP
  '111',
  // Produce Safety
  '112',
  // FSMA Preventive Controls
  '117',
  // Standards of Identity
  '131', '145', '146', '161',
  // Food Additives & GRAS
  '170', '172', '182', '184',
  // Cosmetics
  '700', '701', '710', '720', '740',
  // Medical Devices
  '801', '807', '820',
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)

  // ── --check-updates: version check only, no re-fetch ────────────────────
  if (args.includes('--check-updates')) {
    console.log('[fetch-ecfr] Checking for updates across all Vexim parts...\n')
    mkdirSync(OUTPUT_DIR, { recursive: true })

    const updateResults = []
    for (const part of ALL_VEXIM_PARTS) {
      const newDate = await fetchLastAmendedDate(part)
      const check = checkIfUpdateNeeded(part, newDate)
      updateResults.push({ part, ...check })

      const icon = check.needsUpdate ? 'UPDATE AVAILABLE' : 'up to date'
      console.log(`  Part ${part.padStart(3)}: ${icon} (${check.reason})`)

      await new Promise(r => setTimeout(r, 300))
    }

    const needsUpdate = updateResults.filter(r => r.needsUpdate)
    console.log(`\n[fetch-ecfr] ${needsUpdate.length} of ${ALL_VEXIM_PARTS.length} parts need updating.`)
    if (needsUpdate.length > 0) {
      console.log('[fetch-ecfr] Run the following to update them:')
      console.log(`  node scripts/fetch-ecfr-to-json.mjs ${needsUpdate.map(r => r.part).join(' ')}`)
    }
    return
  }

  // ── Normal fetch mode ─────────────────────────────────────────────────────
  if (args.length === 0) {
    console.log('[fetch-ecfr] No part numbers specified.')
    console.log('[fetch-ecfr] Usage:  node scripts/fetch-ecfr-to-json.mjs 740')
    console.log('[fetch-ecfr]         node scripts/fetch-ecfr-to-json.mjs 101 111 117  (multiple parts)')
    console.log('[fetch-ecfr]         node scripts/fetch-ecfr-to-json.mjs --all        (all Vexim parts)')
    console.log('[fetch-ecfr]         node scripts/fetch-ecfr-to-json.mjs --check-updates  (version check only)')
    console.log('[fetch-ecfr] Fetching demo Part 740 (Cosmetics warnings) as example...')
    args.push('740')
  }

  // --all flag
  if (args.includes('--all')) {
    args.length = 0
    args.push(...ALL_VEXIM_PARTS)
    console.log(`[fetch-ecfr] --all flag: will fetch ${args.length} parts`)
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })

  const results = []

  for (const partNum of args) {
    try {
      const result = await fetchAndParsePart(partNum)

      const outputPath = join(OUTPUT_DIR, `21cfr${partNum}.json`)
      writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
      console.log(`[fetch-ecfr] Saved: ${outputPath}`)
      console.log(`[fetch-ecfr] Stats for Part ${partNum}:`)
      console.log(`  - Sections: ${result.sections.length}`)
      console.log(`  - Total subsections: ${result.sections.reduce((sum, s) => sum + s.subsections.length, 0)}`)
      console.log(`  - Total content chars: ${result.sections.reduce((sum, s) => sum + s.content.length, 0)}`)
      console.log(`  - Tables converted to Markdown: ${result.meta.tables_converted}`)
      console.log(`  - Images converted to alt-text: ${result.meta.images_converted}`)
      console.log(`  - Last amended: ${result.meta.lastAmendedDate || 'unknown'}`)

      const sectionsWithTables = result.sections.filter(s => s.contains_table)
      if (sectionsWithTables.length > 0) {
        console.log(`  - Sections containing tables: ${sectionsWithTables.length} (${sectionsWithTables.map(s => s.id).join(', ')})`)
      }

      results.push({ part: partNum, sections: result.sections.length, tables: result.meta.tables_converted, status: 'ok' })

      // Rate limit: 1s between requests
      if (args.indexOf(partNum) < args.length - 1) {
        console.log('[fetch-ecfr] Waiting 1s before next request...')
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (error) {
      console.error(`[fetch-ecfr] ERROR for Part ${partNum}:`, error.message)
      results.push({ part: partNum, sections: 0, tables: 0, status: 'error', error: error.message })
    }
  }

  console.log('\n[fetch-ecfr] ========== SUMMARY ==========')
  console.table(results)
  console.log(`\nOutput files are in: ${OUTPUT_DIR}/`)
  console.log('\n--- HOW TO IMPORT INTO VEXIM ---')
  console.log('Option A: Upload via Admin UI')
  console.log('  1. Go to /admin/knowledge')
  console.log('  2. Click "Upload File" and select the JSON file')
  console.log('  3. The upload route will use buildCorrectMetadata to assign the correct industry\n')
  console.log('Option B: Use the bulk-import API directly')
  console.log('  POST /api/knowledge/bulk-import')
  console.log('  Body: { "fileName": "21cfr740.json", "sections": [...] }')
  console.log('\n--- VERSION CHECKING ---')
  console.log('To check if any parts have been updated by the FDA:')
  console.log('  node scripts/fetch-ecfr-to-json.mjs --check-updates')
}

main().catch(console.error)
