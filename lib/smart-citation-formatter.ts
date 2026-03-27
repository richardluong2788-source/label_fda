import type { ViolationMapping, MappedFinding } from './violation-to-cfr-mapper'
import type { KnowledgeSearchResult } from './embedding-utils'
import { createEnhancedIngredientViolation, analyzeIngredientList } from './ingredient-analysis-engine'

export type FormatterLang = 'vi' | 'en'

/**
 * SMART CITATION FORMATTER
 * Converts technical findings into professional business language with CFR citations.
 * Supports Vietnamese (vi) and English (en) — defaults to English.
 * 
 * Updated: Now includes enhanced ingredient analysis with:
 * - Non-standard name detection
 * - Allergen verification
 * - Step-by-step remediation
 * - Risk/consequence warnings
 */
export class SmartCitationFormatter {
  /**
   * Format a violation into a professional finding with expert language
   * 
   * For ingredient_order violations, uses enhanced analysis engine that provides:
   * - Specific ingredient name issues (non-standard FDA names)
   * - Allergen declaration verification
   * - Detailed step-by-step remediation
   * - Risk warnings
   */
  static formatProfessionalFinding(
    violation: ViolationMapping,
    regulation: KnowledgeSearchResult | null,
    lang: FormatterLang = 'en',
    additionalContext?: {
      ingredients?: string[]
      ingredientListText?: string
      detectedAllergens?: string[]
    }
  ): MappedFinding {
    const templates = this.getTemplateByType(violation.type, lang)
    
    // Special handling for ingredient_order violations - use enhanced analysis
    if (violation.type === 'ingredient_order' && additionalContext?.ingredients) {
      const enhanced = createEnhancedIngredientViolation(
        additionalContext.ingredients,
        additionalContext.ingredientListText || additionalContext.ingredients.join(', '),
        additionalContext.detectedAllergens || [],
        lang
      )
      
      return {
        summary: templates.summary(violation),
        legal_basis: templates.legalBasis(violation, regulation),
        expert_logic: enhanced.expertLogic,
        remediation: enhanced.remediation,
        severity: violation.severity,
        cfr_reference: violation.regulationSection,
        confidence_score: regulation?.similarity || 0.8
      }
    }
    
    return {
      summary: templates.summary(violation),
      legal_basis: templates.legalBasis(violation, regulation),
      expert_logic: templates.expertLogic(violation),
      remediation: templates.remediation(violation),
      severity: violation.severity,
      cfr_reference: violation.regulationSection,
      confidence_score: regulation?.similarity || 0.8
    }
  }
  
  /**
   * Analyze ingredient list for detailed issues
   * Returns comprehensive analysis including non-standard names, allergens, and remediation steps
   */
  static analyzeIngredients(
    ingredients: string[],
    ingredientListText: string,
    detectedAllergens: string[] = []
  ) {
    return analyzeIngredientList(ingredients, ingredientListText, detectedAllergens)
  }

  /**
   * Get formatting templates by violation type and language
   */
  private static getTemplateByType(type: ViolationMapping['type'], lang: FormatterLang) {
    const L = lang === 'vi' ? VI_TEMPLATES : EN_TEMPLATES
    return L[type] || L.missing_field
  }

  /**
   * Format multiple findings into a categorized report
   */
  static formatCommercialReport(findings: MappedFinding[]): {
    critical: MappedFinding[]
    warning: MappedFinding[]
    info: MappedFinding[]
  } {
    return {
      critical: findings.filter(f => f.severity === 'critical'),
      warning: findings.filter(f => f.severity === 'warning'),
      info: findings.filter(f => f.severity === 'info')
    }
  }

  /**
   * Generate expert tips based on common patterns
   */
  static generateExpertTips(findings: MappedFinding[], lang: FormatterLang = 'en'): string[] {
    const tips: string[] = []
    const L = lang === 'vi' ? VI_TIPS : EN_TIPS

    const fontIssues = findings.filter(f => f.cfr_reference.includes('101.9') && (f.summary.includes('font') || f.summary.includes('chữ')))
    if (fontIssues.length > 0) tips.push(L.fontTip)

    const allergenIssues = findings.filter(f => f.summary.includes('allergen') || f.summary.includes('dị ứng'))
    if (allergenIssues.length > 0) tips.push(L.allergenTip)

    const roundingIssues = findings.filter(f => f.summary.includes('rounding') || f.summary.includes('làm tròn'))
    if (roundingIssues.length > 0) tips.push(L.roundingTip)

    // Ingredient order/naming issues - check for 101.4 (ingredient list) violations
    const ingredientIssues = findings.filter(f => 
      f.cfr_reference.includes('101.4') || 
      f.summary.toLowerCase().includes('ingredient') || 
      f.summary.includes('nguyên liệu') ||
      f.summary.includes('thành phần')
    )
    if (ingredientIssues.length > 0) tips.push(L.ingredientTip)

    return tips
  }

  /**
   * Create a complete commercial report summary
   * Returns empty string if no findings, so client-side fallback can trigger
   */
  static createReportSummary(findings: MappedFinding[], lang: FormatterLang = 'en'): string {
    const categorized = this.formatCommercialReport(findings)
    const tips = this.generateExpertTips(findings, lang)
    const L = lang === 'vi' ? VI_REPORT : EN_REPORT
    const compliantMsg = lang === 'vi' ? VI_COMPLIANT : EN_COMPLIANT

    // If no findings at all, return a compliant message
    const totalFindings = categorized.critical.length + categorized.warning.length + categorized.info.length
    if (totalFindings === 0) {
      let summary = `## ${L.title}\n\n`
      summary += `### ${compliantMsg.icon} ${compliantMsg.title}\n\n`
      summary += `${compliantMsg.description}\n\n`
      summary += `${compliantMsg.recommendation}\n`
      return summary
    }

    let summary = `## ${L.title}\n\n`
    
    if (categorized.critical.length > 0) {
      summary += `### ${L.criticalIcon} ${L.criticalLabel} (${categorized.critical.length})\n`
      summary += `${L.criticalNote}\n\n`
      categorized.critical.forEach((f, i) => {
        summary += `**${i + 1}. ${f.summary}**\n`
        summary += `- ${f.expert_logic}\n`
        summary += `- ${f.remediation}\n`
        summary += `- ${L.legalBasisLabel}: ${f.cfr_reference}\n\n`
      })
    }

    if (categorized.warning.length > 0) {
      summary += `### ${L.warningIcon} ${L.warningLabel} (${categorized.warning.length})\n`
      summary += `${L.warningNote}\n\n`
      categorized.warning.forEach((f, i) => {
        summary += `**${i + 1}. ${f.summary}**\n`
        summary += `- ${f.expert_logic}\n`
        summary += `- ${f.remediation}\n\n`
      })
    }

    if (categorized.info.length > 0) {
      summary += `### ${L.infoIcon} ${L.infoLabel} (${categorized.info.length})\n`
      summary += `${L.infoNote}\n\n`
      categorized.info.forEach((f, i) => {
        summary += `**${i + 1}. ${f.summary}**\n`
        summary += `- ${f.expert_logic}\n\n`
      })
    }

    if (tips.length > 0) {
      summary += `### ${L.tipsLabel}\n\n`
      tips.forEach(tip => {
        summary += `- ${tip}\n`
      })
    }

    return summary
  }
}

// ─── TEMPLATE TYPES ──────────────────────────────────────────────────────────

type TemplateSet = {
  summary: (v: ViolationMapping) => string
  legalBasis: (v: ViolationMapping, reg: KnowledgeSearchResult | null) => string
  expertLogic: (v: ViolationMapping) => string
  remediation: (v: ViolationMapping) => string
}

type AllTemplates = Record<ViolationMapping['type'], TemplateSet> & { missing_field: TemplateSet }

// ─── ENGLISH TEMPLATES ───────────────────────────────────────────────────────

const EN_TEMPLATES: AllTemplates = {
  font_size: {
    summary: () => `Font size non-compliance detected`,
    legalBasis: (v, reg) => {
      const citation = reg ? reg.content.substring(0, 150) + '...' : 'FDA minimum font size requirements'
      return `Per ${v.regulationSection}, ${citation}`
    },
    expertLogic: (v) =>
      `The system detected the "Nutrition Facts" title at ${v.detectedValue}, which is below the minimum ${v.requiredValue} for packages with a PDP area greater than 40 sq in. This violates readability requirements for nutrition information.`,
    remediation: (v) =>
      `Fix: Increase the "Nutrition Facts" title to at least ${v.requiredValue}. Ensure this title is larger than all other text in the nutrition panel.`
  },
  rounding: {
    summary: () => `Nutrition value rounding error detected`,
    legalBasis: (v) =>
      `Per ${v.regulationSection}, FDA requires nutrition values to follow specific rounding rules`,
    expertLogic: (v) => {
      if (v.detectedValue.includes('kcal'))
        return `The system detected Calories at ${v.detectedValue}, which is not divisible by 5. Per FDA rules, Calories must be rounded to the nearest multiple of 5 (e.g., 102 -> 100, 103 -> 105).`
      if (v.detectedValue.includes('Trans Fat'))
        return `The system detected Trans Fat at ${v.detectedValue}. Per FDA rules, if Trans Fat is less than 0.5g it must be listed as 0g on the label to avoid misleading consumers about harmful fat content.`
      return `The value ${v.detectedValue} does not comply with FDA rounding rules and should be adjusted to ${v.requiredValue}.`
    },
    remediation: (v) =>
      `Fix: Change the value from ${v.detectedValue} to ${v.requiredValue} per FDA rounding rules.`
  },
  net_weight: {
    summary: () => `Missing or incomplete net weight declaration`,
    legalBasis: (v) => {
      if (v.regulationSection.includes('701.13'))
        return `Per ${v.regulationSection}, cosmetic labels distributed in the US must include both Metric and Imperial units`
      if (v.regulationSection.includes('201.51'))
        return `Per ${v.regulationSection}, OTC drug labels distributed in the US must include both Metric and Imperial units`
      return `Per ${v.regulationSection}, food labels for US distribution must include both Metric and Imperial units`
    },
    expertLogic: (v) =>
      `The system detected the current Net Weight as: "${v.detectedValue}". Regulations require both measurement units to be declared simultaneously: Metric (g, ml) and Imperial (oz, fl oz). Standard example: "Net Wt. 24 oz (680g)".`,
    remediation: (v) =>
      `Fix: Add both measurement units. Example: if the product is 500g, label as "Net Wt. 17.6 oz (500g)".`
  },
  ingredient_order: {
    summary: (v) => {
      if (v.regulationSection.includes('701.3')) return `Cosmetic ingredient (INCI) order warning`
      if (v.regulationSection.includes('201.10')) return `Inactive ingredient order warning (OTC Drug)`
      return `Ingredient order warning`
    },
    legalBasis: (v) => {
      if (v.regulationSection.includes('701.3'))
        return `Per ${v.regulationSection} (21 CFR 701.3 - Cosmetic labeling), INCI ingredients must be listed in descending order of predominance by weight`
      if (v.regulationSection.includes('201.10'))
        return `Per ${v.regulationSection} (21 CFR 201.10 - OTC Drug labeling), inactive ingredients must be listed in descending order of predominance by weight`
      return `Per ${v.regulationSection} (21 CFR 101.4 - Food labeling), ingredients must be listed in descending order of predominance by weight`
    },
    expertLogic: (v) => {
      if (v.regulationSection.includes('701.3'))
        return `The system identified the INCI ingredient list: ${v.detectedValue}. Per 21 CFR 701.3(a), ingredients must be listed in descending order of concentration. Please cross-reference with the manufacturing formula to confirm the correct order.`
      if (v.regulationSection.includes('201.10'))
        return `The system identified the inactive ingredient list: ${v.detectedValue}. Per 21 CFR 201.10(g), the order must follow descending concentration. Please verify with the manufacturer.`
      return `The system identified the ingredient list: ${v.detectedValue}. Please verify that this order matches the actual weight proportions. The ingredient with the highest proportion by weight must appear first.`
    },
    remediation: (v) => {
      if (v.regulationSection.includes('701.3'))
        return `Guidance: Cross-reference the INCI list with the cosmetic formula. Reorder by descending concentration (% w/w). Ingredients below 1% may be listed in any order at the end.`
      if (v.regulationSection.includes('201.10'))
        return `Guidance: Cross-reference the inactive ingredient list with the OTC drug formula. Reorder by descending concentration and consult the relevant USP monograph.`
      return `Guidance: Cross-reference the ingredient list with the manufacturing formula. Reorder in descending order by weight (highest % ingredient first).`
    },
  },
  allergen_bold: {
    summary: () => `Allergen formatting non-compliance detected`,
    legalBasis: (v) =>
      `Per ${v.regulationSection} (FALCPA - Food Allergen Labeling and Consumer Protection Act), allergens must be highlighted`,
    expertLogic: () =>
      `The system detected allergens that need to be declared but are not bolded or clearly distinguished. Per FALCPA, the 8 major allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans) must be displayed in bold or have a separate "Contains:" statement.`,
    remediation: () =>
      `Fix: Bold all allergens in the ingredient list OR add a "Contains:" statement immediately after the ingredient list. Example: "Contains: Milk, Soy".`
  },
  color_contrast: {
    summary: () => `Color contrast warning`,
    legalBasis: (v) =>
      `Per ${v.regulationSection}, label text must have sufficient contrast for readability`,
    expertLogic: (v) =>
      `The system measured a text/background contrast ratio of ${v.detectedValue}, which is below the standard ${v.requiredValue}. This may make it difficult for consumers to read the information, especially elderly individuals or those with visual impairments.`,
    remediation: () =>
      `Fix: Increase contrast by either: (1) Using darker text color, or (2) Using a lighter background. Tool: WebAIM Contrast Checker.`
  },
  hairlines: {
    summary: () => `Inappropriate use of hairlines detected`,
    legalBasis: (v) =>
      `Per ${v.regulationSection}, when panel area is small, dots should be used instead of hairlines`,
    expertLogic: () =>
      `The system detected hairlines (thin rules) separating items in the Nutrition Facts panel. However, for panels smaller than 40 sq in, FDA recommends using dots as they are more readable and space-efficient.`,
    remediation: () =>
      `Fix: Replace hairlines with dots (......) to connect nutrient names with values. Example: "Total Fat..........5g" instead of "Total Fat _____ 5g".`
  },
  missing_field: {
    summary: () => `Missing mandatory information detected`,
    legalBasis: (v) =>
      `Per ${v.regulationSection}, this information is mandatory on food labels`,
    expertLogic: (v) =>
      `The system did not detect ${v.detectedValue}. This is mandatory information per FDA regulations.`,
    remediation: (v) =>
      `Fix: Add ${v.requiredValue} to the required position on the label.`
  }
}

// ─── VIETNAMESE TEMPLATES ────────────────────────────────────────────────────

const VI_TEMPLATES: AllTemplates = {
  font_size: {
    summary: () => `Phat hien sai sot ve kich thuoc chu`,
    legalBasis: (v, reg) => {
      const citation = reg ? reg.content.substring(0, 150) + '...' : 'yeu cau FDA ve kich thuoc chu toi thieu'
      return `Can cu theo ${v.regulationSection}, ${citation}`
    },
    expertLogic: (v) =>
      `He thong nhan dien tieu de "Nutrition Facts" cua ban co kich thuoc ${v.detectedValue}, nho hon yeu cau toi thieu ${v.requiredValue} doi voi bao bi co dien tich mat chinh (PDP) lon hon 40 sq in. Viec nay vi pham quy dinh ve kha nang doc (readability) cua thong tin dinh duong.`,
    remediation: (v) =>
      `Huong sua doi: Tang kich thuoc tieu de "Nutrition Facts" len toi thieu ${v.requiredValue}. Dam bao tieu de nay lon hon tat ca cac van ban khac trong panel dinh duong.`
  },
  rounding: {
    summary: () => `Ph\u00e1t hi\u1ec7n l\u1ed7i l\u00e0m tr\u00f2n gi\u00e1 tr\u1ecb dinh d\u01b0\u1ee1ng`,
    legalBasis: (v) =>
      `C\u0103n c\u1ee9 theo ${v.regulationSection}, FDA y\u00eau c\u1ea7u c\u00e1c gi\u00e1 tr\u1ecb dinh d\u01b0\u1ee1ng ph\u1ea3i tu\u00e2n th\u1ee7 quy t\u1eafc l\u00e0m tr\u00f2n c\u1ee5 th\u1ec3`,
    expertLogic: (v) => {
      if (v.detectedValue.includes('kcal'))
        return `H\u1ec7 th\u1ed1ng ph\u00e1t hi\u1ec7n gi\u00e1 tr\u1ecb Calories hi\u1ec7n t\u1ea1i l\u00e0 ${v.detectedValue}, kh\u00f4ng chia h\u1ebft cho 5. Theo quy \u0111\u1ecbnh FDA, Calories ph\u1ea3i \u0111\u01b0\u1ee3c l\u00e0m tr\u00f2n \u0111\u1ebfn b\u1ed9i s\u1ed1 g\u1ea7n nh\u1ea5t c\u1ee7a 5 (v\u00ed d\u1ee5: 102 \u2192 100, 103 \u2192 105).`
      if (v.detectedValue.includes('Trans Fat'))
        return `H\u1ec7 th\u1ed1ng ph\u00e1t hi\u1ec7n Trans Fat ${v.detectedValue}. Theo quy \u0111\u1ecbnh FDA, n\u1ebfu h\u00e0m l\u01b0\u1ee3ng Trans Fat nh\u1ecf h\u01a1n 0.5g th\u00ec ph\u1ea3i ghi l\u00e0 0g tr\u00ean nh\u00e3n. \u0110i\u1ec1u n\u00e0y nh\u1eb1m tr\u00e1nh g\u00e2y nh\u1ea7m l\u1eabn cho ng\u01b0\u1eddi ti\u00eau d\u00f9ng v\u1ec1 h\u00e0m l\u01b0\u1ee3ng ch\u1ea5t b\u00e9o c\u00f3 h\u1ea1i.`
      return `Gi\u00e1 tr\u1ecb ${v.detectedValue} kh\u00f4ng tu\u00e2n th\u1ee7 quy t\u1eafc l\u00e0m tr\u00f2n FDA, c\u1ea7n \u0111i\u1ec1u ch\u1ec9nh th\u00e0nh ${v.requiredValue}.`
    },
    remediation: (v) =>
      `H\u01b0\u1edbng s\u1eeda \u0111\u1ed5i: Thay \u0111\u1ed5i gi\u00e1 tr\u1ecb t\u1eeb ${v.detectedValue} th\u00e0nh ${v.requiredValue} theo quy t\u1eafc l\u00e0m tr\u00f2n FDA.`
  },
  net_weight: {
    summary: () => `Ph\u00e1t hi\u1ec7n thi\u1ebfu khai b\u00e1o kh\u1ed1i l\u01b0\u1ee3ng t\u1ecbnh (net weight)`,
    legalBasis: (v) => {
      if (v.regulationSection.includes('701.13'))
        return `C\u0103n c\u1ee9 theo ${v.regulationSection}, nh\u00e3n m\u1ef9 ph\u1ea9m ph\u00e2n ph\u1ed1i t\u1ea1i M\u1ef9 ph\u1ea3i c\u00f3 c\u1ea3 \u0111\u01a1n v\u1ecb Metric v\u00e0 Imperial`
      if (v.regulationSection.includes('201.51'))
        return `C\u0103n c\u1ee9 theo ${v.regulationSection}, nh\u00e3n d\u01b0\u1ee3c ph\u1ea9m OTC ph\u00e2n ph\u1ed1i t\u1ea1i M\u1ef9 ph\u1ea3i c\u00f3 c\u1ea3 \u0111\u01a1n v\u1ecb Metric v\u00e0 Imperial`
      return `C\u0103n c\u1ee9 theo ${v.regulationSection}, nh\u00e3n th\u1ef1c ph\u1ea9m xu\u1ea5t kh\u1ea9u M\u1ef9 ph\u1ea3i c\u00f3 c\u1ea3 \u0111\u01a1n v\u1ecb Metric v\u00e0 Imperial`
    },
    expertLogic: (v) =>
      `H\u1ec7 th\u1ed1ng ph\u00e1t hi\u1ec7n Net Weight hi\u1ec7n t\u1ea1i: "${v.detectedValue}". Theo quy \u0111\u1ecbnh, b\u1ea1n c\u1ea7n khai b\u00e1o \u0111\u1ed3ng th\u1eddi c\u1ea3 hai \u0111\u01a1n v\u1ecb \u0111o l\u01b0\u1eddng: Metric (g, ml) v\u00e0 Imperial (oz, fl oz). V\u00ed d\u1ee5 chu\u1ea9n: "Net Wt. 24 oz (680g)".`,
    remediation: () =>
      `H\u01b0\u1edbng s\u1eeda \u0111\u1ed5i: Th\u00eam c\u1ea3 hai \u0111\u01a1n v\u1ecb \u0111o l\u01b0\u1eddng. V\u00ed d\u1ee5: n\u1ebfu s\u1ea3n ph\u1ea9m l\u00e0 500g th\u00ec ghi "Net Wt. 17.6 oz (500g)".`
  },
  ingredient_order: {
    summary: (v) => {
      if (v.regulationSection.includes('701.3')) return `C\u1ea3nh b\u00e1o v\u1ec1 th\u1ee9 t\u1ef1 th\u00e0nh ph\u1ea7n m\u1ef9 ph\u1ea9m (INCI)`
      if (v.regulationSection.includes('201.10')) return `C\u1ea3nh b\u00e1o v\u1ec1 th\u1ee9 t\u1ef1 th\u00e0nh ph\u1ea7n b\u1ea5t ho\u1ea1t (OTC Drug)`
      return `C\u1ea3nh b\u00e1o v\u1ec1 th\u1ee9 t\u1ef1 nguy\u00ean li\u1ec7u`
    },
    legalBasis: (v) => {
      if (v.regulationSection.includes('701.3'))
        return `C\u0103n c\u1ee9 theo ${v.regulationSection} (21 CFR 701.3 \u2014 Nh\u00e3n m\u1ef9 ph\u1ea9m), c\u00e1c th\u00e0nh ph\u1ea7n INCI ph\u1ea3i \u0111\u01b0\u1ee3c li\u1ec7t k\u00ea theo th\u1ee9 t\u1ef1 gi\u1ea3m d\u1ea7n v\u1ec1 tr\u1ecdng l\u01b0\u1ee3ng`
      if (v.regulationSection.includes('201.10'))
        return `C\u0103n c\u1ee9 theo ${v.regulationSection} (21 CFR 201.10 \u2014 Nh\u00e3n thu\u1ed1c OTC), c\u00e1c th\u00e0nh ph\u1ea7n b\u1ea5t ho\u1ea1t ph\u1ea3i \u0111\u01b0\u1ee3c li\u1ec7t k\u00ea theo th\u1ee9 t\u1ef1 gi\u1ea3m d\u1ea7n v\u1ec1 tr\u1ecdng l\u01b0\u1ee3ng`
      return `C\u0103n c\u1ee9 theo ${v.regulationSection} (21 CFR 101.4 \u2014 Nh\u00e3n th\u1ef1c ph\u1ea9m), c\u00e1c nguy\u00ean li\u1ec7u ph\u1ea3i \u0111\u01b0\u1ee3c li\u1ec7t k\u00ea theo th\u1ee9 t\u1ef1 gi\u1ea3m d\u1ea7n v\u1ec1 tr\u1ecdng l\u01b0\u1ee3ng`
    },
    expertLogic: (v) => {
      if (v.regulationSection.includes('701.3'))
        return `H\u1ec7 th\u1ed1ng nh\u1eadn di\u1ec7n danh s\u00e1ch th\u00e0nh ph\u1ea7n INCI c\u1ee7a m\u1ef9 ph\u1ea9m: ${v.detectedValue}. Theo 21 CFR 701.3(a), c\u00e1c th\u00e0nh ph\u1ea7n ph\u1ea3i \u0111\u01b0\u1ee3c li\u1ec7t k\u00ea theo th\u1ee9 t\u1ef1 gi\u1ea3m d\u1ea7n v\u1ec1 h\u00e0m l\u01b0\u1ee3ng. Vui l\u00f2ng \u0111\u1ed1i chi\u1ebfu v\u1edbi c\u00f4ng th\u1ee9c s\u1ea3n xu\u1ea5t \u0111\u1ec3 x\u00e1c nh\u1eadn th\u1ee9 t\u1ef1 ch\u00ednh x\u00e1c.`
      if (v.regulationSection.includes('201.10'))
        return `H\u1ec7 th\u1ed1ng nh\u1eadn di\u1ec7n danh s\u00e1ch th\u00e0nh ph\u1ea7n b\u1ea5t ho\u1ea1t (inactive ingredients) c\u1ee7a s\u1ea3n ph\u1ea9m OTC: ${v.detectedValue}. Theo 21 CFR 201.10(g), th\u1ee9 t\u1ef1 ph\u1ea3i theo h\u00e0m l\u01b0\u1ee3ng gi\u1ea3m d\u1ea7n. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i v\u1edbi nh\u00e0 s\u1ea3n xu\u1ea5t.`
      return `H\u1ec7 th\u1ed1ng nh\u1eadn di\u1ec7n danh s\u00e1ch nguy\u00ean li\u1ec7u: ${v.detectedValue}. Vui l\u00f2ng ki\u1ec3m tra xem th\u1ee9 t\u1ef1 n\u00e0y c\u00f3 \u0111\u00fang v\u1edbi t\u1ef7 l\u1ec7 tr\u1ecdng l\u01b0\u1ee3ng th\u1ef1c t\u1ebf kh\u00f4ng. Nguy\u00ean li\u1ec7u chi\u1ebfm t\u1ef7 tr\u1ecdng l\u1edbn nh\u1ea5t ph\u1ea3i \u0111\u1ee9ng \u0111\u1ea7u.`
    },
    remediation: (v) => {
      if (v.regulationSection.includes('701.3'))
        return `H\u01b0\u1edbng ki\u1ec3m tra: \u0110\u1ed1i chi\u1ebfu danh s\u00e1ch INCI v\u1edbi c\u00f4ng th\u1ee9c m\u1ef9 ph\u1ea9m. S\u1eafp x\u1ebfp l\u1ea1i theo h\u00e0m l\u01b0\u1ee3ng gi\u1ea3m d\u1ea7n (% w/w). Th\u00e0nh ph\u1ea7n c\u00f3 h\u00e0m l\u01b0\u1ee3ng d\u01b0\u1edbi 1% c\u00f3 th\u1ec3 li\u1ec7t k\u00ea theo th\u1ee9 t\u1ef1 b\u1ea5t k\u1ef3 \u1edf cu\u1ed1i danh s\u00e1ch.`
      if (v.regulationSection.includes('201.10'))
        return `H\u01b0\u1edbng ki\u1ec3m tra: \u0110\u1ed1i chi\u1ebfu danh s\u00e1ch th\u00e0nh ph\u1ea7n b\u1ea5t ho\u1ea1t v\u1edbi c\u00f4ng th\u1ee9c OTC drug. S\u1eafp x\u1ebfp theo h\u00e0m l\u01b0\u1ee3ng gi\u1ea3m d\u1ea7n v\u00e0 tham kh\u1ea3o USP monograph t\u01b0\u01a1ng \u1ee9ng.`
      return `H\u01b0\u1edbng ki\u1ec3m tra: \u0110\u1ed1i chi\u1ebfu danh s\u00e1ch nguy\u00ean li\u1ec7u v\u1edbi c\u00f4ng th\u1ee9c s\u1ea3n xu\u1ea5t. S\u1eafp x\u1ebfp l\u1ea1i theo th\u1ee9 t\u1ef1 gi\u1ea3m d\u1ea7n v\u1ec1 kh\u1ed1i l\u01b0\u1ee3ng (ingredient chi\u1ebfm % cao nh\u1ea5t \u0111\u1ee9ng \u0111\u1ea7u).`
    },
  },
  allergen_bold: {
    summary: () => `Ph\u00e1t hi\u1ec7n l\u1ed7i \u0111\u1ecbnh d\u1ea1ng ch\u1ea5t g\u00e2y d\u1ecb \u1ee9ng (allergen)`,
    legalBasis: (v) =>
      `C\u0103n c\u1ee9 theo ${v.regulationSection} (FALCPA - Food Allergen Labeling and Consumer Protection Act), c\u00e1c ch\u1ea5t g\u00e2y d\u1ecb \u1ee9ng ph\u1ea3i \u0111\u01b0\u1ee3c highlight`,
    expertLogic: () =>
      `H\u1ec7 th\u1ed1ng ph\u00e1t hi\u1ec7n b\u1ea1n c\u00f3 c\u00e1c allergen c\u1ea7n khai b\u00e1o nh\u01b0ng ch\u01b0a \u0111\u01b0\u1ee3c in \u0111\u1eadm (bold) ho\u1eb7c ph\u00e2n bi\u1ec7t r\u00f5 r\u00e0ng. Theo lu\u1eadt FALCPA, 8 lo\u1ea1i allergen ch\u00ednh (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans) ph\u1ea3i \u0111\u01b0\u1ee3c hi\u1ec3n th\u1ecb b\u1eb1ng ch\u1eef in \u0111\u1eadm ho\u1eb7c c\u00f3 "Contains:" statement ri\u00eang.`,
    remediation: () =>
      `H\u01b0\u1edbng s\u1eeda \u0111\u1ed5i: In \u0111\u1eadm (bold) t\u1ea5t c\u1ea3 allergen trong ingredient list HO\u1eb6C th\u00eam "Contains:" statement ngay sau ingredient list. V\u00ed d\u1ee5: "Contains: Milk, Soy".`
  },
  color_contrast: {
    summary: () => `C\u1ea3nh b\u00e1o v\u1ec1 \u0111\u1ed9 t\u01b0\u01a1ng ph\u1ea3n m\u00e0u s\u1eafc`,
    legalBasis: (v) =>
      `C\u0103n c\u1ee9 theo ${v.regulationSection}, v\u0103n b\u1ea3n tr\u00ean nh\u00e3n ph\u1ea3i c\u00f3 \u0111\u1ed9 t\u01b0\u01a1ng ph\u1ea3n \u0111\u1ee7 \u0111\u1ec3 d\u1ec5 \u0111\u1ecdc`,
    expertLogic: (v) =>
      `H\u1ec7 th\u1ed1ng \u0111o \u0111\u01b0\u1ee3c t\u1ef7 l\u1ec7 t\u01b0\u01a1ng ph\u1ea3n m\u00e0u ch\u1eef/n\u1ec1n l\u00e0 ${v.detectedValue}, th\u1ea5p h\u01a1n ti\u00eau chu\u1ea9n ${v.requiredValue}. \u0110i\u1ec1u n\u00e0y c\u00f3 th\u1ec3 khi\u1ebfn ng\u01b0\u1eddi ti\u00eau d\u00f9ng kh\u00f3 \u0111\u1ecdc th\u00f4ng tin, \u0111\u1eb7c bi\u1ec7t l\u00e0 ng\u01b0\u1eddi cao tu\u1ed5i ho\u1eb7c c\u00f3 v\u1ea5n \u0111\u1ec1 v\u1ec1 th\u1ecb l\u1ef1c.`,
    remediation: () =>
      `H\u01b0\u1edbng s\u1eeda \u0111\u1ed5i: T\u0103ng \u0111\u1ed9 t\u01b0\u01a1ng ph\u1ea3n b\u1eb1ng c\u00e1ch: (1) D\u00f9ng m\u00e0u ch\u1eef \u0111\u1eadm h\u01a1n (dark text), ho\u1eb7c (2) D\u00f9ng n\u1ec1n s\u00e1ng h\u01a1n (light background). C\u00f4ng c\u1ee5 ki\u1ec3m tra: WebAIM Contrast Checker.`
  },
  hairlines: {
    summary: () => `Ph\u00e1t hi\u1ec7n s\u1eed d\u1ee5ng hairlines kh\u00f4ng ph\u00f9 h\u1ee3p`,
    legalBasis: (v) =>
      `C\u0103n c\u1ee9 theo ${v.regulationSection}, khi di\u1ec7n t\u00edch panel nh\u1ecf, n\u00ean d\u00f9ng dots thay v\u00ec hairlines`,
    expertLogic: () =>
      `H\u1ec7 th\u1ed1ng ph\u00e1t hi\u1ec7n b\u1ea1n \u0111ang d\u00f9ng hairlines (\u0111\u01b0\u1eddng k\u1ebb m\u1ecfng) \u0111\u1ec3 ph\u00e2n c\u00e1ch c\u00e1c m\u1ee5c trong Nutrition Facts. Tuy nhi\u00ean, v\u1edbi di\u1ec7n t\u00edch panel nh\u1ecf (d\u01b0\u1edbi 40 sq in), FDA khuy\u1ebfn ngh\u1ecb d\u00f9ng dots (d\u1ea5u ch\u1ea5m) v\u00ec d\u1ec5 \u0111\u1ecdc h\u01a1n v\u00e0 ti\u1ebft ki\u1ec7m kh\u00f4ng gian.`,
    remediation: () =>
      `H\u01b0\u1edbng s\u1eeda \u0111\u1ed5i: Thay th\u1ebf hairlines b\u1eb1ng dots (\u2026\u2026) \u0111\u1ec3 k\u1ebft n\u1ed1i t\u00ean nutrient v\u1edbi gi\u00e1 tr\u1ecb. V\u00ed d\u1ee5: "Total Fat..........5g" thay v\u00ec "Total Fat _____ 5g".`
  },
  missing_field: {
    summary: () => `Ph\u00e1t hi\u1ec7n thi\u1ebfu th\u00f4ng tin b\u1eaft bu\u1ed9c`,
    legalBasis: (v) =>
      `C\u0103n c\u1ee9 theo ${v.regulationSection}, th\u00f4ng tin n\u00e0y l\u00e0 b\u1eaft bu\u1ed9c tr\u00ean nh\u00e3n th\u1ef1c ph\u1ea9m`,
    expertLogic: (v) =>
      `H\u1ec7 th\u1ed1ng kh\u00f4ng ph\u00e1t hi\u1ec7n th\u00f4ng tin ${v.detectedValue}. \u0110\u00e2y l\u00e0 th\u00f4ng tin b\u1eaft bu\u1ed9c theo quy \u0111\u1ecbnh FDA.`,
    remediation: (v) =>
      `H\u01b0\u1edbng s\u1eeda \u0111\u1ed5i: B\u1ed5 sung ${v.requiredValue} v\u00e0o v\u1ecb tr\u00ed quy \u0111\u1ecbnh tr\u00ean nh\u00e3n.`
  }
}

// ─── EXPERT TIPS ─────────────────────────────────────────────────────────────

const EN_TIPS = {
  fontTip: 'Vexim Tip: US port inspectors (especially at Long Beach, LA) frequently check font sizes. We recommend increasing to 18pt to be safe.',
  allergenTip: 'Vexim Tip: Products with undeclared allergens are subject to FDA detention. Bold all allergens to minimize risk.',
  roundingTip: 'Vexim Tip: Rounding errors are the most common mistake for international brands. Use the FDA Rounding Calculator before printing labels.',
  ingredientTip: 'Vexim Tip: Ingredient list issues are the #1 cause of FDA Warning Letters for imported foods. Always use FDA common names (English) and verify order matches your manufacturing formula weight percentages.',
}

const VI_TIPS = {
  fontTip: 'Lời khuyên từ Vexim: Hải quan tại cảng Long Beach (Los Angeles) thường kiểm tra kỹ kích thước chữ. Đề xuất tăng font lên 18pt để an toàn.',
  allergenTip: 'Lời khuyên từ Vexim: Với sản phẩm có allergen, FDA thường yêu cầu giữ hàng (detention) nếu không khai báo đúng. Hãy in đậm tất cả allergen để tránh rủi ro.',
  roundingTip: 'Lời khuyên từ Vexim: Lỗi làm tròn là lỗi phổ biến nhất của doanh nghiệp Việt Nam. Hãy sử dụng FDA Rounding Calculator trước khi in nhãn.',
  ingredientTip: 'Lời khuyên từ Vexim: Lỗi danh sách thành phần là nguyên nhân #1 gây ra Warning Letter của FDA cho thực phẩm nhập khẩu. Luôn sử dụng tên phổ thông FDA (tiếng Anh) và xác minh thứ tự khớp với % trọng lượng trong công thức sản xuất.',
}

// ─── REPORT SUMMARY LABELS ───────────────────────────────────────────────────

const EN_REPORT = {
  title: 'FDA LABEL COMPLIANCE REPORT - VEXIM GLOBAL',
  criticalIcon: '🔴', criticalLabel: 'CRITICAL VIOLATIONS', criticalNote: 'These issues may lead to port detention:',
  warningIcon: '🟠', warningLabel: 'WARNINGS', warningNote: 'Presentation issues that should be fixed to reduce risk:',
  infoIcon: '🔵', infoLabel: 'INFORMATION', infoNote: 'Additional notes for label improvement:',
  tipsLabel: '💡 EXPERT RECOMMENDATIONS',
  legalBasisLabel: 'Legal basis',
}

const VI_REPORT = {
  title: 'B\u00c1O C\u00c1O KI\u1ec2M TRA NH\u00c3N FDA - VEXIM GLOBAL',
  criticalIcon: '🔴', criticalLabel: 'L\u1ed6I NGHI\u00caM TR\u1eccNG', criticalNote: 'C\u00e1c l\u1ed7i n\u00e0y c\u00f3 th\u1ec3 d\u1eabn \u0111\u1ebfn gi\u1eef h\u00e0ng (detention) t\u1ea1i c\u1ea3ng:',
  warningIcon: '🟠', warningLabel: 'C\u1ea2NH B\u00c1O', warningNote: 'C\u00e1c l\u1ed7i v\u1ec1 tr\u00ecnh b\u00e0y, n\u00ean s\u1eeda \u0111\u1ec3 tr\u00e1nh r\u1ee7i ro:',
  infoIcon: '🔵', infoLabel: 'TH\u00d4NG TIN', infoNote: 'C\u00e1c ghi ch\u00fa b\u1ed5 sung \u0111\u1ec3 c\u1ea3i thi\u1ec7n nh\u00e3n:',
  tipsLabel: '💡 L\u1edcI KHUY\u00caN T\u1eea CHUY\u00caN GIA',
  legalBasisLabel: 'C\u0103n c\u1ee9 ph\u00e1p l\u00fd',
}

// ─── COMPLIANT MESSAGES (when no violations) ──────────────────────────────────

const EN_COMPLIANT = {
  icon: '✅',
  title: 'NO CFR VIOLATIONS DETECTED',
  description: 'Your label complies with all FDA regulations checked. Vexim AI did not find any critical violations during the inspection process.',
  recommendation: 'The product can be distributed in the US market with low legal risk. We recommend periodic re-inspection when updating label content.',
}

const VI_COMPLIANT = {
  icon: '✅',
  title: 'KHÔNG CÓ VI PHẠM CFR',
  description: 'Nhãn của bạn tuân thủ tất cả các quy định FDA được kiểm tra. Vexim AI không phát hiện vi phạm nghiêm trọng nào trong quá trình kiểm tra.',
  recommendation: 'Sản phẩm có thể được phân phối tại thị trường Hoa Kỳ với rủi ro pháp lý thấp. Khuyến nghị kiểm tra lại định kỳ khi cập nhật nội dung nhãn.',
}
