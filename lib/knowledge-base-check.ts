import { createAdminClient } from '@/lib/supabase/admin'

export interface KBStatus {
  available: boolean
  totalDocuments: number
  warningLetterCount: number
  regulationCount: number
  recallCount: number
  importAlertCount: number
  /** True when at least Warning Letters and Recalls are also loaded (full RAG coverage) */
  fullCoverageReady: boolean
}

/**
 * Check Knowledge Base availability by counting documents in compliance_knowledge table.
 * Returns document counts by type and whether the KB has enough data for reliable analysis.
 * 
 * Minimum threshold: at least 1 regulation document must exist for analysis to proceed.
 * 
 * NOTE: Uses admin client to bypass RLS since this is called from internal routes
 * (e.g., /api/analyze/process/run) that may not have a user session.
 */
export async function checkKnowledgeBaseStatus(): Promise<KBStatus> {
  const supabase = createAdminClient()

  // Count total documents
  const { count: totalDocuments, error: totalError } = await supabase
    .from('compliance_knowledge')
    .select('*', { count: 'exact', head: true })

  if (totalError) {
    console.error('[v0] KB check error:', totalError)
    return {
      available: false,
      totalDocuments: 0,
      warningLetterCount: 0,
      regulationCount: 0,
      recallCount: 0,
      importAlertCount: 0,
      fullCoverageReady: false,
    }
  }

  // Count by document type + approved import alerts in parallel
  const [warningLetterResult, regulationResult, recallResult, importAlertResult] = await Promise.all([
    supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', 'FDA Warning Letter'),
    supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })
      .in('document_type', ['FDA Regulation', 'Regulation', 'CFR']),
    supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', 'FDA Recall'),
    // Import Alerts are stored in a separate table — count approved ones
    supabase
      .from('fda_import_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
  ])

  const warningLetterCount = warningLetterResult.count ?? 0
  const regulationCount = regulationResult.count ?? 0
  const recallCount = recallResult.count ?? 0
  const importAlertCount = importAlertResult.count ?? 0
  const total = totalDocuments ?? 0

  // KB is considered available if there is at least 1 regulation document
  const available = regulationCount > 0 || total > 0

  // Full coverage = all 4 data layers have content
  const fullCoverageReady = regulationCount > 0 && warningLetterCount > 0 && recallCount > 0

  return {
    available,
    totalDocuments: total,
    warningLetterCount,
    regulationCount,
    recallCount,
    importAlertCount,
    fullCoverageReady,
  }
}
