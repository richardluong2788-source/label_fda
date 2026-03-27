import { NextRequest, NextResponse } from 'next/server'
import { getFormulaById, updateFormula, submitFormula } from '@/lib/formula-service'
import { getAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formula = await getFormulaById(params.id)

    if (!formula) {
      return NextResponse.json({ error: 'Formula not found' }, { status: 404 })
    }

    // Check authorization
    if (formula.user_id !== user.id && formula.assigned_to !== user.id && formula.reviewed_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, formula })
  } catch (error) {
    console.error('[v0] GET /api/formulas/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch formula' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formula = await getFormulaById(params.id)
    if (!formula) {
      return NextResponse.json({ error: 'Formula not found' }, { status: 404 })
    }

    // Check authorization (owner can update, reviewers can update status)
    if (formula.user_id !== user.id && formula.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { formula: updated } = await updateFormula(params.id, body)

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update formula' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, formula: updated })
  } catch (error) {
    console.error('[v0] PATCH /api/formulas/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update formula' },
      { status: 500 }
    )
  }
}
