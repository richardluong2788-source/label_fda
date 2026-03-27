'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Info,
  Mail,
  Quote,
  RotateCcw,
  Ship,
  Trash2,
} from 'lucide-react'

// ────────────────────────────────────────────────────────────
// Helper: Extract recall info from description/regulation_reference
// For backward compatibility with old data that doesn't have separate fields
// ────────────────────────────────────────────────────────────

interface ExtractedRecallInfo {
  recall_number?: string
  recalling_firm?: string
  recall_classification?: string
  recall_reason?: string
  preventive_action?: string
}

function extractRecallInfoFromText(finding: {
  description?: string
  regulation_reference?: string
  recall_number?: string
  recalling_firm?: string
  recall_classification?: string
  recall_reason?: string
  preventive_action?: string
  suggested_fix?: string
}): ExtractedRecallInfo {
  // If already has explicit fields, use them
  if (finding.recall_number || finding.recalling_firm) {
    return {
      recall_number: finding.recall_number,
      recalling_firm: finding.recalling_firm,
      recall_classification: finding.recall_classification,
      recall_reason: finding.recall_reason,
      preventive_action: finding.preventive_action,
    }
  }

  const result: ExtractedRecallInfo = {}
  const desc = finding.description || ''
  const ref = finding.regulation_reference || ''

  // Extract recall number: "Recall #H-0434-2026" or "FDA Recall H-0434-2026"
  const recallMatch = desc.match(/Recall\s*#?(H-\d{4}-\d{4})/i) || ref.match(/FDA\s+Recall\s+(H-\d{4}-\d{4})/i)
  if (recallMatch) {
    result.recall_number = recallMatch[1]
  }

  // Extract company name: "(SUPERFOODS, INC.)" or "(Company Name)"
  const companyMatch = desc.match(/\(([A-Z][A-Za-z\s,\.]+(?:LLC|INC|Inc|Corp|Co|Ltd)?\.?)\)/i)
  if (companyMatch) {
    result.recalling_firm = companyMatch[1].trim()
  }

  // Extract classification from description: "Class I" / "Class II" / "Class III"
  const classMatch = desc.match(/Class\s+(I{1,3}|1|2|3)/i)
  if (classMatch) {
    const classNum = classMatch[1].toUpperCase()
    result.recall_classification = classNum === '1' ? 'Class I' : classNum === '2' ? 'Class II' : classNum === '3' ? 'Class III' : `Class ${classNum}`
  }

  // Extract reason: "Reason: ..." until next sentence
  const reasonMatch = desc.match(/Reason:\s*([^.]+\.)/i)
  if (reasonMatch) {
    result.recall_reason = reasonMatch[1].trim()
  }

  // Extract preventive action from suggested_fix or description
  const preventiveMatch = desc.match(/Preventive action:\s*(.+?)(?:\.|$)/i)
  if (preventiveMatch) {
    result.preventive_action = preventiveMatch[1].trim()
  } else if (finding.suggested_fix) {
    result.preventive_action = finding.suggested_fix
  }

  return result
}

// ────────────────────────────────────────────────────────────
// Local Violation Icon (Expert Review specific)
// ────────────────────────────────────────────────────────────

function ViolationIcon({ severity, type }: { severity: string; type?: string }) {
  if (type === 'warning_letter') {
    return (
      <div className="rounded-full bg-purple-100 p-2 shrink-0">
        <Mail className="h-4 w-4 text-purple-600" />
      </div>
    )
  }
  if (type === 'recall') {
    return (
      <div className="rounded-full bg-orange-100 p-2 shrink-0">
        <RotateCcw className="h-4 w-4 text-orange-600" />
      </div>
    )
  }
  if (type === 'import_alert') {
    return (
      <div className="rounded-full bg-cyan-100 p-2 shrink-0">
        <Ship className="h-4 w-4 text-cyan-600" />
      </div>
    )
  }
  if (severity === 'critical') {
    return (
      <div className="rounded-full bg-red-100 p-2 shrink-0">
        <AlertCircle className="h-4 w-4 text-red-600" />
      </div>
    )
  }
  if (severity === 'info') {
    return (
      <div className="rounded-full bg-blue-100 p-2 shrink-0">
        <Info className="h-4 w-4 text-blue-600" />
      </div>
    )
  }
  return (
    <div className="rounded-full bg-amber-100 p-2 shrink-0">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Source Type Badge
// ────────────────────────────────────────────────────────────

function SourceTypeBadge({ sourceType }: { sourceType?: string }) {
  if (sourceType === 'warning_letter') {
    return (
      <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-xs">
        Warning Letter
      </Badge>
    )
  }
  if (sourceType === 'recall') {
    return (
      <Badge className="bg-orange-600 hover:bg-orange-600 text-white text-xs">
        Recall
      </Badge>
    )
  }
  if (sourceType === 'import_alert') {
    return (
      <Badge className="bg-cyan-600 hover:bg-cyan-600 text-white text-xs">
        Import Alert
      </Badge>
    )
  }
  return (
    <Badge className="bg-slate-600 hover:bg-slate-600 text-white text-xs">
      CFR Regulation
    </Badge>
  )
}

// ────────────────────────────────────────────────────────────
// Enhanced Finding Card (Editable)
// ────────────────────────────────────────────────────────────

export interface FindingCardProps {
  finding: any
  globalIndex: number
  onUpdate: (index: number, field: string, value: any) => void
  onDelete: (index: number) => void
}

export function FindingCard({
  finding,
  globalIndex,
  onUpdate,
  onDelete,
}: FindingCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Extract recall info from description if not available as separate fields
  const recallInfo = useMemo(() => {
    if (finding.source_type === 'recall') {
      return extractRecallInfoFromText(finding)
    }
    return null
  }, [finding])

  const borderClass =
    finding.severity === 'critical'
      ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/30'
      : finding.severity === 'info'
        ? 'border-l-4 border-l-blue-500 border-blue-200 bg-blue-50/30'
        : 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/30'

  return (
    <Card className={`p-4 ${borderClass}`}>
      {/* Header Row */}
      <div className="flex items-start gap-3 mb-3">
        <ViolationIcon severity={finding.severity} type={finding.source_type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <input
              type="text"
              value={finding.category}
              onChange={(e) => onUpdate(globalIndex, 'category', e.target.value)}
              className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={finding.severity}
                onChange={(e) =>
                  onUpdate(globalIndex, 'severity', e.target.value)
                }
                className="text-xs border rounded px-1.5 py-0.5 bg-white"
              >
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <SourceTypeBadge sourceType={finding.source_type} />
            </div>
          </div>

          {/* Risk Score + Enforcement inline */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {finding.risk_score !== undefined && (
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  finding.risk_score >= 7
                    ? 'bg-red-100 text-red-700'
                    : finding.risk_score >= 4
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                }`}
              >
                Risk: {finding.risk_score}/10
              </span>
            )}
            {finding.enforcement_frequency && finding.enforcement_frequency > 0 && (
              <span className="text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                {finding.enforcement_frequency}x FDA enforced
              </span>
            )}
            {finding.confidence_score !== undefined && (
              <span className="text-xs text-muted-foreground">
                AI Conf: {Math.round(finding.confidence_score * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <Textarea
        value={finding.description}
        onChange={(e) => onUpdate(globalIndex, 'description', e.target.value)}
        rows={2}
        className="text-xs mb-2 bg-white/60"
        placeholder="Describe the violation..."
      />

      {/* Regulation Reference */}
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={finding.regulation_reference}
          onChange={(e) =>
            onUpdate(globalIndex, 'regulation_reference', e.target.value)
          }
          className="w-full text-xs font-mono bg-white/60 border rounded px-2 py-1.5"
          placeholder="e.g., 21 CFR 101.9"
        />
      </div>

      {/* Suggested Fix */}
      <div className="bg-blue-50/50 rounded-lg p-2.5 mb-2 border border-blue-100">
        <Label className="text-xs font-medium text-blue-800 mb-1 block">
          Suggested Fix:
        </Label>
        <Textarea
          value={finding.suggested_fix}
          onChange={(e) =>
            onUpdate(globalIndex, 'suggested_fix', e.target.value)
          }
          rows={2}
          className="text-xs bg-white/80 border-blue-200"
          placeholder="How to fix this issue..."
        />
      </div>

      {/* Legal Basis / Enforcement Context (read-only from AI) */}
      {(finding.legal_basis || finding.enforcement_context) && (
        <div className="bg-slate-50 rounded-lg p-2.5 mb-2 border space-y-1.5">
          {finding.legal_basis && (
            <div>
              <span className="text-xs font-medium text-slate-500">
                Legal Basis:
              </span>
              <p className="text-xs text-slate-700">{finding.legal_basis}</p>
            </div>
          )}
          {finding.enforcement_context && (
            <div>
              <span className="text-xs font-medium text-slate-500">
                Enforcement Context:
              </span>
              <p className="text-xs text-slate-700">
                {finding.enforcement_context}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recall Details Section (for source_type === 'recall') */}
      {finding.source_type === 'recall' && recallInfo && (recallInfo.recall_number || recallInfo.recalling_firm || recallInfo.preventive_action) && (
        <div className="bg-orange-50 rounded-lg p-3 mb-2 border border-orange-200 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
              FDA Recall Details
            </span>
          </div>
          
          {/* Recall Number */}
          {recallInfo.recall_number && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-orange-700 shrink-0 w-32">
                Recall Number:
              </span>
              <span className="text-xs font-mono text-orange-900 bg-orange-100 px-1.5 py-0.5 rounded">
                {recallInfo.recall_number}
              </span>
            </div>
          )}
          
          {/* Recalling Firm */}
          {recallInfo.recalling_firm && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-orange-700 shrink-0 w-32">
                Company:
              </span>
              <span className="text-xs text-orange-900">
                {recallInfo.recalling_firm}
              </span>
            </div>
          )}
          
          {/* Classification */}
          {recallInfo.recall_classification && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-orange-700 shrink-0 w-32">
                Classification:
              </span>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  recallInfo.recall_classification === 'Class I' 
                    ? 'border-red-500 text-red-700 bg-red-50' 
                    : recallInfo.recall_classification === 'Class II'
                      ? 'border-amber-500 text-amber-700 bg-amber-50'
                      : 'border-slate-500 text-slate-700 bg-slate-50'
                }`}
              >
                {recallInfo.recall_classification}
              </Badge>
            </div>
          )}
          
          {/* Recall Reason */}
          {recallInfo.recall_reason && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-orange-700 shrink-0 w-32">
                Reason:
              </span>
              <span className="text-xs text-orange-900 leading-relaxed">
                {recallInfo.recall_reason}
              </span>
            </div>
          )}
          
          {/* Preventive Action */}
          {recallInfo.preventive_action && (
            <div className="mt-2 pt-2 border-t border-orange-200">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span className="text-xs font-medium text-orange-800">
                  Preventive Action:
                </span>
              </div>
              <p className="text-xs text-orange-900 bg-white/60 p-2 rounded border border-orange-100 leading-relaxed">
                {recallInfo.preventive_action}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Warning Letter Link */}
      {finding.warning_letter_id && (
        <a
          href={`https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/${finding.warning_letter_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-purple-700 hover:underline mb-2"
        >
          View Warning Letter on FDA.gov <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {/* Import Alert Link */}
      {finding.import_alert_number && (
        <a
          href={`https://www.accessdata.fda.gov/cms_ia/ialist.html#${finding.import_alert_number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline mb-2"
        >
          View Import Alert on FDA.gov <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {/* Expandable: Citations */}
      {finding.citations && finding.citations.length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-1">
            <Quote className="h-3 w-3" />
            {finding.citations.length} Citation
            {finding.citations.length !== 1 ? 's' : ''}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2 pl-2 border-l-2 border-primary/20">
              {finding.citations.map((citation: any, citIdx: number) => (
                <div
                  key={citIdx}
                  className="bg-white/80 rounded p-2.5 text-xs border"
                >
                  <p className="font-medium text-foreground mb-1">
                    {citation.section || citation.regulation_id}
                  </p>
                  {citation.text && (
                    <blockquote className="text-muted-foreground italic text-xs leading-relaxed mb-1.5">
                      {'"'}
                      {citation.text}
                      {'"'}
                    </blockquote>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>Source: {citation.source}</span>
                    <span
                      className={`font-medium ${
                        citation.relevance_score >= 0.8
                          ? 'text-green-600'
                          : citation.relevance_score >= 0.5
                            ? 'text-amber-600'
                            : 'text-slate-500'
                      }`}
                    >
                      Relevance: {(citation.relevance_score * 100).toFixed(0)}%
                    </span>
                    {citation.relevance_tier && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {citation.relevance_tier}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Footer: Delete */}
      <div className="flex items-center justify-end pt-2 mt-2 border-t">
        <Button
          onClick={() => onDelete(globalIndex)}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive text-xs h-7"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </Card>
  )
}
