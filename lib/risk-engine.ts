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

export interface RiskCalculationInput {
  violations: Violation[]
  warningLetterMatches: WarningLetterSearchResult[]
  recallMatches?: RecallSearchResult[]
  extractionConfidence: number
  legalReasoningConfidence: number
}

export interface RiskCalculationResult {
  overallRiskScore: number // 0-10
  projectedRiskScore: number // 0-10 after fixing critical issues
  riskAssessment: 'Low' | 'Low-Medium' | 'Medium' | 'Medium-High' | 'High' | 'Critical'
  violationsWithRisk: Violation[]
  enforcementInsights: string[]
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
  const severityWeights = {
    critical: 8.0,
    warning: 4.0,
    info: 1.5,
  }
  riskScore = severityWeights[violation.severity]

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

/**
 * Calculate overall risk score for entire label
 */
export function calculateOverallRisk(input: RiskCalculationInput): RiskCalculationResult {
  const { violations, warningLetterMatches, recallMatches = [], extractionConfidence, legalReasoningConfidence } = input

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

    // Check for recall patterns that matched violations
    const recallLinkedViolations = violationsWithRisk.filter(v => 
      v.enforcement_context?.includes('Recall')
    )
    if (recallLinkedViolations.length > 0) {
      enforcementInsights.push(
        `${recallLinkedViolations.length} violation${recallLinkedViolations.length > 1 ? 's match' : ' matches'} patterns from FDA product recalls, indicating elevated enforcement risk.`
      )
    }
  }

  return {
    overallRiskScore: Number(overallRiskScore.toFixed(2)),
    projectedRiskScore: Number(projectedRiskScore.toFixed(2)),
    riskAssessment,
    violationsWithRisk,
    enforcementInsights,
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
