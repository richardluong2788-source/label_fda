import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/fsvp/hazard-analyses/[id]/link-label
 * Link a new label (from audit report) to an existing hazard analysis
 * Used when scanning a new packaging level of the same product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hazardAnalysisId } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { auditReportId, labelImageUrl, netWeight, changeReason } = body
    
    // Validate hazard analysis exists and user has access
    const { data: hazardAnalysis, error: haError } = await supabase
      .from('fsvp_hazard_analyses')
      .select(`
        id,
        product_name,
        brand_name,
        label_image_url,
        additional_labels,
        importer_user_id,
        analyzed_by
      `)
      .eq('id', hazardAnalysisId)
      .single()
    
    if (haError || !hazardAnalysis) {
      console.error('[Link Label] Hazard analysis not found:', haError)
      return NextResponse.json({ error: 'Hazard analysis not found' }, { status: 404 })
    }
    
    // Check user has access (importer or analyzed_by)
    if (hazardAnalysis.importer_user_id !== user.id && hazardAnalysis.analyzed_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Build array of additional labels
    const existingLabels = hazardAnalysis.additional_labels || []
    const newLabelEntry = {
      label_image_url: labelImageUrl,
      net_weight: netWeight,
      change_reason: changeReason || 'Additional packaging level',
      linked_audit_report_id: auditReportId,
      added_at: new Date().toISOString(),
      added_by: user.id,
    }
    
    // Update hazard analysis with new label
    const { data: updatedHA, error: updateError } = await supabase
      .from('fsvp_hazard_analyses')
      .update({
        additional_labels: [...existingLabels, newLabelEntry],
        updated_at: new Date().toISOString(),
      })
      .eq('id', hazardAnalysisId)
      .select()
      .single()
    
    if (updateError) {
      console.error('[Link Label] Error updating hazard analysis:', updateError)
      return NextResponse.json({ error: 'Failed to update hazard analysis' }, { status: 500 })
    }
    
    // Link the audit report to this hazard analysis
    if (auditReportId) {
      const { error: reportError } = await supabase
        .from('audit_reports')
        .update({
          fsvp_hazard_analysis_id: hazardAnalysisId,
          fsvp_linked_at: new Date().toISOString(),
          fsvp_link_type: 'additional_label', // Mark as additional label, not primary
        })
        .eq('id', auditReportId)
      
      if (reportError) {
        console.warn('[Link Label] Could not link audit report:', reportError)
        // Continue anyway - main update succeeded
      }
    }
    
    // Count total labels now
    const totalLabels = (updatedHA.additional_labels?.length || 0) + 1 // +1 for primary
    
    return NextResponse.json({
      success: true,
      hazardAnalysisId,
      productName: hazardAnalysis.product_name,
      brandName: hazardAnalysis.brand_name,
      totalLabels,
      message: `Label successfully linked. Product now has ${totalLabels} label(s).`,
    })
    
  } catch (error) {
    console.error('[Link Label] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
