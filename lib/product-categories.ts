export interface ProductCategory {
  id: string
  name: string
  subcategories?: ProductSubCategory[]
  regulations: string[]
  templateChecklist: string[]
}

export interface ProductSubCategory {
  id: string
  name: string
  parentId: string
  specificRegulations: string[]
  mandatoryFields: string[]
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'conventional-foods',
    name: 'Conventional Foods (Thực phẩm thông thường)',
    regulations: ['21 CFR 101', '21 CFR 102'],
    templateChecklist: [
      'Product name and brand',
      'Net quantity declaration',
      'Ingredient list',
      'Nutrition Facts panel',
      'Allergen declaration',
      'Manufacturer information',
    ],
    subcategories: [
      {
        id: 'seafood',
        name: 'Seafood (Thủy sản)',
        parentId: 'conventional-foods',
        specificRegulations: ['21 CFR 123', 'HACCP requirements'],
        mandatoryFields: ['Country of origin', 'Fish species', 'Wild/Farm-raised'],
      },
      {
        id: 'dried-foods',
        name: 'Dried Foods (Đồ khô)',
        parentId: 'conventional-foods',
        specificRegulations: ['21 CFR 101.9'],
        mandatoryFields: ['Storage instructions', 'Rehydration instructions'],
      },
      {
        id: 'beverages',
        name: 'Beverages (Nước giải khát)',
        parentId: 'conventional-foods',
        specificRegulations: ['21 CFR 101.30'],
        mandatoryFields: ['Serving size per container', 'Added sugars'],
      },
      {
        id: 'canned-foods',
        name: 'Canned Foods (Thực phẩm đóng hộp)',
        parentId: 'conventional-foods',
        specificRegulations: ['21 CFR 113'],
        mandatoryFields: ['Processing method', 'Best by date'],
      },
    ],
  },
  {
    id: 'dietary-supplements',
    name: 'Dietary Supplements (Thực phẩm chức năng)',
    regulations: ['21 CFR 101.36', 'DSHEA'],
    templateChecklist: [
      'Supplement Facts panel',
      'Disclaimer statement',
      'Serving size',
      'Ingredient list',
      'Structure/function claims',
      'Contact information',
    ],
    subcategories: [
      {
        id: 'vitamins',
        name: 'Vitamins (Vitamin)',
        parentId: 'dietary-supplements',
        specificRegulations: ['21 CFR 101.36(b)'],
        mandatoryFields: ['% Daily Value', 'Dosage form'],
      },
      {
        id: 'herbal',
        name: 'Herbal Products (Thảo dược)',
        parentId: 'dietary-supplements',
        specificRegulations: ['21 CFR 101.36', 'Botanical identity'],
        mandatoryFields: ['Plant part used', 'Extract ratio'],
      },
      {
        id: 'protein',
        name: 'Protein Supplements (Bổ sung Protein)',
        parentId: 'dietary-supplements',
        specificRegulations: ['21 CFR 101.36'],
        mandatoryFields: ['Protein source', 'Amino acid profile'],
      },
    ],
  },
  {
    id: 'alcoholic-beverages',
    name: 'Alcoholic Beverages (Đồ uống có cồn)',
    regulations: ['27 CFR Part 4', '27 CFR Part 5', 'TTB regulations'],
    templateChecklist: [
      'Alcohol content',
      'Health warning',
      'Sulfite declaration',
      'Brand name',
      'Class/type designation',
      'Bottler information',
    ],
    subcategories: [
      {
        id: 'wine',
        name: 'Wine (Rượu vang)',
        parentId: 'alcoholic-beverages',
        specificRegulations: ['27 CFR Part 4'],
        mandatoryFields: ['Vintage year', 'Varietal designation'],
      },
      {
        id: 'beer',
        name: 'Beer (Bia)',
        parentId: 'alcoholic-beverages',
        specificRegulations: ['27 CFR Part 7'],
        mandatoryFields: ['Malt beverage designation'],
      },
    ],
  },
  {
    id: 'cosmetics',
    name: 'Cosmetics (Mỹ phẩm)',
    regulations: ['21 CFR 701', 'FD&C Act'],
    templateChecklist: [
      'Product identity',
      'Ingredient declaration',
      'Net contents',
      'Warning statements',
      'Distributor information',
    ],
    subcategories: [
      {
        id: 'skincare',
        name: 'Skincare (Chăm sóc da)',
        parentId: 'cosmetics',
        specificRegulations: ['21 CFR 701.3'],
        mandatoryFields: ['Skin type indication', 'Usage instructions'],
      },
      {
        id: 'makeup',
        name: 'Makeup (Trang điểm)',
        parentId: 'cosmetics',
        specificRegulations: ['21 CFR 701.3', 'Color additive regulations'],
        mandatoryFields: ['Shade name', 'Application area'],
      },
    ],
  },
]

export function getCategoryById(categoryId: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find((cat) => cat.id === categoryId)
}

export function getSubCategoryById(
  categoryId: string,
  subCategoryId: string
): ProductSubCategory | undefined {
  const category = getCategoryById(categoryId)
  return category?.subcategories?.find((sub) => sub.id === subCategoryId)
}

export function getRelevantRegulations(
  categoryId: string,
  subCategoryId?: string
): string[] {
  const category = getCategoryById(categoryId)
  if (!category) return []

  const regulations = [...category.regulations]

  if (subCategoryId) {
    const subCategory = getSubCategoryById(categoryId, subCategoryId)
    if (subCategory) {
      regulations.push(...subCategory.specificRegulations)
    }
  }

  return regulations
}

export function getMandatoryFields(
  categoryId: string,
  subCategoryId?: string
): string[] {
  const category = getCategoryById(categoryId)
  if (!category) return []

  const fields = [...category.templateChecklist]

  if (subCategoryId) {
    const subCategory = getSubCategoryById(categoryId, subCategoryId)
    if (subCategory) {
      fields.push(...subCategory.mandatoryFields)
    }
  }

  return fields
}
