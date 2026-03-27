'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerFormula, FormulaIngredient } from '@/lib/types'

export default function UploadFormulaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    productName: '',
    productType: 'supplement' as const,
    brandName: '',
    formula_version: '',
    ingredients: [] as FormulaIngredient[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: formData.productName,
          product_type: formData.productType,
          brand_name: formData.brandName,
          formula_version: formData.formula_version,
          ingredients: formData.ingredients,
          ingredient_count: formData.ingredients.length,
          status: 'draft',
        }),
      })

      const result = await response.json()
      if (result.success) {
        router.push(`/dashboard/ingredients/${result.formula.id}`)
      }
    } catch (error) {
      console.error('[v0] Error uploading formula:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Formula</h1>
        <p className="text-gray-600 mt-1">Submit a new formula for review</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>Enter basic details about your product</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                required
                placeholder="e.g., Omega-3 Supplement"
                value={formData.productName}
                onChange={e => setFormData({...formData, productName: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Brand Name</label>
              <Input
                placeholder="e.g., MyHealth Inc."
                value={formData.brandName}
                onChange={e => setFormData({...formData, brandName: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Product Type *</label>
              <select
                value={formData.productType}
                onChange={e => setFormData({...formData, productType: e.target.value as any})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="food">Food</option>
                <option value="supplement">Supplement</option>
                <option value="cosmetic">Cosmetic</option>
                <option value="personal_care">Personal Care</option>
              </select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Uploading...' : 'Create Formula'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
