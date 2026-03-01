/**
 * LABEL FIELD CONFIGURATION SYSTEM
 * 
 * Central config for all product label types.
 * Each product category (food, supplement, cosmetics, pharma) 
 * defines its own field schema. The form, preview, and AI analysis
 * all read from this single source of truth.
 * 
 * Adding a new product type = add a new config here.
 * No need to touch form components or preview components.
 */

export type FieldType = 'number' | 'text' | 'textarea'

export interface LabelField {
  key: string
  label: string
  unit?: string
  type: FieldType
  group: string
  /** FDA Daily Value reference for %DV calculation */
  dailyValue?: number
  /** Default value for the field */
  defaultValue: string
  /** Whether this is indented in the label (sub-nutrient) */
  indent?: number
  /** Whether to show %DV in the label preview */
  showDV?: boolean
  /** Whether to show bold in the label preview */
  bold?: boolean
  /** Whether this is italic in the label preview */
  italic?: boolean
  /** Placeholder text for the input */
  placeholder?: string
  /** Number of rows for textarea */
  rows?: number
}

export interface LabelFieldGroup {
  id: string
  label: string
  icon?: string
}

export interface LabelConfig {
  id: string
  name: string
  /** Regulation reference */
  regulation: string
  /** Field groups for organizing the form */
  groups: LabelFieldGroup[]
  /** All fields for this label type */
  fields: LabelField[]
  /** Fields that appear in the header of the label (serving size etc.) */
  headerFields: string[]
  /** Footer text (DV disclaimer etc.) */
  footerText: string
}

// ============================================
// CONVENTIONAL FOOD - 21 CFR 101
// ============================================

const FOOD_GROUPS: LabelFieldGroup[] = [
  { id: 'general', label: 'Thong Tin Chung' },
  { id: 'fats', label: 'Chat Beo & Cholesterol' },
  { id: 'carbs', label: 'Carbohydrates & Protein' },
  { id: 'vitamins', label: 'Vitamins & Minerals' },
  { id: 'ingredients', label: 'Thanh phan & Di ung (21 CFR 101.4)' },
]

const FOOD_FIELDS: LabelField[] = [
  // General
  { key: 'servingSize', label: 'Serving Size', type: 'text', group: 'general', defaultValue: '2/3 cup (55g)', bold: true },
  { key: 'servingsPerContainer', label: 'Servings Per Container', type: 'text', group: 'general', defaultValue: '8', bold: true },
  { key: 'calories', label: 'Calories', type: 'number', group: 'general', defaultValue: '230', bold: true },

  // Fats
  { key: 'totalFat', label: 'Total Fat', unit: 'g', type: 'number', group: 'fats', dailyValue: 78, defaultValue: '8', bold: true, showDV: true },
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', type: 'number', group: 'fats', dailyValue: 20, defaultValue: '1', indent: 1, showDV: true },
  { key: 'transFat', label: 'Trans Fat', unit: 'g', type: 'number', group: 'fats', defaultValue: '0', indent: 1, italic: true },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', type: 'number', group: 'fats', dailyValue: 300, defaultValue: '0', bold: true, showDV: true },

  // Carbs
  { key: 'sodium', label: 'Sodium', unit: 'mg', type: 'number', group: 'carbs', dailyValue: 2300, defaultValue: '160', bold: true, showDV: true },
  { key: 'totalCarb', label: 'Total Carbohydrate', unit: 'g', type: 'number', group: 'carbs', dailyValue: 275, defaultValue: '37', bold: true, showDV: true },
  { key: 'dietaryFiber', label: 'Dietary Fiber', unit: 'g', type: 'number', group: 'carbs', dailyValue: 28, defaultValue: '4', indent: 1, showDV: true },
  { key: 'totalSugars', label: 'Total Sugars', unit: 'g', type: 'number', group: 'carbs', defaultValue: '12', indent: 1 },
  { key: 'addedSugars', label: 'Incl. Added Sugars', unit: 'g', type: 'number', group: 'carbs', dailyValue: 50, defaultValue: '10', indent: 2, showDV: true },
  { key: 'protein', label: 'Protein', unit: 'g', type: 'number', group: 'carbs', defaultValue: '3', bold: true },

  // Vitamins
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', type: 'number', group: 'vitamins', dailyValue: 20, defaultValue: '2', showDV: true },
  { key: 'calcium', label: 'Calcium', unit: 'mg', type: 'number', group: 'vitamins', dailyValue: 1300, defaultValue: '260', showDV: true },
  { key: 'iron', label: 'Iron', unit: 'mg', type: 'number', group: 'vitamins', dailyValue: 18, defaultValue: '8', showDV: true },
  { key: 'potassium', label: 'Potassium', unit: 'mg', type: 'number', group: 'vitamins', dailyValue: 4700, defaultValue: '235', showDV: true },

  // Ingredients
  {
    key: 'ingredients',
    label: 'Ingredients (Thu tu giam dan theo trong luong)',
    type: 'textarea',
    group: 'ingredients',
    defaultValue: 'Enriched flour (wheat flour, niacin, reduced iron, vitamin B1, vitamin B2, folic acid), sugar, vegetable oil (soybean, palm and palm kernel oil), chocolate, cocoa butter, salt, whey, soy lecithin.',
    placeholder: 'Vi du: Wheat flour, water, sugar...',
    rows: 3,
  },
  {
    key: 'allergens',
    label: 'Allergen Statement (Canh bao di ung)',
    type: 'text',
    group: 'ingredients',
    defaultValue: 'CONTAINS: WHEAT, SOY, MILK.',
    placeholder: 'Vi du: CONTAINS: WHEAT, SOY.',
  },
]

export const FOOD_LABEL_CONFIG: LabelConfig = {
  id: 'conventional-foods',
  name: 'Nutrition Facts',
  regulation: '21 CFR Part 101',
  groups: FOOD_GROUPS,
  fields: FOOD_FIELDS,
  headerFields: ['servingSize', 'servingsPerContainer', 'calories'],
  footerText: '* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.',
}

// ============================================
// DIETARY SUPPLEMENT - 21 CFR 101.36
// ============================================

const SUPPLEMENT_GROUPS: LabelFieldGroup[] = [
  { id: 'general', label: 'Thong Tin Chung' },
  { id: 'vitamins', label: 'Vitamins' },
  { id: 'minerals', label: 'Minerals' },
  { id: 'proprietary', label: 'Proprietary Blend' },
  { id: 'other', label: 'Khac' },
]

const SUPPLEMENT_FIELDS: LabelField[] = [
  { key: 'servingSize', label: 'Serving Size', type: 'text', group: 'general', defaultValue: '1 Capsule' },
  { key: 'servingsPerContainer', label: 'Servings Per Container', type: 'text', group: 'general', defaultValue: '60' },
  { key: 'calories', label: 'Calories', type: 'number', group: 'general', defaultValue: '5' },

  { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg RAE', type: 'number', group: 'vitamins', dailyValue: 900, defaultValue: '900', showDV: true },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', type: 'number', group: 'vitamins', dailyValue: 90, defaultValue: '60', showDV: true },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', type: 'number', group: 'vitamins', dailyValue: 20, defaultValue: '25', showDV: true },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', type: 'number', group: 'vitamins', dailyValue: 15, defaultValue: '15', showDV: true },
  { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg', type: 'number', group: 'vitamins', dailyValue: 1.7, defaultValue: '2', showDV: true },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg', type: 'number', group: 'vitamins', dailyValue: 2.4, defaultValue: '6', showDV: true },
  { key: 'folate', label: 'Folate', unit: 'mcg DFE', type: 'number', group: 'vitamins', dailyValue: 400, defaultValue: '400', showDV: true },

  { key: 'calcium', label: 'Calcium', unit: 'mg', type: 'number', group: 'minerals', dailyValue: 1300, defaultValue: '200', showDV: true },
  { key: 'iron', label: 'Iron', unit: 'mg', type: 'number', group: 'minerals', dailyValue: 18, defaultValue: '18', showDV: true },
  { key: 'zinc', label: 'Zinc', unit: 'mg', type: 'number', group: 'minerals', dailyValue: 11, defaultValue: '11', showDV: true },

  { key: 'proprietaryBlend', label: 'Proprietary Blend', type: 'textarea', group: 'proprietary', defaultValue: '', placeholder: 'Vi du: Green Tea Extract 200mg, Garcinia Cambogia 150mg...', rows: 3 },

  { key: 'otherIngredients', label: 'Other Ingredients', type: 'textarea', group: 'other', defaultValue: 'Gelatin capsule, magnesium stearate, silicon dioxide.', placeholder: 'Vi du: Gelatin capsule, cellulose...', rows: 2 },
  { key: 'allergens', label: 'Allergen Statement', type: 'text', group: 'other', defaultValue: '', placeholder: 'Vi du: CONTAINS: SOY, MILK.' },
  { key: 'disclaimer', label: 'Structure/Function Disclaimer', type: 'textarea', group: 'other', defaultValue: 'This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.', rows: 2 },
]

export const SUPPLEMENT_LABEL_CONFIG: LabelConfig = {
  id: 'dietary-supplements',
  name: 'Supplement Facts',
  regulation: '21 CFR 101.36 / DSHEA',
  groups: SUPPLEMENT_GROUPS,
  fields: SUPPLEMENT_FIELDS,
  headerFields: ['servingSize', 'servingsPerContainer'],
  footerText: '* Percent Daily Values are based on a 2,000 calorie diet.',
}

// ============================================
// COSMETICS - 21 CFR 701
// ============================================

const COSMETIC_GROUPS: LabelFieldGroup[] = [
  { id: 'identity', label: 'Thong Tin San Pham' },
  { id: 'ingredients', label: 'Thanh Phan (INCI)' },
  { id: 'warnings', label: 'Canh Bao' },
  { id: 'manufacturer', label: 'Nha San Xuat' },
]

const COSMETIC_FIELDS: LabelField[] = [
  { key: 'productIdentity', label: 'Product Identity (ten san pham)', type: 'text', group: 'identity', defaultValue: '', placeholder: 'Vi du: Moisturizing Face Cream' },
  { key: 'netContents', label: 'Net Contents', type: 'text', group: 'identity', defaultValue: '', placeholder: 'Vi du: 1.7 FL OZ (50 mL)' },
  { key: 'intendedUse', label: 'Intended Use', type: 'text', group: 'identity', defaultValue: '', placeholder: 'Vi du: For daily facial moisturizing' },

  { key: 'ingredients', label: 'Ingredients (INCI names, giam dan)', type: 'textarea', group: 'ingredients', defaultValue: '', placeholder: 'Vi du: Water (Aqua), Glycerin, Cetearyl Alcohol, Dimethicone...', rows: 4 },
  { key: 'activeIngredients', label: 'Active Ingredients (neu co)', type: 'textarea', group: 'ingredients', defaultValue: '', placeholder: 'Vi du: Titanium Dioxide 6.0%, Zinc Oxide 4.0%', rows: 2 },

  { key: 'warnings', label: 'Warning Statements', type: 'textarea', group: 'warnings', defaultValue: '', placeholder: 'Vi du: For external use only. Avoid contact with eyes.', rows: 3 },
  { key: 'sunscreenWarning', label: 'Sunscreen SPF Warnings (neu co)', type: 'textarea', group: 'warnings', defaultValue: '', placeholder: 'Drug Facts panel required if SPF claim is made', rows: 2 },
  { key: 'allergens', label: 'Allergen/Sensitivity Notes', type: 'text', group: 'warnings', defaultValue: '', placeholder: 'Vi du: Dermatologist tested. Fragrance-free.' },

  { key: 'manufacturer', label: 'Manufacturer/Distributor', type: 'text', group: 'manufacturer', defaultValue: '', placeholder: 'Vi du: Distributed by: Company Name, City, State ZIP' },
  { key: 'madeIn', label: 'Country of Origin', type: 'text', group: 'manufacturer', defaultValue: '', placeholder: 'Vi du: Made in Vietnam' },
]

export const COSMETIC_LABEL_CONFIG: LabelConfig = {
  id: 'cosmetics',
  name: 'Cosmetic Label',
  regulation: '21 CFR 701 / FD&C Act',
  groups: COSMETIC_GROUPS,
  fields: COSMETIC_FIELDS,
  headerFields: ['productIdentity', 'netContents'],
  footerText: 'Ingredient labeling per 21 CFR 701.3. Ingredients listed in descending order of predominance.',
}

// ============================================
// REGISTRY: Maps category ID -> config
// ============================================

export const LABEL_CONFIGS: Record<string, LabelConfig> = {
  'conventional-foods': FOOD_LABEL_CONFIG,
  'dietary-supplements': SUPPLEMENT_LABEL_CONFIG,
  'cosmetics': COSMETIC_LABEL_CONFIG,
}

export function getLabelConfig(categoryId: string): LabelConfig {
  return LABEL_CONFIGS[categoryId] || FOOD_LABEL_CONFIG
}

/**
 * Map nutrition_facts nutrient names to form field keys
 * "Total Fat" -> "totalFat"
 * "Saturated Fat" -> "saturatedFat"
 * "Incl. Added Sugars" -> "addedSugars"
 */
export function mapNutrientToFieldKey(nutrientName: string): string {
  // Special case mappings
  const specialCases: Record<string, string> = {
    'Calories': 'calories',
    'Total Fat': 'totalFat',
    'Saturated Fat': 'saturatedFat',
    'Trans Fat': 'transFat',
    'Cholesterol': 'cholesterol',
    'Sodium': 'sodium',
    'Total Carbohydrate': 'totalCarb',
    'Dietary Fiber': 'dietaryFiber',
    'Total Sugars': 'totalSugars',
    'Incl. Added Sugars': 'addedSugars',
    'Added Sugars': 'addedSugars',
    'Protein': 'protein',
    'Vitamin D': 'vitaminD',
    'Calcium': 'calcium',
    'Iron': 'iron',
    'Potassium': 'potassium',
    'Serving Size': 'servingSize',
    'Servings Per Container': 'servingsPerContainer',
  }

  return specialCases[nutrientName] || nutrientName.toLowerCase().replace(/\s+/g, '')
}

export function getDefaultFormData(config: LabelConfig): Record<string, string> {
  const data: Record<string, string> = {}
  for (const field of config.fields) {
    data[field.key] = field.defaultValue
  }
  return data
}

/**
 * Build nutritionFacts array from form data for saving to DB / sending to AI.
 * Only includes numeric nutrition fields (not ingredients, allergens, etc.)
 */
export function buildNutritionFacts(
  config: LabelConfig,
  formData: Record<string, string>
): Array<{ name: string; value: string; unit: string; dailyValue: string | null }> {
  return config.fields
    .filter(f => f.type === 'number')
    .map(f => ({
      name: f.label,
      value: formData[f.key] || '0',
      unit: f.unit || '',
      dailyValue: f.dailyValue
        ? String(Math.round((Number.parseFloat(formData[f.key] || '0') / f.dailyValue) * 100))
        : null,
    }))
}
