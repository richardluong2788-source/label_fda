'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  AlertTriangle, 
  AlertCircle,
  FileWarning,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Shield,
  RefreshCw,
  Info,
  Search
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

interface WarningLetter {
  id: string
  type: string
  letter_id: string
  company_name: string
  issue_date: string
  violation_type: string[]
  severity: string
  problematic_claim: string
  why_problematic: string
  correction_required: string
  regulation_violated: string[]
  keywords: string[]
  relevance_score: number
  content_preview: string
  created_at: string
}

interface ImportAlert {
  id: string
  type: string
  alert_number: string
  alert_title: string
  reason: string
  products_affected: string[]
  countries_affected: string[]
  status: string
  content_preview: string
  created_at: string
}

interface RiskSummary {
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  total_warnings: number
  active_import_alerts: number
  common_violations: string[]
  recommendation: string
}

interface HistoricalAlertsResponse {
  warning_letters: WarningLetter[]
  import_alerts: ImportAlert[]
  total: number
  search_keywords: string[]
  risk_summary: RiskSummary
}

interface SupplierHistoricalAlertsProps {
  supplierId?: string
  productCategory?: string
  country?: string
  compact?: boolean
}

export function SupplierHistoricalAlerts({
  supplierId,
  productCategory,
  country,
  compact = false
}: SupplierHistoricalAlertsProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)
  
  // Build query params
  const params = new URLSearchParams()
  if (supplierId) params.append('supplier_id', supplierId)
  if (productCategory) params.append('product_category', productCategory)
  if (country) params.append('country', country)
  
  const queryString = params.toString()
  const shouldFetch = supplierId || productCategory || country
  
  const { data, error, isLoading, mutate } = useSWR<HistoricalAlertsResponse>(
    shouldFetch ? `/api/fsvp/historical-alerts?${queryString}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  
  const getRiskLevelBadge = (level: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      low: { className: 'bg-green-100 text-green-700', label: 'Low Risk' },
      medium: { className: 'bg-amber-100 text-amber-700', label: 'Medium Risk' },
      high: { className: 'bg-orange-100 text-orange-700', label: 'High Risk' },
      critical: { className: 'bg-red-100 text-red-700', label: 'Critical Risk' },
    }
    const config = variants[level] || variants.low
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }
  
  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      Critical: 'bg-red-100 text-red-700 border-red-200',
      Major: 'bg-orange-100 text-orange-700 border-orange-200',
      Minor: 'bg-amber-100 text-amber-700 border-amber-200',
    }
    return (
      <Badge variant="outline" className={colors[severity] || ''}>
        {severity}
      </Badge>
    )
  }
  
  if (!shouldFetch) {
    return null
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Historical Data</AlertTitle>
        <AlertDescription>
          Unable to fetch FDA historical alerts. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }
  
  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">FDA Historical Data Check</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <Info className="h-4 w-4" />
            <span className="text-sm">No relevant FDA Warning Letters or Import Alerts found for this supplier/product combination.</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const { warning_letters, import_alerts, risk_summary, search_keywords } = data

  // Compact view for dashboard
  if (compact && !isExpanded) {
    return (
      <Card className={risk_summary.risk_level === 'critical' ? 'border-red-300 bg-red-50' : risk_summary.risk_level === 'high' ? 'border-orange-300 bg-orange-50' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarning className={`h-5 w-5 ${risk_summary.risk_level === 'critical' ? 'text-red-600' : risk_summary.risk_level === 'high' ? 'text-orange-600' : 'text-amber-600'}`} />
              <CardTitle className="text-base">FDA Historical Alerts</CardTitle>
              {getRiskLevelBadge(risk_summary.risk_level)}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-4 text-sm">
            <span><strong>{risk_summary.total_warnings}</strong> Warning Letters</span>
            <span><strong>{risk_summary.active_import_alerts}</strong> Active Import Alerts</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={risk_summary.risk_level === 'critical' ? 'border-red-300' : risk_summary.risk_level === 'high' ? 'border-orange-300' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileWarning className={`h-5 w-5 ${risk_summary.risk_level === 'critical' ? 'text-red-600' : risk_summary.risk_level === 'high' ? 'text-orange-600' : 'text-amber-600'}`} />
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                FDA Historical Data Check
                {getRiskLevelBadge(risk_summary.risk_level)}
              </CardTitle>
              <CardDescription>
                Related Warning Letters and Import Alerts for this supplier/product
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {compact && (
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Summary */}
        <Alert className={
          risk_summary.risk_level === 'critical' ? 'border-red-500 bg-red-50' :
          risk_summary.risk_level === 'high' ? 'border-orange-500 bg-orange-50' :
          risk_summary.risk_level === 'medium' ? 'border-amber-500 bg-amber-50' :
          'border-green-500 bg-green-50'
        }>
          <AlertTriangle className={`h-4 w-4 ${
            risk_summary.risk_level === 'critical' ? 'text-red-600' :
            risk_summary.risk_level === 'high' ? 'text-orange-600' :
            risk_summary.risk_level === 'medium' ? 'text-amber-600' :
            'text-green-600'
          }`} />
          <AlertTitle className={
            risk_summary.risk_level === 'critical' ? 'text-red-800' :
            risk_summary.risk_level === 'high' ? 'text-orange-800' :
            risk_summary.risk_level === 'medium' ? 'text-amber-800' :
            'text-green-800'
          }>
            Risk Assessment
          </AlertTitle>
          <AlertDescription className={
            risk_summary.risk_level === 'critical' ? 'text-red-700' :
            risk_summary.risk_level === 'high' ? 'text-orange-700' :
            risk_summary.risk_level === 'medium' ? 'text-amber-700' :
            'text-green-700'
          }>
            {risk_summary.recommendation}
          </AlertDescription>
        </Alert>
        
        {/* Search Keywords */}
        <div className="flex flex-wrap gap-1 items-center">
          <Search className="h-4 w-4 text-muted-foreground mr-1" />
          <span className="text-xs text-muted-foreground">Searched:</span>
          {search_keywords.slice(0, 8).map((kw, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
        
        {/* Warning Letters */}
        {warning_letters.length > 0 && (
          <Collapsible defaultOpen={warning_letters.length <= 3}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
              Warning Letters ({warning_letters.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {warning_letters.slice(0, 10).map((letter) => (
                <div 
                  key={letter.id} 
                  className="p-3 bg-muted rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{letter.company_name}</span>
                        {getSeverityBadge(letter.severity)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Letter ID: {letter.letter_id} | Issued: {letter.issue_date}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Score: {letter.relevance_score}
                    </Badge>
                  </div>
                  
                  {letter.violation_type.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {letter.violation_type.map((vt, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {vt}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {letter.problematic_claim && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Issue:</strong> {letter.problematic_claim.slice(0, 200)}...
                    </div>
                  )}
                  
                  {letter.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">Keywords:</span>
                      {letter.keywords.slice(0, 5).map((kw, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-red-50 text-red-700">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Import Alerts */}
        {import_alerts.length > 0 && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
              Active Import Alerts ({import_alerts.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {import_alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium text-sm text-red-800">
                        Import Alert {alert.alert_number}
                      </span>
                      <Badge className="ml-2 bg-red-600">
                        {alert.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-red-700">{alert.alert_title}</p>
                  <p className="text-xs text-red-600">{alert.reason}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Common Violations */}
        {risk_summary.common_violations.length > 0 && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground">Most Common Violations:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {risk_summary.common_violations.map((v, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
