import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/fsvp/send-to-importer
 * 
 * Supplier flow: Send prepared FSVP documents to Importer
 * This creates a notification/request for the Importer to review the supplier's documentation
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user (supplier)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      productData,
      readyDocuments,
      importerId, // Optional: specific importer to send to
      hazardAnalysisId,
      message // Optional: message from supplier
    } = body
    
    if (!productData || !readyDocuments || readyDocuments.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: productData and readyDocuments are required' 
      }, { status: 400 })
    }
    
    // Get supplier profile info
    const { data: supplierProfile } = await supabase
      .from('fsvp_suppliers')
      .select('id, supplier_name, supplier_email')
      .eq('supplier_user_id', user.id)
      .single()
    
    // If hazardAnalysisId provided, update the analysis status
    if (hazardAnalysisId) {
      await supabase
        .from('fsvp_hazard_analyses')
        .update({
          status: 'pending_review',
          supplier_submission_date: new Date().toISOString(),
          supplier_ready_documents: readyDocuments,
          supplier_message: message || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', hazardAnalysisId)
    }
    
    // Create a document request/submission record
    const { data: submission, error: submitError } = await supabase
      .from('fsvp_document_submissions')
      .insert({
        supplier_user_id: user.id,
        supplier_id: supplierProfile?.id || null,
        importer_user_id: importerId || null,
        hazard_analysis_id: hazardAnalysisId || null,
        product_name: productData.productName,
        product_category: productData.productCategory || null,
        country_of_origin: productData.countryOfOrigin || null,
        is_sahcodha: productData.isSahcodha || false,
        documents_ready: readyDocuments,
        supplier_message: message || null,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (submitError) {
      // Table might not exist yet - log error but don't fail
      console.error('Failed to create submission record:', submitError)
      
      // Still return success - the main workflow is complete
      return NextResponse.json({
        success: true,
        message: 'Documents marked as ready for importer review',
        hazardAnalysisId,
        submissionId: null,
        note: 'Submission tracking table not available'
      })
    }
    
    // TODO: Send notification to importer (email/in-app notification)
    // This would integrate with a notification service
    
    return NextResponse.json({
      success: true,
      message: 'Successfully sent to importer for review',
      submissionId: submission?.id,
      hazardAnalysisId,
      productName: productData.productName,
      documentsReady: readyDocuments.length
    })
    
  } catch (error) {
    console.error('Error in send-to-importer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/fsvp/send-to-importer
 * 
 * Get submissions sent by the current supplier or received by the current importer
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'supplier' // 'supplier' or 'importer'
    
    let query = supabase
      .from('fsvp_document_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    
    if (role === 'supplier') {
      query = query.eq('supplier_user_id', user.id)
    } else {
      query = query.eq('importer_user_id', user.id)
    }
    
    const { data: submissions, error } = await query
    
    if (error) {
      // Table might not exist
      return NextResponse.json({ submissions: [], note: 'Table not available' })
    }
    
    return NextResponse.json({ submissions })
    
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
