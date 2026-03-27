'use client'

import { useState } from 'react'
import { IngredientCheckerForm } from '@/components/ingredient-checker-form'
import { IngredientCheckerResults } from '@/components/ingredient-checker-results'
import { useToast } from '@/hooks/use-toast'

interface AnalysisResult {
  ingredients: string[]
  allergens: Array<{
    allergen: string
    detected: boolean
    source?: string
  }>
  issues: Array<{
    ingredient: string
    issue: string
    severity: 'error' | 'warning' | 'info'
  }>
  nonStandardNames: string[]
  orderCompliance: boolean
  guidance: string
}

export default function IngredientCheckPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleAnalyze = async (ingredients: string[], language: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ingredient-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients,
          language,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze ingredients')
      }

      const data = await response.json()
      setResult(data.data)

      toast({
        title: 'Analysis Complete',
        description: `Checked ${ingredients.length} ingredients`,
      })
    } catch (error) {
      console.error('[v0] Analysis error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to analyze ingredients',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Ingredient Check</h1>
        <p className="text-muted-foreground mt-2">
          Validate ingredients for FDA compliance, allergen declarations, and naming standards
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <IngredientCheckerForm onAnalyze={handleAnalyze} isLoading={isLoading} />
        </div>

        <div className="lg:col-span-2">
          <IngredientCheckerResults result={result} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
