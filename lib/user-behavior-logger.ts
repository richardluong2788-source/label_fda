/**
 * User Behavior Logger
 * 
 * Tracks user actions on violation findings to build enforcement intelligence dataset:
 * - Which violations users fix vs ignore
 * - Which industries have which issues
 * - Real-world compliance patterns from Vietnamese businesses
 * 
 * This data becomes a gold mine for:
 * - Improving AI predictions
 * - Understanding enforcement priorities
 * - Building risk models based on actual user behavior
 */

import { createClient } from '@/lib/supabase/server'

export interface ViolationFeedback {
  reportId: string
  violationId: string
  violationCategory: string
  violationSeverity: 'critical' | 'warning' | 'info'
  regulationReference: string
  userAction: 'fixed' | 'ignored' | 'disputed' | 'needs_help'
  timeToAction?: number // milliseconds from report creation to action
  userNotes?: string
  productCategory?: string
  industry?: string
}

export interface ViolationPattern {
  violationCategory: string
  regulationReference: string
  totalOccurrences: number
  fixedCount: number
  ignoredCount: number
  disputedCount: number
  avgTimeToFix?: number
  topIndustries: string[]
}

/**
 * Log user action on a violation
 */
export async function logViolationAction(feedback: ViolationFeedback): Promise<void> {
  try {
    const supabase = await createClient()

    // Insert into violation_user_feedback table
    const { error } = await supabase.from('violation_user_feedback').insert({
      report_id: feedback.reportId,
      violation_id: feedback.violationId,
      violation_category: feedback.violationCategory,
      violation_severity: feedback.violationSeverity,
      regulation_reference: feedback.regulationReference,
      user_action: feedback.userAction,
      time_to_action_ms: feedback.timeToAction,
      user_notes: feedback.userNotes,
      product_category: feedback.productCategory,
      industry: feedback.industry,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[v0] Error logging violation feedback:', error)
    } else {
      console.log('[v0] Violation feedback logged:', feedback.violationCategory, '->', feedback.userAction)
    }
  } catch (err) {
    console.error('[v0] Unexpected error in logViolationAction:', err)
  }
}

/**
 * Batch log multiple violation actions (for bulk fixes)
 */
export async function logViolationActionsBatch(feedbacks: ViolationFeedback[]): Promise<void> {
  try {
    const supabase = await createClient()

    const records = feedbacks.map(f => ({
      report_id: f.reportId,
      violation_id: f.violationId,
      violation_category: f.violationCategory,
      violation_severity: f.violationSeverity,
      regulation_reference: f.regulationReference,
      user_action: f.userAction,
      time_to_action_ms: f.timeToAction,
      user_notes: f.userNotes,
      product_category: f.productCategory,
      industry: f.industry,
      created_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('violation_user_feedback').insert(records)

    if (error) {
      console.error('[v0] Error batch logging violation feedback:', error)
    } else {
      console.log('[v0] Batch logged', records.length, 'violation feedbacks')
    }
  } catch (err) {
    console.error('[v0] Unexpected error in logViolationActionsBatch:', err)
  }
}

/**
 * Get violation patterns from historical user behavior
 * Returns which violations are commonly fixed vs ignored
 */
export async function getViolationPatterns(
  productCategory?: string,
  industry?: string
): Promise<ViolationPattern[]> {
  try {
    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('violation_user_feedback')
      .select('violation_category, regulation_reference, user_action, product_category, industry, time_to_action_ms')

    if (productCategory) {
      query = query.eq('product_category', productCategory)
    }

    if (industry) {
      query = query.eq('industry', industry)
    }

    const { data, error } = await query

    if (error) {
      console.error('[v0] Error fetching violation patterns:', error)
      return []
    }

    // Aggregate patterns
    const patternMap = new Map<string, any>()

    for (const record of data || []) {
      const key = `${record.violation_category}|${record.regulation_reference}`

      if (!patternMap.has(key)) {
        patternMap.set(key, {
          violationCategory: record.violation_category,
          regulationReference: record.regulation_reference,
          totalOccurrences: 0,
          fixedCount: 0,
          ignoredCount: 0,
          disputedCount: 0,
          timesToFix: [],
          industries: new Map<string, number>(),
        })
      }

      const pattern = patternMap.get(key)
      pattern.totalOccurrences++

      if (record.user_action === 'fixed') {
        pattern.fixedCount++
        if (record.time_to_action_ms) {
          pattern.timesToFix.push(record.time_to_action_ms)
        }
      } else if (record.user_action === 'ignored') {
        pattern.ignoredCount++
      } else if (record.user_action === 'disputed') {
        pattern.disputedCount++
      }

      if (record.industry) {
        const count = pattern.industries.get(record.industry) || 0
        pattern.industries.set(record.industry, count + 1)
      }
    }

    // Format results
    const patterns: ViolationPattern[] = []

    for (const pattern of patternMap.values()) {
      const avgTimeToFix =
        pattern.timesToFix.length > 0
          ? pattern.timesToFix.reduce((sum: number, t: number) => sum + t, 0) / pattern.timesToFix.length
          : undefined

      const topIndustries = Array.from(pattern.industries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([industry]) => industry)

      patterns.push({
        violationCategory: pattern.violationCategory,
        regulationReference: pattern.regulationReference,
        totalOccurrences: pattern.totalOccurrences,
        fixedCount: pattern.fixedCount,
        ignoredCount: pattern.ignoredCount,
        disputedCount: pattern.disputedCount,
        avgTimeToFix,
        topIndustries,
      })
    }

    // Sort by total occurrences (most common first)
    patterns.sort((a, b) => b.totalOccurrences - a.totalOccurrences)

    return patterns
  } catch (err) {
    console.error('[v0] Unexpected error in getViolationPatterns:', err)
    return []
  }
}

/**
 * Get most commonly ignored violations (red flags for user education)
 */
export async function getCommonlyIgnoredViolations(limit: number = 10): Promise<ViolationPattern[]> {
  const patterns = await getViolationPatterns()

  // Filter to violations that are ignored > 50% of the time
  const ignoredPatterns = patterns
    .filter(p => {
      const ignoreRate = p.totalOccurrences > 0 ? p.ignoredCount / p.totalOccurrences : 0
      return ignoreRate > 0.5 && p.totalOccurrences >= 3 // At least 3 occurrences
    })
    .slice(0, limit)

  return ignoredPatterns
}

/**
 * Get enforcement priority score based on user fix behavior
 * Higher score = users take it more seriously = likely more important
 */
export async function getEnforcementPriorityScore(
  violationCategory: string,
  regulationReference: string
): Promise<number> {
  const patterns = await getViolationPatterns()

  const pattern = patterns.find(
    p => p.violationCategory === violationCategory && p.regulationReference === regulationReference
  )

  if (!pattern || pattern.totalOccurrences === 0) {
    return 0.5 // Default neutral score
  }

  const fixRate = pattern.fixedCount / pattern.totalOccurrences
  const disputeRate = pattern.disputedCount / pattern.totalOccurrences

  // Priority score: fix rate (0-1) - dispute rate penalty
  const priorityScore = Math.max(0, Math.min(1, fixRate - disputeRate * 0.5))

  return priorityScore
}
