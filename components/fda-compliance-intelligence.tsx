'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  FileWarning,
  AlertOctagon,
  ExternalLink,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface RecallDetail {
  recall_number?: string
  company_name?: string
  reason?: string
  description?: string
  preventive_action?: string
  category?: string
}

interface FDAComplianceIntelligenceProps {
  report: {
    warning_letter_weight?: number
    recall_heat_index?: number
    import_alert_heat_index?: number
    enforcement_risk_score?: number
    brand_name?: string
    product_name?: string
    product_category?: string
    // Full details for admin view
    findings?: Array<{
      category?: string
      description?: string
      suggested_fix?: string
      recall_number?: string
      company_name?: string
    }>
  }
  // When true, shows full details (for admin/expert view)
  showFullDetails?: boolean
}

interface IntelligenceItem {
  label: string
  count: number
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  description: string
  fdaLink?: string
  fdaLinkLabel?: string
}

export function FDAComplianceIntelligence({ report, showFullDetails = false }: FDAComplianceIntelligenceProps) {
  const [expanded, setExpanded] = useState(showFullDetails) // Auto-expand for admin view

  // Parse counts from heat index values (stored as 0-100 scale)
  // warning_letter_weight: count of matched warning letters
  // recall_heat_index: 0-100 scale, convert to rough count (each recall ~10 points)
  // import_alert_heat_index: 0-100 scale, convert to rough count
  const warningLetterCount = Math.round(report.warning_letter_weight ?? 0)
  const recallCount = Math.round((report.recall_heat_index ?? 0) / 10) // Approximate
  const importAlertCount = Math.round((report.import_alert_heat_index ?? 0) / 20) // Approximate

  // Check if any intelligence data exists
  const hasData = warningLetterCount > 0 || recallCount > 0 || importAlertCount > 0
  
  // Extract recall details from findings for admin view
  const recallFindings = (report.findings || []).filter(
    f => f.category?.toLowerCase().includes('recall') || f.category?.toLowerCase().includes('thu hồi')
  )

  const items: IntelligenceItem[] = [
    {
      label: 'Import Alerts',
      count: importAlertCount,
      icon: ShieldAlert,
      color: importAlertCount > 0 ? 'text-red-700' : 'text-green-700',
      bgColor: importAlertCount > 0 ? 'bg-red-50' : 'bg-green-50',
      borderColor: importAlertCount > 0 ? 'border-red-200' : 'border-green-200',
      description: importAlertCount > 0 
        ? 'FDA Import Alerts matched - risk of detention at port'
        : 'No Import Alerts found - lower detention risk',
      fdaLink: 'https://www.accessdata.fda.gov/cms_ia/ialist.html',
      fdaLinkLabel: 'FDA Import Alert List',
    },
    {
      label: 'Warning Letters',
      count: warningLetterCount,
      icon: FileWarning,
      color: warningLetterCount > 0 ? 'text-amber-700' : 'text-green-700',
      bgColor: warningLetterCount > 0 ? 'bg-amber-50' : 'bg-green-50',
      borderColor: warningLetterCount > 0 ? 'border-amber-200' : 'border-green-200',
      description: warningLetterCount > 0 
        ? 'Similar violations found in FDA Warning Letters'
        : 'No matching Warning Letters - clean compliance history',
      fdaLink: 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters',
      fdaLinkLabel: 'FDA Warning Letters Database',
    },
    {
      label: 'Recalls',
      count: recallCount,
      icon: AlertOctagon,
      color: recallCount > 0 ? 'text-orange-700' : 'text-green-700',
      bgColor: recallCount > 0 ? 'bg-orange-50' : 'bg-green-50',
      borderColor: recallCount > 0 ? 'border-orange-200' : 'border-green-200',
      description: recallCount > 0 
        ? 'Similar issues found in FDA Recall database'
        : 'No matching Recalls - product type has clean record',
      fdaLink: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
      fdaLinkLabel: 'FDA Recalls Database',
    },
  ]

  // Calculate overall status
  const totalIssues = importAlertCount + warningLetterCount + recallCount
  const overallStatus = totalIssues === 0 ? 'safe' : totalIssues <= 2 ? 'warning' : 'critical'

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          FDA Compliance Intelligence
        </h2>
        <Badge 
          className={`text-xs border ${
            overallStatus === 'safe' 
              ? 'bg-green-100 text-green-700 border-green-200'
              : overallStatus === 'warning'
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-red-100 text-red-700 border-red-200'
          }`}
        >
          {overallStatus === 'safe' ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Clean Record
            </>
          ) : (
            <>
              <Info className="h-3 w-3 mr-1" />
              {totalIssues} Issue{totalIssues > 1 ? 's' : ''} Found
            </>
          )}
        </Badge>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={`rounded-lg border p-3 ${item.bgColor} ${item.borderColor}`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className={`text-lg font-bold ${item.color}`}>
                  {item.count}
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Expandable Details */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            Show Details & FDA Links
          </>
        )}
      </Button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={`rounded-lg border p-3 ${item.bgColor} ${item.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 ${item.color}`} />
                    <div>
                      <p className={`text-sm font-medium ${item.color}`}>
                        {item.label}: {item.count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
                {item.fdaLink && (
                  <a
                    href={item.fdaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {item.fdaLinkLabel}
                  </a>
                )}
              </div>
            )
          })}

          {/* ADMIN ONLY: Full Recall Details */}
          {showFullDetails && recallFindings.length > 0 && (
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-700 mb-3 flex items-center gap-2">
                <AlertOctagon className="h-4 w-4" />
                Chi tiết Thu hồi (Chỉ dành cho Chuyên gia)
              </p>
              <div className="space-y-3">
                {recallFindings.map((recall, idx) => {
                  // Parse recall details from description
                  // Format: "...Thu hồi #H-0465-2026 (Công ty Gia vị Organic)..."
                  const recallMatch = recall.description?.match(/Thu hồi #([A-Z0-9-]+)\s*\(([^)]+)\)/i)
                  const recallNumber = recallMatch?.[1] || `RECALL-${idx + 1}`
                  const companyName = recallMatch?.[2] || 'Không xác định'
                  
                  return (
                    <div key={idx} className="bg-white rounded-lg border border-orange-100 p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-orange-700">
                            #{recallNumber}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            {companyName}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                          FDA Recall
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-700 leading-relaxed mb-2">
                        {recall.description}
                      </p>
                      
                      {recall.suggested_fix && (
                        <div className="bg-blue-50 rounded p-2 border border-blue-100">
                          <p className="text-[10px] font-bold uppercase text-blue-700 mb-1">
                            Biện pháp phòng ngừa:
                          </p>
                          <p className="text-xs text-blue-800">
                            {recall.suggested_fix}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Context Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> This intelligence is based on RAG (Retrieval-Augmented Generation) 
              matching against FDA databases. Import Alerts indicate products/firms flagged for 
              detention. Warning Letters show similar compliance violations. Recalls indicate 
              related safety issues in the market.
            </p>
          </div>

          {/* Quick Search Links */}
          {(report.brand_name || report.product_name) && (
            <div className="bg-primary/5 rounded-lg p-3">
              <p className="text-xs font-medium mb-2">Quick FDA Search:</p>
              <div className="flex flex-wrap gap-2">
                {report.brand_name && (
                  <a
                    href={`https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters?search_api_fulltext=${encodeURIComponent(report.brand_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Search &quot;{report.brand_name}&quot;
                  </a>
                )}
                {report.product_category && (
                  <a
                    href={`https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/cfrsearch.cfm?fr=${encodeURIComponent(report.product_category === 'food' ? '101' : report.product_category === 'dietary_supplement' ? '101.36' : '101')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    21 CFR Regulations
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
