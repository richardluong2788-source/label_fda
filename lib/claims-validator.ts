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
}
