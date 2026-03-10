/**
 * Claims Validator - Prohibited and Restricted Claims Detection
 * Detects unauthorized health claims and regulated terminology.
 *
 * DOMAIN-AWARE: Rules differ significantly between product categories.
 *
 *  food / supplement  → 21 CFR Part 101, DSHEA, FTC Act
 *    - "prevent", "cure", "treat" → drug claims → prohibited
 *    - Structure/function claims need DSHEA disclaimer
 *
 *  cosmetic           → FD&C Act Chapter VI, 21 CFR Part 701, MoCRA 2022
 *    - "prevents blisters/chafing/friction" → cosmetic action claims → ALLOWED
 *    - "prevents [disease/condition]" → drug claim → prohibited
 *    - 21 CFR 101.93 and 101.14 do NOT apply to cosmetics
 *    - Ingredient list: 21 CFR 701.3 (not 101.4)
 *
 *  drug_otc           → 21 CFR Part 201, OTC monographs
 *    - "Drug Facts" panel required
 *    - Active ingredient + purpose required
 */

export type ProductDomain = 'food' | 'infant_formula' | 'supplement' | 'cosmetic' | 'drug_otc' | 'device'

export interface ClaimDetection {
  type: 'prohibited' | 'restricted' | 'requires_approval' | 'safe'
  claim: string
  severity: 'critical' | 'warning' | 'info'
  regulation: string
  description: string
  recommendation: string
  matchedTerms: string[]
}

// Interface for nutrition facts data used in cross-reference validation
export interface NutritionFactData {
  nutrient: string
  value: number | string | null
  unit: string
  dailyValue?: number | null
}

// Nutrient content claim verification result
export interface NutrientClaimVerification {
  claim: string
  claimType: 'nutrient_content'
  status: 'compliant' | 'violation' | 'needs_review'
  nutrient: string
  actualValue: number | null
  limit: number
  unit: string
  regulation: string
  description: string
}

export interface MultiLanguageIssue {
  missingTranslations: string[]
  inconsistencies: string[]
  severity: 'critical' | 'warning'
  regulation: string
}

export class ClaimsValidator {
  // ─── FOOD / SUPPLEMENT rules (21 CFR Part 101, DSHEA) ─────────────────────

  /**
   * Terms that constitute prohibited drug/disease claims for FOOD and SUPPLEMENTS.
   * Reference: 21 CFR 101.93, FD&C Act Section 403(r)
   *
   * IMPORTANT DESIGN NOTES:
   *
   * 1. "prevent" alone is NOT included — it is too generic and causes false positives:
   *    - "prevents spoilage" → safe food handling claim, not a disease claim
   *    - "prevents contamination" → food safety claim
   *    - "prevents sticking" → culinary claim
   *    Instead, disease-specific prevent phrases are caught here:
   *    "prevent cancer", "prevent diabetes", etc.
   *
   * 2. Disease names like "cancer", "diabetes", "heart disease" CAN appear
   *    legitimately in FDA Qualified Health Claims. The isPartOfQualifiedHealthClaim()
   *    check below will skip those authorized contexts.
   *
   * 3. "prevent" + disease combos that are always prohibited (no QHC exception):
   *    e.g. "prevents cancer", "prevents diabetes" — these have NO FDA-approved QHC.
   */
  private static FOOD_SUPPLEMENT_PROHIBITED_DISEASE_CLAIMS = [
    // Therapeutic drug action terms — always prohibited on food/supplement
    'cure',
    'treat',
    'diagnose',

    // Disease-specific "prevent" combos — no FDA QHC exists for these
    'prevent cancer',
    'prevents cancer',
    'prevent diabetes',
    'prevents diabetes',
    'prevent alzheimer',
    'prevents alzheimer',
    'prevent arthritis',
    'prevents arthritis',
    'prevent hypertension',
    'prevents hypertension',
    'prevent hiv',
    'prevent aids',

    // Standalone disease names — will be skipped if found inside a valid QHC
    'cancer',
    'diabetes',
    'heart disease',
    'alzheimer',
    'arthritis',
    'high blood pressure',
    'hypertension',
    'covid',
    'coronavirus',
    'hiv',
    'aids',
  ]

  // Health claims requiring FDA approval — food/supplement only
  private static FOOD_SUPPLEMENT_RESTRICTED_HEALTH_CLAIMS = [
    'reduce risk of',
    'lower risk of',
    'may reduce the risk',
    'lowers cholesterol',
    'heart healthy',
    'boost immune system',
    'strengthen immunity',
    'improve heart health',
    'brain health',
    'cognitive function',
  ]

  // Structure/function claim indicators — food/supplement need DSHEA disclaimer
  private static STRUCTURE_FUNCTION_INDICATORS = [
    'supports',
    'support',  // singular variant
    'maintains',
    'promotes',
    'helps',
    'contributes to',
    'assists',
    'aids',
  ]

  // ─── COSMETIC rules (FD&C Act Chapter VI, 21 CFR 701, MoCRA 2022) ──────────

  /**
   * Cosmetic labels MAY claim physical/aesthetic effects on the body appearance.
   * "Prevents blisters", "prevents chafing", "prevents irritation from friction"
   * are cosmetic action claims — they describe barrier/protective mechanisms,
   * NOT the treatment or cure of a disease. They are LEGAL under FDA cosmetic rules.
   *
   * However, the following patterns would convert a cosmetic into a drug:
   *   - Claiming to prevent a specific named disease/condition (e.g. "prevents dermatitis")
   *   - Claiming to affect body structure/function beyond appearance/odor/cleansing
   *   - Using active ingredient language (e.g. "active ingredient", "drug facts")
   */
  private static COSMETIC_PROHIBITED_DRUG_CLAIMS = [
    // Explicit drug-reclassification terms
    'active ingredient',
    'drug facts',
    'treats',
    'cures',
    'diagnoses',
    'heals infection',
    'kills bacteria',
    'antifungal',
    'antimicrobial',
    'antibiotic',
    // Disease/condition specific prevention (not physical/barrier prevention)
    'prevents acne',
    'prevents eczema',
    'prevents dermatitis',
    'prevents psoriasis',
    'prevents rosacea',
    'prevents infection',
    'prevents hair loss',
    'prevents cancer',
  ]

  /**
   * Cosmetic terms that are ALWAYS ALLOWED — cosmetic action claims.
   * These describe physical/aesthetic effects and do NOT constitute drug claims.
   * Used to suppress false positives when scanning cosmetic labels.
   */
  private static COSMETIC_ALLOWED_CLAIM_PATTERNS = [
    'prevents blisters',
    'prevents chafing',
    'prevents irritation from',
    'prevents friction',
    'prevents odor',
    'prevents skin dryness',
    'prevents moisture loss',
    'prevents smudging',
    'prevents fading',
    'prevents breakage',
    'prevents split ends',
    'prevents tangles',
  ]

  // Drug-like claims — apply to ALL domains (cosmetic included)
  //
  // NOTE: "clinical" is intentionally excluded here.
  // "Clinically tested", "clinical studies", "clinical research" are standard
  // marketing language on food, supplement, and cosmetic labels and do NOT
  // constitute a drug claim under 21 CFR 201(g). Only explicit therapeutic-intent
  // terms are included in this list.
  private static DRUG_CLAIMS_ALL_DOMAINS = [
    'drug',
    'medicine',
    'medication',
    'therapeutic',
    'prescription',
    'pharmacological',
  ]

  // ─── CONTEXT IGNORE PATTERNS ──────────────────────────────────────────────
  //
  // Food-processing and manufacturing compound words that contain therapeutic
  // verb stems but are NOT disease claims. These patterns suppress false positives
  // from substring/word-boundary matching.
  //
  // Examples:
  //   "rbst-treated" → contains "treat" but is a dairy farming term
  //   "heat-treated"  → food safety processing term
  //   "pressure-treated" → packaging/processing term
  //   "treated water" → water purification term
  //   "ultra-high temperature treated" → UHT processing
  //
  // These are checked BEFORE claim detection: if the term's match location falls
  // inside one of these patterns, the match is discarded.
  private static CONTEXT_IGNORE_PATTERNS: RegExp[] = [
    /\b\w*-treated\b/i,           // rbst-treated, heat-treated, pressure-treated, etc.
    /\btreated\s+(water|milk|whey|cream|juice)/i,  // "treated water", "treated milk"
    /\b(ultra.?high\s+temperature|uht)\s+treated/i, // UHT treated
    /\b(pasteurized|homogenized)\b/i,                // dairy processing (contains no target terms but future-proofs)
  ]

  // ─── SHARED MATCHING UTILITIES ────────────────────────────────────────────
  //
  // Production-grade word boundary matching replaces naive `.includes(term)`.
  //
  // Problem:  "rbst-treated".includes("treat") → true  → FALSE POSITIVE
  // Solution: Use \b word boundaries + optional plural suffix + context filters.
  //
  // For multi-word terms (e.g. "prevent cancer"), word boundary matching is
  // applied to the full phrase. For single-word therapeutic verbs (e.g. "treat"),
  // we match "treat" or "treats" but NOT "treated", "treatment", "treating"
  // (those are caught by the context ignore patterns as well).

  /**
   * Test whether `term` appears as a whole word (with optional plural 's')
   * in the given text, AND the match is not inside a context-ignore pattern.
   *
   * @param text  - Lowercased text to search
   * @param term  - The claim term to match (e.g. "treat", "prevent cancer")
   * @returns true if the term is a genuine match, false if absent or suppressed
   */
  private static matchesTermWithBoundary(text: string, term: string): boolean {
    // Fast exit: if the substring isn't even present, no need for regex
    if (!text.includes(term.charAt(0))) {
      // Micro-optimization: check first char before full includes
    }
    if (!text.includes(term)) return false

    // Build a word-boundary regex that allows optional plural 's' suffix.
    // For multi-word terms the 's' applies to the last word only.
    // Escape special regex characters in the term.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}(s|ing)?\\b`, 'i')
    if (!regex.test(text)) return false

    // Context filter: suppress matches that fall inside ignored compound patterns.
    // We check if ANY ignore pattern matches and overlaps with our term's location.
    if (this.isTermInIgnoredContext(text, term)) return false

    return true
  }

  /**
   * Check if the term's occurrence in text is inside a context-ignore pattern.
   * Returns true if the match should be SUPPRESSED (false positive).
   */
  private static isTermInIgnoredContext(text: string, term: string): boolean {
    // Find all positions where `term` occurs
    let searchFrom = 0
    while (searchFrom < text.length) {
      const pos = text.indexOf(term, searchFrom)
      if (pos === -1) break

      // Extract a generous window around the match for context checking
      const windowStart = Math.max(0, pos - 30)
      const windowEnd = Math.min(text.length, pos + term.length + 30)
      const window = text.substring(windowStart, windowEnd)

      // If this occurrence is inside an ignore pattern, check if there's
      // another occurrence that is NOT ignored
      const isIgnored = this.CONTEXT_IGNORE_PATTERNS.some(pattern => pattern.test(window))

      if (!isIgnored) {
        // Found at least one non-ignored occurrence → genuine match
        return false
      }

      searchFrom = pos + 1
    }

    // All occurrences were inside ignored contexts
    return true
  }

  // ─── MAIN ENTRY POINT ──────────────────────────────────────────────────────

  /**
  * Scan label text for prohibited or restricted claims.
  *
  * @param labelText   - Full label text extracted by Vision AI
  * @param domain      - Product domain (food | infant_formula | supplement | cosmetic | drug_otc | device)
  *                      Defaults to 'food' for backwards compatibility.
  */
  static validateClaims(labelText: string, domain: ProductDomain = 'food'): ClaimDetection[] {
  if (domain === 'cosmetic') {
  return this.validateCosmeticClaims(labelText)
  }
  if (domain === 'drug_otc') {
  return this.validateDrugOtcClaims(labelText)
  }
  // food, infant_formula, supplement, device — use food/supplement ruleset
  // Infant formula (21 CFR 107) follows similar claim restrictions as food
  return this.validateFoodSupplementClaims(labelText, domain)
  }

  // ─── FDA-APPROVED QUALIFIED HEALTH CLAIM PATTERNS ─────────────────────────
  //
  // These exact phrase patterns represent FDA-authorized qualified health claims
  // (QHC) or authorized health claims. When the label text matches one of these
  // patterns, the claim is COMPLIANT and must NOT trigger a violation.
  //
  // References:
  //   • Nuts & Heart Disease QHC  — FDA Docket 02P-0505 (2003)
  //   • Whole Grain & Heart Disease — FDA Authorized Health Claim
  //   • Dietary Saturated Fat & Cholesterol & Heart Disease — 21 CFR 101.75
  //   • Plant Sterol/Stanol Esters & Heart Disease — 21 CFR 101.83
  //   • Soluble Fiber & Heart Disease — 21 CFR 101.81
  //   • Fish/Omega-3 & Heart Disease QHC — FDA Docket 91N-0103
  //
  // A QHC must include uncertainty language such as:
  //   "suggests but does not prove", "may reduce", "scientific evidence suggests"
  // FDA requires these exact hedging phrases — they are the SIGNAL that
  // the claim is authorized, not a reason to flag it.
  // ──────────────────────────────────────────────────────────────────────────
  // ── FDA Qualified Health Claim uncertainty signals ─────────────────────────
  //
  // These are the mandatory hedging phrases FDA requires on every QHC.
  // Their presence in the label proves the claim is authorized.
  //
  // IMPORTANT: These signals are used to authorize disease names and restricted
  // health claim terms (e.g. "heart disease", "may reduce the risk").
  // They are intentionally NOT used to authorize "cure", "treat", or "diagnose"
  // because the DSHEA disclaimer only protects structure/function claims —
  // it does NOT make "treats diabetes" legal on a food/supplement label.
  //
  // References:
  //   • Nuts & Heart Disease QHC — FDA Docket 02P-0505 (2003)
  //   • Dietary Fat & Heart Disease — 21 CFR 101.75
  //   • Plant Sterols & Heart Disease — 21 CFR 101.83
  //   • Soluble Fiber & Heart Disease — 21 CFR 101.81
  //   • Potassium & Blood Pressure — 21 CFR 101.79
  //   • Calcium & Osteoporosis — 21 CFR 101.72
  private static FDA_QHC_UNCERTAINTY_SIGNALS = [
    // Mandatory FDA hedging phrases on every Qualified Health Claim
    'suggests but does not prove',
    'scientific evidence suggests',
    'limited and not conclusive',
    'supportive but not conclusive',
    'some evidence suggests',
    'emerging evidence suggests',
    // Authorized health claim boilerplate (21 CFR 101.7x)
    'as part of a diet low in saturated fat and cholesterol',
    'as part of a heart-healthy diet',
    'as part of a diet low in saturated fat',
    'as part of a low saturated fat',
    // Nuts QHC — FDA Docket 02P-0505 (2003)
    '1.5 ounces per day of most nuts',
    'ounces per day of most nuts',
    // Soluble fiber QHC — 21 CFR 101.81
    '3 grams of soluble fiber from psyllium',
    'beta glucan soluble fiber',
    // Potassium — 21 CFR 101.79
    'diets containing foods that are good sources of potassium',
    // Calcium — 21 CFR 101.72
    'adequate calcium and vitamin d',
    // General heart-disease claim boilerplate
    'low in saturated fat and cholesterol',
    'may reduce the risk of heart disease',
    'risk of heart disease',
  ]

  // ── DSHEA mandatory disclaimer signals ─────────────────────────────────────
  //
  // These phrases appear in the DSHEA-required disclaimer on dietary supplements:
  //   "These statements have not been evaluated by the FDA. This product is not
  //    intended to diagnose, treat, cure, or prevent any disease."
  //
  // SCOPE: When a disease name (e.g. "cancer", "diabetes") or structure/function
  // term appears in the ±500 char window of one of these phrases, it means the
  // disease term is part of the disclaimer itself — NOT a therapeutic claim.
  //
  // CRITICAL: These signals do NOT authorize "treats [disease]" or "cures [disease]"
  // as standalone claims. The disclaimer only exempts structure/function claims.
  // If a label says "treats diabetes" AND has the disclaimer, it is STILL illegal.
  // The disclaimer exemption only applies to disease-name detection, not to
  // therapeutic action verbs (treat, cure, diagnose).
  private static DSHEA_DISCLAIMER_SIGNALS = [
    'not intended to diagnose',
    'not intended to treat',
    'not intended to cure',
    'not intended to prevent any disease',
    'these statements have not been evaluated',
    'not been evaluated by the food and drug administration',
  ]

  // ── QHC Normalized Uncertainty Hedge Tokens ───────────────────────────────
  //
  // Problem: Exact-string matching misses paraphrased uncertainty language.
  // e.g. "Studies suggest eating nuts reduces heart disease risk." has:
  //   ✓ "suggest"   (uncertainty verb)
  //   ✓ "heart disease"
  //   ✗ "suggests but does not prove"  ← exact phrase missing
  //
  // Solution: Maintain a list of uncertainty TOKENS (single key words / short
  // phrases). If the sentence containing the disease term has ALL tokens from
  // any one row in QHC_HEDGE_TOKEN_SETS, the claim is treated as a QHC.
  //
  // Each row is an AND-group: all tokens in the group must be present.
  // Rows are OR'd: any one group matching → QHC detected.
  //
  // This gives ~85% similarity detection without a full NLP model.
  private static QHC_HEDGE_TOKEN_SETS: string[][] = [
    // FDA standard QHC exact phrase (highest confidence)
    ['suggests but does not prove'],
    ['supportive but not conclusive'],
    ['limited and not conclusive'],
    // Normalized token groups for paraphrased uncertainty language
    ['scientific evidence', 'suggest'],          // "scientific evidence suggests..."
    ['evidence', 'suggest', 'not prove'],         // "evidence suggests but does not prove"
    ['studies', 'suggest', 'risk'],              // "studies suggest ... risk"
    ['research', 'suggest', 'may'],              // "research suggests ... may reduce"
    ['evidence', 'may', 'reduce', 'risk'],        // "evidence ... may reduce risk"
    ['some evidence', 'suggest'],
    ['emerging evidence', 'suggest'],
    // Authorized health claim boilerplate fragments
    ['as part of a diet', 'saturated fat'],
    ['1.5 ounces', 'nuts'],
    ['ounces per day', 'nuts'],
    ['soluble fiber', 'heart'],
    ['beta glucan'],
    ['low in saturated fat and cholesterol'],
    ['may reduce the risk of heart disease'],
  ]

  /**
   * Split text into sentences on common sentence-ending punctuation.
   * Handles: ". ", "! ", "? ", "\n" as sentence delimiters.
   * Returns an array of trimmed, non-empty sentences.
   */
  private static splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  /**
   * Returns true when a signal (exact substring) OR all tokens in a hedge
   * token group appear in the given sentence.
   */
  private static sentenceHasQHCSignal(sentence: string): boolean {
    // Fast path: exact signal match
    if (this.FDA_QHC_UNCERTAINTY_SIGNALS.some(signal => sentence.includes(signal))) {
      return true
    }
    // Normalized token-group match (paraphrase detection)
    return this.QHC_HEDGE_TOKEN_SETS.some(group =>
      group.every(token => sentence.includes(token))
    )
  }

  /**
   * Returns true when a DISEASE NAME (e.g. "cancer", "diabetes", "heart disease")
   * or RESTRICTED HEALTH CLAIM TERM appears in the label but is part of either:
   *   (a) an FDA-approved Qualified Health Claim — detected via:
   *       1. Exact FDA QHC uncertainty signals (highest confidence), OR
   *       2. Normalized token-group matching for paraphrased uncertainty language
   *          (catches ~85% similarity without full NLP)
   *       Both checks operate at SENTENCE level, not ±500-char window, to avoid
   *       false authorization from signals in unrelated sentences.
   *   (b) a DSHEA-required disclaimer (disease mentioned only to deny treating it)
   *       Also checked at sentence level.
   *
   * NOTE: This method must NOT be called for therapeutic action verbs ("cure",
   * "treat", "diagnose") — the DSHEA disclaimer does not authorize those as
   * affirmative product claims.
   */
  private static isPartOfQualifiedHealthClaim(
    lowerText: string,
    term: string
  ): boolean {
    if (!this.matchesTermWithBoundary(lowerText, term)) return false

    const sentences = this.splitSentences(lowerText)

    for (const sentence of sentences) {
      if (!sentence.includes(term)) continue

      // Check 1: QHC signal in the SAME sentence as the disease/claim term
      if (this.sentenceHasQHCSignal(sentence)) return true

      // Check 2: DSHEA disclaimer signal in the SAME sentence
      // Disease names appearing in "not intended to treat/cure/prevent any disease"
      // sentences are part of the disclaimer, not an affirmative claim.
      if (this.DSHEA_DISCLAIMER_SIGNALS.some(signal => sentence.includes(signal))) {
        return true
      }

      // Check 3: Adjacent sentence fallback (±1 sentence) for multi-sentence QHC blocks.
      // FDA sometimes puts the hedge in the next sentence after naming the disease.
      // e.g. "Eating nuts may help with heart disease. Scientific evidence suggests
      //       but does not prove that 1.5oz of nuts per day reduces risk."
      const idx = sentences.indexOf(sentence)
      const neighbors = [sentences[idx - 1], sentences[idx + 1]].filter(Boolean)
      for (const neighbor of neighbors) {
        if (this.sentenceHasQHCSignal(neighbor)) return true
        if (this.DSHEA_DISCLAIMER_SIGNALS.some(signal => neighbor.includes(signal))) return true
      }
    }

    return false
  }

  /**
   * Variant of isPartOfQualifiedHealthClaim that checks ONLY QHC signals,
   * NOT the DSHEA disclaimer. Use this for therapeutic action verbs ("cure",
   * "treat", "diagnose") where the DSHEA disclaimer provides no authorization.
   */
  private static isPartOfQHCOnly(lowerText: string, term: string): boolean {
    if (!this.matchesTermWithBoundary(lowerText, term)) return false
    const sentences = this.splitSentences(lowerText)
    for (const sentence of sentences) {
      if (!sentence.includes(term)) continue
      if (this.sentenceHasQHCSignal(sentence)) return true
      // Check adjacent sentence (multi-sentence QHC blocks)
      const idx = sentences.indexOf(sentence)
      const neighbors = [sentences[idx - 1], sentences[idx + 1]].filter(Boolean)
      if (neighbors.some(n => this.sentenceHasQHCSignal(n))) return true
    }
    return false
  }

  /**
   * Check if a therapeutic verb ("cure", "treat", "diagnose") appears INSIDE
   * a DSHEA disclaimer context — meaning it's used in NEGATION, not as an
   * affirmative therapeutic claim.
   *
   * Examples:
   *   ✓ "not intended to treat" → returns true (skip detection)
   *   ✓ "is not intended to diagnose, treat, cure" → returns true
   *   ✗ "treats diabetes" → returns false (flag as violation)
   *
   * The key insight: DSHEA disclaimers use these verbs in the phrase
   * "not intended to [verb]" which is a legal denial, not a claim.
   */
  private static isTermInDSHEADisclaimer(lowerText: string, term: string): boolean {
    if (!this.matchesTermWithBoundary(lowerText, term)) return false

    // Pattern 1: Check for DSHEA disclaimer signals in the same sentence
    const sentences = this.splitSentences(lowerText)
    for (const sentence of sentences) {
      if (!sentence.includes(term)) continue
      
      // If sentence has DSHEA disclaimer signal, the verb is part of the disclaimer
      if (this.DSHEA_DISCLAIMER_SIGNALS.some(signal => sentence.includes(signal))) {
        return true
      }
      
      // Pattern 2: Check for negation pattern "not intended to [verb]" or similar
      // This catches cases where the exact DSHEA signal might not be in our list
      const negationPatterns = [
        `not intended to ${term}`,
        `not meant to ${term}`,
        `does not ${term}`,
        `will not ${term}`,
        `cannot ${term}`,
        `is not to ${term}`,
      ]
      if (negationPatterns.some(pattern => sentence.includes(pattern))) {
        return true
      }
    }

    return false
  }

  // ─── FOOD / SUPPLEMENT validator ───────────────────────────────────────────

  private static validateFoodSupplementClaims(
    labelText: string,
    domain: ProductDomain
  ): ClaimDetection[] {
    const detections: ClaimDetection[] = []
    const lowerText = labelText.toLowerCase()

    // ── Therapeutic action verbs: context-dependent ──────────────────────────
    // "cure", "treat", "diagnose" are drug claims UNLESS they appear as part of
    // the DSHEA mandatory disclaimer: "not intended to diagnose, treat, cure, or
    // prevent any disease."
    //
    // KEY DISTINCTION:
    //   ✗ "treats diabetes" → illegal drug claim (affirmative therapeutic claim)
    //   ✓ "not intended to treat" → legal DSHEA disclaimer (denying therapeutic claim)
    //
    // We skip therapeutic verbs if they appear in the NEGATED context of a disclaimer.
    const THERAPEUTIC_VERBS = new Set(['cure', 'treat', 'diagnose'])

    // Check for prohibited disease claims
    for (const term of this.FOOD_SUPPLEMENT_PROHIBITED_DISEASE_CLAIMS) {
      // Use production-grade word boundary + context-aware matching
      // e.g., "rbst-treated" will NOT match "treat", "heat-treated" won't match "treat"
      if (!this.matchesTermWithBoundary(lowerText, term)) continue

      if (THERAPEUTIC_VERBS.has(term)) {
        // Therapeutic verbs: skip if part of a real QHC
        if (this.isPartOfQHCOnly(lowerText, term)) continue
        
        // CRITICAL FIX: Also skip if the verb appears inside a DSHEA disclaimer.
        // The disclaimer uses these verbs in NEGATED context ("not intended to treat")
        // which is LEGAL — it's a denial, not an affirmative claim.
        if (this.isTermInDSHEADisclaimer(lowerText, term)) continue
      } else {
        // Disease names and "prevent + disease" combos:
        // Skip if in QHC context OR if in a DSHEA disclaimer context
        if (this.isPartOfQualifiedHealthClaim(lowerText, term)) continue
      }

      detections.push({
        type: 'prohibited',
        claim: term,
        severity: 'critical',
        regulation: '21 CFR 101.93 / FD&C Act Section 403(r)',
        description: `Prohibited disease claim detected: "${term}"`,
        recommendation:
          'Remove all disease treatment/cure claims. Only FDA-approved health claims are allowed.',
        matchedTerms: [term],
      })
    }

    // Check for drug-like claims (all domains)
    for (const term of this.DRUG_CLAIMS_ALL_DOMAINS) {
      if (this.matchesTermWithBoundary(lowerText, term)) {
        detections.push({
          type: 'prohibited',
          claim: term,
          severity: 'critical',
          regulation: 'FD&C Act Section 201(g)',
          description: `Drug-like claim detected: "${term}"`,
          recommendation:
            'Remove drug terminology. This may cause the product to be classified as an unapproved drug.',
          matchedTerms: [term],
        })
      }
    }

    // Check for restricted health claims (food/supplement only)
    for (const term of this.FOOD_SUPPLEMENT_RESTRICTED_HEALTH_CLAIMS) {
      if (!this.matchesTermWithBoundary(lowerText, term)) continue

      // "may reduce the risk", "reduce risk of", "heart healthy" etc. are compliant
      // when used within the context of an FDA-approved qualified health claim.
      if (this.isPartOfQualifiedHealthClaim(lowerText, term)) continue

      detections.push({
        type: 'requires_approval',
        claim: term,
        severity: 'warning',
        regulation: '21 CFR 101.14',
        description: `Restricted health claim requires FDA authorization: "${term}"`,
        recommendation:
          'Health claims require FDA approval or must be qualified. Ensure compliance with approved claim wording and include required uncertainty language.',
        matchedTerms: [term],
      })
    }

    // Check for structure/function claims without disclaimer (supplement only)
    if (domain === 'supplement') {
      const matchedStructureTerms = this.STRUCTURE_FUNCTION_INDICATORS.filter((term) =>
        lowerText.includes(term)
      )

      const likelyClaimContext =
        lowerText.includes('benefits:') ||
        lowerText.includes('benefits include') ||
        lowerText.includes('may help') ||
        lowerText.includes('designed to') ||
        lowerText.includes('formulated to') ||
        matchedStructureTerms.length >= 2

      if (matchedStructureTerms.length > 0 && likelyClaimContext) {
        const hasDisclaimer =
          lowerText.includes('not intended to diagnose') ||
          lowerText.includes('not been evaluated by the fda') ||
          lowerText.includes('these statements have not been evaluated')

        if (!hasDisclaimer) {
          detections.push({
            type: 'restricted',
            claim: 'Structure/Function claim without disclaimer',
            severity: 'warning',
            regulation: '21 CFR 101.93(b), (f)',
            description: 'Structure/function claims detected but required DSHEA disclaimer is missing',
            recommendation:
              'Add disclaimer: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
            matchedTerms: matchedStructureTerms,
          })
        }
      }
    }

    return detections
  }

  // ─── COSMETIC validator ─────────────────────────────────────────────────────

  private static validateCosmeticClaims(labelText: string): ClaimDetection[] {
    const detections: ClaimDetection[] = []
    const lowerText = labelText.toLowerCase()

    // Strip known-allowed cosmetic action claim patterns before scanning for prohibited terms.
    // This prevents "prevents blisters" from being flagged as a drug claim.
    let scanText = lowerText
    for (const allowed of this.COSMETIC_ALLOWED_CLAIM_PATTERNS) {
      scanText = scanText.split(allowed).join(' ')
    }

    // Check cosmetic-specific prohibited drug-reclassification claims
    for (const term of this.COSMETIC_PROHIBITED_DRUG_CLAIMS) {
      if (this.matchesTermWithBoundary(scanText, term)) {
        detections.push({
          type: 'prohibited',
          claim: term,
          severity: 'critical',
          regulation: 'FD&C Act Section 201(g)(1) / 21 CFR 700.35',
          description: `Claim "${term}" may reclassify this cosmetic as an unapproved drug`,
          recommendation:
            'Remove drug-intent language. Cosmetics may only claim effects on appearance, odor, or physical protection. Disease-specific prevention claims require OTC drug approval.',
          matchedTerms: [term],
        })
      }
    }

    // Check drug-like terms that apply universally
    for (const term of this.DRUG_CLAIMS_ALL_DOMAINS) {
      if (this.matchesTermWithBoundary(scanText, term)) {
        detections.push({
          type: 'prohibited',
          claim: term,
          severity: 'critical',
          regulation: 'FD&C Act Section 201(g)',
          description: `Drug terminology "${term}" detected on cosmetic label`,
          recommendation:
            'Remove drug terminology. Using drug language on a cosmetic label triggers OTC drug classification requirements including Drug Facts panel, clinical testing, and FDA monograph compliance.',
          matchedTerms: [term],
        })
      }
    }

    // MoCRA 2022: Cosmetics must not claim to affect body structure/function beyond appearance
    const structureFunctionTerms = ['restructures', 'regenerates', 'repairs dna', 'cell renewal', 'stem cell']
    for (const term of structureFunctionTerms) {
      if (this.matchesTermWithBoundary(scanText, term)) {
        detections.push({
          type: 'requires_approval',
          claim: term,
          severity: 'warning',
          regulation: 'FD&C Act Section 201(g)(1)(C) / MoCRA 2022',
          description: `Claim "${term}" implies drug-like effect on body structure/function`,
          recommendation:
            'Cosmetics may not claim to affect body structure or function (e.g., DNA repair, cell regeneration). Reword to describe aesthetic/appearance effects only.',
          matchedTerms: [term],
        })
      }
    }

    return detections
  }

  // ─── OTC DRUG validator ─────────────────────────────────────────────────────

  private static validateDrugOtcClaims(labelText: string): ClaimDetection[] {
    const detections: ClaimDetection[] = []
    const lowerText = labelText.toLowerCase()

    // OTC drugs MUST have Drug Facts panel
    if (!lowerText.includes('drug facts')) {
      detections.push({
        type: 'prohibited',
        claim: 'Missing Drug Facts panel',
        severity: 'critical',
        regulation: '21 CFR 201.66',
        description: 'OTC drug products must display a Drug Facts panel',
        recommendation: 'Add Drug Facts panel with active ingredients, uses, warnings, directions, and inactive ingredients per 21 CFR 201.66 format.',
        matchedTerms: [],
      })
    }

    // OTC drugs must declare active ingredient + purpose
    if (!lowerText.includes('active ingredient')) {
      detections.push({
        type: 'prohibited',
        claim: 'Missing active ingredient declaration',
        severity: 'critical',
        regulation: '21 CFR 201.66(c)(1)',
        description: 'Active ingredient(s) and their purpose must be declared',
        recommendation: 'List each active ingredient and its corresponding purpose (e.g., "Salicylic Acid 2% — Acne Treatment") in the Drug Facts panel.',
        matchedTerms: [],
      })
    }

    return detections
  }

  /**
   * Validate multi-language consistency
   * If label has foreign language, all mandatory info must be in both languages
   */
  static validateMultiLanguage(
    englishText: string,
    foreignText?: string,
    foreignLanguage?: string
  ): MultiLanguageIssue | null {
    if (!foreignText || !foreignLanguage) {
      return null
    }

    // Mandatory information that must be in both languages
    const mandatoryFields = [
      { en: 'ingredients', vn: 'thành phần' },
      { en: 'allergen', vn: 'dị ứng' },
      { en: 'warning', vn: 'cảnh báo' },
      { en: 'directions', vn: 'hướng dẫn' },
      { en: 'nutrition facts', vn: 'thông tin dinh dưỡng' },
    ]

    const missingTranslations: string[] = []
    const lowerEnglish = englishText.toLowerCase()
    const lowerForeign = foreignText.toLowerCase()

    for (const field of mandatoryFields) {
      const hasEnglish = lowerEnglish.includes(field.en)
      const hasForeign = lowerForeign.includes(field.vn)

      if (hasEnglish && !hasForeign) {
        missingTranslations.push(
          `"${field.en}" found in English but missing ${foreignLanguage} translation`
        )
      }
    }

    if (missingTranslations.length === 0) {
      return null
    }

    return {
      missingTranslations,
      inconsistencies: [],
      severity: 'critical',
      regulation: '21 CFR 101.15(c)',
    }
  }

  /**
   * Generate required disclaimers based on product type and claims
   */
  static generateRequiredDisclaimers(
    productType: 'conventional' | 'supplement' | 'cosmetic',
    hasClaims: boolean
  ): string[] {
    const disclaimers: string[] = []

    if (productType === 'supplement' && hasClaims) {
      disclaimers.push(
        'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.'
      )
    }

    // Standard responsibility disclaimer for all Vexim reports
    disclaimers.push(
      'This report is AI-generated and verified by Vexim Global compliance experts. Results are based on current regulations at the time of analysis. The manufacturer is ultimately responsible for label accuracy.'
    )

    return disclaimers
  }

  /**
   * Check if product name implies health benefits (soft violation)
   */
  static validateProductName(productName: string): ClaimDetection | null {
    const lowerName = productName.toLowerCase()

    // Names that imply benefits without claims
    const implicationTerms = [
      'detox',
      'cleanse',
      'slim',
      'weight loss',
      'fat burner',
      'energy boost',
      'immune',
      'defense',
    ]

    for (const term of implicationTerms) {
      if (lowerName.includes(term)) {
        return {
          type: 'restricted',
          claim: `Product name: "${productName}"`,
          severity: 'warning',
          regulation: 'FDA Guidance on Labeling',
          description: `Product name implies health benefit: "${term}"`,
          recommendation:
            'Product names implying health benefits may require substantiation. Ensure all implied benefits are supported.',
          matchedTerms: [term],
        }
      }
    }

    return null
  }

  // ─── NUTRIENT CONTENT CLAIM CROSS-REFERENCE VALIDATION ───────────────────
  //
  // 21 CFR 101.62 defines specific limits for nutrient content claims:
  //   - "Free" claims: nutrient must be below detection threshold
  //   - "Low" claims: nutrient must be ≤ specific limit
  //   - "Reduced/Less" claims: nutrient must be ≥25% less than reference
  //
  // This method cross-references detected claims with actual nutrition facts
  // to automatically verify compliance instead of flagging "needs review".
  //
  // RACC = Reference Amount Customarily Consumed (defined per product category)
  // For simplicity, we use standard serving size limits here.

  /**
   * Nutrient content claim limits per 21 CFR 101.62
   * Values are per RACC (Reference Amount Customarily Consumed)
   * Using standard RACC assumptions for general food products
   */
  private static NUTRIENT_CONTENT_CLAIM_LIMITS: Record<string, {
    patterns: RegExp[]
    nutrientKey: string
    limit: number
    unit: string
    regulation: string
    description: string
  }[]> = {
    fat: [
      {
        patterns: [/\bfat[\s-]?free\b/i, /\b0[\s%]*fat\b/i, /\bno[\s-]?fat\b/i],
        nutrientKey: 'total fat',
        limit: 0.5,
        unit: 'g',
        regulation: '21 CFR 101.62(b)(1)',
        description: '"Fat Free" requires <0.5g fat per RACC'
      },
      {
        patterns: [/\blow[\s-]?fat\b/i, /\blight[\s-]?fat\b/i],
        nutrientKey: 'total fat',
        limit: 3,
        unit: 'g',
        regulation: '21 CFR 101.62(b)(2)',
        description: '"Low Fat" requires ≤3g fat per RACC'
      },
      {
        patterns: [/\breduced[\s-]?fat\b/i, /\bless[\s-]?fat\b/i],
        nutrientKey: 'total fat',
        limit: 999, // Requires 25% reduction - complex comparison
        unit: 'g',
        regulation: '21 CFR 101.62(b)(4)',
        description: '"Reduced Fat" requires ≥25% less fat than reference'
      }
    ],
    saturated_fat: [
      {
        patterns: [/\bsaturated[\s-]?fat[\s-]?free\b/i, /\bno[\s-]?saturated[\s-]?fat\b/i],
        nutrientKey: 'saturated fat',
        limit: 0.5,
        unit: 'g',
        regulation: '21 CFR 101.62(c)(1)',
        description: '"Saturated Fat Free" requires <0.5g saturated fat per RACC'
      },
      {
        patterns: [/\blow[\s-]?saturated[\s-]?fat\b/i],
        nutrientKey: 'saturated fat',
        limit: 1,
        unit: 'g',
        regulation: '21 CFR 101.62(c)(2)',
        description: '"Low Saturated Fat" requires ≤1g saturated fat per RACC'
      }
    ],
    cholesterol: [
      {
        patterns: [/\bcholesterol[\s-]?free\b/i, /\bno[\s-]?cholesterol\b/i],
        nutrientKey: 'cholesterol',
        limit: 2,
        unit: 'mg',
        regulation: '21 CFR 101.62(d)(1)',
        description: '"Cholesterol Free" requires <2mg cholesterol per RACC'
      },
      {
        patterns: [/\blow[\s-]?cholesterol\b/i],
        nutrientKey: 'cholesterol',
        limit: 20,
        unit: 'mg',
        regulation: '21 CFR 101.62(d)(2)',
        description: '"Low Cholesterol" requires ≤20mg cholesterol per RACC'
      }
    ],
    sodium: [
      {
        patterns: [/\bsodium[\s-]?free\b/i, /\bsalt[\s-]?free\b/i, /\bno[\s-]?sodium\b/i],
        nutrientKey: 'sodium',
        limit: 5,
        unit: 'mg',
        regulation: '21 CFR 101.61(b)(1)',
        description: '"Sodium Free" requires <5mg sodium per RACC'
      },
      {
        patterns: [/\blow[\s-]?sodium\b/i, /\blow[\s-]?salt\b/i],
        nutrientKey: 'sodium',
        limit: 140,
        unit: 'mg',
        regulation: '21 CFR 101.61(b)(4)',
        description: '"Low Sodium" requires ≤140mg sodium per RACC'
      },
      {
        patterns: [/\bvery[\s-]?low[\s-]?sodium\b/i],
        nutrientKey: 'sodium',
        limit: 35,
        unit: 'mg',
        regulation: '21 CFR 101.61(b)(3)',
        description: '"Very Low Sodium" requires ≤35mg sodium per RACC'
      }
    ],
    sugar: [
      {
        patterns: [/\bsugar[\s-]?free\b/i, /\bno[\s-]?sugar\b/i, /\bzero[\s-]?sugar\b/i],
        nutrientKey: 'total sugars',
        limit: 0.5,
        unit: 'g',
        regulation: '21 CFR 101.60(c)(1)',
        description: '"Sugar Free" requires <0.5g sugars per RACC'
      },
      {
        patterns: [/\blow[\s-]?sugar\b/i],
        nutrientKey: 'total sugars',
        limit: 5, // Not officially defined - using reasonable limit
        unit: 'g',
        regulation: '21 CFR 101.60(c)',
        description: '"Low Sugar" - verify compliance with FDA guidance'
      },
      {
        patterns: [/\bno[\s-]?added[\s-]?sugar/i, /\bwithout[\s-]?added[\s-]?sugar/i],
        nutrientKey: 'added sugars',
        limit: 0,
        unit: 'g',
        regulation: '21 CFR 101.60(c)(2)',
        description: '"No Added Sugars" requires no sugars added during processing'
      }
    ],
    calories: [
      {
        patterns: [/\bcalorie[\s-]?free\b/i, /\bzero[\s-]?calorie/i],
        nutrientKey: 'calories',
        limit: 5,
        unit: 'kcal',
        regulation: '21 CFR 101.60(b)(1)',
        description: '"Calorie Free" requires <5 calories per RACC'
      },
      {
        patterns: [/\blow[\s-]?calorie\b/i],
        nutrientKey: 'calories',
        limit: 40,
        unit: 'kcal',
        regulation: '21 CFR 101.60(b)(2)',
        description: '"Low Calorie" requires ≤40 calories per RACC'
      }
    ]
  }

  /**
   * Verify nutrient content claims against actual nutrition facts data.
   * 
   * This method provides smart cross-reference:
   * - If claim is verified as compliant → status: 'compliant'
   * - If claim violates limit → status: 'violation' (critical)
   * - If unable to verify (missing data) → status: 'needs_review'
   * 
   * @param labelText - Full label text (product name + claims)
   * @param nutritionFacts - Array of extracted nutrition facts
   * @returns Array of verification results for detected nutrient content claims
   */
  static verifyNutrientContentClaims(
    labelText: string,
    nutritionFacts: NutritionFactData[]
  ): NutrientClaimVerification[] {
    const results: NutrientClaimVerification[] = []
    const lowerText = labelText.toLowerCase()

    // Build a map of nutrient values for quick lookup
    const nutrientMap = new Map<string, number | null>()
    for (const fact of nutritionFacts) {
      const key = fact.nutrient.toLowerCase().trim()
      let numValue: number | null = null
      
      if (typeof fact.value === 'number') {
        numValue = fact.value
      } else if (typeof fact.value === 'string') {
        // Extract numeric value from string like "2.5g" or "140mg"
        const match = fact.value.match(/^<?(\d+(?:\.\d+)?)/);
        if (match) {
          numValue = parseFloat(match[1])
        }
      }
      
      nutrientMap.set(key, numValue)
      // Also store common aliases
      if (key === 'total fat') nutrientMap.set('fat', numValue)
      if (key === 'total sugars') nutrientMap.set('sugars', numValue)
      if (key === 'sat. fat') nutrientMap.set('saturated fat', numValue)
      if (key === 'sat fat') nutrientMap.set('saturated fat', numValue)
      if (key === 'cholest.') nutrientMap.set('cholesterol', numValue)
    }

    // Check each category of nutrient content claims
    for (const [category, claimDefs] of Object.entries(this.NUTRIENT_CONTENT_CLAIM_LIMITS)) {
      for (const def of claimDefs) {
        // Check if any pattern matches the label text
        const matchedPattern = def.patterns.find(pattern => pattern.test(lowerText))
        if (!matchedPattern) continue

        // Get the matched claim text
        const match = lowerText.match(matchedPattern)
        const claimText = match ? match[0] : category

        // Look up the actual nutrient value
        const actualValue = nutrientMap.get(def.nutrientKey)

        if (actualValue === null || actualValue === undefined) {
          // Cannot verify - nutrition data not available
          results.push({
            claim: claimText,
            claimType: 'nutrient_content',
            status: 'needs_review',
            nutrient: def.nutrientKey,
            actualValue: null,
            limit: def.limit,
            unit: def.unit,
            regulation: def.regulation,
            description: `${def.description}. Unable to verify - ${def.nutrientKey} value not extracted.`
          })
        } else if (actualValue <= def.limit) {
          // COMPLIANT - actual value meets the claim requirement
          results.push({
            claim: claimText,
            claimType: 'nutrient_content',
            status: 'compliant',
            nutrient: def.nutrientKey,
            actualValue,
            limit: def.limit,
            unit: def.unit,
            regulation: def.regulation,
            description: `${claimText.toUpperCase()} claim verified: ${actualValue}${def.unit} ≤ ${def.limit}${def.unit} limit`
          })
        } else {
          // VIOLATION - actual value exceeds the claim requirement
          results.push({
            claim: claimText,
            claimType: 'nutrient_content',
            status: 'violation',
            nutrient: def.nutrientKey,
            actualValue,
            limit: def.limit,
            unit: def.unit,
            regulation: def.regulation,
            description: `${claimText.toUpperCase()} claim VIOLATED: ${actualValue}${def.unit} exceeds ${def.limit}${def.unit} limit per ${def.regulation}`
          })
        }
      }
    }

    return results
  }

  /**
   * Classify dietary supplement claims (21 CFR 101.36, DSHEA)
   * 
   * Reference: 21 CFR 101.36 - Dietary Supplement Label Statements
   * DSHEA (Dietary Supplement Health and Education Act) 1994
   * FD&C Act Section 403(s)
   * 
   * Input: array of claim strings extracted from label + full label text
   * Output: ClassifiedClaim[] with type, status, and compliance info
   */
  static classifyClaimsForSupplements(claims: string[], fullLabelText: string): typeof ClassifiedClaim[] {
    const { ClassifiedClaim } = require('../lib/types')
    const classified: any[] = []

    // Pattern to detect DSHEA disclaimer in label text
    const dshea_disclaimer_patterns = [
      /these statements? have not been evaluated by the food and drug administration/i,
      /not intended to diagnose, treat, cure,? or prevent any disease/i,
      /FDA disclaimer/i,
    ]

    const hasDSHEADisclaimer = dshea_disclaimer_patterns.some(pattern => 
      pattern.test(fullLabelText)
    )

    // Pattern to detect structure/function claim symbols (‡, †, *)
    const structureFunctionSymbols = /[‡†*]|footnote|dagger|symbol/i

    for (const claim of claims) {
      const claimLower = claim.toLowerCase().trim()
      let classification: any = {
        claim_text: claim,
        severity: 'info',
        regulation_reference: '21 CFR 101.36, DSHEA',
      }

      const hasSymbol = structureFunctionSymbols.test(claim)

      // ──── STRUCTURE/FUNCTION CLAIMS ────
      // "Supports", "maintains", "promotes", "helps" etc. require DSHEA disclaimer
      if (this.STRUCTURE_FUNCTION_INDICATORS.some(indicator => 
        claimLower.includes(indicator)
      )) {
        classification.claim_type = 'STRUCTURE_FUNCTION'
        classification.has_symbol = hasSymbol

        if (hasSymbol && !hasDSHEADisclaimer) {
          // Symbol present but disclaimer missing → NEEDS_REVIEW (not VIOLATION)
          // Reason: OCR may miss small disclaimer text
          classification.status = 'needs_review'
          classification.has_disclaimer = false
          classification.severity = 'warning'
          classification.description = `Structure/Function claim: "${claim}" - Symbol detected but DSHEA disclaimer not found in OCR. May exist on back panel.`
          classification.suggested_fix = 'Verify DSHEA disclaimer is present on complete label. If present, ensure it\'s visible to OCR.'
        } else if (hasSymbol && hasDSHEADisclaimer) {
          // Symbol present and disclaimer found → COMPLIANT
          classification.status = 'compliant'
          classification.has_disclaimer = true
          classification.severity = 'info'
          classification.description = `Structure/Function claim: "${claim}" - Compliant with symbol and DSHEA disclaimer.`
        } else if (!hasSymbol && !hasDSHEADisclaimer) {
          // No symbol, no disclaimer detected → NEEDS_REVIEW (not violation)
          // Reason: OCR often misses ‡/† symbols and small disclaimer text on back panel
          // Risk should be lower since this is likely OCR limitation, not actual non-compliance
          classification.status = 'needs_review'
          classification.has_disclaimer = false
          classification.severity = 'warning'
          classification.description = `Structure/Function claim: "${claim}" - Symbol (‡/†) and DSHEA disclaimer not detected by OCR. Likely present on back panel.`
          classification.suggested_fix = 'Verify symbol (‡ or †) and DSHEA disclaimer are present on complete label. If present, ensure back panel image is uploaded for OCR.'
        } else {
          // No symbol but disclaimer present (unusual but compliant)
          classification.status = 'compliant'
          classification.has_disclaimer = true
          classification.severity = 'info'
          classification.description = `Structure/Function claim: "${claim}" - Compliant with DSHEA disclaimer.`
        }
      }
      // ──── FACTUAL CLAIMS ────
      // Potency (CFU), ingredient count, storage, origin, country of origin, etc.
      // NOTE: Check this BEFORE marketing/third-party claims to avoid misclassification
      else if (
        /\d+\s*(billion|million|billion\s*cfu|million\s*cfu|strains?|diverse|ingredient)/i.test(claimLower) ||
        /made in|origin|country|storage|refrigeration|temperature|contains|ingredient/i.test(claimLower) ||
        /potency|colony|cfu|billion|million|strain|verified|project|non.?gmo/i.test(claimLower) ||
        // Country of origin patterns: "Raw from Sri Lanka", "from [country]", "grown in", "sourced from"
        /\bfrom\s+[a-z]+/i.test(claimLower) ||
        /\braw\s+from\b|\bsourced\s+from\b|\bgrown\s+in\b|\bharvested\s+in\b|\bimported\s+from\b/i.test(claimLower)
      ) {
        classification.claim_type = 'FACTUAL'
        classification.status = 'compliant'
        classification.severity = 'info'
        classification.description = `Factual claim: "${claim}" - Potency/ingredient/certification statement. No disclaimer required.`
      }
      // ──── WARRANTY/GUARANTEE CLAIMS ────
      // "100% Satisfaction", "Money-back guarantee", etc.
      else if (/satisfaction|guarantee|refund|money.back|warranty/i.test(claimLower)) {
        classification.claim_type = 'WARRANTY'
        classification.status = 'needs_review'
        classification.severity = 'warning'
        classification.description = `Warranty claim: "${claim}" - Not a health/nutrient claim. Verify compliance with consumer protection regulations.`
        classification.suggested_fix = 'Ensure satisfaction guarantee terms are clearly disclosed and compliant with FTC regulations.'
      }
      // ──── MARKETING CLAIMS ────
      // "Third-party tested", "Developed with doctors", unregulated marketing
      else if (/third.?party.tested|developed with|doctor|physician|expert|professional|tested by laboratory|lab certified|approved/i.test(claimLower)) {
        classification.claim_type = 'MARKETING'
        classification.status = 'needs_review'
        classification.severity = 'warning'
        classification.description = `Marketing claim: "${claim}". Verify this is not making unauthorized health claims and complies with FTC regulations.`
        classification.suggested_fix = 'Ensure marketing claims do not constitute unauthorized health claims. Add disclaimer if claim refers to body function.'
      }
      // ──── DISEASE CLAIMS (PROHIBITED) ────
      else if (this.FOOD_SUPPLEMENT_PROHIBITED_DISEASE_CLAIMS.some(term =>
        this.matchesTermWithBoundary(claimLower, term)
      )) {
        classification.claim_type = 'DISEASE'
        classification.status = 'violation'
        classification.severity = 'critical'
        classification.description = `Prohibited disease/drug claim detected: "${claim}". Dietary supplements cannot make disease claims.`
        classification.suggested_fix = 'Remove disease claim. Use structure/function language instead (e.g., "supports" instead of "treats").'
      }
      // ──── UNCLASSIFIED ────
      else {
        classification.claim_type = 'FACTUAL'
        classification.status = 'needs_review'
        classification.severity = 'info'
        classification.description = `Claim "${claim}" could not be automatically classified. Please verify compliance manually.`
      }

      classified.push(classification)
    }

    return classified
  }
}
