import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * FFR (Food Facility Registration) Consultation API
 * 
 * Handles requests for FFR registration support.
 * FFR is prerequisite for FCE/SID registration (21 CFR 108).
 * 
 * POST: Submit FFR consultation request
 * GET: Get user's FFR consultation requests
 */

interface FFRConsultationRequest {
  companyName: string
  contactName?: string
  email: string
  phone?: string
  facilityName?: string
  facilityAddress?: string
  facilityCountry?: string
  productName?: string
  productCategory?: string
  countryOfOrigin?: string
  auditReportId?: string
  message?: string
  requestType: 'ffr_registration'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const body: FFRConsultationRequest = await request.json()
    
    // Validate required fields
    if (!body.email || !body.companyName) {
      return NextResponse.json(
        { error: 'Email and company name are required' },
        { status: 400 }
      )
    }
    
    // Insert consultation request
    const { data, error } = await supabase
      .from('fsvp_consultation_requests')
      .insert({
        user_id: user?.id || null,
        request_type: 'ffr_registration',
        company_name: body.companyName,
        contact_name: body.contactName || null,
        email: body.email,
        phone: body.phone || null,
        facility_name: body.facilityName || null,
        facility_address: body.facilityAddress || null,
        facility_country: body.facilityCountry || null,
        product_name: body.productName || null,
        product_category: body.productCategory || null,
        country_of_origin: body.countryOfOrigin || null,
        audit_report_id: body.auditReportId || null,
        message: body.message || null,
        status: 'pending',
        metadata: {
          source: 'fsvp_integration_banner',
          request_type: 'ffr_registration',
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()
    
    if (error) {
      console.error('[v0] FFR consultation insert error:', error)
      // Return success anyway - we'll fallback to email in frontend
      return NextResponse.json({
        success: true,
        message: 'Request received. Please use email fallback.',
        fallback: true,
      })
    }
    
    // Optionally: Send notification email to Vexim support team
    // This would integrate with email service
    
    return NextResponse.json({
      success: true,
      message: 'FFR consultation request submitted successfully',
      requestId: data?.id,
      data: {
        id: data?.id,
        status: 'pending',
        estimatedResponse: '24 hours',
        nextSteps: [
          'Vexim team will contact you within 24 hours',
          'Prepare facility information (address, DUNS if available)',
          'FFR registration typically takes 2-5 business days',
          'After FFR, you can proceed with FCE/SID registration',
        ],
      },
    })
  } catch (error: any) {
    console.error('[v0] FFR consultation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        fallback: true,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data, error } = await supabase
      .from('fsvp_consultation_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('request_type', 'ffr_registration')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[v0] FFR consultation fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch consultation requests' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      requests: data || [],
    })
  } catch (error: any) {
    console.error('[v0] FFR consultation GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
