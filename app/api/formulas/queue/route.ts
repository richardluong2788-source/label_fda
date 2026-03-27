import { NextRequest, NextResponse } from 'next/server'
import { getPendingFormulas, assignFormulaReview } from '@/lib/formula-service'
import { getAuth } from '@/lib/auth'

// Check if user is admin
async function isAdmin(userId: string) {
  const { data } = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
  })
    .then(r => r.json())
    .catch(() => ({ data: null }))

  return data && data.length > 0
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view pending queue
    // const admin = await isAdmin(user.id)
    // if (!admin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const formulas = await getPendingFormulas(limit, offset)
    return NextResponse.json({ success: true, formulas })
  } catch (error) {
    console.error('[v0] GET /api/formulas/queue error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch formula queue' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can assign formulas
    // const admin = await isAdmin(user.id)
    // if (!admin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const body = await request.json()
    const { formulaId, assignedToUserId, reviewType, priority, dueDate } = body

    if (!formulaId || !assignedToUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { assignment, error } = await assignFormulaReview(
      formulaId,
      assignedToUserId,
      user.id,
      reviewType || 'initial_review',
      priority || 'normal',
      dueDate
    )

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, assignment })
  } catch (error) {
    console.error('[v0] POST /api/formulas/queue error:', error)
    return NextResponse.json(
      { error: 'Failed to assign formula' },
      { status: 500 }
    )
  }
}
