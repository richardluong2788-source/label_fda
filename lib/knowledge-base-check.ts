import { createClient } from '@/lib/supabase/server'

export interface KBStatus {
  available: boolean
  totalDocuments: number
  warningLetterCount: number
  regulationCount: number
  recallCount: number
}

/**
 * Check Knowledge Base availability by counting documents in compliance_knowledge table.
 * Returns document counts by type and whether the KB has enough data for reliable analysis.
 * 
 * Minimum threshold: at least 1 regulation document must exist for analysis to proceed.
 */
export async function checkKnowledgeBaseStatus(): Promise<KBStatus> {
  const supabase = await createClient()

  // Count total documents
  const { count: totalDocuments, error: totalError } = await supabase
    .from('compliance_knowledge')
    .select('*', { count: 'exact', head: true })

  if (totalError) {
    console.error('[v0] KB check error:', totalError)
    // If table doesn't exist or query fails, KB is not available
    return {
      available: false,
      totalDocuments: 0,
      warningLetterCount: 0,
      regulationCount: 0,
      recallCount: 0,
    }
  }

  // Count by document type in parallel
  const [warningLetterResult, regulationResult, recallResult] = await Promise.all([
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
  ])

  const warningLetterCount = warningLetterResult.count ?? 0
  const regulationCount = regulationResult.count ?? 0
  const recallCount = recallResult.count ?? 0
  const total = totalDocuments ?? 0

  // KB is considered available if there is at least 1 document of any type
  const available = total > 0

  return {
    available,
    totalDocuments: total,
    warningLetterCount,
    regulationCount,
    recallCount,
  }
}
