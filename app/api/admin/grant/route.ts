import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // --- AUTH CHECK: Require a logged-in superadmin ---
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the requester is already a superadmin
    const { data: requesterAdmin, error: adminCheckError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single()

    if (adminCheckError || !requesterAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: only superadmins can grant admin roles' },
        { status: 403 }
      )
    }

    // --- INPUT VALIDATION ---
    const { userId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'userId must be a valid UUID' },
        { status: 400 }
      )
    }

    // --- GRANT via admin client (bypasses RLS) ---
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase.from('admin_users').upsert({
      user_id: userId,
      role: 'superadmin',
      can_review: true,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error granting admin:', error)
      return NextResponse.json({ error: 'Failed to grant admin role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
