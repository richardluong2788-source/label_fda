/**
 * Query Intent Classifier
 * Detects product category to route retrieval correctly
 */

export type ProductCategory = 'food' | 'drug' | 'cosmetic' | 'device' | 'supplement' | 'soap' | 'mixed' | 'unknown'

export interface IntentClassificationResult {
  query: string
  category: ProductCategory
  confidence: number
  keywords: string[]
  reasoning: string
}

// Vietnamese → English translation map for common label terms
// Allows intent classifier to work on Vietnamese product labels
const VIETNAMESE_TRANSLATION_MAP: Record<string, string[]> = {
  // Regulation / labeling terms (Vietnamese → English)
  'ghi nhãn': ['labeling', 'label', 'labeling requirement'],
  'ghi nhan': ['labeling', 'label', 'labeling requirement'],
  'nhãn mác': ['label', 'labeling'],
  'nhan mac': ['label', 'labeling'],
  'yêu cầu': ['requirement', 'regulation', 'labeling requirement'],
  'yeu cau': ['requirement', 'regulation', 'labeling requirement'],
  'quy định': ['regulation', 'requirement', 'rule'],
  'quy dinh': ['regulation', 'requirement', 'rule'],
  'mỹ phẩm': ['cosmetic', 'cosmetics', 'cosmetic labeling'],
  'my pham': ['cosmetic', 'cosmetics', 'cosmetic labeling'],
  'dược phẩm': ['drug', 'pharmaceutical', 'medication'],
  'duoc pham': ['drug', 'pharmaceutical', 'medication'],
  'phân loại': ['classification', 'classify'],
  'phan loai': ['classification', 'classify'],
  'chất bảo quản': ['preservative', 'preservatives', 'cosmetic ingredient'],
  'chat bao quan': ['preservative', 'preservatives', 'cosmetic ingredient'],
  'màu sắc': ['color additive', 'colorant'],
  'mau sac': ['color additive', 'colorant'],
  'hương liệu': ['fragrance', 'parfum'],
  'huong lieu': ['fragrance', 'parfum'],
  'kích thước chữ': ['font size', 'type size'],
  'kich thuoc chu': ['font size', 'type size'],
  'nhà sản xuất': ['manufacturer', 'distributor'],
  'nha san xuat': ['manufacturer', 'distributor'],
  'cảnh báo': ['warning statement', 'caution'],
  'canh bao': ['warning statement', 'caution'],
  'số lô': ['lot number', 'batch number'],
  'so lo': ['lot number', 'batch number'],
  'hạn sử dụng': ['expiration date', 'shelf life'],
  'han su dung': ['expiration date', 'shelf life'],
  'địa chỉ': ['manufacturer address'],
  'dia chi': ['manufacturer address'],
  'thành phần hoạt chất': ['active ingredient'],
  'thanh phan hoat chat': ['active ingredient'],

  // Product types
  'serum': ['serum', 'cosmetic', 'skincare'],
  'kem': ['cream', 'cosmetic', 'skincare'],
  'lotion': ['lotion', 'cosmetic'],
  'son': ['lipstick', 'cosmetic'],
  'phan': ['powder', 'makeup', 'cosmetic'],
  'nuoc hoa': ['perfume', 'fragrance', 'cosmetic'],
  'dau goi': ['shampoo', 'hair cosmetic'],
  'sua rua mat': ['face wash', 'cosmetic', 'skincare'],
  'kem chong nang': ['sunscreen', 'cosmetic'],
  'toner': ['toner', 'cosmetic', 'skincare'],
  'essence': ['essence', 'cosmetic', 'skincare'],
  'mask': ['mask', 'cosmetic', 'skincare'],
  'gel': ['gel', 'cosmetic'],
  // Vietnamese ingredient terms
  'thanh phan': ['ingredient'],
  'thành phần': ['ingredient'],
  'nuoc': ['water'],
  'nước': ['water'],
  'glycerin': ['glycerin', 'ingredient'],
  'phenoxyethanol': ['phenoxyethanol', 'preservative', 'cosmetic ingredient'],
  'chiet xuat': ['extract', 'ingredient'],
  'chiết xuất': ['extract', 'ingredient'],
  'tra xanh': ['green tea', 'ingredient'],
  'trà xanh': ['green tea', 'ingredient'],
  'vitamin c': ['vitamin c', 'ingredient'],
  'retinol': ['retinol', 'ingredient', 'cosmetic'],
  'hyaluronic': ['hyaluronic acid', 'ingredient', 'cosmetic'],
  'niacinamide': ['niacinamide', 'ingredient'],
  'collagen': ['collagen', 'ingredient'],
  // Usage/purpose terms (cong dung / công dụng)
  'cong dung': ['intended use', 'cosmetic claim'],
  'công dụng': ['intended use', 'cosmetic claim'],
  'tri mun': ['acne treatment', 'skin', 'cosmetic'],
  'trị mụn': ['acne treatment', 'skin', 'cosmetic'],
  'duong am': ['moisturizing', 'skin', 'cosmetic'],
  'dưỡng ẩm': ['moisturizing', 'skin', 'cosmetic'],
  'lam sang da': ['brightening', 'skin', 'cosmetic'],
  'làm sáng da': ['brightening', 'skin', 'cosmetic'],
  'phuc hoi da': ['skin repair', 'skincare', 'cosmetic'],
  'phục hồi da': ['skin repair', 'skincare', 'cosmetic'],
  'chong lao hoa': ['anti-aging', 'skin', 'cosmetic'],
  'chống lão hóa': ['anti-aging', 'skin', 'cosmetic'],
  'tay te bao chet': ['exfoliant', 'skin', 'cosmetic'],
  // Net weight / quantity terms
  'net wt': ['net weight', 'net quantity'],
  'khoi luong tinh': ['net weight'],
  'khối lượng tịnh': ['net weight'],
  'trong luong': ['net weight'],
  'ml': ['net quantity', 'fluid ounce'],
  'oz': ['net quantity', 'ounce'],
  // Manufacturer / origin
  'made in vietnam': ['country of origin', 'manufacturer'],
  'nsx': ['manufacturer'],
  'noi san xuat': ['manufacturer', 'place of manufacture'],
  // Food-specific Vietnamese
  'nang luong': ['calories', 'nutrition'],
  'năng lượng': ['calories', 'nutrition'],
  'chat beo': ['fat', 'nutrition facts'],
  'chất béo': ['fat', 'nutrition facts'],
  'protein': ['protein', 'nutrition facts'],
  'carbohydrate': ['carbohydrate', 'nutrition facts'],
  'duong': ['sugar', 'nutrition facts'],
  'đường': ['sugar', 'nutrition facts'],
  'muoi': ['sodium', 'salt', 'nutrition facts'],
  'muối': ['sodium', 'salt', 'nutrition facts'],
  'thuc pham': ['food', 'food product'],
  'thực phẩm': ['food', 'food product'],
  'han dung': ['expiration', 'date'],
  'hạn dùng': ['expiration', 'date'],
  // Drug/supplement Vietnamese
  'thuoc': ['drug', 'medication'],
  'thuốc': ['drug', 'medication'],
  'vien uong': ['capsule', 'dietary supplement'],
  'viên uống': ['capsule', 'dietary supplement'],
  'thuc pham chuc nang': ['dietary supplement'],
  'thực phẩm chức năng': ['dietary supplement'],
}

/**
 * Normalize a query: expand Vietnamese terms to their English equivalents
 * so the classifier can work on Vietnamese product labels.
 */
function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase()
  // Replace Vietnamese terms with English equivalents
  for (const [viTerm, enTerms] of Object.entries(VIETNAMESE_TRANSLATION_MAP)) {
    if (normalized.includes(viTerm.toLowerCase())) {
      normalized += ' ' + enTerms.join(' ')
    }
  }
  return normalized
}

/**
 * Detect if the query looks like a product label being submitted for analysis
 * (as opposed to a regulation search query).
 * Signals: contains ingredient list, net weight, manufacturer info, product name.
 */
export function isProductLabelQuery(query: string): boolean {
  const lower = query.toLowerCase()
  const signals = [
    // Ingredient list signals
    /thanh phan|thành phần|ingredients?:/i,
    // Net weight signals
    /net\s*wt|net\s*weight|khoi luong|fl\.?\s*oz/i,
    // Made in / manufacturer
    /made\s+in\s+\w+|nsx:|noi san xuat/i,
    // Multiple ingredient names with commas (ingredient list pattern)
    /(?:glycerin|phenoxyethanol|aqua|water|sodium|fragrance|parfum),/i,
    // Vietnamese product label patterns
    /cong dung|công dụng|thanh phan|thành phần/i,
  ]
  return signals.some(re => re.test(lower))
}

// Keyword patterns for each category
const CATEGORY_PATTERNS = {
  food: {
    keywords: [
      // Core labeling terms
      'nutrition',
      'serving size',
      'calories',
      'ingredient',
      'allergen',
      'nutrition facts',
      'daily value',
      'food product',
      'food label',
      'food labeling',
      // Net quantity / declaration — food specific (21 CFR 101.105)
      // Generic "net quantity" is intentionally NOT here: it exists in both
      // food (101.105) and cosmetic (701.13) law; context words decide the winner.
      'net quantity of food',
      'food net quantity',
      'food net weight',
      'net contents food',
      'quantity of food',
      'declaration of quantity',
      'food quantity statement',
      // Display / placement terms
      'principal display panel',
      'principal display',
      'display panel',
      'information panel',
      // Typography / sizing terms
      'font size',
      'type size',
      'conspicuous',
      'prominent',
      'boldface',
      'area of principal display',
      // Specific food categories
      'snack',
      'beverage',
      'juice',
      'cereal',
      // CFR references
      'part 101',
      'cfr 101',
      '101.105',
      '101.9',
      // Regulatory terms
      'labeling requirement',
      'label requirement',
      'declaration',
      'statement of identity',
      'common name',
      'standard of identity',
      'health claim',
      'nutrient content claim',
      'structure function',
      'supplemental statement',
      'metric system',
    ],
    weight: 1.0
  },
  
  drug: {
    keywords: [
      'therapeutic',
      'pharmaceutical',
      'medication',
      'disease',
      'cure',
      'treat',
      'prevent',
      'drug',
      'over-the-counter',
      'otc',
      'efficacy',
      'clinical',
      'drug facts',
      'active ingredient',
      'inactive ingredient',
      'dosage',
      'drug labeling',
      'part 201',
      'cfr 201',
      'prescription',
      'adequate directions',
    ],
    weight: 1.0
  },
  
  cosmetic: {
    keywords: [
      'beauty',
      'skincare',
      'cosmetic',
      'cosmetics',
      'makeup',
      'perfume',
      'fragrance',
      'appearance',
      'skin',
      'hair',
      'toilet articles',
      'intended use',
      'moisturizer',
      'cosmetic labeling',
      'cosmetic label',
      'cosmetic product',
      'cosmetic packaging',
      'cosmetic claim',
      'cosmetic ingredient',
      // Net quantity — cosmetic-specific (21 CFR 701.13)
      'cosmetic net quantity',
      'cosmetic net weight',
      'cosmetic quantity',
      // CFR references
      'part 701',
      'cfr 701',
      '701.3',
      '701.13',
      '701.30',
      // Warning / safety
      'warning statement',
      'color additive',
      'ingredient declaration',
      'ingredient list',
      // Product types
      'serum',
      'moisturizer',
      'sunscreen',
      'shampoo',
      'conditioner',
      'lipstick',
      'foundation',
      'lotion',
    ],
    // Raised to 1.0 to compete equally with food when cosmetic terms are present
    weight: 1.0
  },
  
  supplement: {
    keywords: [
      'dietary supplement',
      'vitamin',
      'mineral',
      'amino acid',
      'supplement facts',
      'structure-function',
      'dshea',
      'dietary ingredient'
    ],
    weight: 0.95
  },
  
  device: {
    keywords: [
      'medical device',
      'device',
      'diagnostic',
      'contraceptive',
      'sterile',
      'biocompatibility',
      'quality system'
    ],
    weight: 0.85
  },
  
  soap: {
    keywords: [
      'soap',
      'hand soap',
      'body soap',
      'bar soap',
      'antiseptic soap',
      'cosmetic soap'
    ],
    weight: 0.95
  }
}

/**
 * Classify query intent based on keywords
 */
export function classifyIntent(query: string): IntentClassificationResult {
  // Normalize: expand Vietnamese terms to English equivalents before scoring
  const queryLower = normalizeQuery(query)
  const scores: Record<string, number> = {}
  const foundKeywords: string[] = []

  // Score each category
  Object.entries(CATEGORY_PATTERNS).forEach(([category, pattern]) => {
    let categoryScore = 0
    const categoryKeywords: string[] = []

    pattern.keywords.forEach(keyword => {
      if (queryLower.includes(keyword)) {
        categoryScore += pattern.weight
        categoryKeywords.push(keyword)
      }
    })

    if (categoryKeywords.length > 0) {
      scores[category] = categoryScore
      foundKeywords.push(...categoryKeywords)
    }
  })

  // Determine primary category
  if (Object.keys(scores).length === 0) {
    return {
      query,
      category: 'unknown',
      confidence: 0,
      keywords: [],
      reasoning: 'No clear category indicators found'
    }
  }

  // Find highest scoring category
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  let primaryCategory = sorted[0][0] as ProductCategory
  const primaryScore = sorted[0][1]

  // Normalize confidence based on the WINNING category's keyword count
  const winningPattern = CATEGORY_PATTERNS[primaryCategory as keyof typeof CATEGORY_PATTERNS]
  const maxReasonableHits = winningPattern ? Math.min(winningPattern.keywords.length, 5) : 3
  let confidence = Math.min(primaryScore / maxReasonableHits, 1)

  // Hard override: explicit CFR part number in query is the strongest possible signal.
  // This MUST run before isMixed check so it can correct the category.
  const cfrPartBoostMap: Record<string, ProductCategory> = {
    '701': 'cosmetic',
    '700': 'cosmetic',
    '201': 'drug',
    '111': 'supplement',
    '820': 'device',
    '101': 'food',
    '102': 'food',
  }
  let cfrOverrideCategory: ProductCategory | null = null
  for (const [partNum, cat] of Object.entries(cfrPartBoostMap)) {
    // Match "part 701", "21 cfr 701", "cfr701", "701." but NOT "1701" or "7010"
    const partRegex = new RegExp(
      `(?:part|cfr)\\s*${partNum}\\b|\\b${partNum}(?:\\.[0-9]|\\b(?!\\d))`,
      'i'
    )
    if (partRegex.test(queryLower)) {
      cfrOverrideCategory = cat
      primaryCategory = cat
      confidence = 0.90  // Near-certain: explicit regulation reference
      break
    }
  }

  // Product label boost: if query looks like an actual product label being submitted,
  // treat it as cosmetic (most common case) with higher confidence.
  // This handles Vietnamese/multilingual labels that don't hit English keywords well.
  let labelBoostApplied = false
  if (cfrOverrideCategory === null && isProductLabelQuery(query)) {
    const skincareIngredients = /phenoxyethanol|glycerin|niacinamide|retinol|hyaluronic|serum|moisturiz/i
    const isSkincare = skincareIngredients.test(query)

    if (
      primaryCategory === 'cosmetic' ||
      primaryCategory === 'unknown' ||
      primaryCategory === 'mixed' ||
      // Food classification but clearly a skincare product
      (primaryCategory === 'food' && isSkincare)
    ) {
      primaryCategory = 'cosmetic'
      confidence = Math.max(confidence, 0.75)
      labelBoostApplied = true
    }
  }

  // Only flag as mixed if:
  // - No explicit CFR part number found
  // - No product label boost applied (label boost makes category certain)
  // - Two categories are genuinely close (margin < 2 keyword hits)
  const secondScore = sorted.length > 1 ? sorted[1][1] : 0
  const isMixed = cfrOverrideCategory === null &&
    !labelBoostApplied &&
    sorted.length > 1 &&
    primaryScore - secondScore < 2

  const finalCategory: ProductCategory = isMixed ? 'mixed' : primaryCategory

  return {
    query,
    category: finalCategory,
    confidence,
    keywords: [...new Set(foundKeywords)],
    reasoning: `Detected ${finalCategory} product based on keywords: ${foundKeywords.slice(0, 3).join(', ')}`
  }
}

/**
 * Get search filters based on detected category
 */
export function getCategoryFilters(category: ProductCategory): {
  partNumbers: string[]
  regulations: string[]
  weight: number
} {
  const filters: Record<ProductCategory, { partNumbers: string[]; regulations: string[]; weight: number }> = {
    food: {
      partNumbers: ['101', '102'],
      regulations: ['21 CFR 101', 'FALCPA', 'Nutrition Labeling'],
      weight: 1.0
    },
    drug: {
      partNumbers: ['200', '201'],
      regulations: ['21 CFR 201', 'Drug Labeling', 'Therapeutic Claims'],
      weight: 1.0
    },
    cosmetic: {
      partNumbers: ['701', '700'],
      regulations: ['21 CFR 701', 'Cosmetic Labeling', 'Cosmetic Claims'],
      weight: 0.95
    },
    supplement: {
      partNumbers: ['111'],
      regulations: ['21 CFR 111', 'Structure-Function Claims', 'DSHEA'],
      weight: 0.90
    },
    device: {
      partNumbers: ['820', '860'],
      regulations: ['21 CFR 820', 'Medical Device Labeling'],
      weight: 0.85
    },
    soap: {
      partNumbers: ['701', '700'],
      regulations: ['21 CFR 701', 'Cosmetic Labeling', 'Soap Labeling'],
      weight: 0.95
    },
    mixed: {
      partNumbers: ['101', '201', '701'],
      regulations: ['General', 'Multiple Categories'],
      weight: 0.7
    },
    unknown: {
      partNumbers: ['101', '201', '701'],
      regulations: ['All Available'],
      weight: 0.5
    }
  }

  return filters[category]
}

/**
 * Analyze multiple queries and get aggregate category
 */
export function analyzeMultipleQueries(queries: string[]): {
  primaryCategory: ProductCategory
  allCategories: Record<ProductCategory, number>
  confidence: number
} {
  const categoryScores: Record<ProductCategory, number> = {
    food: 0,
    drug: 0,
    cosmetic: 0,
    device: 0,
    supplement: 0,
    soap: 0,
    mixed: 0,
    unknown: 0
  }

  queries.forEach(query => {
    const result = classifyIntent(query)
    categoryScores[result.category] += result.confidence
  })

  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0)
  const avgScore = totalScore / queries.length

  const sorted = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])

  return {
    primaryCategory: sorted[0][0] as ProductCategory,
    allCategories: categoryScores,
    confidence: avgScore / queries.length
  }
}
