/**
 * Contrast Checker - Readability Validation for FDA Labels
 * 
 * PROFESSIONAL DISCLAIMER:
 * This tool provides readability assessment based on WCAG-inspired guidelines.
 * While FDA regulations require "conspicuous" labeling (21 CFR 101.15), the FDA
 * does not specify exact contrast ratios. WCAG 2.1 AA standards (4.5:1 for normal
 * text, 3:1 for large text) are industry best practices for readability, not
 * direct FDA requirements.
 * 
 * This analysis is for guidance only. Always consult FDA regulations and legal
 * counsel for final compliance determination.
 */

export interface RGBColor {
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
}

export interface ContrastResult {
  ratio: number
  isReadable: boolean
  wcagLevel: 'AAA' | 'AA' | 'A' | 'Fail'
  warning?: string
  recommendation?: string
}

export class ContrastChecker {
  /**
   * Calculate relative luminance of a color (WCAG formula)
   */
  private static calculateLuminance(color: RGBColor): number {
    const rsRGB = color.r / 255
    const gsRGB = color.g / 255
    const bsRGB = color.b / 255

    const r =
      rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
    const g =
      gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
    const b =
      bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static calculateContrastRatio(foreground: RGBColor, background: RGBColor): number {
    const l1 = this.calculateLuminance(foreground)
    const l2 = this.calculateLuminance(background)

    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)

    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * Validate contrast for FDA label readability
   * FDA expects "conspicuous" labeling - we use WCAG AA as minimum
   */
  static validateContrast(
    foreground: RGBColor,
    background: RGBColor,
    textSize: 'normal' | 'large' = 'normal'
  ): ContrastResult {
    const ratio = this.calculateContrastRatio(foreground, background)

    // WCAG 2.1 Standards:
    // - Normal text: 4.5:1 (AA), 7:1 (AAA)
    // - Large text: 3:1 (AA), 4.5:1 (AAA)
    const minRatioAA = textSize === 'large' ? 3 : 4.5
    const minRatioAAA = textSize === 'large' ? 4.5 : 7

    let wcagLevel: 'AAA' | 'AA' | 'A' | 'Fail'
    let isReadable: boolean
    let warning: string | undefined
    let recommendation: string | undefined

    if (ratio >= minRatioAAA) {
      wcagLevel = 'AAA'
      isReadable = true
    } else if (ratio >= minRatioAA) {
      wcagLevel = 'AA'
      isReadable = true
    } else if (ratio >= 3) {
      wcagLevel = 'A'
      isReadable = false
      warning = 'Contrast ratio is below industry best practices for readability (WCAG AA). FDA may consider this insufficient for "conspicuous" labeling.'
      recommendation = 'Increase contrast to at least 4.5:1 for normal text to meet WCAG AA standards'
    } else {
      wcagLevel = 'Fail'
      isReadable = false
      warning =
        'CRITICAL: Text contrast is very low and may not meet FDA "conspicuous" labeling requirements. This could result in regulatory action.'
      recommendation = `Current ratio ${ratio.toFixed(2)}:1 - increase to at least ${minRatioAA}:1 (WCAG AA standard) for proper readability`
    }

    return {
      ratio,
      isReadable,
      wcagLevel,
      warning,
      recommendation,
    }
  }

  /**
   * Convert hex color to RGB
   */
  static hexToRgb(hex: string): RGBColor {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) {
      throw new Error('Invalid hex color')
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
  }

  /**
   * Suggest better color combinations
   */
  static suggestImprovement(
    foreground: RGBColor,
    background: RGBColor
  ): {
    suggestedForeground?: RGBColor
    suggestedBackground?: RGBColor
    message: string
  } {
    const currentRatio = this.calculateContrastRatio(foreground, background)

    if (currentRatio >= 4.5) {
      return { message: 'Current contrast is acceptable' }
    }

    // Simple suggestion: darken foreground or lighten background
    const fgLuminance = this.calculateLuminance(foreground)
    const bgLuminance = this.calculateLuminance(background)

    if (fgLuminance > bgLuminance) {
      // Light text on dark background - make text whiter
      return {
        suggestedForeground: { r: 255, g: 255, b: 255 },
        message: 'Consider using pure white text for better contrast',
      }
    }
    // Dark text on light background - make text darker
    return {
      suggestedForeground: { r: 0, g: 0, b: 0 },
      message: 'Consider using pure black text for better contrast',
    }
  }

  /**
   * Check common problematic color combinations
   */
  static checkProblematicCombinations(
    foreground: RGBColor,
    background: RGBColor
  ): string[] {
    const warnings: string[] = []

    // Red on green or green on red (colorblind issue)
    if (
      (foreground.r > 200 &&
        foreground.g < 50 &&
        background.g > 200 &&
        background.r < 50) ||
      (foreground.g > 200 &&
        foreground.r < 50 &&
        background.r > 200 &&
        background.g < 50)
    ) {
      warnings.push('Red-green combination may be difficult for colorblind users')
    }

    // Blue on red or red on blue (vibrating colors)
    if (
      (foreground.b > 200 &&
        foreground.r < 50 &&
        background.r > 200 &&
        background.b < 50) ||
      (foreground.r > 200 &&
        foreground.b < 50 &&
        background.b > 200 &&
        background.r < 50)
    ) {
      warnings.push('Blue-red combination can cause visual vibration')
    }

    // Low saturation difference (grey on grey)
    const fgGray = Math.abs(foreground.r - foreground.g) < 30
    const bgGray = Math.abs(background.r - background.g) < 30
    if (fgGray && bgGray) {
      warnings.push('Grey on grey - ensure sufficient brightness difference')
    }

    return warnings
  }
}
