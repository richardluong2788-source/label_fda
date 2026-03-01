import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, user: null, adminUser: null }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return { supabase, user, adminUser }
}

export async function GET() {
  const { supabase, adminUser } = await requireAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Tổng doanh thu (completed transactions) ──────────────────────────
  const { data: revenueAgg } = await supabase
    .from('payment_transactions')
    .select('amount_vnd, created_at, plan_id')
    .eq('status', 'completed')

  const totalRevenue = (revenueAgg ?? []).reduce((s, t) => s + (t.amount_vnd ?? 0), 0)

  // MRR: tổng giao dịch completed trong 30 ngày qua
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const mrr = (revenueAgg ?? [])
    .filter((t) => t.created_at >= thirtyDaysAgo)
    .reduce((s, t) => s + (t.amount_vnd ?? 0), 0)

  // ── Users theo plan ───────────────────────────────────────────────────
  const { data: subsByPlan } = await supabase
    .from('user_subscriptions')
    .select('plan_id, status')

  const planCounts: Record<string, { active: number; total: number }> = {}
  for (const row of subsByPlan ?? []) {
    if (!planCounts[row.plan_id]) planCounts[row.plan_id] = { active: 0, total: 0 }
    planCounts[row.plan_id].total++
    if (row.status === 'active') planCounts[row.plan_id].active++
  }

  // ── Doanh thu theo tháng (6 tháng gần nhất) ──────────────────────────
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const recentTxns = (revenueAgg ?? []).filter((t) => t.created_at >= sixMonthsAgo)

  const monthlyMap: Record<string, number> = {}
  for (const t of recentTxns) {
    const monthKey = t.created_at.slice(0, 7) // "YYYY-MM"
    monthlyMap[monthKey] = (monthlyMap[monthKey] ?? 0) + t.amount_vnd
  }
  const monthlyRevenue = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }))

  // ── 20 giao dịch gần nhất ─────────────────────────────────────────────
  const { data: recentTransactions } = await supabase
    .from('payment_transactions')
    .select('id, user_id, plan_id, amount_vnd, status, vnpay_bank_code, vnpay_txn_ref, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  // ── Subscription plans để hiển thị tên ───────────────────────────────
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, price_vnd')
    .order('sort_order', { ascending: true })

  return NextResponse.json({
    totalRevenue,
    mrr,
    totalSubscribers: (subsByPlan ?? []).length,
    activeSubscribers: (subsByPlan ?? []).filter((s) => s.status === 'active').length,
    planCounts,
    monthlyRevenue,
    recentTransactions: recentTransactions ?? [],
    plans: plans ?? [],
  })
}
