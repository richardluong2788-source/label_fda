import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is superadmin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: 'Only superadmins can manage users' },
        { status: 403 }
      )
    }

    // Get all admin users
    const { data: adminUsers, error: listError } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (listError) throw listError

    return NextResponse.json({ adminUsers })
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { user_id, role } = await request.json()

    if (!user_id || !role) {
      return NextResponse.json(
        { error: 'user_id and role are required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof user_id !== 'string' || !uuidRegex.test(user_id)) {
      return NextResponse.json(
        { error: 'user_id must be a valid UUID' },
        { status: 400 }
      )
    }

    // Validate role is an allowed value
    const ALLOWED_ROLES = ['admin', 'superadmin']
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is superadmin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: 'Only superadmins can grant admin roles' },
        { status: 403 }
      )
    }

    // Grant admin role
    const { data, error: grantError } = await supabase
      .from('admin_users')
      .upsert(
        {
          user_id,
          role,
          can_review: true,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (grantError) throw grantError

    console.log('Admin role granted to user:', user_id, 'with role:', role)

    return NextResponse.json({
      message: 'Admin role granted successfully',
      data,
    })
  } catch (error) {
    console.error('Error granting admin role:', error)
    return NextResponse.json(
      { error: 'Failed to grant admin role' },
      { status: 500 }
    )
  }
}
