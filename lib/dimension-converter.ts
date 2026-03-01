/**
 * Dimension Converter - Pixel to Real-World Size Conversion
 * Converts pixel measurements to actual inches/cm for FDA compliance validation
 * Reference: 21 CFR 101.105 - Principal Display Panel requirements
 */

export interface PhysicalDimensions {
  width: number // in cm
  height: number // in cm
  unit: 'cm' | 'inch'
}

export interface PixelDimensions {
  width: number // in pixels
  height: number // in pixels
}

export interface ConversionResult {
  pixelsPerInch: number
  pixelsPerCm: number
  pdpAreaSquareInches: number
  fontSizeRequirements: {
    minimum_1_16_inch: number // pixels
    minimum_1_8_inch: number // pixels
    minimum_3_16_inch: number // pixels
  }
}

export class DimensionConverter {
  private static CM_TO_INCH = 0.393701

  /**
   * Calculate conversion ratios from physical dimensions and image pixels
   */
  static calculateConversionRatios(
    physical: PhysicalDimensions,
    pixel: PixelDimensions
  ): ConversionResult {
    // Convert physical dimensions to inches if needed
    const widthInches =
      physical.unit === 'cm' ? physical.width * this.CM_TO_INCH : physical.width
    const heightInches =
      physical.unit === 'cm' ? physical.height * this.CM_TO_INCH : physical.height

    // Calculate pixels per inch
    const pixelsPerInchWidth = pixel.width / widthInches
    const pixelsPerInchHeight = pixel.height / heightInches
    const pixelsPerInch = (pixelsPerInchWidth + pixelsPerInchHeight) / 2

    const pixelsPerCm = pixelsPerInch / this.CM_TO_INCH

    // Calculate PDP area in square inches
    const pdpAreaSquareInches = widthInches * heightInches

    // Calculate minimum font sizes in pixels based on FDA requirements
    // 21 CFR 101.105: Font size requirements vary by PDP area
    const fontSizeRequirements = {
      minimum_1_16_inch: pixelsPerInch * (1 / 16), // ~1.5-2mm
      minimum_1_8_inch: pixelsPerInch * (1 / 8), // ~3mm
      minimum_3_16_inch: pixelsPerInch * (3 / 16), // ~5mm
    }

    return {
      pixelsPerInch,
      pixelsPerCm,
      pdpAreaSquareInches,
      fontSizeRequirements,
    }
  }

  /**
   * Get required font size based on PDP area (21 CFR 101.105)
   */
  static getRequiredFontSize(pdpAreaSquareInches: number): {
    minHeight: number // in inches
    regulation: string
    description: string
  } {
    if (pdpAreaSquareInches <= 5) {
      return {
        minHeight: 1 / 16,
        regulation: '21 CFR 101.105(h)(1)',
        description: 'PDP ≤5 sq in: minimum 1/16 inch',
      }
    }
    if (pdpAreaSquareInches <= 25) {
      return {
        minHeight: 1 / 8,
        regulation: '21 CFR 101.105(h)(2)',
        description: 'PDP >5 and ≤25 sq in: minimum 1/8 inch',
      }
    }
    if (pdpAreaSquareInches <= 100) {
      return {
        minHeight: 3 / 16,
        regulation: '21 CFR 101.105(h)(3)',
        description: 'PDP >25 and ≤100 sq in: minimum 3/16 inch',
      }
    }
    return {
      minHeight: 1 / 4,
      regulation: '21 CFR 101.105(h)(4)',
      description: 'PDP >100 sq in: minimum 1/4 inch',
    }
  }

  /**
   * Validate if a text element meets FDA size requirements
   */
  static validateTextSize(
    textHeightPixels: number,
    conversion: ConversionResult,
    elementType: 'brand' | 'product' | 'net_quantity' | 'other'
  ): {
    isValid: boolean
    actualInches: number
    requiredInches: number
    regulation: string
    violation?: string
  } {
    const actualInches = textHeightPixels / conversion.pixelsPerInch
    const requirement = this.getRequiredFontSize(conversion.pdpAreaSquareInches)

    // Apply specific rules based on element type
    let requiredInches = requirement.minHeight
    let specificRegulation = requirement.regulation

    // Net quantity has specific requirements
    if (elementType === 'net_quantity') {
      requiredInches = requirement.minHeight
      specificRegulation = '21 CFR 101.105'
    }

    const isValid = actualInches >= requiredInches

    return {
      isValid,
      actualInches,
      requiredInches,
      regulation: specificRegulation,
      violation: isValid
        ? undefined
        : `Text height ${actualInches.toFixed(3)}" is below minimum ${requiredInches.toFixed(3)}" (${requirement.description})`,
    }
  }

  /**
   * Convert pixel coordinates to actual measurements
   */
  static pixelToInch(pixels: number, pixelsPerInch: number): number {
    return pixels / pixelsPerInch
  }

  static pixelToCm(pixels: number, pixelsPerCm: number): number {
    return pixels / pixelsPerCm
  }

  /**
   * Calculate area of a text element in square inches
   */
  static calculateTextArea(
    widthPixels: number,
    heightPixels: number,
    conversion: ConversionResult
  ): number {
    const widthInches = widthPixels / conversion.pixelsPerInch
    const heightInches = heightPixels / conversion.pixelsPerInch
    return widthInches * heightInches
  }

  /**
   * Validate if text prominence meets "1/2 rule" or other ratio requirements
   */
  static validateTextRatio(
    primaryTextHeight: number,
    secondaryTextHeight: number,
    requiredRatio: number = 0.5
  ): {
    isValid: boolean
    actualRatio: number
    requiredRatio: number
    violation?: string
  } {
    const actualRatio = secondaryTextHeight / primaryTextHeight
    const isValid = actualRatio >= requiredRatio

    return {
      isValid,
      actualRatio,
      requiredRatio,
      violation: isValid
        ? undefined
        : `Secondary text ratio ${actualRatio.toFixed(2)} is below required ${requiredRatio} of primary text height`,
    }
  }
}
