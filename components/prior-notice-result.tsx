'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertTriangle, Copy, Download } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface PriorNoticeResult {
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

interface PriorNoticeResultsProps {
  result: PriorNoticeResult | null
}

export function PriorNoticeResults({ result }: PriorNoticeResultsProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (!result) {
    return null
  }

  const handleCopyPNRN = () => {
    navigator.clipboard.writeText(result.pnrn)
    setCopied(true)
    toast({
      title: 'Copied',
      description: 'PNRN copied to clipboard',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 border-green-600'
      case 'high':
        return 'text-red-600 border-red-600'
      default:
        return 'text-orange-600 border-orange-600'
    }
  }

  const getStatusIcon = (status: string) => {
    return status === 'approved' ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-orange-600" />
    )
  }

  return (
    <div className="space-y-6">
      {/* PNRN Reference Card */}
      <Card className="border-2 border-blue-600 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Prior Notice Reference Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded border border-blue-200 dark:border-blue-800">
              <code className="flex-1 font-mono text-lg font-bold">{result.pnrn}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyPNRN}
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This reference number must be included in your FDA submission. Keep this for your records.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-semibold">{result.productName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Manufacturer</p>
              <p className="font-semibold">{result.manufacturerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Import Date</p>
              <p className="font-semibold">{new Date(result.importDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Risk Level</p>
              <Badge variant="outline" className={getRiskColor(result.riskLevel)}>
                {result.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(result.complianceStatus)}
            Compliance Status
          </CardTitle>
          <CardDescription>FDA pre-review assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="capitalize">
            {result.complianceStatus}
          </Badge>
        </CardContent>
      </Card>

      {/* Required Documents */}
      {result.requiredDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Required Documentation</CardTitle>
            <CardDescription>
              Prepare these documents for FDA submission or internal filing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.requiredDocuments.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 bg-muted rounded">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{doc}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Guidance */}
      {result.guidance && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps & Guidance</CardTitle>
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

      {/* FDA Submission Link */}
      {result.submissionUrl && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>Submit to FDA ePrior Notification System</span>
            <Button
              size="sm"
              asChild
            >
              <a href={result.submissionUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Go to FDA System
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
