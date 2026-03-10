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
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AIAnalysis {
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical'
    summary: string
  }
  importAlertAnalysis: {
    relevance: 'none' | 'low' | 'medium' | 'high'
    insight: string
    action: string
  }
  warningLetterAnalysis: {
    relevance: 'none' | 'low' | 'medium' | 'high'
    insight: string
    action: string
  }
  recallAnalysis: {
    relevance: 'none' | 'low' | 'medium' | 'high'
    insight: string
    action: string
  }
  expertRecommendations: Array<{
    recommendation: string
    priority: 'immediate' | 'short-term' | 'long-term'
    rationale: string
  }>
  complianceScore: {
    score: number
    interpretation: string
  }
}

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
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // AI Analysis handler
  const handleAIAnalysis = async () => {
    setAiAnalyzing(true)
    setAiError(null)
    try {
      const res = await fetch('/api/admin/fda-intelligence-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: report.product_name,
          productCategory: report.product_category,
          brandName: report.brand_name,
          targetMarket: 'US',
          importAlertCount: Math.round((report.import_alert_heat_index ?? 0) / 20),
          warningLetterCount: Math.round(report.warning_letter_weight ?? 0),
          recallCount: Math.round((report.recall_heat_index ?? 0) / 10),
          findings: report.findings,
          overallRiskScore: (report as any).overall_risk_score,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'AI analysis failed')
      }

      const { analysis } = await res.json()
      setAiAnalysis(analysis)
    } catch (err: any) {
      setAiError(err.message)
    } finally {
      setAiAnalyzing(false)
    }
  }

  // Parse counts from heat index values (stored as 0-100 scale)
  // warning_letter_weight: count of matched warning letters
  // recall_heat_index: 0-100 scale, convert to rough count (each recall ~10 points)
  // import_alert_heat_index: 0-100 scale, convert to rough count
  const warningLetterCount = Math.round(report.warning_letter_weight ?? 0)
  const recallCount = Math.round((report.recall_heat_index ?? 0) / 10) // Approximate
  const importAlertCount = Math.round((report.import_alert_heat_index ?? 0) / 20) // Approximate

  // Check if any intelligence data exists
  const hasData = warningLetterCount > 0 || recallCount > 0 || importAlertCount > 0
  
  // Extract details from findings for admin view
  const recallFindings = (report.findings || []).filter(
    f => f.category?.toLowerCase().includes('recall') || f.category?.toLowerCase().includes('thu hồi')
  )
  const importAlertFindings = (report.findings || []).filter(
    f => f.category?.toLowerCase().includes('import') || f.category?.toLowerCase().includes('alert') || f.category?.toLowerCase().includes('detention')
  )
  const warningLetterFindings = (report.findings || []).filter(
    f => f.category?.toLowerCase().includes('warning') || f.category?.toLowerCase().includes('letter') || f.category?.toLowerCase().includes('cảnh báo')
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
        <div className="flex items-center gap-2">
          {/* AI Analysis button - only for admin */}
          {showFullDetails && !aiAnalysis && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAIAnalysis}
              disabled={aiAnalyzing}
              className="h-7 text-xs bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-200 hover:border-violet-300 text-violet-700"
            >
              {aiAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Phân tích
                </>
              )}
            </Button>
          )}
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
      </div>

      {/* AI Analysis Results */}
      {aiError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {aiError}
        </div>
      )}

      {aiAnalysis && (
        <div className="mb-4 space-y-4 p-4 rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 border border-violet-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-violet-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Phân tích AI - FDA Intelligence
            </h3>
            <Badge className={`text-xs ${
              aiAnalysis.riskAssessment.level === 'low' ? 'bg-green-100 text-green-700 border-green-200' :
              aiAnalysis.riskAssessment.level === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              aiAnalysis.riskAssessment.level === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' :
              'bg-red-100 text-red-700 border-red-200'
            }`}>
              Rủi ro: {aiAnalysis.riskAssessment.level.toUpperCase()}
            </Badge>
          </div>

          {/* Risk Summary */}
          <div className="bg-white/80 rounded-lg p-3 border border-violet-100">
            <p className="text-sm text-slate-700">{aiAnalysis.riskAssessment.summary}</p>
          </div>

          {/* Compliance Score */}
          <div className="bg-white/80 rounded-lg p-3 border border-violet-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">Điểm Tuân thủ FDA</span>
              <span className={`text-lg font-bold ${
                aiAnalysis.complianceScore.score >= 80 ? 'text-green-600' :
                aiAnalysis.complianceScore.score >= 60 ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {aiAnalysis.complianceScore.score}/100
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  aiAnalysis.complianceScore.score >= 80 ? 'bg-green-500' :
                  aiAnalysis.complianceScore.score >= 60 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${aiAnalysis.complianceScore.score}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">{aiAnalysis.complianceScore.interpretation}</p>
          </div>

          {/* Analysis by Type */}
          <div className="grid gap-3">
            {/* Import Alert Analysis */}
            {aiAnalysis.importAlertAnalysis.relevance !== 'none' && (
              <div className="bg-white/80 rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-bold text-red-700">Import Alerts</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    Liên quan: {aiAnalysis.importAlertAnalysis.relevance}
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 mb-2">{aiAnalysis.importAlertAnalysis.insight}</p>
                <div className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 rounded p-2">
                  <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                  {aiAnalysis.importAlertAnalysis.action}
                </div>
              </div>
            )}

            {/* Warning Letter Analysis */}
            {aiAnalysis.warningLetterAnalysis.relevance !== 'none' && (
              <div className="bg-white/80 rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileWarning className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">Warning Letters</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    Liên quan: {aiAnalysis.warningLetterAnalysis.relevance}
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 mb-2">{aiAnalysis.warningLetterAnalysis.insight}</p>
                <div className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 rounded p-2">
                  <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                  {aiAnalysis.warningLetterAnalysis.action}
                </div>
              </div>
            )}

            {/* Recall Analysis */}
            {aiAnalysis.recallAnalysis.relevance !== 'none' && (
              <div className="bg-white/80 rounded-lg p-3 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertOctagon className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-bold text-orange-700">Recalls</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    Liên quan: {aiAnalysis.recallAnalysis.relevance}
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 mb-2">{aiAnalysis.recallAnalysis.insight}</p>
                <div className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 rounded p-2">
                  <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                  {aiAnalysis.recallAnalysis.action}
                </div>
              </div>
            )}
          </div>

          {/* Expert Recommendations */}
          {aiAnalysis.expertRecommendations.length > 0 && (
            <div className="bg-white/80 rounded-lg p-3 border border-violet-100">
              <h4 className="text-xs font-bold text-violet-800 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Khuyến nghị từ AI
              </h4>
              <div className="space-y-2">
                {aiAnalysis.expertRecommendations.map((rec, idx) => (
                  <div key={idx} className={`p-2 rounded border-l-2 ${
                    rec.priority === 'immediate' ? 'border-l-red-500 bg-red-50/50' :
                    rec.priority === 'short-term' ? 'border-l-amber-500 bg-amber-50/50' :
                    'border-l-blue-500 bg-blue-50/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${
                        rec.priority === 'immediate' ? 'border-red-300 text-red-700' :
                        rec.priority === 'short-term' ? 'border-amber-300 text-amber-700' :
                        'border-blue-300 text-blue-700'
                      }`}>
                        {rec.priority === 'immediate' ? 'Ngay lập tức' :
                         rec.priority === 'short-term' ? 'Ngắn hạn' : 'Dài hạn'}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-slate-800">{rec.recommendation}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{rec.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

          {/* ADMIN ONLY: Full Import Alert Details */}
          {showFullDetails && importAlertFindings.length > 0 && (
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-red-700 mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Chi tiết Import Alert (Chỉ dành cho Chuyên gia)
              </p>
              <div className="space-y-3">
                {importAlertFindings.map((alert, idx) => {
                  // Parse alert details from description
                  const alertMatch = alert.description?.match(/Import Alert #?([A-Z0-9-]+)/i)
                  const alertNumber = alertMatch?.[1] || `IA-${idx + 1}`
                  
                  return (
                    <div key={idx} className="bg-white rounded-lg border border-red-100 p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-red-700">
                          #{alertNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                          FDA Import Alert
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-700 leading-relaxed mb-2">
                        {alert.description}
                      </p>
                      
                      {alert.suggested_fix && (
                        <div className="bg-blue-50 rounded p-2 border border-blue-100">
                          <p className="text-[10px] font-bold uppercase text-blue-700 mb-1">
                            Hành động khuyến nghị:
                          </p>
                          <p className="text-xs text-blue-800">
                            {alert.suggested_fix}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ADMIN ONLY: Full Warning Letter Details */}
          {showFullDetails && warningLetterFindings.length > 0 && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2">
                <FileWarning className="h-4 w-4" />
                Chi tiết Warning Letter (Chỉ dành cho Chuyên gia)
              </p>
              <div className="space-y-3">
                {warningLetterFindings.map((letter, idx) => {
                  // Parse warning letter details from description
                  const letterMatch = letter.description?.match(/Warning Letter #?([A-Z0-9-]+)/i)
                  const letterNumber = letterMatch?.[1] || `WL-${idx + 1}`
                  
                  return (
                    <div key={idx} className="bg-white rounded-lg border border-amber-100 p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-amber-700">
                          #{letterNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                          FDA Warning Letter
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-700 leading-relaxed mb-2">
                        {letter.description}
                      </p>
                      
                      {letter.suggested_fix && (
                        <div className="bg-blue-50 rounded p-2 border border-blue-100">
                          <p className="text-[10px] font-bold uppercase text-blue-700 mb-1">
                            Hành động khắc phục:
                          </p>
                          <p className="text-xs text-blue-800">
                            {letter.suggested_fix}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
                  const recallMatch = recall.description?.match(/Thu hồi #([A-Z0-9-]+)\s*\(([^)]+)\)/i) || 
                                      recall.description?.match(/Recall #([A-Z0-9-]+)\s*\(([^)]+)\)/i)
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
