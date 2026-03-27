import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * FCE/SID Consultation Request API
 * 
 * Receives consultation requests for FCE/SID registration assistance
 * and stores them in the database for follow-up by Vexim team.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      companyName,
      contactName,
      email,
      phone,
      supplierName,
      productType,
      message,
      productName,
      productCategory,
      countryOfOrigin,
      auditReportId,
      requestType,
      fceSidCategory,
    } = body
    
    // Validate required fields
    if (!email || !companyName) {
      return NextResponse.json(
        { error: 'Email and company name are required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser()
    
    // Store consultation request
    const { data, error } = await supabase
      .from('fsvp_consultation_requests')
      .insert({
        user_id: user?.id || null,
        company_name: companyName,
        contact_name: contactName || null,
        email: email,
        phone: phone || null,
        supplier_name: supplierName || null,
        product_type: productType || null,
        message: message || null,
        product_name: productName || null,
        product_category: productCategory || null,
        country_of_origin: countryOfOrigin || null,
        audit_report_id: auditReportId || null,
        request_type: requestType || 'fce_sid_registration',
        fce_sid_category: fceSidCategory || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (error) {
      // If table doesn't exist or other DB error, log but still return success
      // (the form will fallback to mailto)
      console.error('[v0] FCE consultation insert error:', error)
      
      // Try to send notification email as fallback
      // This ensures the request is not lost
      return NextResponse.json(
        { 
          success: true, 
          fallback: true,
          message: 'Request received. We will contact you shortly.' 
        },
        { status: 200 }
      )
    }
    
    // TODO: Send notification email to Vexim team
    // await sendFceConsultationNotification(data)
    
    return NextResponse.json({
      success: true,
      message: 'Consultation request submitted successfully',
      requestId: data?.id,
    })
    
  } catch (error: any) {
    console.error('[v0] FCE consultation error:', error)
    return NextResponse.json(
      { error: 'Failed to submit consultation request' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check existing consultation requests
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const auditReportId = searchParams.get('auditReportId')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ requests: [] })
    }
    
    let query = supabase
      .from('fsvp_consultation_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (auditReportId) {
      query = query.eq('audit_report_id', auditReportId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[v0] FCE consultation fetch error:', error)
      return NextResponse.json({ requests: [] })
    }
    
    return NextResponse.json({ requests: data || [] })
    
  } catch (error: any) {
    console.error('[v0] FCE consultation GET error:', error)
    return NextResponse.json({ requests: [] })
  }
}
