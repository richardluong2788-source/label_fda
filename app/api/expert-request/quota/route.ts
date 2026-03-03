import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/expert-request/quota
 * Returns the user's expert review quota status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        can_request: false, 
        reason: 'not_authenticated',
        reviews_used: 0,
        reviews_limit: 0,
      })
    }

    // Check quota via DB function
    const { data: quotaData, error: quotaError } = await supabase
      .rpc('check_expert_review_quota', { p_user_id: user.id })

    if (quotaError) {
      console.error('[v0] Quota check error:', quotaError.message)
      // Return conservative response if quota check fails
      return NextResponse.json({ 
        can_request: false, 
        reason: 'quota_check_failed',
        reviews_used: 0,
        reviews_limit: 0,
      })
    }

    return NextResponse.json({
      can_request: quotaData?.can_request ?? false,
      reason: quotaData?.reason ?? 'unknown',
      reviews_used: quotaData?.reviews_used ?? 0,
      reviews_limit: quotaData?.reviews_limit ?? 0,
      plan_name: quotaData?.plan_name ?? 'free',
    })
  } catch (error: any) {
    console.error('[v0] GET expert-request/quota error:', error)
    return NextResponse.json({ 
      can_request: false, 
      reason: 'server_error',
      reviews_used: 0,
      reviews_limit: 0,
    }, { status: 500 })
  }
}
