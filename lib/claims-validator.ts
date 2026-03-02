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

export type ProductDomain = 'food' | 'supplement' | 'cosmetic' | 'drug_otc' | 'device'

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
   * NOTE: "prevent" is included here because FDA prohibits food/supplement labels
   * from claiming the product prevents a disease (e.g. "prevents heart disease").
   */
  private static FOOD_SUPPLEMENT_PROHIBITED_DISEASE_CLAIMS = [
    'cure',
    'treat',
    'prevent',
    'diagnose',
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
  private static DRUG_CLAIMS_ALL_DOMAINS = [
    'drug',
    'medicine',
    'medication',
    'therapeutic',
    'prescription',
    'clinical',
    'pharmacological',
  ]

  // ─── MAIN ENTRY POINT ──────────────────────────────────────────────────────

  /**
   * Scan label text for prohibited or restricted claims.
   *
   * @param labelText   - Full label text extracted by Vision AI
   * @param domain      - Product domain (food | supplement | cosmetic | drug_otc | device)
   *                      Defaults to 'food' for backwards compatibility.
   */
  static validateClaims(labelText: string, domain: ProductDomain = 'food'): ClaimDetection[] {
    if (domain === 'cosmetic') {
      return this.validateCosmeticClaims(labelText)
    }
    if (domain === 'drug_otc') {
      return this.validateDrugOtcClaims(labelText)
    }
    // food, supplement, device — use food/supplement ruleset
    return this.validateFoodSupplementClaims(labelText, domain)
  }

  // ─── FOOD / SUPPLEMENT validator ───────────────────────────────────────────

  private static validateFoodSupplementClaims(
    labelText: string,
    domain: ProductDomain
  ): ClaimDetection[] {
    const detections: ClaimDetection[] = []
    const lowerText = labelText.toLowerCase()

    // Check for prohibited disease claims
    for (const term of this.FOOD_SUPPLEMENT_PROHIBITED_DISEASE_CLAIMS) {
      if (lowerText.includes(term)) {
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
    }

    // Check for drug-like claims (all domains)
    for (const term of this.DRUG_CLAIMS_ALL_DOMAINS) {
      if (lowerText.includes(term)) {
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
      if (lowerText.includes(term)) {
        detections.push({
          type: 'requires_approval',
          claim: term,
          severity: 'warning',
          regulation: '21 CFR 101.14',
          description: `Restricted health claim detected: "${term}"`,
          recommendation:
            'Health claims require FDA approval or must be qualified. Ensure compliance with approved claim wording.',
          matchedTerms: [term],
        })
      }
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
            regulation: '21 CFR 101.93(f)',
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
      if (scanText.includes(term)) {
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
      if (scanText.includes(term)) {
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
      if (scanText.includes(term)) {
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
