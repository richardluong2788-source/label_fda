import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fsvp/stats
 * Retrieve FSVP dashboard statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch suppliers for this user
    const { data: suppliers, error: suppliersError } = await supabase
      .from('fsvp_suppliers')
      .select('*')
      .eq('importer_user_id', user.id)
      .neq('status', 'removed')
    
    if (suppliersError) {
      return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }
    
    // Fetch hazard analyses
    const { data: hazardAnalyses, error: hazardError } = await supabase
      .from('fsvp_hazard_analyses')
      .select('*')
      .eq('importer_user_id', user.id)
      .eq('status', 'active')
    
    if (hazardError) {
      console.error('[FSVP] Error fetching hazard analyses:', hazardError)
    }
    
    // Fetch verification activities
    const { data: verificationActivities, error: verificationError } = await supabase
      .from('fsvp_verification_activities')
      .select('*')
      .eq('importer_user_id', user.id)
      .order('activity_date', { ascending: false })
    
    if (verificationError) {
      console.error('[FSVP] Error fetching verification activities:', verificationError)
    }
    
    // Fetch user profile for FSVP program info
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[FSVP] Error fetching user profile:', profileError)
    }
    
    // Calculate statistics
    const now = new Date()
    const suppliersList = suppliers || []
    const hazardList = hazardAnalyses || []
    const activities = verificationActivities || []
    
    // SAHCODHA products count
    const sahcodhaProducts = hazardList.filter(h => h.is_sahcodha_product).length
    
    // Products with hazard analysis
    const productsWithAnalysis = hazardList.length
    const totalProducts = new Set(hazardList.map(h => h.product_name)).size || suppliersList.reduce((acc, s) => acc + (s.primary_products?.length || 0), 0)
    const productsPendingAnalysis = Math.max(0, totalProducts - productsWithAnalysis)
    
    // Calculate compliance score (based on supplier status and verification)
    let complianceScore = 0
    if (suppliersList.length > 0) {
      const approvedSuppliers = suppliersList.filter(s => s.status === 'approved' || s.status === 'conditionally_approved').length
      const suppliersWithVerification = suppliersList.filter(s => s.last_verification_date).length
      const suppliersWithHazardAnalysis = suppliersList.filter(s => s.hazard_analysis && Object.keys(s.hazard_analysis).length > 0).length
      
      const statusScore = (approvedSuppliers / suppliersList.length) * 40
      const verificationScore = (suppliersWithVerification / suppliersList.length) * 30
      const hazardScore = (suppliersWithHazardAnalysis / suppliersList.length) * 30
      
      complianceScore = Math.round(statusScore + verificationScore + hazardScore)
    } else {
      complianceScore = 0
    }
    
    // Calculate audit readiness score
    let auditReadinessScore = 0
    if (suppliersList.length > 0) {
      const hasQI = userProfile?.fsvp_qualified_individual ? 20 : 0
      const hasDUNS = userProfile?.importer_duns ? 15 : 0
      const hasProgram = userProfile?.fsvp_program_active ? 15 : 0
      
      // Check suppliers with complete documentation
      const suppliersWithDocs = suppliersList.filter(s => 
        s.hazard_analysis && Object.keys(s.hazard_analysis).length > 0 &&
        s.supplier_evaluation && Object.keys(s.supplier_evaluation).length > 0
      ).length
      const docsScore = suppliersList.length > 0 ? (suppliersWithDocs / suppliersList.length) * 50 : 0
      
      auditReadinessScore = Math.round(hasQI + hasDUNS + hasProgram + docsScore)
    }
    
    // Certifications (from verification activities)
    const certificationActivities = activities.filter(a => 
      a.activity_type === 'third_party_audit' || a.activity_type === 'onsite_audit'
    )
    const activeCertifications = certificationActivities.filter(a => a.result === 'passed' || a.result === 'passed_with_conditions').length
    
    // Documents count (from supplier verification activities and hazard analyses)
    const documentsUpToDate = hazardList.length + activities.filter(a => a.result === 'passed').length
    const documentsNeedingUpdate = activities.filter(a => a.requires_followup && !a.followup_completed).length
    
    // Corrective actions
    const openCorrectiveActions = activities.filter(a => 
      a.activity_type === 'corrective_action_followup' && !a.followup_completed
    ).length
    const overdueCorrectiveActions = activities.filter(a => 
      a.activity_type === 'corrective_action_followup' && 
      !a.followup_completed && 
      a.followup_due_date && 
      new Date(a.followup_due_date) < now
    ).length
    
    // US Importers count (unique count)
    const usImportersCount = 1 // Current user is the importer
    
    // Find next audit due date
    const suppliersWithAuditDue = suppliersList.filter(s => s.next_onsite_audit_due || s.next_verification_due)
    let nextAuditDue: string | null = null
    let lastAuditDate: string | null = null
    let daysUntilNextAudit: number | null = null
    
    if (suppliersWithAuditDue.length > 0) {
      const auditDates = suppliersWithAuditDue
        .map(s => s.next_onsite_audit_due || s.next_verification_due)
        .filter(d => d)
        .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())
      
      if (auditDates.length > 0) {
        nextAuditDue = auditDates[0]!
        daysUntilNextAudit = Math.ceil((new Date(nextAuditDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }
    }
    
    // Find last audit date
    const lastAuditActivity = activities.find(a => 
      a.activity_type === 'onsite_audit' || a.activity_type === 'third_party_audit' || a.activity_type === 'annual_onsite_audit'
    )
    if (lastAuditActivity) {
      lastAuditDate = lastAuditActivity.activity_date
    }
    
    // Certifications expiring soon (within 60 days)
    const certificationsExpiringSoon = suppliersList.filter(s => {
      if (!s.next_verification_due) return false
      const daysUntil = Math.ceil((new Date(s.next_verification_due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil > 0 && daysUntil <= 60
    }).length
    
    const stats = {
      compliance_score: complianceScore,
      audit_readiness_score: auditReadinessScore,
      total_products: totalProducts || productsWithAnalysis,
      products_with_hazard_analysis: productsWithAnalysis,
      products_pending_analysis: productsPendingAnalysis,
      sahcodha_products: sahcodhaProducts,
      certifications_active: activeCertifications,
      certifications_expiring_soon: certificationsExpiringSoon,
      documents_up_to_date: documentsUpToDate,
      documents_needing_update: documentsNeedingUpdate,
      open_corrective_actions: openCorrectiveActions,
      overdue_corrective_actions: overdueCorrectiveActions,
      us_importers_count: usImportersCount,
      last_audit_date: lastAuditDate,
      next_audit_due: nextAuditDue,
      days_until_next_audit: daysUntilNextAudit,
      // Additional info
      total_suppliers: suppliersList.length,
      approved_suppliers: suppliersList.filter(s => s.status === 'approved').length,
      sahcodha_suppliers: suppliersList.filter(s => s.is_sahcodha_risk).length,
      pending_suppliers: suppliersList.filter(s => s.status === 'pending_review').length,
      has_qualified_individual: !!userProfile?.fsvp_qualified_individual,
      has_duns: !!userProfile?.importer_duns,
      fsvp_program_active: !!userProfile?.fsvp_program_active
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('[FSVP] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
