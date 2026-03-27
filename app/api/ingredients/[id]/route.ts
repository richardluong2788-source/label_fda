import { NextRequest, NextResponse } from 'next/server'
import { getIngredientById } from '@/lib/ingredient-service'
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

    const ingredient = await getIngredientById(params.id)

    if (!ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, ingredient })
  } catch (error) {
    console.error('[v0] GET /api/ingredients/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ingredient' },
      { status: 500 }
    )
  }
}
