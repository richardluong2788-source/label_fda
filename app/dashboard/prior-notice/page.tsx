'use client'

import { useState } from 'react'
import { PriorNoticeForm } from '@/components/prior-notice-form'
import { PriorNoticeResults } from '@/components/prior-notice-result'
import { useToast } from '@/hooks/use-toast'

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

interface PriorNoticeResult {
  id: string
  pnrn: string
  productName: string
  manufacturerName: string
  importDate: string
  complianceStatus: string
  riskLevel: 'low' | 'medium' | 'high'
  requiredDocuments: string[]
  guidance: string
  submissionUrl?: string
}

export default function PriorNoticePage() {
  const [result, setResult] = useState<PriorNoticeResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (data: PriorNoticeFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/prior-notice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate prior notice')
      }

      const responseData = await response.json()
      setResult(responseData.data)

      toast({
        title: 'Prior Notice Generated',
        description: `PNRN: ${responseData.data.pnrn}`,
      })
    } catch (error) {
      console.error('[v0] Prior notice generation error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate prior notice',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Prior Notice</h1>
        <p className="text-muted-foreground mt-2">
          Generate FDA Prior Notices for food product imports (21 U.S.C. § 381(m))
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <PriorNoticeForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        <div className="lg:col-span-2">
          <PriorNoticeResults result={result} />
        </div>
      </div>
    </div>
  )
}
