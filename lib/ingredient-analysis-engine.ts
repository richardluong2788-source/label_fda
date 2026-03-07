/**
 * INGREDIENT ANALYSIS ENGINE
 * 
 * Provides detailed, actionable guidance for ingredient list violations.
 * Addresses the problem of generic, unhelpful remediation advice.
 * 
 * Key capabilities:
 * 1. Detect non-standard FDA ingredient names (common name violations)
 * 2. Detect spelling errors in ingredient names
 * 3. Analyze allergen declaration completeness
 * 4. Generate specific, step-by-step remediation guidance
 * 5. Include risk/consequence warnings
 * 
 * Reference: 21 CFR §101.4 (Food labeling - Ingredient declaration)
 */

export type IngredientIssueType = 
  | 'non_standard_name'      // Not using FDA common name
  | 'spelling_error'         // Typo in ingredient name
  | 'missing_allergen'       // Allergen present but not declared
  | 'allergen_format'        // Allergen not bolded/highlighted
  | 'order_verification'     // Need to verify order matches formula
  | 'sub_ingredient_format'  // Sub-ingredients not properly nested
  | 'color_additive'         // Color additive declaration issue

export interface IngredientIssue {
  type: IngredientIssueType
  severity: 'critical' | 'warning' | 'info'
  originalText: string
  suggestedFix?: string
  cfrReference: string
  riskLevel: 'Class I' | 'Class II' | 'Class III' | 'Advisory'
  riskExplanation: string
}

export interface IngredientAnalysisResult {
  issues: IngredientIssue[]
  detectedAllergens: string[]
  allergenDeclarationComplete: boolean
  allergenDeclarationIssues: string[]
  requiresFormulaVerification: boolean
  formattedGuidance: {
    en: string
    vi: string
  }
}

// ─── FDA MAJOR ALLERGENS (FALCPA + Sesame - 2023) ─────────────────────────────
const FDA_MAJOR_ALLERGENS = [
  { name: 'milk', keywords: ['milk', 'dairy', 'cream', 'butter', 'cheese', 'whey', 'casein', 'lactose', 'lactalbumin'] },
  { name: 'eggs', keywords: ['egg', 'albumin', 'globulin', 'lysozyme', 'mayonnaise', 'meringue'] },
  { name: 'fish', keywords: ['fish', 'cod', 'salmon', 'tilapia', 'anchovies', 'bass', 'catfish', 'flounder'] },
  { name: 'shellfish', keywords: ['shellfish', 'shrimp', 'crab', 'lobster', 'crawfish', 'prawn', 'scallop', 'clam', 'mussel', 'oyster'] },
  { name: 'tree nuts', keywords: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'brazil nut', 'chestnut', 'pine nut'] },
  { name: 'peanuts', keywords: ['peanut', 'groundnut', 'arachis'] },
  { name: 'wheat', keywords: ['wheat', 'flour', 'bread', 'durum', 'semolina', 'spelt', 'kamut', 'bulgur', 'couscous', 'farina'] },
  { name: 'soybeans', keywords: ['soy', 'soybean', 'soya', 'edamame', 'tofu', 'tempeh', 'miso', 'lecithin'] },
  { name: 'sesame', keywords: ['sesame', 'tahini', 'halvah', 'hummus'] }, // Added 2023
]

// ─── COMMON NAME VIOLATIONS (Vietnamese labels commonly make these mistakes) ──
const COMMON_NAME_ISSUES: Array<{
  pattern: RegExp
  issue: string
  suggestedFix: string
  severity: 'critical' | 'warning'
}> = [
  // Flour issues
  { pattern: /bột\s*bạc/i, issue: 'BỘT BẠC', suggestedFix: 'BLEACHED ENRICHED FLOUR', severity: 'warning' },
  { pattern: /bleached\s*flour/i, issue: 'BLEACHED FLOUR (missing enrichment)', suggestedFix: 'BLEACHED ENRICHED FLOUR or ENRICHED BLEACHED FLOUR', severity: 'warning' },
  
  // Sodium phosphate variants
  { pattern: /photphate\s*nari/i, issue: 'PHOTPHATE NARI (typo)', suggestedFix: 'SODIUM PHOSPHATE', severity: 'warning' },
  { pattern: /natri\s*phosphate/i, issue: 'NATRI PHOSPHATE', suggestedFix: 'SODIUM PHOSPHATE', severity: 'warning' },
  
  // Enzyme modified cheese
  { pattern: /phô\s*mai\s*được\s*chỉnh\s*bởi\s*enzyme/i, issue: 'PHÔ MAI ĐƯỢC CHỈNH BỞI ENZYME', suggestedFix: 'ENZYME-MODIFIED CHEESE', severity: 'warning' },
  { pattern: /enzyme\s*treated\s*cheese/i, issue: 'ENZYME TREATED CHEESE', suggestedFix: 'ENZYME-MODIFIED CHEESE', severity: 'warning' },
  
  // Vegetable protein
  { pattern: /chất\s*đạm\s*rau\s*củ/i, issue: 'CHẤT ĐẠM RAU CỦ (too generic)', suggestedFix: 'TEXTURED VEGETABLE PROTEIN (SOY FLOUR, SOY PROTEIN CONCENTRATE) or specific source', severity: 'warning' },
  { pattern: /vegetable\s*protein(?!\s*\()/i, issue: 'VEGETABLE PROTEIN (source not specified)', suggestedFix: 'Specify source: SOY PROTEIN, PEA PROTEIN, etc.', severity: 'warning' },
  
  // Color additives
  { pattern: /màu\s*caramen/i, issue: 'MÀU CARAMEN', suggestedFix: 'CARAMEL COLOR', severity: 'warning' },
  { pattern: /caramel\s*colour/i, issue: 'CARAMEL COLOUR (British spelling)', suggestedFix: 'CARAMEL COLOR', severity: 'info' },
  
  // High fructose corn syrup
  { pattern: /siro\s*ngọt\s*bắp\s*ngô/i, issue: 'SIRO NGỌT BẮP NGÔ', suggestedFix: 'HIGH FRUCTOSE CORN SYRUP', severity: 'warning' },
  
  // Citric acid
  { pattern: /axit\s*citric/i, issue: 'AXIT CITRIC', suggestedFix: 'CITRIC ACID', severity: 'info' },
  
  // Xanthan gum
  { pattern: /gum\s*guar/i, issue: 'GUM GUAR', suggestedFix: 'GUAR GUM', severity: 'info' },
  
  // Vitamins - common issues
  { pattern: /thiamine\s*mononitrate\s*\[vitamin\s*b1\]/i, issue: 'Vitamin declaration in brackets', suggestedFix: 'THIAMINE MONONITRATE (VITAMIN B1) - use parentheses', severity: 'info' },
  
  // Generic "flavor" without proper declaration
  { pattern: /hương\s*liệu(?!\s*tự\s*nhiên|\s*nhân\s*tạo)/i, issue: 'HƯƠNG LIỆU (unclear natural/artificial)', suggestedFix: 'NATURAL FLAVOR or ARTIFICIAL FLAVOR - must specify', severity: 'warning' },
]

/**
 * Analyze an ingredient list and return detailed issues with actionable guidance
 */
export function analyzeIngredientList(
  ingredients: string[],
  ingredientListText: string,
  detectedAllergens: string[] = []
): IngredientAnalysisResult {
  const issues: IngredientIssue[] = []
  const fullText = ingredientListText.toUpperCase()
  
  // ─── 1. Check for non-standard names ────────────────────────────────────────
  for (const check of COMMON_NAME_ISSUES) {
    if (check.pattern.test(ingredientListText)) {
      issues.push({
        type: 'non_standard_name',
        severity: check.severity,
        originalText: check.issue,
        suggestedFix: check.suggestedFix,
        cfrReference: '21 CFR §101.4(b)',
        riskLevel: check.severity === 'critical' ? 'Class II' : 'Class III',
        riskExplanation: check.severity === 'critical' 
          ? 'Non-standard ingredient names may result in FDA detention or Warning Letter.'
          : 'FDA inspectors may flag this during routine inspection.'
      })
    }
  }
  
  // ─── 2. Detect allergens from ingredient text ───────────────────────────────
  // First normalize existing allergens to lowercase for comparison
  const normalizedExisting = detectedAllergens.map(a => a.toLowerCase().trim())
  const foundAllergensSet = new Set<string>(normalizedExisting)
  
  for (const allergen of FDA_MAJOR_ALLERGENS) {
    for (const keyword of allergen.keywords) {
      if (fullText.includes(keyword.toUpperCase())) {
        // Add normalized allergen name (lowercase)
        foundAllergensSet.add(allergen.name.toLowerCase())
        break
      }
    }
  }
  
  // Convert back to properly formatted array (capitalize first letter)
  const foundAllergens = Array.from(foundAllergensSet).map(a => 
    a.charAt(0).toUpperCase() + a.slice(1)
  )
  
  // ─── 3. Check allergen declaration completeness ─────────────────────────────
  const hasContainsStatement = /contains\s*:/i.test(ingredientListText)
  const allergenDeclarationIssues: string[] = []
  
  if (foundAllergens.length > 0 && !hasContainsStatement) {
    // Check if allergens are bolded in the ingredient list
    // Since we can't detect bold from text, we flag for verification
    allergenDeclarationIssues.push(
      `Allergens detected (${foundAllergens.join(', ')}) but no "Contains:" statement found. ` +
      `Either add "Contains: ${foundAllergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}" ` +
      `OR ensure allergens are bolded in the ingredient list.`
    )
  }
  
  // ─── 4. Add order verification issue (always for food products) ─────────────
  if (ingredients.length >= 3) {
    issues.push({
      type: 'order_verification',
      severity: 'warning',
      originalText: `Ingredients: ${ingredients.slice(0, 3).join(', ')}...`,
      cfrReference: '21 CFR §101.4(a)(1)',
      riskLevel: 'Class II',
      riskExplanation: 'Incorrect ingredient order violates FDCA Section 403(i)(2). FDA may issue Warning Letter or detention.'
    })
  }
  
  // ─── 5. Generate formatted guidance ─────────────────────────────────────────
  const formattedGuidance = generateDetailedGuidance(issues, foundAllergens, allergenDeclarationIssues, ingredients)
  
  return {
    issues,
    detectedAllergens: foundAllergens,
    allergenDeclarationComplete: foundAllergens.length === 0 || (hasContainsStatement && allergenDeclarationIssues.length === 0),
    allergenDeclarationIssues,
    requiresFormulaVerification: true,
    formattedGuidance
  }
}

/**
 * Generate detailed, actionable guidance in both English and Vietnamese
 */
function generateDetailedGuidance(
  issues: IngredientIssue[],
  allergens: string[],
  allergenIssues: string[],
  ingredients: string[]
): { en: string; vi: string } {
  const nameIssues = issues.filter(i => i.type === 'non_standard_name')
  const hasOrderIssue = issues.some(i => i.type === 'order_verification')
  
  // ─── ENGLISH VERSION ────────────────────────────────────────────────────────
  let en = ''
  
  if (nameIssues.length > 0 || hasOrderIssue || allergenIssues.length > 0) {
    en += `**SEVERITY: WARNING** — Per 21 CFR §101.4(a)(1)\n\n`
    en += `**ISSUES DETECTED:**\n`
    en += `The ingredient list order has not been verified against the manufacturing formula. `
    en += `Additionally, some ingredient names do not use FDA-standard common names.\n\n`
    
    en += `**REQUIRED ACTIONS:**\n\n`
    
    // Step 1: Order verification
    en += `**① Verify Ingredient Order**\n`
    en += `   Confirm with your production team that the current order `
    en += `(${ingredients.slice(0, 3).join(' → ')}...) matches the actual weight percentages in your formula. `
    en += `The ingredient with the highest weight % must appear first.\n`
    en += `   If incorrect → reorder by descending weight.\n\n`
    
    // Step 2: Name standardization
    if (nameIssues.length > 0) {
      en += `**② Standardize Ingredient Names**\n`
      en += `   The following names must use FDA common names per 21 CFR §101.4(b):\n`
      for (const issue of nameIssues) {
        en += `   • "${issue.originalText}" → change to "${issue.suggestedFix}"\n`
      }
      en += `\n`
    }
    
    // Step 3: Allergen declaration
    if (allergens.length > 0) {
      en += `**③ Verify Allergen Declaration (CRITICAL)**\n`
      en += `   Detected allergens: ${allergens.map(a => a.toUpperCase()).join(', ')}\n`
      en += `   Confirm your label has one of these:\n`
      en += `   • "Contains: ${allergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}" statement immediately after ingredients\n`
      en += `   • OR all allergens are BOLDED in the ingredient list\n`
      en += `   Missing allergen declaration = **Class I Violation** (highest severity, mandatory recall possible).\n\n`
    }
    
    // Risk warning
    en += `**⚠️ RISK IF NOT CORRECTED:**\n`
    en += `• Shipment may be DETAINED at US port under FDA Import Alert\n`
    en += `• Allergen violations are Class I — most severe, may trigger mandatory recall\n`
    en += `• Ingredient name violations result in Warning Letters (public record)\n`
  }
  
  // ─── VIETNAMESE VERSION ─────────────────────────────────────────────────────
  let vi = ''
  
  if (nameIssues.length > 0 || hasOrderIssue || allergenIssues.length > 0) {
    vi += `**MỨC ĐỘ: CẢNH BÁO** — Căn cứ 21 CFR §101.4(a)(1)\n\n`
    vi += `**VẤN ĐỀ PHÁT HIỆN:**\n`
    vi += `Thứ tự thành phần chưa được xác nhận khớp với công thức sản xuất thực tế. `
    vi += `Ngoài ra, một số tên thành phần không sử dụng tên phổ thông (common name) theo yêu cầu FDA.\n\n`
    
    vi += `**CẦN KIỂM TRA VÀ SỬA:**\n\n`
    
    // Step 1: Order verification
    vi += `**① Xác nhận thứ tự thành phần**\n`
    vi += `   Xác nhận với bộ phận sản xuất rằng thứ tự hiện tại `
    vi += `(${ingredients.slice(0, 3).join(' → ')}...) khớp với % trọng lượng thực tế trong công thức. `
    vi += `Thành phần có tỷ lệ cao nhất phải đứng đầu.\n`
    vi += `   Nếu sai → sắp xếp lại theo thứ tự giảm dần.\n\n`
    
    // Step 2: Name standardization
    if (nameIssues.length > 0) {
      vi += `**② Chuẩn hóa tên thành phần**\n`
      vi += `   Các tên sau cần sử dụng tên phổ thông FDA theo 21 CFR §101.4(b):\n`
      for (const issue of nameIssues) {
        vi += `   • "${issue.originalText}" → đổi thành "${issue.suggestedFix}"\n`
      }
      vi += `\n`
    }
    
    // Step 3: Allergen declaration
    if (allergens.length > 0) {
      vi += `**③ Kiểm tra khai báo chất gây dị ứng (QUAN TRỌNG)**\n`
      vi += `   Phát hiện allergen: ${allergens.map(a => a.toUpperCase()).join(', ')}\n`
      vi += `   Xác nhận nhãn của bạn có một trong hai:\n`
      vi += `   • Dòng "Contains: ${allergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}" ngay sau danh sách thành phần\n`
      vi += `   • HOẶC tất cả allergen được IN ĐẬM trong danh sách thành phần\n`
      vi += `   Thiếu khai báo allergen = **Vi phạm Class I** (nghiêm trọng nhất, có thể buộc thu hồi).\n\n`
    }
    
    // Risk warning
    vi += `**⚠️ RỦI RO NẾU KHÔNG SỬA:**\n`
    vi += `• Lô hàng có thể bị GIỮ tại cảng Mỹ theo FDA Import Alert\n`
    vi += `• Vi phạm allergen là Class I — mức nghiêm trọng cao nhất, có thể dẫn đến thu hồi bắt buộc\n`
    vi += `• Vi phạm tên thành phần dẫn đến Warning Letter (công khai trên website FDA)\n`
  }
  
  return { en, vi }
}

/**
 * Create an enhanced ingredient order violation with detailed guidance
 * This replaces the generic guidance from SmartCitationFormatter
 */
export function createEnhancedIngredientViolation(
  ingredients: string[],
  ingredientListText: string,
  detectedAllergens: string[] = [],
  lang: 'en' | 'vi' = 'en'
): {
  expertLogic: string
  remediation: string
  additionalContext: string[]
} {
  const analysis = analyzeIngredientList(ingredients, ingredientListText, detectedAllergens)
  const guidance = analysis.formattedGuidance[lang]
  
  // Parse guidance into expert logic and remediation
  const nameIssues = analysis.issues.filter(i => i.type === 'non_standard_name')
  
  let expertLogic = lang === 'en'
    ? `The system identified the ingredient list: ${ingredients.slice(0, 5).join(', ')}${ingredients.length > 5 ? '...' : ''}. `
    : `Hệ thống đã xác định danh sách thành phần: ${ingredients.slice(0, 5).join(', ')}${ingredients.length > 5 ? '...' : ''}. `
  
  if (nameIssues.length > 0) {
    // List specific non-compliant names so user knows exactly what to fix
    const issueNames = nameIssues.map(i => `"${i.originalText}"`).join(', ')
    expertLogic += lang === 'en'
      ? `Additionally, ${nameIssues.length} ingredient name(s) do not comply with FDA common name requirements: ${issueNames}. `
      : `Ngoài ra, ${nameIssues.length} tên thành phần không tuân thủ yêu cầu về tên phổ thông của FDA: ${issueNames}. `
  }
  
  if (analysis.detectedAllergens.length > 0) {
    expertLogic += lang === 'en'
      ? `Allergens detected: ${analysis.detectedAllergens.join(', ')}. Verify allergen declaration is complete.`
      : `Phát hiện allergen: ${analysis.detectedAllergens.join(', ')}. Cần xác minh khai báo allergen đầy đủ.`
  }
  
  expertLogic += lang === 'en'
    ? ` Please verify that this order matches the actual weight proportions in your manufacturing formula.`
    : ` Vui lòng xác minh rằng thứ tự này khớp với tỷ lệ trọng lượng thực tế trong công thức sản xuất.`
  
  // Build detailed remediation
  let remediation = ''
  
  if (lang === 'en') {
    remediation = `**Action Required:**\n`
    remediation += `① **Verify Order**: Cross-reference with manufacturing formula. Highest weight % ingredient must be first.\n`
    
    if (nameIssues.length > 0) {
      remediation += `② **Fix Names**: `
      remediation += nameIssues.map(i => `"${i.originalText}" → "${i.suggestedFix}"`).join('; ')
      remediation += `\n`
    }
    
    if (analysis.detectedAllergens.length > 0) {
      remediation += `③ **Allergen Check**: Ensure "Contains: ${analysis.detectedAllergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}" statement exists OR allergens are bolded.\n`
    }
    
    remediation += `\n**⚠️ Risk**: Incorrect ingredient order or missing allergen declaration may result in FDA detention or Class I violation (mandatory recall).`
  } else {
    remediation = `**Hành động cần thiết:**\n`
    remediation += `① **Xác minh thứ tự**: Đối chiếu với công thức sản xuất. Thành phần có % trọng lượng cao nhất phải đứng đầu.\n`
    
    if (nameIssues.length > 0) {
      remediation += `② **Sửa tên**: `
      remediation += nameIssues.map(i => `"${i.originalText}" → "${i.suggestedFix}"`).join('; ')
      remediation += `\n`
    }
    
    if (analysis.detectedAllergens.length > 0) {
      remediation += `③ **Kiểm tra allergen**: Đảm bảo có dòng "Contains: ${analysis.detectedAllergens.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}" HOẶC allergen được in đậm.\n`
    }
    
    remediation += `\n**⚠️ Rủi ro**: Sai thứ tự thành phần hoặc thiếu khai báo allergen có thể dẫn đến giữ hàng FDA hoặc vi phạm Class I (buộc thu hồi).`
  }
  
  // Additional context for display
  const additionalContext = [
    ...nameIssues.map(i => `${i.originalText} → ${i.suggestedFix}`),
    ...analysis.allergenDeclarationIssues
  ]
  
  return {
    expertLogic,
    remediation,
    additionalContext
  }
}
