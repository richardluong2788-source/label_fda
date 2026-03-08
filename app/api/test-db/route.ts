import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test connection by fetching some basic data
    const results: Record<string, unknown> = {}

    // Try to get users count
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    if (!usersError) {
      results.users_count = usersCount
    }

    // Try to get audit_reports count
    const { count: reportsCount, error: reportsError } = await supabase
      .from('audit_reports')
      .select('*', { count: 'exact', head: true })
    
    if (!reportsError) {
      results.audit_reports_count = reportsCount
    }

    // Try to get compliance_knowledge count
    const { count: knowledgeCount, error: knowledgeError } = await supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })
    
    if (!knowledgeError) {
      results.compliance_knowledge_count = knowledgeCount
    }

    // Try to get subscription_plans (using correct column names: price_vnd)
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('id, name, price_vnd, reports_limit, features')
      .limit(5)
    
    if (!plansError && plans) {
      results.subscription_plans = plans
    }

    // Get recent audit reports (using correct column names - no compliance_score)
    const { data: recentReports, error: recentError } = await supabase
      .from('audit_reports')
      .select('id, product_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!recentError && recentReports) {
      results.recent_reports = recentReports
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      supabase_url: supabaseUrl,
      data: results,
      errors: {
        users: usersError?.message,
        reports: reportsError?.message,
        knowledge: knowledgeError?.message,
        plans: plansError?.message,
        recent: recentError?.message
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
