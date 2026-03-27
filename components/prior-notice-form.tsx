'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface PriorNoticeFormData {
  productName: string
  manufacturerName: string
  manufacturerCountry: string
  intendedUse: string
  quantity: number
  unitOfMeasure: string
  importDate: string
  portOfEntry: string
  commodityCode: string
}

interface PriorNoticeFormProps {
  onSubmit: (data: PriorNoticeFormData) => Promise<void>
  isLoading?: boolean
}

const PORTS_OF_ENTRY = [
  'Los Angeles, CA',
  'Long Beach, CA',
  'New York, NY',
  'Newark, NJ',
  'Houston, TX',
  'Savannah, GA',
  'Miami, FL',
  'Other',
]

const UNITS_OF_MEASURE = [
  'kg',
  'lbs',
  'metric tons',
  'units',
  'cases',
  'pallets',
]

export function PriorNoticeForm({ onSubmit, isLoading = false }: PriorNoticeFormProps) {
  const [formData, setFormData] = useState<PriorNoticeFormData>({
    productName: '',
    manufacturerName: '',
    manufacturerCountry: '',
    intendedUse: 'Human Food',
    quantity: 0,
    unitOfMeasure: 'kg',
    importDate: '',
    portOfEntry: '',
    commodityCode: '',
  })

  const { toast } = useToast()

  const handleChange = (field: keyof PriorNoticeFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productName.trim()) {
      toast({
        title: 'Error',
        description: 'Product name is required',
        variant: 'destructive',
      })
      return
    }

    if (!formData.manufacturerName.trim()) {
      toast({
        title: 'Error',
        description: 'Manufacturer name is required',
        variant: 'destructive',
      })
      return
    }

    if (!formData.importDate) {
      toast({
        title: 'Error',
        description: 'Import date is required',
        variant: 'destructive',
      })
      return
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prior Notice Details</CardTitle>
          <CardDescription>
            Enter shipment information for FDA Prior Notice (21 U.S.C. § 381(m))
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Product Information</h3>

            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                placeholder="e.g., Organic Pasta, Olive Oil, Spice Blend"
                value={formData.productName}
                onChange={(e) => handleChange('productName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intendedUse">Intended Use *</Label>
              <Select value={formData.intendedUse} onValueChange={(val) => handleChange('intendedUse', val)}>
                <SelectTrigger id="intendedUse">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Human Food">Human Food</SelectItem>
                  <SelectItem value="Pet Food">Pet Food</SelectItem>
                  <SelectItem value="Food Additive">Food Additive</SelectItem>
                  <SelectItem value="Dietary Supplement">Dietary Supplement</SelectItem>
                  <SelectItem value="Cosmetic">Cosmetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manufacturer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Manufacturer Information</h3>

            <div className="space-y-2">
              <Label htmlFor="manufacturerName">Manufacturer Name *</Label>
              <Input
                id="manufacturerName"
                placeholder="Official manufacturer name"
                value={formData.manufacturerName}
                onChange={(e) => handleChange('manufacturerName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturerCountry">Country of Manufacture</Label>
              <Input
                id="manufacturerCountry"
                placeholder="e.g., Italy, Vietnam, Mexico"
                value={formData.manufacturerCountry}
                onChange={(e) => handleChange('manufacturerCountry', e.target.value)}
              />
            </div>
          </div>

          {/* Shipment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Shipment Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unit *</Label>
                <Select value={formData.unitOfMeasure} onValueChange={(val) => handleChange('unitOfMeasure', val)}>
                  <SelectTrigger id="unitOfMeasure">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_OF_MEASURE.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importDate">Expected Import Date *</Label>
              <Input
                id="importDate"
                type="date"
                value={formData.importDate}
                onChange={(e) => handleChange('importDate', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="portOfEntry">Port of Entry</Label>
                <Select value={formData.portOfEntry} onValueChange={(val) => handleChange('portOfEntry', val)}>
                  <SelectTrigger id="portOfEntry">
                    <SelectValue placeholder="Select port" />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTS_OF_ENTRY.map(port => (
                      <SelectItem key={port} value={port}>
                        {port}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commodityCode">HS Commodity Code</Label>
                <Input
                  id="commodityCode"
                  placeholder="e.g., 0702.00.00"
                  value={formData.commodityCode}
                  onChange={(e) => handleChange('commodityCode', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Prior Notice...
          </>
        ) : (
          'Generate Prior Notice'
        )}
      </Button>
    </form>
  )
}
