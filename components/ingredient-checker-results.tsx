'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, AlertCircle, Leaf } from 'lucide-react'

interface AllergenInfo {
  allergen: string
  detected: boolean
  source?: string
}

interface IngredientIssue {
  ingredient: string
  issue: string
  severity: 'error' | 'warning' | 'info'
}

interface IngredientAnalysisResult {
  ingredients: string[]
  allergens: AllergenInfo[]
  issues: IngredientIssue[]
  nonStandardNames: string[]
  orderCompliance: boolean
  guidance: string
}

interface IngredientCheckerResultsProps {
  result: IngredientAnalysisResult | null
  isLoading?: boolean
}

export function IngredientCheckerResults({ result, isLoading = false }: IngredientCheckerResultsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Analyzing ingredients...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return null
  }

  const hasErrors = result.issues.some(i => i.severity === 'error')
  const hasWarnings = result.issues.some(i => i.severity === 'warning')

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Analysis Results
          </CardTitle>
          <CardDescription>
            Compliance check for {result.ingredients.length} ingredients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Ingredients</p>
              <p className="text-2xl font-bold">{result.ingredients.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Allergens Found</p>
              <p className="text-2xl font-bold text-orange-600">
                {result.allergens.filter(a => a.detected).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Issues</p>
              <p className="text-2xl font-bold text-red-600">{result.issues.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergen Detection */}
      {result.allergens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Allergen Detection
            </CardTitle>
            <CardDescription>FDA FALCPA + Sesame allergens (as of Dec 2023)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.allergens.map((allergen, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-3">
                    {allergen.detected ? (
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-medium">{allergen.allergen}</span>
                  </div>
                  {allergen.source && (
                    <Badge variant="outline" className="text-xs">
                      {allergen.source}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues Found */}
      {result.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Compliance Issues
            </CardTitle>
            <CardDescription>Items requiring attention or correction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.issues.map((issue, idx) => (
                <Alert
                  key={idx}
                  variant={issue.severity === 'error' ? 'destructive' : 'default'}
                  className={
                    issue.severity === 'error'
                      ? 'border-red-600'
                      : issue.severity === 'warning'
                        ? 'border-orange-600'
                        : 'border-blue-600'
                  }
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{issue.ingredient}</strong>: {issue.issue}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-Standard Names */}
      {result.nonStandardNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Non-Standard Ingredient Names</CardTitle>
            <CardDescription>Consider using FDA-accepted names</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.nonStandardNames.map((name, idx) => (
                <Badge key={idx} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Declaration Order</CardTitle>
          <CardDescription>21 CFR §101.4(a)(1) - Decreasing order by weight</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted rounded">
            {result.orderCompliance ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Ingredients appear to follow FDA declaration order requirements</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Review ingredient order - must be listed by decreasing weight</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guidance */}
      {result.guidance && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {result.guidance}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
