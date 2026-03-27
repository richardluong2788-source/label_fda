import { NextRequest, NextResponse } from 'next/server'
import { submitFormula, getFormulaById } from '@/lib/formula-service'
import { getAuth } from '@/lib/auth'

export async function POST(
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

    // Only owner can submit
    if (formula.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { formula: submitted } = await submitFormula(params.id, body.auditReportId)

    if (!submitted) {
      return NextResponse.json(
        { error: 'Failed to submit formula' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, formula: submitted })
  } catch (error) {
    console.error('[v0] POST /api/formulas/[id]/submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit formula' },
      { status: 500 }
    )
  }
}
