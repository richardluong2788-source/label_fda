import { v4 as uuidv4 } from 'uuid'

// PNRN: Prior Notice Reference Number format (FDA requirement)
// Format: PNRN-YYYYMMDD-XXXXX (where XXXXX is random alphanumeric)
export function generatePNRN(): string {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `PNRN-${dateStr}-${randomStr}`
}

// FDA requires shipment data validation
export interface PriorNoticeShipment {
  pnrn: string
  shipmentDate: string
  productName: string
  shipper: {
    name: string
    address: string
    country: string
  }
  consignee: {
    name: string
    address: string
    state: string
  }
  productType: 'human food' | 'animal food' | 'dietary supplement' | 'cosmetic'
  manufacturingDate?: string
  ingredients: string[]
  allergens: string[]
  estimatedArrivalDate: string
  quantity: number
  unit: string
  complianceNotes: string
}

// Validate prior notice data
export function validatePriorNotice(data: Partial<PriorNoticeShipment>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.productName?.trim()) errors.push('Product name is required')
  if (!data.shipper?.name?.trim()) errors.push('Shipper name is required')
  if (!data.shipper?.country?.trim()) errors.push('Shipper country is required')
  if (!data.consignee?.name?.trim()) errors.push('Consignee name is required')
  if (!data.consignee?.state?.trim()) errors.push('Consignee state is required')
  if (!data.estimatedArrivalDate) errors.push('Estimated arrival date is required')
  if (!data.productType) errors.push('Product type is required')
  if (!data.ingredients || data.ingredients.length === 0) {
    errors.push('At least one ingredient is required')
  }
  if (data.quantity && data.quantity <= 0) errors.push('Quantity must be greater than 0')

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Check for FDA restricted ingredients
export const FDA_RESTRICTED_INGREDIENTS = [
  'Safrole',
  'Sassafras',
  'Coumarin',
  'Calamus',
  'Cyclamate',
  'Cycad',
  'Bracken fern',
  'Thiouracil',
]

export function checkRestrictedIngredients(ingredients: string[]): string[] {
  return ingredients.filter((ingredient) =>
    FDA_RESTRICTED_INGREDIENTS.some((restricted) =>
      ingredient.toLowerCase().includes(restricted.toLowerCase())
    )
  )
}

// Common food allergens (FDA Big 9)
export const FDA_MAJOR_ALLERGENS = [
  'Milk',
  'Eggs',
  'Peanuts',
  'Tree nuts',
  'Fish',
  'Crustacean shellfish',
  'Sesame',
  'Soy',
  'Wheat',
]

export function checkAllergenDisclosure(ingredients: string[], declaredAllergens: string[]): {
  missing: string[]
  undeclared: string[]
} {
  const foundAllergens: string[] = []

  // Find allergens in ingredients
  for (const ingredient of ingredients) {
    for (const allergen of FDA_MAJOR_ALLERGENS) {
      if (ingredient.toLowerCase().includes(allergen.toLowerCase())) {
        if (!foundAllergens.includes(allergen)) {
          foundAllergens.push(allergen)
        }
      }
    }
  }

  // Check for missing declarations
  const missing = foundAllergens.filter(
    (allergen) =>
      !declaredAllergens.some((declared) =>
        declared.toLowerCase().includes(allergen.toLowerCase())
      )
  )

  // Check for undeclared allergens
  const undeclared = declaredAllergens.filter(
    (declared) =>
      !ingredients.some((ingredient) =>
        ingredient.toLowerCase().includes(declared.toLowerCase())
      )
  )

  return { missing, undeclared }
}

// Generate compliance report
export interface ComplianceReport {
  pnrn: string
  status: 'compliant' | 'non-compliant' | 'conditional'
  issues: string[]
  warnings: string[]
  restrictedIngredients: string[]
  allergenDisclosureIssues: {
    missing: string[]
    undeclared: string[]
  }
  recommendedActions: string[]
}

export function generateComplianceReport(
  shipment: PriorNoticeShipment
): ComplianceReport {
  const issues: string[] = []
  const warnings: string[] = []
  const recommendedActions: string[] = []

  // Check restricted ingredients
  const restrictedFound = checkRestrictedIngredients(shipment.ingredients)
  if (restrictedFound.length > 0) {
    issues.push(`Contains FDA-restricted ingredients: ${restrictedFound.join(', ')}`)
    recommendedActions.push('Review FDA regulations for restricted ingredients')
  }

  // Check allergen disclosure
  const allergenIssues = checkAllergenDisclosure(shipment.ingredients, shipment.allergens)
  if (allergenIssues.missing.length > 0) {
    issues.push(
      `Missing allergen declarations for: ${allergenIssues.missing.join(', ')}`
    )
    recommendedActions.push('Add missing allergen statements to product label')
  }

  if (allergenIssues.undeclared.length > 0) {
    warnings.push(
      `Declared allergens not found in ingredients: ${allergenIssues.undeclared.join(', ')}`
    )
    recommendedActions.push('Verify allergen declarations match actual ingredients')
  }

  // Check shipment date validity
  const shipmentDate = new Date(shipment.shipmentDate)
  const today = new Date()
  if (shipmentDate > today) {
    warnings.push('Shipment date is in the future')
  }

  // Check estimated arrival
  const arrivalDate = new Date(shipment.estimatedArrivalDate)
  const daysDiff = Math.ceil(
    (arrivalDate.getTime() - shipmentDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysDiff < 1 || daysDiff > 45) {
    warnings.push('Estimated transit time seems unusual (typically 1-45 days)')
  }

  // Determine status
  let status: 'compliant' | 'non-compliant' | 'conditional' = 'compliant'
  if (issues.length > 0) {
    status = 'non-compliant'
  } else if (warnings.length > 0) {
    status = 'conditional'
  }

  return {
    pnrn: shipment.pnrn,
    status,
    issues,
    warnings,
    restrictedIngredients: restrictedFound,
    allergenDisclosureIssues: allergenIssues,
    recommendedActions,
  }
}

// Format PNRN for display
export function formatPNRN(pnrn: string): string {
  // PNRN-20240327-ABC12
  return pnrn.toUpperCase()
}

// Export PNRN data for FDA submission
export function exportPNRNForFDA(shipment: PriorNoticeShipment, report: ComplianceReport) {
  return {
    priorNoticeReferenceNumber: shipment.pnrn,
    submissionDate: new Date().toISOString(),
    shipmentInformation: {
      estimatedArrivalDate: shipment.estimatedArrivalDate,
      shipper: shipment.shipper,
      consignee: shipment.consignee,
    },
    productInformation: {
      productName: shipment.productName,
      type: shipment.productType,
      ingredients: shipment.ingredients,
      allergens: shipment.allergens,
      quantity: `${shipment.quantity} ${shipment.unit}`,
    },
    complianceStatus: report.status,
    issues: report.issues,
    warnings: report.warnings,
    submittedAt: new Date().toISOString(),
  }
}
