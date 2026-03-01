import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/violations/feedback
 * Log user feedback on violations for ML training dataset
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      report_id,
      violation_id,
      action,
      severity_override,
      user_notes,
    } = body

    if (!report_id || !violation_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: report_id, violation_id, action' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Insert feedback
    const { data, error } = await supabase
      .from('violation_user_feedback')
      .insert({
        report_id,
        violation_id,
        action,
        severity_override: severity_override || null,
        user_notes: user_notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Error saving user feedback:', error)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    console.log('[v0] User feedback saved:', action, 'for violation:', violation_id)

    return NextResponse.json({
      success: true,
      feedback: data,
    })
  } catch (error: any) {
    console.error('[v0] Error in feedback API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/violations/feedback?report_id=xxx
 * Get all feedback for a report
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const report_id = searchParams.get('report_id')

    if (!report_id) {
      return NextResponse.json(
        { error: 'Missing report_id parameter' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('violation_user_feedback')
      .select('*')
      .eq('report_id', report_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching feedback:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      feedback: data || [],
    })
  } catch (error: any) {
    console.error('[v0] Error in feedback GET:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
