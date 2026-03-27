import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { FSVP_REQUIREMENTS, SAHCODHA_CATEGORIES } from '@/lib/fsvp-validator'

/**
 * FSVP Export Dossier API
 * 
 * Generates complete FSVP documentation package for FDA inspection
 * Per 21 CFR 1.510: Records must be available within 24 hours of request
 * 
 * Package includes:
 * - Qualified Individual documentation
 * - Hazard analysis for each product
 * - Supplier evaluation records
 * - Verification activity logs
 * - Corrective action records
 * - Import records (DUNS-linked)
 */

interface DossierRequest {
  export_type?: 'full_program' | 'supplier_specific' | 'product_specific' | 'fda_request'
  supplier_ids?: string[]
  product_ids?: string[]
  is_fda_request?: boolean
  fda_request_reference?: string
}

/**
 * POST /api/fsvp/export-dossier
 * Generate FSVP dossier for FDA compliance
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body: DossierRequest = await request.json()
    const exportType = body.export_type || 'full_program'
    
    // Fetch user profile with FSVP info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    // Fetch all suppliers or specific ones
    let suppliersQuery = supabase
      .from('fsvp_suppliers')
      .select('*')
      .eq('importer_user_id', user.id)
      .neq('status', 'removed')
    
    if (body.supplier_ids && body.supplier_ids.length > 0) {
      suppliersQuery = suppliersQuery.in('id', body.supplier_ids)
    }
    
    const { data: suppliers, error: suppliersError } = await suppliersQuery
    
    if (suppliersError) {
      console.error('[FSVP Dossier] Error fetching suppliers:', suppliersError)
      return NextResponse.json({ error: 'Failed to fetch supplier data' }, { status: 500 })
    }
    
    // Fetch hazard analyses
    const supplierIds = suppliers?.map(s => s.id) || []
    const { data: hazardAnalyses } = await supabase
      .from('fsvp_hazard_analyses')
      .select('*')
      .in('supplier_id', supplierIds)
      .eq('status', 'active')
    
    // Fetch verification activities
    const { data: verificationActivities } = await supabase
      .from('fsvp_verification_activities')
      .select('*')
      .in('supplier_id', supplierIds)
      .order('activity_date', { ascending: false })
    
    // Fetch related audit reports
    const { data: auditReports } = await supabase
      .from('audit_reports')
      .select('id, product_name, product_category, manufacturer_info, created_at, overall_result')
      .eq('user_id', user.id)
      .in('fsvp_supplier_id', supplierIds)
      .order('created_at', { ascending: false })
      .limit(100)
    
    // Build the dossier
    const dossier = {
      dossier_metadata: {
        generated_at: new Date().toISOString(),
        export_type: exportType,
        is_fda_request: body.is_fda_request || false,
        fda_request_reference: body.fda_request_reference || null,
        generation_time_ms: 0, // Will be updated at end
        compliance_reference: '21 CFR Part 1, Subpart L (§1.500-§1.514)'
      },
      
      importer_information: {
        company_name: profile?.company_name || 'Not specified',
        duns_number: profile?.importer_duns || 'NOT REGISTERED',
        duns_verified: profile?.importer_duns_verified || false,
        address: profile?.company_address || 'Not specified',
        contact_email: user.email,
        fsvp_program_established: profile?.fsvp_program_established_date || null
      },
      
      qualified_individual: {
        name: profile?.fsvp_qualified_individual || 'NOT DESIGNATED',
        title: profile?.fsvp_qi_title || null,
        credentials: profile?.fsvp_qi_credentials || {},
        training_records: profile?.fsvp_qi_training_records || [],
        compliance_status: profile?.fsvp_qualified_individual 
          ? 'COMPLIANT' 
          : 'NON-COMPLIANT: No QI designated per 21 CFR 1.502'
      },
      
      fsvp_requirements_summary: FSVP_REQUIREMENTS.map(req => ({
        requirement: req.title,
        cfr_section: req.cfrSection,
        description: req.description,
        verification_method: req.verificationMethod,
        is_mandatory: req.isMandatory
      })),
      
      suppliers: (suppliers || []).map(supplier => {
        const supplierHazardAnalyses = hazardAnalyses?.filter(h => h.supplier_id === supplier.id) || []
        const supplierActivities = verificationActivities?.filter(v => v.supplier_id === supplier.id) || []
        const supplierReports = auditReports?.filter(r => r.fsvp_supplier_id === supplier.id) || []
        
        return {
          supplier_info: {
            id: supplier.id,
            name: supplier.supplier_name,
            country: supplier.supplier_country,
            address: supplier.supplier_address,
            fei: supplier.supplier_fei,
            duns: supplier.supplier_duns,
            status: supplier.status,
            approval_date: supplier.approval_date
          },
          
          risk_assessment: {
            is_sahcodha_risk: supplier.is_sahcodha_risk,
            sahcodha_hazards: supplier.sahcodha_hazards,
            requires_annual_audit: supplier.requires_annual_audit,
            last_onsite_audit: supplier.last_onsite_audit_date,
            next_onsite_audit_due: supplier.next_onsite_audit_due
          },
          
          supplier_evaluation: {
            evaluation_data: supplier.supplier_evaluation,
            evaluation_status: Object.keys(supplier.supplier_evaluation || {}).length > 0
              ? 'DOCUMENTED'
              : 'MISSING: Evaluation required per 21 CFR 1.505'
          },
          
          hazard_analyses: supplierHazardAnalyses.map(ha => ({
            product_name: ha.product_name,
            product_category: ha.product_category,
            is_sahcodha_product: ha.is_sahcodha_product,
            known_hazards: ha.known_hazards,
            biological_hazards: ha.biological_hazards,
            chemical_hazards: ha.chemical_hazards,
            physical_hazards: ha.physical_hazards,
            control_measures: ha.control_measures,
            analysis_date: ha.analysis_date,
            analyzed_by: ha.analyzed_by
          })),
          
          verification_activities: supplierActivities.map(va => ({
            activity_type: va.activity_type,
            activity_date: va.activity_date,
            conducted_by: va.conducted_by,
            result: va.result,
            findings_summary: va.findings,
            documents_count: va.documents?.length || 0,
            requires_followup: va.requires_followup,
            followup_completed: va.followup_completed
          })),
          
          verification_status: {
            last_verification: supplier.last_verification_date,
            next_verification_due: supplier.next_verification_due,
            is_overdue: supplier.next_verification_due 
              ? new Date(supplier.next_verification_due) < new Date()
              : false,
            activities_count: supplierActivities.length
          },
          
          corrective_actions: supplier.corrective_actions || [],
          
          import_records: supplierReports.map(r => ({
            report_id: r.id,
            product_name: r.product_name,
            product_category: r.product_category,
            import_date: r.created_at,
            compliance_result: r.overall_result
          }))
        }
      }),
      
      sahcodha_reference: Object.entries(SAHCODHA_CATEGORIES).map(([category, config]) => ({
        category,
        hazards: config.hazards,
        cfr_reference: config.cfrReference,
        requires_annual_audit: config.requiresAnnualAudit
      })),
      
      compliance_summary: {
        total_suppliers: suppliers?.length || 0,
        approved_suppliers: suppliers?.filter(s => s.status === 'approved').length || 0,
        sahcodha_suppliers: suppliers?.filter(s => s.is_sahcodha_risk).length || 0,
        overdue_verifications: suppliers?.filter(s => 
          s.next_verification_due && new Date(s.next_verification_due) < new Date()
        ).length || 0,
        has_qualified_individual: !!profile?.fsvp_qualified_individual,
        has_duns: !!profile?.importer_duns,
        program_established: !!profile?.fsvp_program_established_date
      }
    }
    
    // Calculate generation time
    dossier.dossier_metadata.generation_time_ms = Date.now() - startTime
    
    // Record the dossier export
    const { data: exportRecord, error: exportError } = await supabase
      .from('fsvp_dossier_exports')
      .insert({
        importer_user_id: user.id,
        export_type: exportType,
        supplier_ids: body.supplier_ids || [],
        product_ids: body.product_ids || [],
        is_fda_request: body.is_fda_request || false,
        fda_request_reference: body.fda_request_reference || null,
        fda_request_date: body.is_fda_request ? new Date().toISOString() : null,
        status: 'completed',
        generated_at: new Date().toISOString(),
        generation_time_ms: dossier.dossier_metadata.generation_time_ms
      })
      .select()
      .single()
    
    if (exportError) {
      console.error('[FSVP Dossier] Error recording export:', exportError)
      // Continue anyway - don't fail the export just because we couldn't record it
    }
    
    // Update user profile with last export time
    await supabase
      .from('user_profiles')
      .update({ fsvp_last_dossier_export: new Date().toISOString() })
      .eq('id', user.id)
    
    // Return the dossier as JSON
    // In production, this could also generate a PDF and store it in blob storage
    return NextResponse.json({
      success: true,
      export_id: exportRecord?.id,
      dossier,
      message: `FSVP dossier generated in ${dossier.dossier_metadata.generation_time_ms}ms. This document is ready for FDA inspection per 21 CFR 1.510 (24-hour retrieval requirement).`
    })
    
  } catch (error) {
    console.error('[FSVP Dossier] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/fsvp/export-dossier
 * Get list of previous dossier exports
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: exports, error } = await supabase
      .from('fsvp_dossier_exports')
      .select('*')
      .eq('importer_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('[FSVP Dossier] Error fetching exports:', error)
      return NextResponse.json({ error: 'Failed to fetch export history' }, { status: 500 })
    }
    
    return NextResponse.json(exports || [])
    
  } catch (error) {
    console.error('[FSVP Dossier] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
