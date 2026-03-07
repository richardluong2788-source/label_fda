import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { reportId } = await req.json()

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete the report
    const { data, error } = await supabase
      .from('audit_reports')
      .delete()
      .eq('id', reportId)
      .select('id, product_name')
      .single()

    if (error) {
      console.error('[admin/delete-report] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      reportId: data.id,
      productName: data.product_name,
      message: `Đã xóa báo cáo "${data.product_name || reportId}"`
    })
  } catch (err: any) {
    console.error('[admin/delete-report] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
