'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CustomerFormula } from '@/lib/types'

export default function FormulaDetailPage() {
  const params = useParams()
  const [formula, setFormula] = useState<CustomerFormula | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFormula()
  }, [params.id])

  const fetchFormula = async () => {
    try {
      const response = await fetch(`/api/formulas/${params.id}`)
      const data = await response.json()
      if (data.success) {
        setFormula(data.formula)
      }
    } catch (error) {
      console.error('[v0] Error fetching formula:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>
  if (!formula) return <div className="text-center py-8">Formula not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{formula.product_name}</h1>
          <Badge className="mt-2">{formula.status}</Badge>
        </div>
        {formula.status === 'draft' && (
          <Button onClick={() => window.location.href = `/dashboard/ingredients/${formula.id}/edit`}>
            Edit Formula
          </Button>
        )}
      </div>

      {/* Product Info */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Product Name</p>
            <p className="font-semibold">{formula.product_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Type</p>
            <p className="font-semibold capitalize">{formula.product_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Brand</p>
            <p className="font-semibold">{formula.brand_name || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Formula Version</p>
            <p className="font-semibold">{formula.formula_version || 'v1.0'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredients ({formula.ingredient_count})</CardTitle>
          <CardDescription>Total Percentage: {formula.total_percentage}%</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Ingredient</th>
                <th className="text-right py-2 px-3">Percentage</th>
                <th className="text-left py-2 px-3">Function</th>
                <th className="text-left py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {formula.ingredients.map((ing, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">{ing.name}</td>
                  <td className="text-right py-2 px-3">{ing.percentage}%</td>
                  <td className="py-2 px-3">{ing.function || '-'}</td>
                  <td className="py-2 px-3">
                    <Badge variant={ing.status === 'verified' ? 'default' : 'secondary'}>
                      {ing.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Issues Found */}
      {formula.issues_found && formula.issues_found.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formula.issues_found.map((issue, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="font-semibold text-red-800">{issue.type}</p>
                  <p className="text-red-700">{issue.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Notes */}
      {formula.review_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{formula.review_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
