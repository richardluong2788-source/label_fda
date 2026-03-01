import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/expert-request/price
// Trả về giá tư vấn lẻ theo plan hiện tại của user đang đăng nhập.
// Dùng để hiển thị giá động trong ExpertRequestPanel thay vì hardcode.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Chưa đăng nhập — trả giá mặc định plan Free (Starter = 499k)
    const { data: starterPlan } = await supabase
      .from('subscription_plans')
      .select('expert_review_price_vnd')
      .eq('id', 'starter')
      .maybeSingle()

    return NextResponse.json({
      expert_review_price_vnd: starterPlan?.expert_review_price_vnd ?? 499000,
    })
  }

  // Lấy subscription hiện tại của user
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .maybeSingle()

  const planId = sub?.plan_id ?? 'free'

  // Lấy giá tư vấn lẻ từ plan này
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, name, expert_reviews_limit, expert_review_price_vnd')
    .eq('id', planId)
    .maybeSingle()

  return NextResponse.json({
    plan_id:                   plan?.id ?? planId,
    plan_name:                 plan?.name ?? 'Free Trial',
    expert_reviews_limit:      plan?.expert_reviews_limit ?? 0,
    expert_review_price_vnd:   plan?.expert_review_price_vnd ?? 499000,
    // included = limit > 0 hoặc -1 (unlimited) → trong gói, không tính tiền lẻ
    included: (plan?.expert_reviews_limit ?? 0) !== 0,
  })
}
