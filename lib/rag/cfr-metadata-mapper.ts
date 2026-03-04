/**
 * CFR Metadata Mapper
 *
 * Single source of truth for mapping 21 CFR Part numbers to their correct
 * industry, category, regulation label, and source string.
 *
 * Used by:
 * - bulk-import API route (at insert time)
 * - re-import API route (at insert time)
 * - upload API route (at insert time)
 * - Supabase DB trigger (via SQL migration 017)
 *
 * By centralising this logic here, switching servers / re-running migrations
 * will NEVER produce wrong industry/category metadata again.
 */

export interface CfrPartInfo {
  partNumber: string
  source: string          // e.g. "21 CFR Part 701"
  regulation: string      // same as source, used in metadata.regulation
  industry: string        // e.g. "Cosmetics"
  category: string        // e.g. "cosmetic"  (matches intent-classifier categories)
  documentType: string    // e.g. "FDA Regulation"
}

// Master mapping table — add new parts here as needed
const CFR_PART_MAP: Record<string, Omit<CfrPartInfo, 'partNumber'>> = {
  // ── Customs / Country of Origin (Title 19, Chapter I) ────────────────────
  // NOTE: These are 19 CFR (CBP) parts — industry/category uses 'import_compliance'
  // to separate them from 21 CFR FDA regulations in RAG filtering.
  '19_134': { source: '19 CFR Part 134', regulation: '19 CFR Part 134', industry: 'Import Compliance', category: 'import_compliance', documentType: 'CBP Regulation' }, // Country of Origin Marking
  // ── General Administrative (Title 21, Chapter I, Parts 1–99) ─────────────
  '1':   { source: '21 CFR Part 1',   regulation: '21 CFR Part 1',   industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Registration, Prior Notice, FSVP
  '7':   { source: '21 CFR Part 7',   regulation: '21 CFR Part 7',   industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Recalls/Enforcement
  '11':  { source: '21 CFR Part 11',  regulation: '21 CFR Part 11',  industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Electronic Records
  // ── Food & Beverages (Title 21, Chapter I, Parts 100–199) ────────────────
  '101': { source: '21 CFR Part 101', regulation: '21 CFR Part 101', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Food Labeling
  '102': { source: '21 CFR Part 102', regulation: '21 CFR Part 102', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' },
  '104': { source: '21 CFR Part 104', regulation: '21 CFR Part 104', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' },
  '105': { source: '21 CFR Part 105', regulation: '21 CFR Part 105', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' },
  '110': { source: '21 CFR Part 110', regulation: '21 CFR Part 110', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // CGMP
  '112': { source: '21 CFR Part 112', regulation: '21 CFR Part 112', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Produce Safety
  '114': { source: '21 CFR Part 114', regulation: '21 CFR Part 114', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Acidified Foods
  '117': { source: '21 CFR Part 117', regulation: '21 CFR Part 117', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // FSMA Preventive Controls
  '123': { source: '21 CFR Part 123', regulation: '21 CFR Part 123', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Seafood HACCP
  '131': { source: '21 CFR Part 131', regulation: '21 CFR Part 131', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Milk & Cream Standards of Identity
  '145': { source: '21 CFR Part 145', regulation: '21 CFR Part 145', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Canned Fruits
  '146': { source: '21 CFR Part 146', regulation: '21 CFR Part 146', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Fruit Juices
  '161': { source: '21 CFR Part 161', regulation: '21 CFR Part 161', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Fish & Shellfish
  '170': { source: '21 CFR Part 170', regulation: '21 CFR Part 170', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Food Additives (General)
  '172': { source: '21 CFR Part 172', regulation: '21 CFR Part 172', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Food Additives (Direct)
  '182': { source: '21 CFR Part 182', regulation: '21 CFR Part 182', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // GRAS
  '184': { source: '21 CFR Part 184', regulation: '21 CFR Part 184', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // GRAS (Affirmed, Direct)
  '205': { source: '21 CFR Part 205', regulation: '21 CFR Part 205', industry: 'Food & Beverages',    category: 'food',       documentType: 'FDA Regulation' }, // Retail/Wholesale Drug
  // ── Dietary Supplements (Parts 111, 190) ─────────────────────────────────
  '111': { source: '21 CFR Part 111', regulation: '21 CFR Part 111', industry: 'Dietary Supplements', category: 'supplement', documentType: 'FDA Regulation' }, // cGMP for Supplements
  '190': { source: '21 CFR Part 190', regulation: '21 CFR Part 190', industry: 'Dietary Supplements', category: 'supplement', documentType: 'FDA Regulation' },
  // ── Pharmaceuticals / Drug Labeling (Parts 200–299) ──────────────────────
  '201': { source: '21 CFR Part 201', regulation: '21 CFR Part 201', industry: 'Pharmaceuticals',     category: 'drug',       documentType: 'FDA Regulation' },
  '202': { source: '21 CFR Part 202', regulation: '21 CFR Part 202', industry: 'Pharmaceuticals',     category: 'drug',       documentType: 'FDA Regulation' },
  '206': { source: '21 CFR Part 206', regulation: '21 CFR Part 206', industry: 'Pharmaceuticals',     category: 'drug',       documentType: 'FDA Regulation' },
  // ── Cosmetics (Parts 700–799) ─────────────────────────────────────────────
  '700': { source: '21 CFR Part 700', regulation: '21 CFR Part 700', industry: 'Cosmetics',           category: 'cosmetic',   documentType: 'FDA Regulation' },
  '701': { source: '21 CFR Part 701', regulation: '21 CFR Part 701', industry: 'Cosmetics',           category: 'cosmetic',   documentType: 'FDA Regulation' },
  '710': { source: '21 CFR Part 710', regulation: '21 CFR Part 710', industry: 'Cosmetics',           category: 'cosmetic',   documentType: 'FDA Regulation' },
  '720': { source: '21 CFR Part 720', regulation: '21 CFR Part 720', industry: 'Cosmetics',           category: 'cosmetic',   documentType: 'FDA Regulation' },
  '740': { source: '21 CFR Part 740', regulation: '21 CFR Part 740', industry: 'Cosmetics',           category: 'cosmetic',   documentType: 'FDA Regulation' },
  // ── Medical Devices (Parts 800–899) ──────────────────────────────────────
  '801': { source: '21 CFR Part 801', regulation: '21 CFR Part 801', industry: 'Medical Devices',     category: 'device',     documentType: 'FDA Regulation' },
  '806': { source: '21 CFR Part 806', regulation: '21 CFR Part 806', industry: 'Medical Devices',     category: 'device',     documentType: 'FDA Regulation' }, // Corrections & Removals
  '807': { source: '21 CFR Part 807', regulation: '21 CFR Part 807', industry: 'Medical Devices',     category: 'device',     documentType: 'FDA Regulation' }, // Establishment Registration
  '820': { source: '21 CFR Part 820', regulation: '21 CFR Part 820', industry: 'Medical Devices',     category: 'device',     documentType: 'FDA Regulation' },
  '830': { source: '21 CFR Part 830', regulation: '21 CFR Part 830', industry: 'Medical Devices',     category: 'device',     documentType: 'FDA Regulation' }, // UDI
}

/**
 * Range-based fallback: if a part number is NOT in CFR_PART_MAP, derive industry
 * from the numeric range. This prevents any future upload from being silently
 * misclassified as "Food & Beverages".
 *
 * Ranges follow Title 21 Chapter I structure:
 *   1–99    → Food & Beverages (general administrative)
 *   100–199 → Food & Beverages (labeling, additives, GMP)
 *   200–299 → Pharmaceuticals  (drug labeling & GMP)
 *   300–499 → Pharmaceuticals  (drug applications)
 *   500–599 → Animal & Veterinary
 *   600–699 → Biologics
 *   700–799 → Cosmetics
 *   800–899 → Medical Devices
 *   900–999 → Mammography / Radiation
 */
export function inferIndustryFromPartRange(partNumber: string): Pick<CfrPartInfo, 'industry' | 'category'> | null {
  const n = parseInt(partNumber, 10)
  if (isNaN(n)) return null
  if (n >= 1   && n <= 199) return { industry: 'Food & Beverages',    category: 'food'       }
  if (n >= 200 && n <= 499) return { industry: 'Pharmaceuticals',     category: 'drug'       }
  if (n >= 500 && n <= 599) return { industry: 'Animal & Veterinary', category: 'veterinary' }
  if (n >= 600 && n <= 699) return { industry: 'Biologics',           category: 'biologic'   }
  if (n >= 700 && n <= 799) return { industry: 'Cosmetics',           category: 'cosmetic'   }
  if (n >= 800 && n <= 899) return { industry: 'Medical Devices',     category: 'device'     }
  return null
}

/**
 * Detect the CFR part number from content text.
 * Checks for patterns like:
 *   "21 CFR Part 701", "CFR 701", "Part 701", "§ 701.30", "701.3"
 *
 * Returns the FIRST match found (most specific wins — section refs before part refs).
 */
export function detectCfrPartFromContent(content: string): string | null {
  // Priority 1: Explicit section reference "§ 701.30" or "701.3" (most specific)
  const sectionRef = content.match(/§\s*(7[0-9]{2}|[12][0-9]{2}|8[0-9]{2})\.\d/i)
  if (sectionRef) return sectionRef[1]

  // Priority 2: "21 CFR Part 701" or "CFR Part 701"
  const cfrPart = content.match(/(?:21\s*)?cfr\s*part\s*(\d{2,3})\b/i)
  if (cfrPart) return cfrPart[1]

  // Priority 3: "Part 701"
  const partRef = content.match(/\bpart\s*(7[0-9]{2}|[12][0-9]{2}|8[0-9]{2})\b/i)
  if (partRef) return partRef[1]

  return null
}

/**
 * Get the correct CfrPartInfo for a given part number string.
 * Falls back to range-based industry inference if the part is not in the
 * explicit map, so unknown parts are NEVER silently assigned to Food & Beverages.
 */
export function getCfrPartInfo(partNumber: string): CfrPartInfo | null {
  const explicit = CFR_PART_MAP[partNumber]
  if (explicit) return { partNumber, ...explicit }

  // Range-based fallback for unlisted parts
  const rangeInfo = inferIndustryFromPartRange(partNumber)
  if (!rangeInfo) return null

  return {
    partNumber,
    source:       `21 CFR Part ${partNumber}`,
    regulation:   `21 CFR Part ${partNumber}`,
    industry:     rangeInfo.industry,
    category:     rangeInfo.category,
    documentType: 'FDA Regulation',
  }
}

/**
 * Build correct metadata for a knowledge chunk.
 *
 * - If the file/batch was explicitly labelled with a partNumber hint, use that.
 * - Otherwise auto-detect from the chunk content.
 * - Falls back to the provided defaults if detection fails.
 *
 * @param content        The text content of the chunk
 * @param hintPartNumber Optional explicit part number from the file name or JSON wrapper
 * @param defaults       Base metadata (will be merged / overridden)
 */
export function buildCorrectMetadata(
  content: string,
  hintPartNumber: string | null,
  defaults: Record<string, any>
): Record<string, any> {
  // 1. Determine authoritative part number
  const detectedPart = detectCfrPartFromContent(content)
  const partNumber = hintPartNumber || detectedPart

  if (!partNumber) {
    // Cannot determine — return defaults unchanged
    return defaults
  }

  const info = getCfrPartInfo(partNumber)
  if (!info) {
    // Unknown part — return defaults unchanged
    return defaults
  }

  // 2. Override the fields that are commonly wrong
  return {
    ...defaults,
    source:        info.source,
    regulation:    info.regulation,
    industry:      info.industry,
    category:      info.category,
    part_number:   info.partNumber,
    document_type: info.documentType,
  }
}

/**
 * Infer a part number hint from the file name.
 * e.g. "21cfr701.json" → "701", "part101.json" → "101"
 */
export function inferPartNumberFromFileName(fileName: string): string | null {
  const match = fileName.match(/(?:part[-_\s]*|cfr[-_\s]*)(\d{2,3})\b/i)
    ?? fileName.match(/\b(7[0-9]{2}|[12][0-9]{2}|8[0-9]{2})\b/)
  return match?.[1] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION-AWARE CHUNKING  (shared by upload & bulk-import routes)
// Each chunk always starts with the section title so the AI never loses context
// when a section is split across multiple chunks.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_SECTION_CHARS  = 1800   // ~450 tokens — only split if longer
export const CHUNK_TARGET_CHARS = 1500
export const CHUNK_OVERLAP_CHARS = 200

/**
 * If the section fits within MAX_SECTION_CHARS return as a single chunk.
 * Otherwise split at paragraph boundaries and prepend the title to every chunk
 * so section context is never lost in the embedding.
 */
export function chunkSectionWithTitle(title: string, content: string): string[] {
  const header   = title && title !== 'Untitled' ? `${title}\n\n` : ''
  const fullText = header + content

  if (fullText.length <= MAX_SECTION_CHARS) return [fullText.trim()]

  const paragraphs = content.split(/\n\n+/)
  const chunks: string[] = []
  let current = header

  for (const para of paragraphs) {
    if ((current + para).length > CHUNK_TARGET_CHARS && current.length > header.length) {
      chunks.push(current.trim())
      const overlap = current.slice(-CHUNK_OVERLAP_CHARS)
      current = header + `[continued]\n${overlap}\n\n` + para
    } else {
      current += (current === header ? '' : '\n\n') + para
    }
  }
  if (current.trim().length > 50) chunks.push(current.trim())
  return chunks.filter(c => c.length > 50)
}
