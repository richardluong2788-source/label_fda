import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    // Get user and check admin role
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('compliance_knowledge')
      .select('*')
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: entries, error } = await query

    if (error) throw error

    // Get statistics
    const { count: totalCount } = await supabase
      .from('compliance_knowledge')
      .select('*', { count: 'exact', head: true })

    const { data: categoryCounts } = await supabase
      .from('compliance_knowledge')
      .select('category')

    const categoryStats = categoryCounts?.reduce((acc: any, item: any) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      entries,
      stats: {
        total: totalCount,
        byCategory: categoryStats,
      },
    })
  } catch (error: any) {
    console.error('Error fetching knowledge entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Get user and check admin role
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    // Delete entry
    const { error } = await supabase
      .from('compliance_knowledge')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting knowledge entry:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
