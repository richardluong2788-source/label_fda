import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fsvp/historical-alerts
 * 
 * Fetches related FDA Warning Letters and Import Alerts based on:
 * - Product category (e.g., "cashew", "pangasius")
 * - Country of origin (e.g., "Vietnam")
 * - Specific hazards (e.g., "Salmonella")
 * 
 * This enables the system to automatically warn users about
 * historical enforcement actions relevant to their suppliers.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const productCategory = searchParams.get('product_category')
    const country = searchParams.get('country')
    const hazard = searchParams.get('hazard')
    const supplierId = searchParams.get('supplier_id')
    
    // Build search keywords
    const keywords: string[] = []
    if (productCategory) {
      keywords.push(productCategory.toLowerCase())
      // Add common aliases
      if (productCategory.toLowerCase().includes('cashew') || productCategory.toLowerCase().includes('hạt điều')) {
        keywords.push('cashew', 'tree nut', 'nut')
      }
      if (productCategory.toLowerCase().includes('pangasius') || productCategory.toLowerCase().includes('cá tra')) {
        keywords.push('pangasius', 'catfish', 'basa', 'seafood', 'fish')
      }
    }
    if (country) {
      keywords.push(country.toLowerCase())
    }
    if (hazard) {
      keywords.push(hazard.toLowerCase())
    }
    
    // If supplier_id provided, get supplier details first
    if (supplierId) {
      const { data: supplier } = await supabase
        .from('fsvp_suppliers')
        .select('supplier_country, product_categories, primary_products')
        .eq('id', supplierId)
        .single()
      
      if (supplier) {
        if (supplier.supplier_country) {
          keywords.push(supplier.supplier_country.toLowerCase())
        }
        if (supplier.product_categories) {
          for (const cat of supplier.product_categories) {
            keywords.push(cat.toLowerCase())
          }
        }
        if (supplier.primary_products) {
          for (const prod of supplier.primary_products) {
            keywords.push(prod.toLowerCase())
          }
        }
      }
    }
    
    if (keywords.length === 0) {
      return NextResponse.json({
        alerts: [],
        warning_letters: [],
        import_alerts: [],
        total: 0,
        message: 'No search criteria provided'
      })
    }
    
    // Search compliance_knowledge for related warning letters
    // Using text search on content and metadata
    const uniqueKeywords = [...new Set(keywords)]
    
    // Build OR conditions for keyword search
    const orConditions = uniqueKeywords.map(kw => `content.ilike.%${kw}%`)
    
    const { data: warningLetters, error: wlError } = await supabase
      .from('compliance_knowledge')
      .select('id, content, metadata, created_at')
      .eq('metadata->>document_type', 'FDA Warning Letter')
      .or(orConditions.join(','))
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (wlError) {
      console.error('[FSVP Historical] Warning letters query error:', wlError)
    }
    
    // Search for import alerts in metadata
    const { data: importAlertRecords, error: iaError } = await supabase
      .from('compliance_knowledge')
      .select('id, content, metadata, created_at')
      .eq('metadata->>document_type', 'FDA Import Alert')
      .or(orConditions.join(','))
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (iaError) {
      console.error('[FSVP Historical] Import alerts query error:', iaError)
    }
    
    // Process and format results
    const formattedWarningLetters = (warningLetters || []).map(wl => {
      const meta = wl.metadata as Record<string, unknown>
      return {
        id: wl.id,
        type: 'warning_letter',
        letter_id: meta?.letter_id || 'Unknown',
        company_name: meta?.company_name || 'Unknown Company',
        issue_date: meta?.issue_date || '',
        violation_type: meta?.violation_type || [],
        severity: meta?.severity || 'Major',
        problematic_claim: meta?.problematic_claim || '',
        why_problematic: meta?.why_problematic || '',
        correction_required: meta?.correction_required || '',
        regulation_violated: meta?.regulation_violated || [],
        keywords: meta?.problematic_keywords || [],
        relevance_score: calculateRelevanceScore(wl.content, uniqueKeywords),
        content_preview: (wl.content || '').slice(0, 300) + '...',
        created_at: wl.created_at
      }
    }).sort((a, b) => b.relevance_score - a.relevance_score)
    
    const formattedImportAlerts = (importAlertRecords || []).map(ia => {
      const meta = ia.metadata as Record<string, unknown>
      return {
        id: ia.id,
        type: 'import_alert',
        alert_number: meta?.alert_number || 'Unknown',
        alert_title: meta?.alert_title || '',
        reason: meta?.reason || '',
        products_affected: meta?.products_affected || [],
        countries_affected: meta?.countries_affected || [],
        status: meta?.status || 'Active',
        content_preview: (ia.content || '').slice(0, 300) + '...',
        created_at: ia.created_at
      }
    })
    
    // Generate risk assessment summary
    const riskSummary = generateRiskSummary(formattedWarningLetters, formattedImportAlerts, uniqueKeywords)
    
    return NextResponse.json({
      warning_letters: formattedWarningLetters,
      import_alerts: formattedImportAlerts,
      total: formattedWarningLetters.length + formattedImportAlerts.length,
      search_keywords: uniqueKeywords,
      risk_summary: riskSummary
    })
    
  } catch (error) {
    console.error('[FSVP Historical] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Calculate relevance score based on keyword matches
 */
function calculateRelevanceScore(content: string, keywords: string[]): number {
  if (!content) return 0
  const lowerContent = content.toLowerCase()
  let score = 0
  for (const keyword of keywords) {
    const matches = (lowerContent.match(new RegExp(keyword, 'gi')) || []).length
    score += matches
  }
  return score
}

/**
 * Generate risk summary based on historical data
 */
function generateRiskSummary(
  warningLetters: Array<{ severity: string; violation_type: unknown[] }>,
  importAlerts: Array<{ status: string }>,
  keywords: string[]
): {
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  total_warnings: number
  active_import_alerts: number
  common_violations: string[]
  recommendation: string
} {
  const totalWarnings = warningLetters.length
  const activeAlerts = importAlerts.filter(a => a.status === 'Active').length
  const criticalWarnings = warningLetters.filter(w => w.severity === 'Critical').length
  
  // Extract common violation types
  const violationCounts: Record<string, number> = {}
  for (const wl of warningLetters) {
    for (const vt of (wl.violation_type as string[]) || []) {
      violationCounts[vt] = (violationCounts[vt] || 0) + 1
    }
  }
  const commonViolations = Object.entries(violationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type)
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  let recommendation = 'Standard supplier verification activities are appropriate.'
  
  if (activeAlerts > 0 || criticalWarnings > 0) {
    riskLevel = 'critical'
    recommendation = 'CRITICAL: Active FDA Import Alerts or critical violations exist. Conduct immediate onsite audit and enhanced testing before importing.'
  } else if (totalWarnings >= 5) {
    riskLevel = 'high'
    recommendation = 'HIGH RISK: Multiple warning letters issued for this product/region. Annual onsite audit and per-shipment testing recommended.'
  } else if (totalWarnings >= 2) {
    riskLevel = 'medium'
    recommendation = 'MEDIUM RISK: Some FDA enforcement history exists. Enhanced documentation review and periodic sampling recommended.'
  }
  
  return {
    risk_level: riskLevel,
    total_warnings: totalWarnings,
    active_import_alerts: activeAlerts,
    common_violations: commonViolations,
    recommendation
  }
}
