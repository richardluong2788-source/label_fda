/**
 * FDA Compliance Risk Engine
 * 
 * Calculates enforcement likelihood and risk scores based on:
 * - Violation severity
 * - Historical FDA enforcement patterns
 * - Warning letter frequency
 * - Citation quality
 * 
 * Transforms compliance checking into FDA Simulation System
 */

import type { Violation, Citation, WarningLetterSearchResult, RecallSearchResult } from './types'

// ── Import Alert shape from embedding-utils (inline to avoid circular import) ──
export interface ImportAlertContext {
  alert_number: string
  action_type: string
  reason_for_alert: string
  industry_type: string
  match_method: 'entity' | 'product' | 'category'
  red_list_entities?: Array<{ name: string; is_active: boolean }>
}

export interface RiskCalculationInput {
  violations: Violation[]
  warningLetterMatches: WarningLetterSearchResult[]
  recallMatches?: RecallSearchResult[]
  importAlertMatches?: ImportAlertContext[]
  extractionConfidence: number
  legalReasoningConfidence: number
}

export interface RiskCalculationResult {
  overallRiskScore: number     // 0-10  blended compliance + enforcement risk
  projectedRiskScore: number   // 0-10  after fixing critical violations
  riskAssessment: 'Low' | 'Low-Medium' | 'Medium' | 'Medium-High' | 'High' | 'Critical'
  violationsWithRisk: Violation[]
  enforcementInsights: string[]

  // ── Enforcement Risk Decomposition ──────────────────────────────────────
  // Separated from overallRiskScore so the UI can show a dedicated
  // "Enforcement Risk" panel that accounts for:
  //   (1) Warning Letter weight  — how often similar issues were cited
  //   (2) Recall class frequency — Class I > Class II > Class III weight
  //   (3) Import Alert heat index — entity match (DWPE) >> product match >> category match
  enforcementRiskScore: number  // 0-10  pure enforcement signal, no violation baseline
  warningLetterWeight: number   // 0-10  contribution from warning letter history
  recallHeatIndex: number       // 0-10  contribution from recall frequency × class severity
  importAlertHeatIndex: number  // 0-10  contribution from import alert signals
}

/**
 * Calculate risk score for individual violation
 */
export function calculateViolationRisk(
  violation: Violation,
  warningLetterMatches: WarningLetterSearchResult[],
  recallMatches: RecallSearchResult[] = []
): {
  riskScore: number
  enforcementFrequency: number
  enforcementContext: string
} {
  let riskScore = 0

  // Base risk by severity
  // For warnings, distinguish between confirmed violations (4.0) and
  // verification-needed / order-check advisories (3.0).
  // Verification warnings are identifiable by AI confidence < 0.7 or
  // description keywords that indicate uncertainty ("verify", "check", "order").
  const severityWeights = {
    critical: 8.0,
    warning: 4.0,
    info: 1.5,
  }
  riskScore = severityWeights[violation.severity]

  // Soften warning score when the violation is a verification advisory
  // (not a confirmed defect) — e.g., ingredient order checks where AI
  // cannot confirm the actual formulation proportions.
  if (violation.severity === 'warning') {
    const desc = violation.description.toLowerCase()
    const isVerificationWarning =
      desc.includes('thứ tự') || desc.includes('order') ||
      desc.includes('verify') || desc.includes('kiểm tra') ||
      desc.includes('xác nhận') || desc.includes('check')
    const aiConfidence = violation.confidence_score ?? 1.0
    if (isVerificationWarning || aiConfidence < 0.7) {
      riskScore = 3.0  // Low-Medium instead of Medium
    }
  }

  // Boost risk if found in warning letters (enforcement precedent)
  let enforcementFrequency = 0
  const matchingWarnings: string[] = []

  for (const wl of warningLetterMatches) {
    const violationText = violation.description.toLowerCase()
    const warningContent = wl.content.toLowerCase()
    const problematicClaim = wl.metadata?.problematic_claim?.toLowerCase() || ''

    // Check if violation matches warning letter pattern
    const keywords = violation.description
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)

    let matchScore = 0
    for (const keyword of keywords) {
      if (warningContent.includes(keyword) || problematicClaim.includes(keyword)) {
        matchScore += 0.1
      }
    }

    // Check problematic_keywords overlap
    const probKeywords = wl.metadata?.problematic_keywords || []
    for (const pk of probKeywords) {
      if (violationText.includes(pk.toLowerCase())) {
        matchScore += 0.3
        enforcementFrequency++
        matchingWarnings.push(
          `${wl.metadata?.company_name || 'Company'} (${wl.metadata?.issue_date?.substring(0, 4) || 'Recent'})`
        )
        break
      }
    }

    // Boost risk based on match strength
    if (matchScore >= 0.3) {
      riskScore += Math.min(2.5, matchScore * 3)
    }
  }

  // Boost risk if found in FDA Recalls (stronger enforcement signal)
  const matchingRecalls: string[] = []
  for (const recall of recallMatches) {
    const violationText = violation.description.toLowerCase()
    const recallContent = recall.content.toLowerCase()

    const keywords = violation.description
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)

    let matchScore = 0
    for (const keyword of keywords) {
      if (recallContent.includes(keyword)) {
        matchScore += 0.1
      }
    }

    // Check problematic_keywords overlap
    const probKeywords = recall.metadata?.problematic_keywords || []
    for (const pk of probKeywords) {
      if (violationText.includes(pk.toLowerCase())) {
        matchScore += 0.35 // Recalls are stronger enforcement signal than warning letters
        enforcementFrequency++
        matchingRecalls.push(
          `Recall ${recall.metadata?.recall_number || 'N/A'} - ${recall.metadata?.recalling_firm || 'Firm'} (Class ${recall.metadata?.recall_classification || 'N/A'})`
        )
        break
      }
    }

    // Recalls carry higher risk weight: Class I = very high, Class II = high
    if (matchScore >= 0.3) {
      const classMultiplier = recall.metadata?.recall_classification === 'Class I' ? 1.5 : 
                              recall.metadata?.recall_classification === 'Class II' ? 1.2 : 1.0
      riskScore += Math.min(3.0, matchScore * 3 * classMultiplier)
    }
  }

  // Cap at 10
  riskScore = Math.min(10, riskScore)

  // Build enforcement context
  let enforcementContext = ''
  if (enforcementFrequency > 0) {
    const parts: string[] = []
    
    if (matchingWarnings.length > 0) {
      parts.push(`cited in ${matchingWarnings.length} FDA Warning Letter${matchingWarnings.length > 1 ? 's' : ''} (${matchingWarnings.slice(0, 2).join(', ')})`)
    }
    if (matchingRecalls.length > 0) {
      parts.push(`linked to ${matchingRecalls.length} FDA Recall${matchingRecalls.length > 1 ? 's' : ''} (${matchingRecalls.slice(0, 2).join(', ')})`)
    }
    
    enforcementContext = `This issue has been ${parts.join(' and ')} in recent years. `
    enforcementContext += `Products with similar violations were required to relabel or were removed from market.`
  } else {
    enforcementContext = 'No recent FDA enforcement actions found for this specific issue. However, compliance is still required by regulation.'
  }

  return {
    riskScore,
    enforcementFrequency,
    enforcementContext,
  }
}

/**
 * Classify citations into tiers based on relevance score
 */
export function classifyCitationTiers(citations: Citation[]): Citation[] {
  return citations.map(citation => {
    let tier: 'primary' | 'supporting' | 'related'

    if (citation.relevance_score >= 0.70) {
      tier = 'primary'
    } else if (citation.relevance_score >= 0.50) {
      tier = 'supporting'
    } else {
      tier = 'related'
    }

    return {
      ...citation,
      relevance_tier: tier,
    }
  })
}

// ── ENFORCEMENT RISK CALCULATORS ──────────────────────────────────────────────
//
// These three functions compute independent enforcement signals that are then
// blended into an overall enforcementRiskScore (0-10). They are kept separate
// so the UI can display each dimension individually.

/**
 * (1) Warning Letter Weight — 0-10
 * Measures how frequently similar violations appear in FDA Warning Letters
 * and how severe those letters were (Critical > Major > Minor).
 *
 * Formula:
 *   baseWeight = count of WL matches
 *   severityBoost = sum of severity multipliers (Critical=3, Major=2, Minor=1)
 *   warningLetterWeight = min(10, baseWeight * 1.5 + severityBoost)
 */
function calcWarningLetterWeight(
  matches: WarningLetterSearchResult[],
  violations: Violation[]
): number {
  if (matches.length === 0) return 0
  const violationTexts = violations.map(v => v.description.toLowerCase())
  let weight = 0

  for (const wl of matches) {
    const meta = wl.metadata || {}
    const probKeywords: string[] = meta.problematic_keywords || []
    const severityRaw: string = meta.severity || 'Minor'

    // Severity multiplier: Critical=3, Major=2, otherwise 1
    const severityMultiplier = severityRaw === 'Critical' ? 3 : severityRaw === 'Major' ? 2 : 1

    // Only count the WL if at least one of its keywords overlaps with a violation
    const hasOverlap = probKeywords.some(kw =>
      violationTexts.some(vt => vt.includes(kw.toLowerCase()))
    )

    if (hasOverlap) {
      weight += 1.5 * severityMultiplier
    } else {
      // Semantic match from RAG — lighter weight
      weight += 0.5
    }
  }

  return Math.min(10, weight)
}

/**
 * (2) Recall Heat Index — 0-10
 * Weights recall frequency by recall class severity.
 * Class I (life-threatening) = weight 5 per recall
 * Class II (may cause harm)  = weight 3 per recall
 * Class III (no harm)        = weight 1 per recall
 *
 * Multiple recalls compound: total = min(10, sum of class weights)
 */
function calcRecallHeatIndex(recallMatches: RecallSearchResult[]): number {
  if (recallMatches.length === 0) return 0
  let heat = 0

  for (const r of recallMatches) {
    const cls = r.metadata?.recall_classification || ''
    if (cls === 'Class I')        heat += 5
    else if (cls === 'Class II')  heat += 3
    else                          heat += 1
  }

  return Math.min(10, heat)
}

/**
 * (3) Import Alert Heat Index — 0-10
 * Strongest enforcement signal — potential Detention Without Physical Examination (DWPE).
 *
 * Scoring:
 *   Entity match (company on Red List) = 8.5 base (near-DWPE risk)
 *   Product match (product type targeted) = 5.0 base
 *   Category match (industry targeted)   = 2.5 base
 *
 *   Active Red List entities add +0.5 each (max +2.0)
 *   Multiple alerts compound but are capped at 10.
 */
function calcImportAlertHeatIndex(importAlerts: ImportAlertContext[]): number {
  if (importAlerts.length === 0) return 0
  let heat = 0

  for (const ia of importAlerts) {
    const base =
      ia.match_method === 'entity'   ? 8.5 :
      ia.match_method === 'product'  ? 5.0 : 2.5

    const activeEntities = (ia.red_list_entities || []).filter(e => e.is_active)
    const entityBoost = Math.min(2.0, activeEntities.length * 0.5)

    heat += base + entityBoost
  }

  return Math.min(10, heat)
}

/**
 * Calculate overall risk score for entire label
 */
export function calculateOverallRisk(input: RiskCalculationInput): RiskCalculationResult {
  const {
    violations,
    warningLetterMatches,
    recallMatches = [],
    importAlertMatches = [],
    extractionConfidence,
    legalReasoningConfidence,
  } = input

  // Calculate risk for each violation
  const violationsWithRisk = violations.map(violation => {
    const { riskScore, enforcementFrequency, enforcementContext } = calculateViolationRisk(
      violation,
      warningLetterMatches,
      recallMatches
    )

    // Classify citation tiers
    const tieredCitations = classifyCitationTiers(violation.citations)

    return {
      ...violation,
      citations: tieredCitations,
      risk_score: riskScore,
      enforcement_frequency: enforcementFrequency,
      enforcement_context: enforcementContext,
    }
  })

  // Calculate weighted overall risk
  let overallRiskScore = 0
  let criticalCount = 0
  let warningCount = 0

  for (const v of violationsWithRisk) {
    overallRiskScore += v.risk_score || 0
    if (v.severity === 'critical') criticalCount++
    if (v.severity === 'warning') warningCount++
  }

  // Normalize to 0-10 scale
  overallRiskScore = violationsWithRisk.length > 0 ? overallRiskScore / violationsWithRisk.length : 0

  // Boost for multiple critical issues
  if (criticalCount >= 3) {
    overallRiskScore = Math.min(10, overallRiskScore + 1.5)
  }

  // Adjust for confidence levels (low confidence = higher risk)
  const avgConfidence = (extractionConfidence + legalReasoningConfidence) / 2
  if (avgConfidence < 0.7) {
    overallRiskScore = Math.min(10, overallRiskScore + 0.5)
  }

  // Calculate projected risk if critical issues are fixed
  const criticalRisk = violationsWithRisk
    .filter(v => v.severity === 'critical')
    .reduce((sum, v) => sum + (v.risk_score || 0), 0)

  const projectedRiskScore = Math.max(
    0,
    overallRiskScore - (criticalRisk / (violationsWithRisk.length || 1)) * 0.7
  )

  // Determine risk assessment category
  let riskAssessment: RiskCalculationResult['riskAssessment']
  if (overallRiskScore >= 8.5) riskAssessment = 'Critical'
  else if (overallRiskScore >= 7.0) riskAssessment = 'High'
  else if (overallRiskScore >= 5.5) riskAssessment = 'Medium-High'
  else if (overallRiskScore >= 4.0) riskAssessment = 'Medium'
  else if (overallRiskScore >= 2.5) riskAssessment = 'Low-Medium'
  else riskAssessment = 'Low'

  // Generate enforcement insights
  const enforcementInsights: string[] = []

  const totalEnforcements = violationsWithRisk.reduce(
    (sum, v) => sum + (v.enforcement_frequency || 0),
    0
  )

  if (totalEnforcements > 0) {
    enforcementInsights.push(
      `${totalEnforcements} similar issue${totalEnforcements > 1 ? 's have' : ' has'} been flagged in FDA Warning Letters in recent years.`
    )
  }

  if (criticalCount > 0) {
    enforcementInsights.push(
      `${criticalCount} critical violation${criticalCount > 1 ? 's' : ''} detected that could trigger regulatory action.`
    )
  }

  if (projectedRiskScore < overallRiskScore * 0.5) {
    enforcementInsights.push(
      `Fixing all critical issues could reduce your enforcement risk by approximately ${Math.round((1 - projectedRiskScore / overallRiskScore) * 100)}%.`
    )
  }

  const highFrequencyIssues = violationsWithRisk.filter(v => (v.enforcement_frequency || 0) >= 2)
  if (highFrequencyIssues.length > 0) {
    enforcementInsights.push(
      `${highFrequencyIssues.length} issue${highFrequencyIssues.length > 1 ? 's are' : ' is'} frequently enforced by FDA and should be prioritized.`
    )
  }

  // Recall-specific insights
  if (recallMatches.length > 0) {
    const classIRecalls = recallMatches.filter(r => r.metadata?.recall_classification === 'Class I')
    if (classIRecalls.length > 0) {
      enforcementInsights.push(
        `${classIRecalls.length} Class I recall pattern${classIRecalls.length > 1 ? 's' : ''} detected. Class I recalls involve products that could cause serious health consequences or death.`
      )
    }

    const recallLinkedViolations = violationsWithRisk.filter(v =>
      v.enforcement_context?.includes('Recall')
    )
    if (recallLinkedViolations.length > 0) {
      enforcementInsights.push(
        `${recallLinkedViolations.length} violation${recallLinkedViolations.length > 1 ? 's match' : ' matches'} patterns from FDA product recalls, indicating elevated enforcement risk.`
      )
    }
  }

  // ── Enforcement Risk Decomposition ────────────────────────────────────────
  // Compute three independent enforcement signals and blend into one score.
  //
  // Weights (must sum to 1.0):
  //   Warning Letter Weight  → 0.35  (high frequency of WL citations = strong signal)
  //   Recall Heat Index      → 0.35  (recall class severity = very strong signal)
  //   Import Alert Heat Index→ 0.30  (DWPE / border detention = operational risk)
  //
  // The blended enforcementRiskScore is also applied as a soft modifier (+20%)
  // on the violation-based overallRiskScore when enforcement signal is high.
  const warningLetterWeight  = calcWarningLetterWeight(warningLetterMatches, violations)
  const recallHeatIndex      = calcRecallHeatIndex(recallMatches)
  const importAlertHeatIndex = calcImportAlertHeatIndex(importAlertMatches)

  const enforcementRiskScore = Number(
    Math.min(10,
      warningLetterWeight  * 0.35 +
      recallHeatIndex      * 0.35 +
      importAlertHeatIndex * 0.30
    ).toFixed(2)
  )

  // Soft boost: if enforcement risk is high, bleed it into overall risk (max +1.5)
  if (enforcementRiskScore >= 5.0) {
    overallRiskScore = Math.min(10, overallRiskScore + Math.min(1.5, (enforcementRiskScore - 5.0) * 0.3))
  }

  // Import alert specific insights
  if (importAlertMatches.length > 0) {
    const entityMatches = importAlertMatches.filter(ia => ia.match_method === 'entity')
    const activeOnRedList = importAlertMatches.flatMap(ia =>
      (ia.red_list_entities || []).filter(e => e.is_active)
    )

    if (entityMatches.length > 0) {
      enforcementInsights.push(
        `DWPE Risk: ${entityMatches.length} FDA Import Alert${entityMatches.length > 1 ? 's' : ''} directly match this company or manufacturer. Products may be detained at US ports without physical examination.`
      )
    }

    if (activeOnRedList.length > 0) {
      enforcementInsights.push(
        `${activeOnRedList.length} entit${activeOnRedList.length > 1 ? 'ies are' : 'y is'} currently on the FDA Red List. To be removed, the firm must submit corrective action documentation and request re-inspection.`
      )
    }

    if (importAlertHeatIndex >= 5.0 && entityMatches.length === 0) {
      enforcementInsights.push(
        `Product category or type is under active FDA Import Alert monitoring. Ensure full compliance to avoid port detention risk even without entity-level match.`
      )
    }
  }

  return {
    overallRiskScore: Number(overallRiskScore.toFixed(2)),
    projectedRiskScore: Number(projectedRiskScore.toFixed(2)),
    riskAssessment,
    violationsWithRisk,
    enforcementInsights,
    enforcementRiskScore,
    warningLetterWeight:  Number(warningLetterWeight.toFixed(2)),
    recallHeatIndex:      Number(recallHeatIndex.toFixed(2)),
    importAlertHeatIndex: Number(importAlertHeatIndex.toFixed(2)),
  }
}

/**
 * Generate risk summary for display in reports
 */
export function generateRiskSummary(result: RiskCalculationResult): string {
  const { overallRiskScore, projectedRiskScore, riskAssessment, enforcementInsights } = result

  let summary = `**Current Risk Level: ${riskAssessment} (${overallRiskScore.toFixed(1)}/10)**\n\n`

  if (projectedRiskScore < overallRiskScore) {
    summary += `If all critical issues are fixed, your estimated risk would drop to: **${projectedRiskScore.toFixed(1)}/10**\n\n`
  }

  if (enforcementInsights.length > 0) {
    summary += `**Enforcement Intelligence:**\n`
    for (const insight of enforcementInsights) {
      summary += `- ${insight}\n`
    }
  }

  return summary
}
