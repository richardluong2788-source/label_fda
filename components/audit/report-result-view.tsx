'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Loader2,
  Info,
  Expand,
  Shield,
  Mail,
  RotateCcw,
  Ship,
  FileText,
  Languages,
  RefreshCw,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Ruler,
  Package,
  ShieldAlert,
  BookOpen,
  ExternalLink,
  Utensils,
  MessageSquare,
  Landmark,
} from 'lucide-react'
import type { AuditReport, Violation, LabelImageEntry, GeometryViolation } from '@/lib/types'
import { LabelImageGallery } from '@/components/label-image-gallery'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LabelPreview } from '@/components/label-preview'
import { getLabelConfig } from '@/lib/label-field-config'
import { useTranslation } from '@/lib/i18n'
import { useTranslateViolations } from '@/hooks/use-translate-violations'
import { ClaimsValidator, type NutritionFactData } from '@/lib/claims-validator'
import { FDAComplianceIntelligenceSection } from '@/components/audit/report-sections'

// Import utilities
import { getClaimTooltips, getLabTestLabel } from '@/lib/claim-tooltips'
import { parseNutritionValue } from '@/lib/nutrition-parser'
import { generateLocalizedCommercialSummary } from '@/lib/commercial-summary'

// Import shared components
import { MarkdownContent } from '@/components/audit/shared/markdown-content'
import { RiskScoreGauge, OcrConfidenceBar, MiniConfidenceBar } from '@/components/audit/shared/gauges'
import { SeverityBadge, ViolationIcon, IngredientTags } from '@/components/audit/shared/badges'

// Import card components
import { ViolationCard } from '@/components/audit/cards/violation-card'
import { ContrastViolationCard, type ContrastViolation } from '@/components/audit/cards/contrast-card'
import { GeometryViolationCard } from '@/components/audit/cards/geometry-card'
import { CombinedMarketIntelligenceCard } from '@/components/audit/cards/market-intelligence-cards'

// ────────────────────────────────────────────────────────────
// Main Report Result View
// ────────────────────────────────────────────────────────────

interface ReportResultViewProps {
  report: AuditReport
  onDownloadPdf: () => void
  pdfLoading: boolean
}

export function ReportResultView({
  report,
  onDownloadPdf,
  pdfLoading,
}: ReportResultViewProps) {
  const router = useRouter()
  const { t, locale } = useTranslation()
  const [showExpertTips, setShowExpertTips] = useState(true)

  const rawViolations: Violation[] = (report as any).findings || report.violations || []
  
  // Use translation hook for AI-generated content
  const {
    translatedViolations,
    isTranslating,
    translationError,
    sourceLanguage,
    retryTranslation,
  } = useTranslateViolations(rawViolations, locale, report.id)
  
  const allViolations = translatedViolations
  
  // Filter violations by source type
  const cfrViolations = allViolations.filter(
    (v) =>
      v.source_type !== 'import_alert' &&
      v.source_type !== 'warning_letter' &&
      v.source_type !== 'recall'
  )
  const wlViolations = allViolations.filter((v) => v.source_type === 'warning_letter')
  const recallViolations = allViolations.filter((v) => v.source_type === 'recall')
  const importAlertViolations = allViolations.filter((v) => v.source_type === 'import_alert')
  
  // Filter contrast violations:
  // Brand/decorative elements (logo, product name) with large text meeting WCAG AA 3:1 are EXEMPT.
  // 21 CFR does NOT mandate a specific contrast ratio — only "conspicuous/legible" text.
  // Only show violations that are genuinely problematic for regulatory text OR critically low for any text.
  const contrastViolations = (report.contrast_violations || []).filter((cv: any) => {
    const ratio = cv.ratio ?? 0
    const role = cv.elementRole ?? cv.element_role ?? 'regulatory'
    const textSize = cv.textSize ?? cv.text_size ?? 'normal'

    // Always show regulatory element violations (net quantity, ingredient text, etc.)
    if (role === 'regulatory') return true

    // For brand elements: only show if ratio is critically low (< 2.5:1)
    // A ratio of 2.94:1 on orange brand logo is intentional design — skip it
    if (role === 'brand') {
      return ratio < 2.5
    }

    // For large text of any role: WCAG AA requires 3:1 minimum
    if (textSize === 'large' && ratio >= 3.0) return false

    // For normal text: WCAG AA requires 4.5:1 minimum — show if below threshold
    return true
  })
  const geometryViolations = report.geometry_violations || []

  const riskScore = report.overall_risk_score ?? 5
  const projectedRiskScore = report.projected_risk_score
  const riskLabel =
    riskScore >= 7
      ? t.report.riskHigh
      : riskScore >= 4
        ? t.report.riskMediumHigh
        : riskScore >= 2
          ? t.report.riskMedium
          : t.report.riskLow

  // NOTE: Contrast violations are DESIGN RECOMMENDATIONS, not FDA violations
  // They should NOT be counted in criticalCount/warningCount as they don't affect compliance
  // FDA 21 CFR does NOT specify contrast ratios - only "conspicuous and legible"
  //
  // IMPORTANT: Also exclude market intelligence items from counts.
  // Warning Letters, Recalls, and Import Alerts are displayed in separate sections and do NOT affect risk score.
  const MARKET_INTELLIGENCE_TYPES = ['recall', 'warning_letter', 'import_alert']
  const violationsForCounting = allViolations.filter((v) => !MARKET_INTELLIGENCE_TYPES.includes(v.source_type))
  const criticalCount = violationsForCounting.filter((v) => v.severity === 'critical').length
  const warningCount = violationsForCounting.filter((v) => v.severity === 'warning').length
  const infoCount = violationsForCounting.filter((v) => v.severity === 'info').length
  
  // Track design recommendations separately (contrast violations are always 'info')
  const designRecommendationCount = contrastViolations.length

  const descParts: string[] = []
  if (criticalCount > 0) descParts.push(`${criticalCount} ${t.report.criticalViolations}`)
  if (warningCount > 0) descParts.push(`${warningCount} ${t.report.warnings}`)

  // Commercial Summary - ALWAYS generate in current UI language
  // This ensures the summary language matches user's current language selection
  // instead of using the DB-stored summary which was generated at analysis time
  const commercialSummary = generateLocalizedCommercialSummary(report, t)
  
  // Expert tips with deduplication - remove tips that are already in commercial summary
  // This prevents duplicate content between commercial_summary.expert_recommendations and expert_tips array
  const rawExpertTips = report.expert_tips || []
  const commercialTextLower = (commercialSummary || '').toLowerCase()
  const expertTips = rawExpertTips.filter((tip: string) => {
    // Extract first 50 chars of tip to check for duplication
    const tipKey = tip.toLowerCase().slice(0, 50)
    return !commercialTextLower.includes(tipKey)
  })
  const enforcementInsights = report.enforcement_insights || []
  const nutritionFacts = report.nutrition_facts || []
  const allergenDeclaration = report.allergen_declaration
  const healthClaims = (report as any).health_claims as string[] | undefined
  const detectedLanguages = (report as any).detected_languages as string[] | undefined
  const netQuantity = (report as any).net_quantity as string | undefined
  const packagingFormat = report.packaging_format
  // Deduplicate special claims case-insensitively (e.g., "USDA ORGANIC" and "USDA Organic" -> keep first)
  const specialClaims = (() => {
    const rawClaims = report.special_claims || []
    const seen = new Set<string>()
    return rawClaims.filter((claim: string) => {
      const normalized = claim.toLowerCase().trim()
      if (seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
  })()

  return (
    <div className="bg-slate-50">
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-600 font-medium">FDA Pipeline: Connected</span>
            </div>
            
            {isTranslating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
                <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                <span className="text-xs text-blue-600 font-medium">
                  {t.report.translating || 'Translating...'}
                </span>
              </div>
            )}
            
            {translationError && !isTranslating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                <Languages className="h-3 w-3 text-amber-600" />
                <span className="text-xs text-amber-600 font-medium">
                  {t.report.translationFailed || 'Translation unavailable'}
                </span>
                <button
                  onClick={retryTranslation}
                  className="ml-1 p-0.5 rounded hover:bg-amber-100 transition-colors"
                  title={t.report.retry || 'Retry'}
                >
                  <RefreshCw className="h-3 w-3 text-amber-600" />
                </button>
              </div>
            )}
            
            {sourceLanguage && sourceLanguage !== locale && !isTranslating && !translationError && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                <Languages className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600 font-medium">
                  {t.report.translatedFrom || 'Translated from'} {sourceLanguage === 'vi' ? 'Vietnamese' : 'English'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadPdf}
              disabled={pdfLoading}
              className="text-xs"
            >
              {pdfLoading ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1.5" />
              )}
              {t.report.downloadPdf}
            </Button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* LEFT COLUMN: Product Info & Images */}
          <div className="space-y-6">
            {/* Label Images */}
            {report.label_images && report.label_images.length > 0 && (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <div className="p-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                    {t.report.labelImages}
                  </h2>
                  <LabelImageGallery images={report.label_images} />
                </div>
              </Card>
            )}

            {/* Product Details */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-4">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4">
                  {t.report.productDetails}
                </h2>
                <div className="space-y-4">
                  {(report as any).brand_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.brand}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {(report as any).brand_name}
                      </p>
                    </div>
                  )}

                  {report.product_name && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.productName}
                      </p>
                      <p className="text-sm font-medium text-slate-700 italic">
                        {report.product_name}
                      </p>
                    </div>
                  )}

                  {/* Net Quantity */}
                  {netQuantity && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.netQuantity}
                      </p>
                      <p className="text-sm font-medium text-slate-700">{netQuantity}</p>
                    </div>
                  )}

                  {report.ingredient_list && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                        {t.report.extractedIngredients}
                      </p>
                      <IngredientTags ingredientList={report.ingredient_list} />
                    </div>
                  )}

                  {/* Allergen Declaration */}
                  {allergenDeclaration && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-[11px] text-amber-700 uppercase tracking-wider font-bold mb-1">
                        {t.report.allergenDeclaration}
                      </p>
                      <p className="text-xs text-amber-900 leading-relaxed">{allergenDeclaration}</p>
                    </div>
                  )}

                  {/* DIETARY SUPPLEMENT CLAIMS CLASSIFICATION (21 CFR 101.36, DSHEA) */}
                  {(report.product_type === 'dietary_supplement' || report.product_category?.includes('supplement')) && 
                   (report as any).violations && (report as any).violations.length > 0 && (() => {
                    // Filter only supplement claims (marked with claim_type or category containing "Supplement Claim")
                    const supplementClaims = ((report as any).violations as any[]).filter(v => 
                      v.claim_type || v.category?.includes('Supplement Claim')
                    )
                    
                    if (supplementClaims.length === 0) return null
                    
                    // Group by claim_type
                    const structureFunctionClaims = supplementClaims.filter(c => c.claim_type === 'STRUCTURE_FUNCTION')
                    const factualClaims = supplementClaims.filter(c => c.claim_type === 'FACTUAL')
                    const marketingClaims = supplementClaims.filter(c => c.claim_type === 'MARKETING')
                    const warrantyClaims = supplementClaims.filter(c => c.claim_type === 'WARRANTY')
                    const diseaseClaims = supplementClaims.filter(c => c.claim_type === 'DISEASE')
                    
                    return (
                      <div className="space-y-3 mb-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                          {t.report.supplementClaimsClassification || 'DIETARY SUPPLEMENT CLAIMS (21 CFR 101.36, DSHEA)'}
                        </div>
                        
                        {/* DISEASE CLAIMS - RED/CRITICAL */}
                        {diseaseClaims.length > 0 && (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-2">
                              Prohibited Disease Claims
                            </p>
                            <div className="space-y-1.5">
                              {diseaseClaims.map((claim, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-red-800">
                                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-600" />
                                  <div className="flex-1">
                                    <p className="font-medium">{claim.claim_text || claim.description}</p>
                                    {claim.suggested_fix && (
                                      <p className="text-[10px] text-red-600 mt-0.5">Fix: {claim.suggested_fix}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* STRUCTURE/FUNCTION CLAIMS - organized by status */}
                        {structureFunctionClaims.length > 0 && (() => {
                          const compliant = structureFunctionClaims.filter(c => c.status === 'compliant')
                          const needsReview = structureFunctionClaims.filter(c => c.status === 'needs_review')
                          const violations = structureFunctionClaims.filter(c => c.status === 'violation')
                          
                          return (
                            <>
                              {/* Compliant - GREEN */}
                              {compliant.length > 0 && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-2">
                                    Structure/Function - Compliant (Has Disclaimer)
                                  </p>
                                  <div className="space-y-1.5">
                                    {compliant.map((claim, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs text-green-800">
                                        <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                        <div className="flex-1">
                                          <p className="font-medium">{claim.claim_text || claim.description}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Needs Review - YELLOW */}
                              {needsReview.length > 0 && (
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">
                                    Structure/Function - Verify Disclaimer
                                  </p>
                                  <div className="space-y-1.5">
                                    {needsReview.map((claim, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs text-amber-900">
                                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-600" />
                                        <div className="flex-1">
                                          <p className="font-medium">{claim.claim_text || claim.description}</p>
                                          {claim.suggested_fix && (
                                            <p className="text-[10px] text-amber-700 mt-0.5">Fix: {claim.suggested_fix}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Violations - RED */}
                              {violations.length > 0 && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-2">
                                    Structure/Function - Missing Disclaimer/Symbol
                                  </p>
                                  <div className="space-y-1.5">
                                    {violations.map((claim, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs text-red-800">
                                        <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-600" />
                                        <div className="flex-1">
                                          <p className="font-medium">{claim.claim_text || claim.description}</p>
                                          {claim.suggested_fix && (
                                            <p className="text-[10px] text-red-600 mt-0.5">Fix: {claim.suggested_fix}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                        
                        {/* FACTUAL CLAIMS - GREEN */}
                        {factualClaims.length > 0 && (
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-2">
                              Factual Claims - Compliant (Potency, Ingredients, Origin)
                            </p>
                            <div className="space-y-1.5">
                              {factualClaims.map((claim, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-green-800">
                                  <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                  <div className="flex-1">
                                    <p className="font-medium">{claim.claim_text || claim.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* MARKETING & WARRANTY - YELLOW */}
                        {(marketingClaims.length > 0 || warrantyClaims.length > 0) && (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">
                              Marketing & Warranty - Needs Review
                            </p>
                            <div className="space-y-1.5">
                              {[...marketingClaims, ...warrantyClaims].map((claim, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-amber-900">
                                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-600" />
                                  <div className="flex-1">
                                    <p className="font-medium">{claim.claim_text || claim.description}</p>
                                    {claim.suggested_fix && (
                                      <p className="text-[10px] text-amber-700 mt-0.5">Fix: {claim.suggested_fix}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Health Claims - Split into Structure/Function vs Factual vs Nutrient Content */}
                  {/* SKIP this section for dietary supplements - use new classified claims system instead */}
                  {healthClaims && healthClaims.length > 0 && 
                   !(report.product_type === 'dietary_supplement' || report.product_category?.includes('supplement')) &&
                   (() => {
                    // Lifestyle taglines/brand messaging - NOT health claims, should be ignored
                    const lifestyleTaglines = [
                      'eat well', 'be active', 'keep track', 'live well', 'feel good',
                      'stay healthy', 'enjoy life', 'be well', 'live better', 'stay fit',
                      'be healthy', 'think well', 'move more', 'eat smart', 'live smart'
                    ]
                    
                    // Packaging descriptors - NOT claims, just size/quantity descriptions
                    const packagingDescriptors = [
                      'value pack', 'family size', 'party size', 'bulk pack', 'economy size',
                      'mega pack', 'jumbo size', 'king size', 'snack size', 'travel size',
                      'bonus pack', 'twin pack', 'multi-pack', 'variety pack', 'combo pack'
                    ]
                    
                    // Simple nutrient statement patterns
                    const simpleNutrientStatementPatterns = [
                      /^\d+\.?\d*\s*(g|mg|mcg|kcal|cal|oz|ml|%)\s/i,
                      /^\d+\.?\d*\s*(grams?|milligrams?|micrograms?|calories?)\s/i,
                      /^\d+\s*(vitamins?|minerals?)/i,
                      /\d+\s*(nutrient|calorie)/i,
                      /^(high|good|excellent)\s+source\s+of\s/i,
                      /for daily nutrition/i,
                      /\d+%\s*(juice|fruit)/i,
                    ]
                    
                    // Nutrient content CLAIMS that need cross-reference verification
                    const nutrientContentClaimPatterns = [
                      /\b(low|reduced|less)[\s-]?(fat|sodium|sugar|salt|cholesterol|calorie)/i,
                      /\b(fat|sodium|sugar|salt|cholesterol|calorie)[\s-]?free\b/i,
                      /\bno[\s-]?(fat|sodium|sugar|salt|cholesterol)\b/i,
                      /\bzero[\s-]?(fat|sugar|calorie)/i,
                      /\bno\s+sugar(s)?\s+added/i,
                      /\bwithout\s+added\s+sugar(s)?/i,
                    ]
                    
                    // Structure/Function indicators
                    const structureFunctionKeywords = [
                      'supports', 'maintains', 'promotes', 'helps', 'contributes to', 'assists', 'aids',
                      'healthy blood', 'nitric oxide', 'boosts', 'enhances', 'strengthens', 'fights',
                      'protects', 'reduces risk', 'immune', 'metabolism',
                      'muscle health', 'bone health', 'heart health', 'brain health', 'gut health',
                      'joint health', 'eye health', 'skin health', 'liver health', 'kidney health',
                      'digestive health', 'cognitive', 'mental clarity', 'focus', 'alertness',
                      'stamina', 'endurance', 'recovery', 'performance'
                    ]
                    
                    // Factual/Negative claims that are compliant
                    const factualClaimPatterns = ['no artificial', 'no added', 'no preservatives', 'free', 'organic', 'natural', 'non-gmo', 'gluten-free', 'allergen-free', 'sulfate-free', 'antioxidant', 'source of', 'contains']
                    
                    // Filter out lifestyle taglines and packaging descriptors
                    const actualClaims = healthClaims.filter(claim => {
                      const claimLower = claim.toLowerCase().trim()
                      if (lifestyleTaglines.some(tagline => claimLower === tagline)) return false
                      if (packagingDescriptors.some(pd => claimLower === pd || claimLower.includes(pd))) return false
                      return true
                    })
                    
                    const hasStructureFunctionKeyword = (claim: string) => 
                      structureFunctionKeywords.some(keyword => claim.toLowerCase().includes(keyword))
                    
                    const isSimpleNutrientStatement = (claim: string) => 
                      simpleNutrientStatementPatterns.some(pattern => pattern.test(claim)) && !hasStructureFunctionKeyword(claim)
                    
                    const needsNutrientVerification = (claim: string) =>
                      nutrientContentClaimPatterns.some(pattern => pattern.test(claim))
                    
                    const structureFunctionClaimsFiltered = actualClaims.filter(claim => hasStructureFunctionKeyword(claim))
                    
                    const nutrientContentClaims = actualClaims.filter(claim => 
                      isSimpleNutrientStatement(claim) && !needsNutrientVerification(claim)
                    )
                    
                    const factualClaimsFiltered = actualClaims.filter(claim => 
                      factualClaimPatterns.some(pattern => claim.toLowerCase().includes(pattern)) &&
                      !hasStructureFunctionKeyword(claim) &&
                      !isSimpleNutrientStatement(claim) &&
                      !needsNutrientVerification(claim)
                    )
                    
                    const otherClaims = actualClaims.filter(claim => 
                      !structureFunctionClaimsFiltered.includes(claim) && 
                      !factualClaimsFiltered.includes(claim) &&
                      !nutrientContentClaims.includes(claim)
                    )
                    
                    return (
                      <div className="space-y-2">
                        {/* Structure/Function Claims - Need DSHEA */}
                        {structureFunctionClaimsFiltered.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-[11px] text-amber-700 uppercase tracking-wider font-bold mb-1">
                              {t.report.structureFunctionClaimsTitle || 'STRUCTURE/FUNCTION CLAIMS (NEED DSHEA)'}
                            </p>
                            <p className="text-[10px] text-amber-600 mb-2 leading-relaxed">
                              {t.report.structureFunctionClaimsHint || 'These claims require a DSHEA disclaimer. Ensure the label includes: "These statements have not been evaluated by the FDA..."'}
                            </p>
                            <div className="space-y-1">
                              {structureFunctionClaimsFiltered.map((claim, idx) => (
                                <p key={idx} className="text-xs text-amber-800 flex items-start gap-1.5">
                                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                  {claim}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Other claims - cross-reference with nutrition facts for smart verification */}
                        {otherClaims.length > 0 && (() => {
                          const nfData: NutritionFactData[] = nutritionFacts.map((nf: any) => ({
                            nutrient: nf.nutrient || nf.name || '',
                            value: nf.value,
                            unit: nf.unit || '',
                            dailyValue: nf.dailyValue
                          }))
                          
                          const claimText = otherClaims.join(' ')
                          const verifications = ClaimsValidator.verifyNutrientContentClaims(claimText, nfData)
                          
                          const verifiedCompliant = verifications.filter(v => v.status === 'compliant')
                          const verifiedViolations = verifications.filter(v => v.status === 'violation')
                          const needsReview = verifications.filter(v => v.status === 'needs_review')
                          
                          const verifiedClaimTexts = verifications.map(v => v.claim.toLowerCase())
                          const unverifiableClaims = otherClaims.filter(claim => 
                            !verifiedClaimTexts.some(vc => claim.toLowerCase().includes(vc))
                          )
                          
                          return (
                            <>
                              {/* Verified COMPLIANT nutrient content claims */}
                              {verifiedCompliant.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
                                  <p className="text-[11px] text-green-700 uppercase tracking-wider font-bold mb-1.5">
                                    {t.report.verifiedNutrientClaimsTitle || 'VERIFIED NUTRIENT CLAIMS (COMPLIANT)'}
                                  </p>
                                  <div className="space-y-1.5">
                                    {verifiedCompliant.map((v, idx) => (
                                      <div key={idx} className="text-xs text-green-800">
                                        <p className="flex items-start gap-1.5">
                                          <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                          <span className="font-medium">{v.claim.toUpperCase()}</span>
                                        </p>
                                        <p className="ml-4.5 text-[10px] text-green-600 mt-0.5">
                                          {v.nutrient}: {v.actualValue}{v.unit} &le; {v.limit}{v.unit} ({v.regulation})
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Verified VIOLATION nutrient content claims */}
                              {verifiedViolations.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                                  <p className="text-[11px] text-red-700 uppercase tracking-wider font-bold mb-1.5">
                                    {t.report.nutrientClaimViolationsTitle || 'NUTRIENT CLAIM VIOLATIONS'}
                                  </p>
                                  <div className="space-y-1.5">
                                    {verifiedViolations.map((v, idx) => (
                                      <div key={idx} className="text-xs text-red-800">
                                        <p className="flex items-start gap-1.5">
                                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-600" />
                                          <span className="font-medium">{v.claim.toUpperCase()}</span>
                                        </p>
                                        <p className="ml-4.5 text-[10px] text-red-600 mt-0.5">
                                          {v.nutrient}: {v.actualValue}{v.unit} exceeds {v.limit}{v.unit} limit ({v.regulation})
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Claims needing review */}
                              {(needsReview.length > 0 || unverifiableClaims.length > 0) && (
                                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                  <p className="text-[11px] text-amber-700 uppercase tracking-wider font-bold mb-1">
                                    {t.report.otherClaimsTitle || 'OTHER CLAIMS (REVIEW NEEDED)'}
                                  </p>
                                  <p className="text-[10px] text-amber-600 mb-2 leading-relaxed">
                                    {t.report.otherClaimsHint || 'These claims need to be verified against Nutrition Facts data for accuracy.'}
                                  </p>
                                  <div className="space-y-1">
                                    {needsReview.map((v, idx) => (
                                      <div key={`nr-${idx}`} className="text-xs text-amber-800">
                                        <p className="flex items-start gap-1.5">
                                          <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                          <span>{v.claim}</span>
                                        </p>
                                        <p className="ml-4.5 text-[10px] text-amber-600 mt-0.5">
                                          {v.description}
                                        </p>
                                      </div>
                                    ))}
                                    {unverifiableClaims.map((claim, idx) => {
                                      const claimTooltips = getClaimTooltips(locale, report.product_category)
                                      const claimLower = claim.toLowerCase().trim()
                                      const tooltipInfo = claimTooltips[claimLower]
                                      
                                      if (tooltipInfo) {
                                        return (
                                          <TooltipProvider key={`uv-${idx}`}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <p className="text-xs text-amber-800 flex items-start gap-1.5 cursor-help hover:text-amber-900 transition-colors">
                                                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                                  <span className="underline decoration-dotted underline-offset-2">{claim}</span>
                                                </p>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900 text-white border-slate-700">
                                                <div className="space-y-1.5">
                                                  <p className="text-[10px] font-mono text-amber-300">{tooltipInfo.regulation}</p>
                                                  <p className="text-xs">{tooltipInfo.note}</p>
                                                  {tooltipInfo.needsLabTest && (
                                                    <p className="text-[10px] text-blue-300 pt-1 border-t border-slate-700">
                                                      {getLabTestLabel(locale)}
                                                    </p>
                                                  )}
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )
                                      }
                                      
                                      return (
                                        <p key={`uv-${idx}`} className="text-xs text-amber-800 flex items-start gap-1.5">
                                          <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                          {claim}
                                        </p>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                        
                        {/* Nutrient Content Claims - Compliant */}
                        {nutrientContentClaims.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-[11px] text-green-700 uppercase tracking-wider font-bold mb-1.5">
                              {t.report.nutrientContentClaimsTitle || 'NUTRIENT CONTENT (COMPLIANT)'}
                            </p>
                            <div className="space-y-1">
                              {nutrientContentClaims.map((claim, idx) => (
                                <p key={idx} className="text-xs text-green-800 flex items-start gap-1.5">
                                  <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                  {claim}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        
{/* Factual/Negative Claims - Compliant with tooltips */}
  {factualClaimsFiltered.length > 0 && (() => {
  const claimTooltips = getClaimTooltips(locale)
  
  return (
  <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
  <p className="text-[11px] text-green-700 uppercase tracking-wider font-bold mb-1">
  {t.report.factualClaimsTitle || 'FACTUAL/NEGATIVE CLAIMS (COMPLIANT)'}
  </p>
  <p className="text-[10px] text-green-600 mb-2 leading-relaxed">
  {t.report.factualClaimsHint || 'These claims describe product facts (no X, without Y) and comply with FDA regulations.'}
  </p>
  <div className="space-y-1">
                                {factualClaimsFiltered.map((claim, idx) => {
                                  const claimLower = claim.toLowerCase().trim()
                                  const tooltipInfo = claimTooltips[claimLower]
                                  
                                  if (tooltipInfo) {
                                    return (
                                      <TooltipProvider key={idx}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <p className="text-xs text-green-800 flex items-start gap-1.5 cursor-help hover:text-green-900 transition-colors">
                                              <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                              <span className="underline decoration-dotted underline-offset-2">{claim}</span>
                                            </p>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900 text-white border-slate-700">
                                            <div className="space-y-1.5">
                                              <p className="text-[10px] font-mono text-green-300">{tooltipInfo.regulation}</p>
                                              <p className="text-xs">{tooltipInfo.note}</p>
                                              {tooltipInfo.needsLabTest && (
                                                <p className="text-[10px] text-blue-300 pt-1 border-t border-slate-700">
                                                  {getLabTestLabel(locale)}
                                                </p>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  }
                                  
                                  return (
                                    <p key={idx} className="text-xs text-green-800 flex items-start gap-1.5">
                                      <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-600" />
                                      {claim}
                                    </p>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })()}

                  {/* Special Claims - with tooltips for regulated claims */}
                  {specialClaims.length > 0 && (() => {
                    const claimTooltips = getClaimTooltips(locale)
                    
                    return (
                      <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
                          {t.report.specialClaimsTitle}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {specialClaims.map((claim, idx) => {
                            const claimLower = claim.toLowerCase().trim()
                            const tooltipInfo = claimTooltips[claimLower]
                            
                            if (tooltipInfo) {
                              return (
                                <TooltipProvider key={idx}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 border border-green-200 font-medium cursor-help hover:bg-green-100 transition-colors">
                                        {claim}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900 text-white border-slate-700">
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-mono text-green-300">{tooltipInfo.regulation}</p>
                                        <p className="text-xs">{tooltipInfo.note}</p>
                                        {tooltipInfo.needsLabTest && (
                                          <p className="text-[10px] text-blue-300 pt-1 border-t border-slate-700">
                                            {getLabTestLabel(locale)}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            }
                            
                            return (
                              <span key={idx} className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                                {claim}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  {report.product_category && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.category}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.product_category}
                      </p>
                    </div>
                  )}

                  {/* Packaging Format */}
                  {packagingFormat && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.packagingFormatLabel}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        <Package className="h-3 w-3 mr-1" />
                        {packagingFormat.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}

                  {report.target_market && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {t.report.market}
                      </p>
                      <p className="text-sm font-medium text-slate-700">
                        {report.target_market}
                      </p>
                    </div>
                  )}

                  {/* Detected Languages */}
                  {detectedLanguages && detectedLanguages.length > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                        {t.report.detectedLanguagesTitle}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedLanguages.map((lang, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium flex items-center gap-1">
                            <Languages className="h-2.5 w-2.5" />
                            {lang.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Nutrition/Supplement Facts Card */}
            {nutritionFacts.length > 0 && (() => {
              const productCategory = (report as any).product_category || (report as any).product_type || ''
              const isSupplementCategory = ['dietary_supplement', 'supplement', 'vitamin', 'mineral', 'probiotic', 'herbal'].some(
                cat => productCategory.toLowerCase().includes(cat)
              )
              const visionDetectedSupplement = (report as any).detected_panel_type === 'supplementFacts'
              const isSupplement = isSupplementCategory || visionDetectedSupplement
              
              const panelTitle = isSupplement ? 'Supplement Facts' : 'Nutrition Facts'
              const sectionTitle = isSupplement 
                ? (t.report.supplementFactsTitle || t.report.nutritionFactsTitle)
                : t.report.nutritionFactsTitle
              
              return (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Utensils className="h-4 w-4 text-slate-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {sectionTitle}
                    </h2>
                    <Badge variant="secondary" className="text-[9px] ml-auto">
                      {nutritionFacts.length}
                    </Badge>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>{panelTitle}</span>
                      {(report as any).is_multi_column_nutrition && (
                        <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-100 border-amber-400/50">
                          {t.report.multiColumnLabel || 'MULTI-COLUMN'}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Multi-column detection info */}
                    {(report as any).is_multi_column_nutrition && !((report as any).nutrition_facts_columns?.length > 0) && (() => {
                      const columnFormat = (report as any).nutrition_column_format_type
                      const isDualColumn = columnFormat === 'AS_PACKAGED_PREPARED' || columnFormat === 'DUAL_SERVING_CONTAINER'
                      
                      if (isDualColumn) {
                        return (
                          <div className="p-3 bg-blue-50 border-b border-blue-200">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-blue-800">
                                  {t.report.dualColumnDetected || 'Dual-Column Format Detected'}
                                </p>
                                <p className="text-[10px] text-blue-700 mt-0.5">
                                  {t.report.dualColumnDesc || 'The Nutrition Facts panel shows two columns with "as packaged" and "as prepared" values.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      return (
                        <div className="p-3 bg-amber-50 border-b border-amber-200">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-amber-800">
                                {t.report.multiColumnDetectedNoData || 'Multi-column Nutrition Facts Detected'}
                              </p>
                              <p className="text-[10px] text-amber-700 mt-0.5">
                                {t.report.multiColumnDetectedNoDataDesc || 'This label appears to have multiple Nutrition Facts panels.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    
                    {/* Multi-column display for variety packs */}
                    {(report as any).is_multi_column_nutrition && (report as any).nutrition_facts_columns?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                              <th className="text-left px-2 py-1.5 font-semibold text-slate-700">Nutrient</th>
                              {((report as any).nutrition_facts_columns as any[]).map((col: any, colIdx: number) => (
                                <th key={colIdx} className="text-center px-2 py-1.5 font-semibold text-slate-700 border-l border-slate-200">
                                  <div className="text-[10px] leading-tight">{col.columnName}</div>
                                  {col.servingSize && (
                                    <div className="text-[9px] text-slate-500 font-normal">{col.servingSize}</div>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              const columns = (report as any).nutrition_facts_columns as any[]
                              const allNutrients = new Set<string>()
                              columns.forEach((col: any) => {
                                col.nutritionFacts?.forEach((f: any) => allNutrients.add(f.name || f.nutrient))
                              })
                              return Array.from(allNutrients).slice(0, 15).map((nutrientName, rowIdx) => (
                                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                  <td className="px-2 py-1 font-medium text-slate-700">{nutrientName}</td>
                                  {columns.map((col: any, colIdx: number) => {
                                    const fact = col.nutritionFacts?.find((f: any) => 
                                      (f.name || f.nutrient) === nutrientName
                                    )
                                    const isMissing = !fact || fact.value === null || fact.value === undefined
                                    return (
                                      <td 
                                        key={colIdx} 
                                        className={`text-left px-2 py-1 border-l border-slate-200 ${
                                          isMissing ? 'bg-amber-50 text-amber-600' : 'text-slate-900'
                                        }`}
                                      >
                                        {isMissing ? (
                                          <span className="text-[9px]">—</span>
                                        ) : (
                                          (() => {
                                            const { displayValue, displayDV } = parseNutritionValue(fact)
                                            return (
                                              <span className="whitespace-nowrap">
                                                <span className="font-medium">{displayValue}</span>
                                                {displayDV && (
                                                  <span className="text-slate-400 text-[10px] ml-1">({displayDV}%)</span>
                                                )}
                                              </span>
                                            )
                                          })()
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))
                            })()}
                          </tbody>
                        </table>
                        
                        {/* Multi-column validation warnings */}
                        {(report as any).multi_column_validation?.warnings?.length > 0 && (
                          <div className="p-2 bg-amber-50 border-t border-amber-200">
                            <p className="text-[10px] text-amber-700 font-medium mb-1">
                              {t.report.multiColumnWarnings || 'Column Inconsistencies Detected:'}
                            </p>
                            {((report as any).multi_column_validation.warnings as string[]).slice(0, 2).map((warning: string, idx: number) => (
                              <p key={idx} className="text-[9px] text-amber-600 leading-tight">• {warning}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Single-column display */
                      <div className="divide-y divide-slate-100">
                        {nutritionFacts.map((item: any, idx: number) => {
                          const { displayValue, displayDV } = parseNutritionValue(item)
                          return (
                            <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                              <span className="text-slate-700 font-medium">{item.nutrient || item.name}</span>
                              <span className="text-slate-900 font-semibold">
                                {displayValue}
                                {displayDV != null && (
                                  <span className="text-slate-400 font-normal ml-1">({displayDV}%)</span>
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              )
            })()}

            {/* Expert Tips Card */}
            {expertTips.length > 0 && (
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                        {t.report.expertTips}
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowExpertTips(!showExpertTips)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {showExpertTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                  {showExpertTips && (
                    <div className="space-y-2">
                      {expertTips.map((tip: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-indigo-900">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-600" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Enforcement Insights Card */}
            {enforcementInsights.length > 0 && (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t.report.enforcementInsights}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {enforcementInsights.map((insight: string, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <MarkdownContent content={insight} />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: Violations & Assessment */}
          <div className="space-y-6">
            {/* Risk Score & OCR Confidence Header */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-6">
                  {/* Risk Score with Label */}
                  <div className="flex items-center gap-4">
                    <RiskScoreGauge score={riskScore} size="lg" />
                    <div className="flex flex-col gap-1">
                      <span className={`text-base font-bold ${
                        riskScore >= 7 ? 'text-red-600' : 
                        riskScore >= 4 ? 'text-amber-600' : 
                        riskScore >= 2 ? 'text-amber-500' : 'text-green-600'
                      }`}>
                        {t.report.riskLevel}: <span className={
                          riskScore >= 7 ? 'text-red-600' : 
                          riskScore >= 4 ? 'text-amber-600' : 
                          riskScore >= 2 ? 'text-amber-500' : 'text-green-600'
                        }>{riskLabel}</span>
                      </span>
                      <p className="text-sm text-slate-600">
                        {riskScore >= 8.5 
                          ? t.report.riskDesc_8_5_10
                          : riskScore >= 7
                            ? t.report.riskDesc_7_0_8_4
                            : riskScore >= 5.5
                              ? t.report.riskDesc_5_5_6_9
                              : riskScore >= 4
                                ? t.report.riskDesc_4_0_5_4
                                : riskScore >= 2.5
                                  ? t.report.riskDesc_2_5_3_9
                                  : t.report.riskDesc_0_2_4
                        }
                      </p>
                      
                      {/* Projected risk score after fix */}
                      {projectedRiskScore !== undefined && projectedRiskScore < riskScore && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 w-fit mt-1">
                          <TrendingDown className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-700">
                            {t.report.projectedRiskAfterFix}: <strong>{projectedRiskScore.toFixed(1)}</strong>
                          </span>
                        </div>
                      )}
                      
                      {/* Issue counts */}
                      <div className="flex items-center gap-4 mt-1">
                        {criticalCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            <span className="text-xs text-slate-600">
                              {criticalCount} {t.report.critical}
                            </span>
                          </div>
                        )}
                        {warningCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                            <span className="text-xs text-slate-600">
                              {warningCount} {t.report.warning}
                            </span>
                          </div>
                        )}
                        {infoCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                            <span className="text-xs text-slate-600">
                              {infoCount} {t.report.info || 'Info'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* OCR Confidence */}
                  {report.ocr_confidence !== undefined && (
                    <OcrConfidenceBar confidence={report.ocr_confidence} />
                  )}
                </div>
              </div>
            </Card>

            {/* Commercial Summary */}
            {commercialSummary && (
              <Card className="bg-white border-slate-200 overflow-hidden">
                <div className="p-5">
                  <MarkdownContent content={commercialSummary} />
                </div>
              </Card>
            )}

            {/* OVERALL ASSESSMENT FROM VEXIM AI */}
            <Card className={`overflow-hidden border-2 ${
              riskScore >= 7 
                ? 'border-red-200 bg-red-50' 
                : riskScore >= 2 
                  ? 'border-amber-200 bg-amber-50' 
                  : 'border-green-200 bg-green-50'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`rounded-full p-2.5 ${
                    riskScore >= 7 
                      ? 'bg-red-100' 
                      : riskScore >= 2 
                        ? 'bg-amber-100' 
                        : 'bg-green-100'
                  }`}>
                    {riskScore >= 7 ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : riskScore >= 2 ? (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                    {t.report.overallAssessment}
                  </h2>
                </div>

                {/* Compliance Summary */}
                <div className="space-y-4">
                  {/* Regulations Checked */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {t.report.regulationsChecked}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {t.report.cfr101}
                      </span>
                      
                      {report.product_category === 'cosmetic' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                          {t.report.cfr701}
                        </span>
                      )}
                      
                      {(report.product_type === 'dietary_supplement' || report.product_category?.includes('supplement')) && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                          {'DSHEA 1994'}
                        </span>
                      )}
                      
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {'FD&C Act Section 403'}
                      </span>
                      {report.product_category === 'cosmetic' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                          {t.report.cfr700}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Historical Data Check */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      {t.report.historicalDataCheck}
                    </p>
                    <p className="text-[11px] text-slate-400 mb-2 italic">
                      {t.report.similarProductsNote || 'Similar products flagged by FDA in this category'}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className={`rounded-lg p-3 ${
                        wlViolations.length > 0 ? 'bg-orange-100 border border-orange-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Mail className={`h-4 w-4 ${wlViolations.length > 0 ? 'text-orange-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Warning Letters</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${wlViolations.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {wlViolations.length > 0 ? wlViolations.length : t.report.none}
                        </p>
                        {wlViolations.length > 0 && (
                          <p className="text-[10px] text-orange-500 mt-0.5">
                            {t.report.similarProductsFlagged || 'similar products flagged'}
                          </p>
                        )}
                      </div>
                      
                      <div className={`rounded-lg p-3 ${
                        recallViolations.length > 0 ? 'bg-purple-100 border border-purple-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <RotateCcw className={`h-4 w-4 ${recallViolations.length > 0 ? 'text-purple-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Recalls</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${recallViolations.length > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                          {recallViolations.length > 0 ? recallViolations.length : t.report.none}
                        </p>
                        {recallViolations.length > 0 && (
                          <p className="text-[10px] text-purple-500 mt-0.5">
                            {t.report.similarProductsFlagged || 'similar products recalled'}
                          </p>
                        )}
                      </div>
                      
                      <div className={`rounded-lg p-3 ${
                        importAlertViolations.length > 0 ? 'bg-cyan-100 border border-cyan-200' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Ship className={`h-4 w-4 ${importAlertViolations.length > 0 ? 'text-cyan-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium text-slate-700">Import Alerts</span>
                        </div>
                        <p className={`text-lg font-bold mt-1 ${importAlertViolations.length > 0 ? 'text-cyan-600' : 'text-green-600'}`}>
                          {importAlertViolations.length > 0 ? importAlertViolations.length : t.report.none}
                        </p>
                        {importAlertViolations.length > 0 && (
                          <p className="text-[10px] text-cyan-500 mt-0.5">
                            {t.report.similarProductsFlagged || 'similar products detained'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div className={`rounded-lg p-4 ${
                    riskScore >= 7 
                      ? 'bg-red-100 border border-red-200' 
                      : riskScore >= 2 
                        ? 'bg-amber-100 border border-amber-200' 
                        : 'bg-green-100 border border-green-200'
                  }`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                      {t.report.conclusion}
                    </p>
                    {riskScore >= 7 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-red-800">
                          {t.report.conclusionHigh}
                        </p>
                        <p className="text-sm text-red-700 leading-relaxed">
                          {t.report.conclusionHighDesc(criticalCount, warningCount, wlViolations.length, recallViolations.length, importAlertViolations.length)}
                        </p>
                      </div>
                    ) : riskScore >= 2 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-amber-800">
                          {t.report.conclusionMedium}
                        </p>
                        <p className="text-sm text-amber-700 leading-relaxed">
                          {t.report.conclusionMediumDesc(warningCount, wlViolations.length === 0 && recallViolations.length === 0 && importAlertViolations.length === 0)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-green-800">
                          {t.report.conclusionLow}
                        </p>
                        <p className="text-sm text-green-700 leading-relaxed">
                          {t.report.conclusionLowDesc(wlViolations.length === 0 && recallViolations.length === 0 && importAlertViolations.length === 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* CONSEQUENCES BANNER (for high risk) */}
            {riskScore >= 5 && criticalCount > 0 && (
              <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide">
                      {t.report.consequencesTitle}
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/60 border border-red-100">
                      <p className="text-xs font-bold text-red-700">{t.report.consequenceDetention}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">$5,000-15,000</p>
                      <p className="text-[10px] text-slate-500">{t.report.consequenceDetentionDesc}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/60 border border-red-100">
                      <p className="text-xs font-bold text-red-700">{t.report.consequenceRelabeling}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">$3,000-8,000</p>
                      <p className="text-[10px] text-slate-500">{t.report.consequenceRelabelingDesc}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/60 border border-red-100">
                      <p className="text-xs font-bold text-red-700">{t.report.consequenceRecall}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">$50,000+</p>
                      <p className="text-[10px] text-slate-500">{t.report.consequenceRecallDesc}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <a 
                      href="#expert-request-panel" 
                      onClick={(e) => { 
                        e.preventDefault()
                        document.getElementById('expert-request-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) 
                      }} 
                      className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      {t.report.getExpertHelp}
                      <MessageSquare className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {/* CFR VIOLATIONS SECTION */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {t.report.cfrComplianceDetail}
                </h2>
              </div>

              {cfrViolations.length === 0 && contrastViolations.length === 0 ? (
                <Card className="bg-white border-slate-200 p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {t.report.noCfrViolations}
                  </h3>
                  <p className="text-slate-500">
                    {t.report.labelCompliant}
                  </p>
                </Card>
              ) : (
                <div className="space-y-5">
                  {/* CFR violations */}
                  {cfrViolations.map((violation, index) => (
                    <ViolationCard
                      key={`cfr-${index}`}
                      violation={violation}
                      index={index}
                      t={t}
                      showExpertCta={riskScore >= 4}
                    />
                  ))}

                  {/* Contrast violations merged into main list */}
                  {contrastViolations.map((cv, index) => (
                    <ContrastViolationCard
                      key={`contrast-${index}`}
                      violation={cv}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* GEOMETRY VIOLATIONS SECTION */}
            {geometryViolations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Ruler className="h-4 w-4 text-indigo-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {t.report.geometrySection}
                  </h2>
                </div>
                <div className="space-y-5">
                  {geometryViolations.map((gv, index) => (
                    <GeometryViolationCard key={`geo-${index}`} violation={gv} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* COMBINED MARKET INTELLIGENCE SECTION */}
            {(recallViolations.length > 0 || wlViolations.length > 0 || importAlertViolations.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      {t.report.recallsReferenceSection} ({recallViolations.length + wlViolations.length + importAlertViolations.length})
                    </h2>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                    {t.report.marketIntelligence}
                  </span>
                </div>
                <CombinedMarketIntelligenceCard
                  recalls={recallViolations}
                  warningLetters={wlViolations}
                  importAlerts={importAlertViolations}
                  t={t}
                />
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
