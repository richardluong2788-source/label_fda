import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFormulas, createFormula, updateFormula, submitFormula } from '@/lib/formula-service'
import { getAuth } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: NextRequest) {
  try {
    const user = await getAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const formulas = await getUserFormulas(user.id, status || undefined)
    return NextResponse.json({ success: true, formulas })
  } catch (error) {
    console.error('[v0] GET /api/formulas error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch formulas' },
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

    const body = await request.json()
    const { formula } = await createFormula(user.id, body)

    if (!formula) {
      return NextResponse.json(
        { error: 'Failed to create formula' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, formula })
  } catch (error) {
    console.error('[v0] POST /api/formulas error:', error)
    return NextResponse.json(
      { error: 'Failed to create formula' },
      { status: 500 }
    )
  }
}
