/**
 * Visual Geometry Analyzer
 * Analyzes text size ratios and visual proportions on food labels per FDA requirements
 */

export interface TextElement {
  text: string
  fontSize: number
  fontWeight: string
  x: number
  y: number
  width: number
  height: number
  area: number
}

export interface GeometryViolation {
  type: 'font_ratio' | 'text_area' | 'placement' | 'prominence'
  severity: 'critical' | 'warning' | 'info'
  description: string
  expected: string
  actual: string
  regulation: string
}

export class VisualGeometryAnalyzer {
  /**
   * Calculate text area in pixels
   */
  static calculateTextArea(element: TextElement): number {
    return element.width * element.height
  }

  /**
   * Calculate font size ratio between two text elements
   */
  static calculateFontRatio(element1: TextElement, element2: TextElement): number {
    return element1.fontSize / element2.fontSize
  }

  /**
   * Calculate area ratio between two text elements
   */
  static calculateAreaRatio(element1: TextElement, element2: TextElement): number {
    const area1 = this.calculateTextArea(element1)
    const area2 = this.calculateTextArea(element2)
    return area1 / area2
  }

  /**
   * Product name prominence check
   * 
   * IMPORTANT: 21 CFR 101.3(d) requires the "statement of identity" (common name)
   * to be in "bold type" and "reasonably related to prominence" — but does NOT
   * specify a minimum percentage ratio relative to brand name.
   * 
   * Industry standard: Brand names are almost always larger than product descriptors.
   * Examples: Coca-Cola >> "Sparkling Water", Oreo >> "Chocolate Sandwich Cookies"
   * 
   * This check is now INFO-level only for extreme cases (< 15% ratio or < 6pt font)
   * where the product name becomes genuinely unreadable. Normal brand/product
   * size relationships (20%-50%) are NOT violations.
   * 
   * Reference: FDA does NOT enforce or cite 101.3(d) for font ratio violations
   * in Warning Letters — only for missing/inadequate statement of identity.
   */
  static validateProductNameSize(
    brandName: TextElement,
    productName: TextElement
  ): GeometryViolation | null {
    const ratio = this.calculateFontRatio(productName, brandName)

    // Only flag if product name is genuinely unreadable (< 15% or < 6pt equivalent)
    // This catches extreme cases where text is practically invisible
    if (ratio < 0.15) {
      return {
        type: 'font_ratio',
        severity: 'info', // Changed from 'critical' - this is advisory only
        description: 'Product name may be difficult to read due to very small font size',
        expected: 'Product name should be clearly legible to consumers',
        actual: `Current ratio: ${(ratio * 100).toFixed(1)}% of brand name size`,
        regulation: '21 CFR 101.3(d) - Statement of Identity',
      }
    }

    // Normal brand/product ratios (15%-100%) are NOT violations
    // Brand names being larger than product descriptors is standard industry practice
    return null
  }

  /**
   * FDA Regulation: Net quantity statement must be prominent
   * 21 CFR 101.105
   */
  static validateNetQuantityProminence(
    netQuantity: TextElement,
    principalDisplay: TextElement
  ): GeometryViolation | null {
    const areaRatio = this.calculateAreaRatio(netQuantity, principalDisplay)

    // Net quantity should occupy at least 2% of principal display panel area
    if (areaRatio < 0.02) {
      return {
        type: 'text_area',
        severity: 'critical',
        description: 'Net quantity statement is not prominent enough',
        expected: 'Net quantity must occupy at least 2% of principal display panel',
        actual: `Current area: ${(areaRatio * 100).toFixed(2)}%`,
        regulation: '21 CFR 101.105',
      }
    }

    return null
  }

  /**
   * FDA Regulation: "Contains" allergen statement placement
   * Must be directly after ingredients or in separate statement
   */
  static validateAllergenPlacement(
    allergenStatement: TextElement,
    ingredientList: TextElement
  ): GeometryViolation | null {
    const verticalDistance = Math.abs(allergenStatement.y - (ingredientList.y + ingredientList.height))
    const fontSize = ingredientList.fontSize

    // Allergen statement should be within 1 line height of ingredients
    if (verticalDistance > fontSize * 2) {
      return {
        type: 'placement',
        severity: 'warning',
        description: 'Allergen statement is too far from ingredient list',
        expected: 'Should be within 1-2 line heights of ingredient list',
        actual: `Current distance: ${verticalDistance.toFixed(0)}px (${(verticalDistance / fontSize).toFixed(1)} line heights)`,
        regulation: 'FALCPA Section 203(c)',
      }
    }

    return null
  }

  /**
   * Calculate minimum font size based on panel size
   * 21 CFR 101.105(h) - Font size requirements
   */
  static calculateMinimumFontSize(panelAreaSquareInches: number): number {
    if (panelAreaSquareInches <= 5) return 1 / 16 // 1/16 inch
    if (panelAreaSquareInches <= 25) return 1 / 8 // 1/8 inch
    if (panelAreaSquareInches <= 100) return 3 / 16 // 3/16 inch
    return 1 / 4 // 1/4 inch for > 100 sq in
  }

  /**
   * Validate nutrition label font size
   */
  static validateNutritionLabelFont(
    nutritionLabel: TextElement,
    panelAreaSquareInches: number
  ): GeometryViolation | null {
    const minFontSizeInches = this.calculateMinimumFontSize(panelAreaSquareInches)
    const minFontSizePixels = minFontSizeInches * 96 // Convert inches to pixels (96 DPI)

    if (nutritionLabel.fontSize < minFontSizePixels) {
      return {
        type: 'font_ratio',
        severity: 'critical',
        description: 'Nutrition label font size is below FDA minimum',
        expected: `Minimum ${minFontSizeInches} inch (${minFontSizePixels.toFixed(1)}px) for ${panelAreaSquareInches} sq in panel`,
        actual: `Current: ${nutritionLabel.fontSize}px`,
        regulation: '21 CFR 101.105(h)',
      }
    }

    return null
  }

  /**
   * Analyze all visual geometry aspects of a label
   */
  static analyzeLabel(elements: {
    brandName?: TextElement
    productName?: TextElement
    netQuantity?: TextElement
    principalDisplay?: TextElement
    allergenStatement?: TextElement
    ingredientList?: TextElement
    nutritionLabel?: TextElement
    panelAreaSquareInches?: number
  }): GeometryViolation[] {
    const violations: GeometryViolation[] = []

    // Validate product name size
    if (elements.brandName && elements.productName) {
      const violation = this.validateProductNameSize(elements.brandName, elements.productName)
      if (violation) violations.push(violation)
    }

    // Validate net quantity prominence
    if (elements.netQuantity && elements.principalDisplay) {
      const violation = this.validateNetQuantityProminence(
        elements.netQuantity,
        elements.principalDisplay
      )
      if (violation) violations.push(violation)
    }

    // Validate allergen placement
    if (elements.allergenStatement && elements.ingredientList) {
      const violation = this.validateAllergenPlacement(
        elements.allergenStatement,
        elements.ingredientList
      )
      if (violation) violations.push(violation)
    }

    // Validate nutrition label font
    if (elements.nutritionLabel && elements.panelAreaSquareInches) {
      const violation = this.validateNutritionLabelFont(
        elements.nutritionLabel,
        elements.panelAreaSquareInches
      )
      if (violation) violations.push(violation)
    }

    return violations
  }

  /**
   * Extract text elements from OCR result (mock implementation)
   * In production, this would integrate with actual OCR service
   */
  static extractTextElements(ocrResult: any): TextElement[] {
    // Mock implementation - in production, parse real OCR data
    return [
      {
        text: 'BRAND NAME',
        fontSize: 48,
        fontWeight: 'bold',
        x: 100,
        y: 50,
        width: 300,
        height: 60,
        area: 18000,
      },
      {
        text: 'Product Name',
        fontSize: 20,
        fontWeight: 'normal',
        x: 100,
        y: 120,
        width: 200,
        height: 25,
        area: 5000,
      },
    ]
  }
}
