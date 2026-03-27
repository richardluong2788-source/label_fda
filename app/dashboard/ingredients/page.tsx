'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CustomerFormula } from '@/lib/types'

export default function IngredientReviewPage() {
  const router = useRouter()
  const [formulas, setFormulas] = useState<CustomerFormula[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'submitted' | 'under_review' | 'approved'>('all')

  useEffect(() => {
    fetchFormulas()
  }, [filter])

  const fetchFormulas = async () => {
    try {
      const query = filter !== 'all' ? `?status=${filter}` : ''
      const response = await fetch(`/api/formulas${query}`)
      const data = await response.json()
      setFormulas(data.formulas || [])
    } catch (error) {
      console.error('[v0] Error fetching formulas:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      revision_needed: 'bg-orange-100 text-orange-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ingredient Review</h1>
          <p className="text-gray-600 mt-1">Manage your formula submissions and reviews</p>
        </div>
        <Button onClick={() => router.push('/dashboard/ingredients/upload')}>
          Upload Formula
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'draft', 'submitted', 'under_review', 'approved'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Formulas List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : formulas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">No formulas found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {formulas.map(formula => (
            <Card key={formula.id} className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => router.push(`/dashboard/ingredients/${formula.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{formula.product_name}</CardTitle>
                    <CardDescription>{formula.brand_name || formula.product_type}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(formula.status)}>
                    {formula.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Ingredients</p>
                    <p className="font-semibold">{formula.ingredient_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className="font-semibold capitalize">{formula.product_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Submission</p>
                    <p className="font-semibold">
                      {formula.submission_date 
                        ? new Date(formula.submission_date).toLocaleDateString()
                        : 'Not submitted'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Approval</p>
                    <p className="font-semibold capitalize">{formula.approval_status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
