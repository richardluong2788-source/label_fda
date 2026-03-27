import { createClient } from '@supabase/supabase-js'
import type { IngredientMaster, IngredientSearchResult, FormulaIngredient } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Search for ingredients in the master database
export async function searchIngredients(
  query: string,
  limit: number = 20
): Promise<IngredientSearchResult[]> {
  if (!query.trim()) return []

  const { data, error } = await supabase
    .from('ingredient_master')
    .select('*')
    .or(`fda_common_name.ilike.%${query}%,inci_name.ilike.%${query}%,vietnamese_name.ilike.%${query}%,cas_number.ilike.%${query}%`)
    .limit(limit)

  if (error) {
    console.error('[v0] Ingredient search error:', error)
    return []
  }

  return (data || []).map((ing: IngredientMaster) => ({
    ...ing,
    match_score: calculateMatchScore(ing, query),
  }))
}

// Get ingredient by ID
export async function getIngredientById(id: string): Promise<IngredientMaster | null> {
  const { data, error } = await supabase
    .from('ingredient_master')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[v0] Get ingredient error:', error)
    return null
  }

  return data as IngredientMaster
}

// Get ingredients by category
export async function getIngredientsByCategory(
  category: string,
  limit: number = 50
): Promise<IngredientMaster[]> {
  const { data, error } = await supabase
    .from('ingredient_master')
    .select('*')
    .eq('category', category)
    .limit(limit)

  if (error) {
    console.error('[v0] Get ingredients by category error:', error)
    return []
  }

  return (data || []) as IngredientMaster[]
}

// Check for allergens in ingredients
export async function checkAllergensInFormula(ingredients: FormulaIngredient[]): Promise<string[]> {
  const allergens: string[] = []

  for (const ingredient of ingredients) {
    const ing = await searchIngredients(ingredient.name, 1)
    if (ing.length > 0 && ing[0].allergen_group) {
      if (!allergens.includes(ing[0].allergen_group)) {
        allergens.push(ing[0].allergen_group)
      }
    }
  }

  return allergens
}

// Verify ingredient against FDA/INCI standards
export async function verifyIngredientName(name: string): Promise<{
  verified: boolean
  suggestions: IngredientMaster[]
  message: string
}> {
  const results = await searchIngredients(name, 5)

  if (results.length === 0) {
    return {
      verified: false,
      suggestions: [],
      message: `Ingredient "${name}" not found in FDA/INCI database. Please verify the name or select from suggestions.`,
    }
  }

  // Exact match found
  if (results.some(r => r.fda_common_name?.toLowerCase() === name.toLowerCase() || r.inci_name?.toLowerCase() === name.toLowerCase())) {
    return {
      verified: true,
      suggestions: results,
      message: 'Ingredient verified against FDA/INCI standards.',
    }
  }

  // Partial match
  return {
    verified: false,
    suggestions: results,
    message: `"${name}" may not be the exact FDA/INCI name. Please select from these suggestions or verify manually.`,
  }
}

// Get detailed ingredient info including regulatory status
export async function getIngredientDetails(id: string): Promise<{
  ingredient: IngredientMaster | null
  regulatoryInfo: Record<string, string>
  usageLimits: Record<string, string>
  allergenInfo: { isAllergen: boolean; group?: string }
}> {
  const ingredient = await getIngredientById(id)

  if (!ingredient) {
    return {
      ingredient: null,
      regulatoryInfo: {},
      usageLimits: {},
      allergenInfo: { isAllergen: false },
    }
  }

  return {
    ingredient,
    regulatoryInfo: ingredient.regulatory_status || {},
    usageLimits: ingredient.max_usage_level || {},
    allergenInfo: {
      isAllergen: ingredient.is_allergen,
      group: ingredient.allergen_group,
    },
  }
}

// Seed initial ingredient database (admin function)
export async function seedIngredientDatabase(): Promise<{
  success: boolean
  count: number
  error?: string
}> {
  // Sample FDA-approved ingredients
  const commonIngredients: Partial<IngredientMaster>[] = [
    {
      fda_common_name: 'Ascorbic Acid',
      inci_name: 'Ascorbic Acid',
      cas_number: '50-81-7',
      vietnamese_name: 'Axit Ascorbic',
      category: 'preservative',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'GRAS', EU: 'approved' },
      is_allergen: false,
      is_natural: true,
    },
    {
      fda_common_name: 'Sodium Benzoate',
      inci_name: 'Sodium Benzoate',
      cas_number: '532-32-1',
      vietnamese_name: 'Sodium Benzoate',
      category: 'preservative',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'GRAS', EU: 'approved' },
      is_allergen: false,
      is_natural: false,
    },
    {
      fda_common_name: 'Potassium Sorbate',
      inci_name: 'Potassium Sorbate',
      cas_number: '590-00-1',
      vietnamese_name: 'Potassium Sorbate',
      category: 'preservative',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'GRAS', EU: 'approved' },
      is_allergen: false,
      is_natural: false,
    },
    {
      fda_common_name: 'Citric Acid',
      inci_name: 'Citric Acid',
      cas_number: '77-92-9',
      vietnamese_name: 'Axit Citric',
      category: 'acidulant',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'GRAS', EU: 'approved' },
      is_allergen: false,
      is_natural: true,
    },
    {
      fda_common_name: 'Sugar',
      inci_name: 'Sucrose',
      cas_number: '57-50-1',
      vietnamese_name: 'Đường',
      category: 'sweetener',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'GRAS', EU: 'approved' },
      is_allergen: false,
      is_natural: true,
    },
    {
      fda_common_name: 'Salt',
      inci_name: 'Sodium Chloride',
      cas_number: '7647-14-5',
      vietnamese_name: 'Muối',
      category: 'seasoning',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'GRAS', EU: 'approved' },
      is_allergen: false,
      is_natural: true,
    },
    {
      fda_common_name: 'Peanut',
      inci_name: 'Arachis Hypogaea',
      vietnamese_name: 'Lạc',
      category: 'ingredient',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'allowed', EU: 'approved' },
      allergen_group: 'peanut',
      is_allergen: true,
      is_natural: true,
    },
    {
      fda_common_name: 'Tree Nut',
      inci_name: 'Tree Nut',
      vietnamese_name: 'Hạt cây',
      category: 'ingredient',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'allowed', EU: 'approved' },
      allergen_group: 'tree_nut',
      is_allergen: true,
      is_natural: true,
    },
    {
      fda_common_name: 'Shellfish',
      inci_name: 'Shellfish',
      vietnamese_name: 'Hải sản vỏ cứng',
      category: 'ingredient',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'allowed', EU: 'approved' },
      allergen_group: 'shellfish',
      is_allergen: true,
      is_natural: true,
    },
    {
      fda_common_name: 'Milk',
      inci_name: 'Milk',
      vietnamese_name: 'Sữa',
      category: 'ingredient',
      ingredient_type: 'food',
      regulatory_status: { FDA: 'allowed', EU: 'approved' },
      allergen_group: 'milk',
      is_allergen: true,
      is_natural: true,
    },
  ]

  try {
    const { data, error } = await supabase
      .from('ingredient_master')
      .insert(commonIngredients as IngredientMaster[])
      .select()

    if (error) {
      return { success: false, count: 0, error: error.message }
    }

    return { success: true, count: data?.length || 0 }
  } catch (err) {
    return { success: false, count: 0, error: String(err) }
  }
}

// Helper function to calculate match score
function calculateMatchScore(ingredient: IngredientMaster, query: string): number {
  const q = query.toLowerCase()
  const fda = ingredient.fda_common_name?.toLowerCase() || ''
  const inci = ingredient.inci_name?.toLowerCase() || ''
  const vn = ingredient.vietnamese_name?.toLowerCase() || ''

  if (fda === q || inci === q) return 100
  if (fda.startsWith(q) || inci.startsWith(q) || vn.startsWith(q)) return 90
  if (fda.includes(q) || inci.includes(q) || vn.includes(q)) return 80

  return 50
}

// Get all ingredient categories for filtering
export async function getIngredientCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('ingredient_master')
    .select('category')
    .order('category', { ascending: true })

  if (error) {
    console.error('[v0] Get categories error:', error)
    return []
  }

  // Get unique categories
  const categories = new Set<string>()
  data?.forEach(item => {
    if (item.category) categories.add(item.category)
  })

  return Array.from(categories)
}
