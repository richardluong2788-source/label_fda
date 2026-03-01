/**
 * Claims Validator - Prohibited and Restricted Claims Detection
 * Detects unauthorized health claims and regulated terminology
 * Reference: 21 CFR 101.14, DSHEA, FTC Act
 */

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
  // Prohibited disease claims - absolute NO
  private static PROHIBITED_DISEASE_CLAIMS = [
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

  // Health claims requiring FDA approval
  private static RESTRICTED_HEALTH_CLAIMS = [
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

  // Drug-like claims
  private static DRUG_CLAIMS = [
    'drug',
    'medicine',
    'medication',
    'therapeutic',
    'prescription',
    'clinical',
    'pharmacological',
  ]

  // Structure/function claims (allowed but need disclaimer)
  private static STRUCTURE_FUNCTION_INDICATORS = [
    'supports',
    'maintains',
    'promotes',
    'helps',
    'contributes to',
    'assists',
    'aids',
  ]

  /**
   * Scan label text for prohibited or restricted claims
   */
  static validateClaims(labelText: string): ClaimDetection[] {
    const detections: ClaimDetection[] = []
    const lowerText = labelText.toLowerCase()

    // Check for prohibited disease claims
    for (const term of this.PROHIBITED_DISEASE_CLAIMS) {
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

    // Check for drug-like claims
    for (const term of this.DRUG_CLAIMS) {
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

    // Check for restricted health claims
    for (const term of this.RESTRICTED_HEALTH_CLAIMS) {
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

    // Check for structure/function claims without disclaimer
    // IMPORTANT: Only flag if we have substantive claim statements, not just isolated words
    const matchedStructureTerms = this.STRUCTURE_FUNCTION_INDICATORS.filter((term) =>
      lowerText.includes(term)
    )
    
    // Additional context check: claims usually appear in specific sections
    const likelyClaimContext = 
      lowerText.includes('benefits:') ||
      lowerText.includes('benefits include') ||
      lowerText.includes('may help') ||
      lowerText.includes('designed to') ||
      lowerText.includes('formulated to') ||
      (matchedStructureTerms.length >= 2) // Multiple claim indicators = more likely a real claim

    const hasStructureFunctionClaim = matchedStructureTerms.length > 0 && likelyClaimContext

    if (hasStructureFunctionClaim) {
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
          description:
            'Structure/function claims detected but required disclaimer is missing',
          recommendation:
            'Add disclaimer: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
          matchedTerms: matchedStructureTerms,
        })
      }
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
