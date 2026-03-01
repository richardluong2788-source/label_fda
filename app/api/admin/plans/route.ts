import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Helper: verify caller is admin (uses user-scoped client for auth check only)
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, adminUser: null }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return { user, adminUser }
}

// GET /api/admin/plans — list all plans
export async function GET() {
  const { adminUser } = await requireAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service-role client so RLS never blocks reads
  const admin = createAdminClient()
  const { data: plans, error } = await admin
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plans })
}

// PUT /api/admin/plans — update a plan
export async function PUT(req: Request) {
  const { adminUser } = await requireAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    id,
    name,
    price_vnd,
    annual_price_vnd,
    annual_discount_percent,
    expert_review_price_vnd,
    reports_limit,
    expert_reviews_limit,
    storage_days,
    features,
    is_active,
    sort_order,
  } = body

  if (!id) {
    return NextResponse.json({ error: 'Plan id is required' }, { status: 400 })
  }

  // features must be stored as a JSON array (jsonb column)
  const featuresArray = Array.isArray(features)
    ? features
    : typeof features === 'string'
      ? features.split('\n').map((f: string) => f.trim()).filter(Boolean)
      : []

  // Use service-role client to bypass RLS for writes
  const admin = createAdminClient()
  const { data: updated, error } = await admin
    .from('subscription_plans')
    .update({
      name,
      price_vnd: Number(price_vnd) || 0,
      annual_price_vnd: Number(annual_price_vnd) || 0,
      annual_discount_percent: Number(annual_discount_percent) || 0,
      expert_review_price_vnd: Number(expert_review_price_vnd) || 0,
      reports_limit: Number(reports_limit),
      expert_reviews_limit: Number(expert_reviews_limit),
      storage_days: storage_days === '' || storage_days === null ? null : Number(storage_days),
      features: featuresArray,
      is_active: Boolean(is_active),
      sort_order: Number(sort_order) || 0,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan: updated })
}

// POST /api/admin/plans — create a new plan
export async function POST(req: Request) {
  const { adminUser } = await requireAdmin()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const featuresArray = Array.isArray(body.features)
    ? body.features
    : typeof body.features === 'string'
      ? body.features.split('\n').map((f: string) => f.trim()).filter(Boolean)
      : []

  const admin = createAdminClient()
  const { data: created, error } = await admin
    .from('subscription_plans')
    .insert({
      name: body.name || 'New Plan',
      price_vnd: Number(body.price_vnd) || 0,
      annual_price_vnd: Number(body.annual_price_vnd) || 0,
      annual_discount_percent: Number(body.annual_discount_percent) || 0,
      expert_review_price_vnd: Number(body.expert_review_price_vnd) || 0,
      reports_limit: Number(body.reports_limit) || 1,
      expert_reviews_limit: Number(body.expert_reviews_limit) || 0,
      storage_days: body.storage_days ? Number(body.storage_days) : null,
      features: featuresArray,
      is_active: body.is_active ?? false,
      sort_order: Number(body.sort_order) || 99,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan: created }, { status: 201 })
}
