import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeIngredientList } from '@/lib/ingredient-analysis-engine'

interface IngredientCheckRequest {
  ingredients: string[]
  language: 'en' | 'vi'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as IngredientCheckRequest

    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty ingredients array' },
        { status: 400 }
      )
    }

    const language = body.language || 'en'
    if (!['en', 'vi'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Use "en" or "vi"' },
        { status: 400 }
      )
    }

    // Analyze ingredients using the existing engine
    const analysis = await analyzeIngredientList(body.ingredients, language)

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    console.error('[v0] Ingredient check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze ingredients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
