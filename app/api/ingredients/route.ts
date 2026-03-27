import { NextRequest, NextResponse } from 'next/server'
import { searchIngredients, getIngredientById, getIngredientCategories } from '@/lib/ingredient-service'
import { getAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20')

    let results = []

    if (query) {
      results = await searchIngredients(query, limit)
    } else if (category) {
      const { data, error } = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ingredient_master?category=eq.${category}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      )
        .then(r => r.json() as any)
        .catch(() => ({ data: null }))

      results = data || []
    }

    return NextResponse.json({ success: true, ingredients: results })
  } catch (error) {
    console.error('[v0] GET /api/ingredients error:', error)
    return NextResponse.json(
      { error: 'Failed to search ingredients' },
      { status: 500 }
    )
  }
}
