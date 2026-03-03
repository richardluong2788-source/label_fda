'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  Globe,
  Info,
  Languages,
  Lightbulb,
  Mail,
  Package,
  Quote,
  RotateCcw,
  Ruler,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
  XCircle,
  Trash2,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LabelImageGallery } from '@/components/label-image-gallery'
import type { Violation, LabelImageEntry } from '@/lib/types'

// ────────────────────────────────────────────────────────────
// Risk Score Circular Gauge
// ────────────────────────────────────────────────────────────

function RiskScoreGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const color =
    score >= 7 ? '#ef4444' : score >= 4 ? '#f59e0b' : '#22c55e'
  const circumference = 2 * Math.PI * 42
  const dashLength = (score / 10) * circumference
  const sizeClass = size === 'sm' ? 'h-16 w-16' : 'h-24 w-24'
  const textClass = size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg viewBox="0 0 100 100" className={`${sizeClass} -rotate-90`}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
        />
      </svg>
      <span className={`absolute ${textClass} font-bold`} style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Confidence Bar
// ────────────────────────────────────────────────────────────

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = pct >= 80 ? 'text-green-700' : pct >= 60 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${textColor}`}>{pct}%</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Severity Badge
// ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-red-500 text-white">
        Critical
      </span>
    )
  }
  if (severity === 'warning') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-amber-500 text-white">
        Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-blue-500 text-white">
      Info
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Source Type Badge
// ────────────────────────────────────────────────────────────

function SourceTypeBadge({ sourceType }: { sourceType?: string }) {
  if (sourceType === 'warning_letter') {
    return <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-xs">Warning Letter</Badge>
  }
  if (sourceType === 'recall') {
    return <Badge className="bg-orange-600 hover:bg-orange-600 text-white text-xs">Recall</Badge>
  }
  if (sourceType === 'import_alert') {
    return <Badge className="bg-cyan-600 hover:bg-cyan-600 text-white text-xs">Import Alert</Badge>
  }
  return <Badge className="bg-slate-600 hover:bg-slate-600 text-white text-xs">CFR Regulation</Badge>
}

// ────────────────────────────────────────────────────────────
// Violation Icon
// ────────────────────────────────────────────────────────────

function ViolationIcon({ severity, type }: { severity: string; type?: string }) {
  if (type === 'warning_letter') {
    return <div className="rounded-full bg-purple-100 p-2 shrink-0"><Mail className="h-4 w-4 text-purple-600" /></div>
  }
  if (type === 'recall') {
    return <div className="rounded-full bg-orange-100 p-2 shrink-0"><RotateCcw className="h-4 w-4 text-orange-600" /></div>
  }
  if (type === 'import_alert') {
    return <div className="rounded-full bg-cyan-100 p-2 shrink-0"><Ship className="h-4 w-4 text-cyan-600" /></div>
  }
  if (severity === 'critical') {
    return <div className="rounded-full bg-red-100 p-2 shrink-0"><AlertCircle className="h-4 w-4 text-red-600" /></div>
  }
  if (severity === 'info') {
    return <div className="rounded-full bg-blue-100 p-2 shrink-0"><Info className="h-4 w-4 text-blue-600" /></div>
  }
  return <div className="rounded-full bg-amber-100 p-2 shrink-0"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
}

// ────────────────────────────────────────────────────────────
// FDA Review Checklist Items
// ────────────────────────────────────────────────────────────

const FDA_CHECKLIST = [
  { id: 'identity', label: 'Product identity statement verified', cfr: '21 CFR 101.3', hint: 'Common/usual name clearly displayed on PDP' },
  { id: 'net_contents', label: 'Net contents declaration checked', cfr: '21 CFR 101.105', hint: 'Correct units (oz/g/ml), proper placement on lower 30% of PDP' },
  { id: 'ingredients', label: 'Ingredient list order verified', cfr: '21 CFR 101.4', hint: 'Listed in descending order by weight, common names used' },
  { id: 'allergens', label: 'Allergen declarations present (FALCPA)', cfr: 'FD&C Act 403(w)', hint: 'Big 9 allergens: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame' },
  { id: 'nutrition', label: 'Nutrition Facts format correct', cfr: '21 CFR 101.9', hint: 'Serving size, calories, 13 mandatory nutrients, %DV, footnote' },
  { id: 'health_claims', label: 'No prohibited health/disease claims', cfr: 'FD&C Act 403(r)', hint: 'No "cures", "treats", "prevents" disease language without FDA approval' },
  { id: 'manufacturer', label: 'Manufacturer/distributor info present', cfr: '21 CFR 101.5', hint: 'Name and address of manufacturer, packer, or distributor' },
  { id: 'warnings', label: 'Required warnings present (if applicable)', cfr: 'Various', hint: 'Juice HACCP, phenylalanine (aspartame), FD&C Yellow No. 5, sulfites' },
  { id: 'font_size', label: 'Font size minimums met', cfr: '21 CFR 101.2', hint: 'Minimum 1/16 inch for most text, varies by PDP area' },
  { id: 'country_origin', label: 'Country of origin declared (if imported)', cfr: '19 CFR 134', hint: 'Required on all imported food products entering the US' },
]

// ────────────────────────────────────────────────────────────
// Main Expert Review Interface
// ────────────────────────────────────────────────────────────

interface ExpertReviewInterfaceProps {
  report: any
  adminUser: any
}

export function ExpertReviewInterface({
  report,
  adminUser,
}: ExpertReviewInterfaceProps) {
  const router = useRouter()
  const [findings, setFindings] = useState(report.findings || [])
  const [reviewNotes, setReviewNotes] = useState(report.review_notes || '')
  const [overallAssessment, setOverallAssessment] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState('cfr')
  const [expandedTips, setExpandedTips] = useState(true)
  const [expandedExtraction, setExpandedExtraction] = useState(true)

  // Categorize findings
  const categorized = useMemo(() => {
    const cfr = findings.filter((v: Violation) =>
      !v.source_type || (v.source_type !== 'warning_letter' && v.source_type !== 'recall' && v.source_type !== 'import_alert')
    )
    const wl = findings.filter((v: Violation) => v.source_type === 'warning_letter')
    const recall = findings.filter((v: Violation) => v.source_type === 'recall')
    const ia = findings.filter((v: Violation) => v.source_type === 'import_alert')
    return { cfr, wl, recall, ia }
  }, [findings])

  // Stats
  const criticalCount = findings.filter((v: Violation) => v.severity === 'critical').length
  const warningCount = findings.filter((v: Violation) => v.severity === 'warning').length
  const checklistComplete = Object.values(checklist).filter(Boolean).length
  const totalCitations = findings.reduce((acc: number, v: Violation) => acc + (v.citations?.length || 0), 0)

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          action: 'approve',
          findings,
          reviewNotes: `[Assessment: ${overallAssessment || 'Not set'}] [Checklist: ${checklistComplete}/${FDA_CHECKLIST.length}]\n${reviewNotes}`,
        }),
      })
      if (response.ok) router.push('/admin')
    } catch (error) {
      console.error('Approve error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          action: 'reject',
          reviewNotes: `[Assessment: ${overallAssessment || 'Not set'}]\n${reviewNotes}`,
        }),
      })
      if (response.ok) router.push('/admin')
    } catch (error) {
      console.error('Reject error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFinding = (globalIndex: number, field: string, value: any) => {
    const updated = [...findings]
    updated[globalIndex] = { ...updated[globalIndex], [field]: value }
    setFindings(updated)
  }

  const deleteFinding = (globalIndex: number) => {
    setFindings(findings.filter((_: any, i: number) => i !== globalIndex))
  }

  const addFinding = () => {
    setFindings([
      ...findings,
      {
        category: 'New Finding',
        severity: 'warning',
        description: '',
        regulation_reference: '',
        suggested_fix: '',
        citations: [],
        confidence_score: 1.0,
      },
    ])
  }

  // Get the global index of a finding by reference
  const getGlobalIndex = (finding: any) => findings.indexOf(finding)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* ─── HEADER ─── */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-bold">Expert Review</h1>
                <p className="text-xs text-muted-foreground">
                  {report.product_name || report.file_name || 'Unnamed Report'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {report.overall_risk_score !== undefined && (
                <div className="flex items-center gap-1.5 mr-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    report.overall_risk_score >= 7 ? 'bg-red-500' :
                    report.overall_risk_score >= 4 ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm font-semibold">
                    Risk: {report.overall_risk_score?.toFixed(1)}/10
                  </span>
                </div>
              )}
              <Badge variant={report.needs_expert_review ? 'destructive' : 'secondary'}>
                {report.needs_expert_review ? 'Requires Review' : 'AI Completed'}
              </Badge>
              <Badge variant="outline">{totalCitations} Citations</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-[1600px]">
        <div className="grid xl:grid-cols-5 gap-6">
          {/* ═══════════════════════════════════════════════════ */}
          {/* LEFT PANEL (2/5) - Label Intelligence Dashboard   */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="xl:col-span-2 space-y-4">

            {/* ─── Product Identity Card ─── */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileSearch className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Product Identity</h2>
                {report.product_type && (
                  <Badge variant="outline" className="ml-auto text-xs capitalize">
                    {report.product_type?.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
              <div className="space-y-2.5">
                {(report as any).brand_name && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-24 shrink-0">Brand:</span>
                    <span className="font-medium">{(report as any).brand_name}</span>
                  </div>
                )}
                {report.product_name && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-24 shrink-0">Product:</span>
                    <span className="font-medium">{report.product_name}</span>
                  </div>
                )}
                {report.product_category && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-24 shrink-0">Category:</span>
                    <span className="font-medium">{report.product_category}</span>
                  </div>
                )}
                {report.target_market && (
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-20 shrink-0">Market:</span>
                    <span className="font-medium">{report.target_market}</span>
                  </div>
                )}
                {report.packaging_format && (
                  <div className="flex items-center gap-2 text-xs">
                    <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-20 shrink-0">Package:</span>
                    <span className="font-medium capitalize">{report.packaging_format?.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {report.pdp_dimensions && (
                  <div className="flex items-center gap-2 text-xs">
                    <Ruler className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-20 shrink-0">PDP Size:</span>
                    <span className="font-medium">
                      {report.pdp_dimensions.width} x {report.pdp_dimensions.height} {report.pdp_dimensions.unit}
                    </span>
                  </div>
                )}
                {report.net_content && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-24 shrink-0">Net Content:</span>
                    <span className="font-medium">
                      {report.net_content.value} {report.net_content.unit}
                    </span>
                  </div>
                )}
                {report.manufacturer_info?.country_of_origin && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-24 shrink-0">Origin:</span>
                    <span className="font-medium">{report.manufacturer_info.country_of_origin}</span>
                    {report.manufacturer_info.is_importer && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Importer</Badge>
                    )}
                  </div>
                )}
                {/* Special Claims */}
                {report.special_claims && report.special_claims.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <span className="text-xs text-muted-foreground block mb-1.5">Special Claims:</span>
                    <div className="flex flex-wrap gap-1">
                      {report.special_claims.map((claim: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs capitalize">
                          {claim.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Show message if no product data */}
                {!report.product_name && !(report as any).brand_name && !report.product_category && (
                  <p className="text-xs text-muted-foreground italic">No product identity data extracted by AI</p>
                )}
              </div>
            </Card>

            {/* ─── Label Image Gallery ─── */}
            <Card className="p-5">
              <h2 className="font-semibold text-sm mb-3">Label Image</h2>
              {report.label_image_url === 'manual-entry' ? (
                <div className="flex items-center justify-center h-32 bg-slate-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Manual Entry</p>
                  </div>
                </div>
              ) : (
                <LabelImageGallery
                  images={(report.label_images as LabelImageEntry[]) || []}
                  fallbackUrl={report.label_image_url}
                />
              )}
            </Card>

            {/* ─── AI Extraction Panel ─── */}
            <Collapsible open={expandedExtraction} onOpenChange={setExpandedExtraction}>
              <Card className="p-5">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-sm">AI Extracted Data</h2>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedExtraction ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {/* Nutrition Facts */}
                  {report.nutrition_facts && report.nutrition_facts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-medium">Nutrition Facts</span>
                        <Badge variant="secondary" className="text-xs ml-auto">{report.nutrition_facts.length}</Badge>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-1">
                          {report.nutrition_facts.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs py-0.5 border-b border-slate-100 last:border-0">
                              <span className="text-muted-foreground">{item.name || item.nutrient}</span>
                              <span className="font-medium">
                                {item.value}{item.unit}
                                {(item.daily_value || item.dailyValue) && (
                                  <span className="text-muted-foreground ml-1">({item.daily_value || item.dailyValue}% DV)</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ingredients */}
                  {report.ingredient_list && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-medium">Ingredients</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {report.ingredient_list.split(/,|;/).map((s: string) => s.trim()).filter(Boolean).slice(0, 12).map((ing: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-xs rounded border border-slate-200 bg-slate-50 text-slate-700">
                            {ing}
                          </span>
                        ))}
                        {report.ingredient_list.split(/,|;/).length > 12 && (
                          <span className="px-2 py-0.5 text-xs rounded border border-slate-200 bg-slate-50 text-slate-400">
                            +{report.ingredient_list.split(/,|;/).length - 12} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Allergens */}
                  {report.allergen_declaration && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-900">Allergen Declaration</span>
                      </div>
                      <p className="text-xs text-amber-800">{report.allergen_declaration}</p>
                    </div>
                  )}

                  {/* Health Claims */}
                  {(report as any).health_claims && (report as any).health_claims.length > 0 && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-900">Health Claims Detected</span>
                      </div>
                      <div className="space-y-1">
                        {(report as any).health_claims.map((claim: string, idx: number) => (
                          <p key={idx} className="text-xs text-purple-800">{'- '}{claim}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detected Languages */}
                  {(report as any).detected_languages && (report as any).detected_languages.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Languages:</span>
                      <div className="flex gap-1">
                        {(report as any).detected_languages.map((lang: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">{lang.toUpperCase()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No data message */}
                  {!report.nutrition_facts?.length && !report.ingredient_list && !report.allergen_declaration && (
                    <p className="text-xs text-muted-foreground italic text-center py-4">
                      No AI-extracted data available for this report
                    </p>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ─── Confidence Meters ─── */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">AI Confidence & Risk</h2>
              </div>

              <div className="flex items-center gap-4 mb-4">
                {/* Risk Score Gauge */}
                {report.overall_risk_score !== undefined ? (
                  <div className="text-center">
                    <RiskScoreGauge score={report.overall_risk_score} size="md" />
                    <p className="text-xs text-muted-foreground mt-1">Current Risk</p>
                  </div>
                ) : (
                  <div className="text-center flex-1">
                    <div className="h-24 w-24 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">N/A</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">No Risk Score</p>
                  </div>
                )}

                {report.projected_risk_score !== undefined && (
                  <div className="text-center">
                    <RiskScoreGauge score={report.projected_risk_score} size="md" />
                    <p className="text-xs text-muted-foreground mt-1">After Fixes</p>
                  </div>
                )}

                {report.risk_assessment && (
                  <div className="flex-1 text-center">
                    <Badge className={`text-sm px-3 py-1.5 ${
                      report.risk_assessment === 'Critical' ? 'bg-red-500 hover:bg-red-500' :
                      report.risk_assessment === 'High' ? 'bg-orange-500 hover:bg-orange-500' :
                      report.risk_assessment === 'Medium' ? 'bg-amber-500 hover:bg-amber-500' :
                      'bg-green-500 hover:bg-green-500'
                    } text-white`}>
                      {report.risk_assessment}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">Assessment</p>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {report.ocr_confidence !== undefined && (
                  <ConfidenceBar label="OCR Quality" value={report.ocr_confidence} />
                )}
                {report.extraction_confidence !== undefined && (
                  <ConfidenceBar label="Extraction" value={report.extraction_confidence} />
                )}
                {report.legal_reasoning_confidence !== undefined && (
                  <ConfidenceBar label="Legal Analysis" value={report.legal_reasoning_confidence} />
                )}
                {report.ocr_confidence === undefined && report.extraction_confidence === undefined && (
                  <p className="text-xs text-muted-foreground italic text-center py-2">No confidence data available</p>
                )}
              </div>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* RIGHT PANEL (3/5) - Findings Analysis Workstation */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="xl:col-span-3 space-y-4">

            {/* ─── Risk Score Banner ─── */}
            <Card className={`p-5 ${
              criticalCount > 0 ? 'border-red-200 bg-red-50/30' :
              warningCount > 0 ? 'border-amber-200 bg-amber-50/30' :
              'border-green-200 bg-green-50/30'
            }`}>
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  {criticalCount > 0 ? (
                    <ShieldAlert className="h-8 w-8 text-red-500" />
                  ) : warningCount > 0 ? (
                    <ShieldAlert className="h-8 w-8 text-amber-500" />
                  ) : (
                    <ShieldCheck className="h-8 w-8 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-bold text-lg">
                      {findings.length} Finding{findings.length !== 1 ? 's' : ''} Detected
                    </h2>
                    <div className="flex gap-1.5">
                      {criticalCount > 0 && (
                        <Badge variant="destructive" className="text-xs">{criticalCount} Critical</Badge>
                      )}
                      {warningCount > 0 && (
                        <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white">{warningCount} Warning</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{categorized.cfr.length} CFR violations</span>
                    {categorized.wl.length > 0 && <span>{categorized.wl.length} Warning Letter patterns</span>}
                    {categorized.recall.length > 0 && <span>{categorized.recall.length} Recall patterns</span>}
                    {categorized.ia.length > 0 && <span>{categorized.ia.length} Import Alerts</span>}
                    <span>{totalCitations} total citations</span>
                  </div>
                </div>
                <Button onClick={addFinding} size="sm" variant="outline" className="shrink-0">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Finding
                </Button>
              </div>

              {/* Enforcement Insights */}
              {report.enforcement_insights && report.enforcement_insights.length > 0 && (
                <div className="mt-4 pt-3 border-t border-dashed">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Enforcement Intelligence</span>
                  </div>
                  <div className="space-y-1">
                    {report.enforcement_insights.slice(0, 3).map((insight: string, i: number) => (
                      <p key={i} className="text-xs text-slate-600 pl-5">{'- '}{insight}</p>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* ─── Expert Tips & AI Summary ─── */}
            {(report.expert_tips?.length > 0 || report.commercial_summary) && (
              <Collapsible open={expandedTips} onOpenChange={setExpandedTips}>
                <Card className="p-5 border-blue-200 bg-blue-50/20">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <h2 className="font-semibold text-sm text-blue-900">Expert Tips & AI Summary</h2>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-blue-400 transition-transform ${expandedTips ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {report.expert_tips && report.expert_tips.length > 0 && (
                      <div className="space-y-1.5">
                        {report.expert_tips.map((tip: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <ChevronRight className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                            <span className="text-blue-800">{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {report.commercial_summary && (
                      <div className="bg-white/60 rounded-lg p-3 mt-2">
                        <span className="text-xs font-medium text-muted-foreground block mb-1">AI Summary:</span>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{report.commercial_summary}</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* ─── Tabbed Findings ─── */}
            <Card className="p-5">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
                  <TabsTrigger value="cfr" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    CFR Violations
                    {categorized.cfr.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-0.5">{categorized.cfr.length}</Badge>
                    )}
                  </TabsTrigger>
                  {categorized.wl.length > 0 && (
                    <TabsTrigger value="wl" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white text-xs gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Warning Letters
                      <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-0.5">{categorized.wl.length}</Badge>
                    </TabsTrigger>
                  )}
                  {categorized.recall.length > 0 && (
                    <TabsTrigger value="recall" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Recalls
                      <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-0.5">{categorized.recall.length}</Badge>
                    </TabsTrigger>
                  )}
                  {categorized.ia.length > 0 && (
                    <TabsTrigger value="ia" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-xs gap-1.5">
                      <Ship className="h-3.5 w-3.5" />
                      Import Alerts
                      <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-0.5">{categorized.ia.length}</Badge>
                    </TabsTrigger>
                  )}
                  {(report.contrast_violations?.length > 0 || report.geometry_violations?.length > 0 || report.multilanguage_issues?.length > 0) && (
                    <TabsTrigger value="visual" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Visual/Geometry
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* CFR Violations Tab */}
                <TabsContent value="cfr" className="mt-0">
                  <div className="space-y-3 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
                    {categorized.cfr.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">No CFR Violations Found</p>
                        <p className="text-xs text-muted-foreground">Label appears compliant with checked regulations</p>
                      </div>
                    ) : (
                      categorized.cfr.map((finding: any) => {
                        const idx = getGlobalIndex(finding)
                        return (
                          <FindingCard
                            key={idx}
                            finding={finding}
                            globalIndex={idx}
                            onUpdate={updateFinding}
                            onDelete={deleteFinding}
                          />
                        )
                      })
                    )}
                  </div>
                </TabsContent>

                {/* Warning Letters Tab */}
                <TabsContent value="wl" className="mt-0">
                  <div className="rounded-lg bg-purple-50 border-l-4 border-purple-400 p-3 mb-3">
                    <p className="text-xs text-purple-800">
                      These are patterns from actual FDA Warning Letters with similar language. They signal high enforcement risk but are not direct CFR violations.
                    </p>
                  </div>
                  <div className="space-y-3 max-h-[calc(100vh-28rem)] overflow-y-auto pr-1">
                    {categorized.wl.map((finding: any) => {
                      const idx = getGlobalIndex(finding)
                      return (
                        <FindingCard
                          key={idx}
                          finding={finding}
                          globalIndex={idx}
                          onUpdate={updateFinding}
                          onDelete={deleteFinding}
                        />
                      )
                    })}
                  </div>
                </TabsContent>

                {/* Recalls Tab */}
                <TabsContent value="recall" className="mt-0">
                  <div className="rounded-lg bg-orange-50 border-l-4 border-orange-400 p-3 mb-3">
                    <p className="text-xs text-orange-800">
                      These findings match patterns from FDA recalled products. Not a prediction of recall, but a risk signal based on similar ingredients, claims, or label structures.
                    </p>
                  </div>
                  <div className="space-y-3 max-h-[calc(100vh-28rem)] overflow-y-auto pr-1">
                    {categorized.recall.map((finding: any) => {
                      const idx = getGlobalIndex(finding)
                      return (
                        <FindingCard
                          key={idx}
                          finding={finding}
                          globalIndex={idx}
                          onUpdate={updateFinding}
                          onDelete={deleteFinding}
                        />
                      )
                    })}
                  </div>
                </TabsContent>

                {/* Import Alerts Tab */}
                <TabsContent value="ia" className="mt-0">
                  <div className="rounded-lg bg-cyan-50 border-l-4 border-cyan-400 p-3 mb-3">
                    <p className="text-xs text-cyan-800">
                      Import Alerts indicate border enforcement risk. A label can pass all CFR checks but still face DWPE (Detention Without Physical Examination) at US ports.
                    </p>
                  </div>
                  <div className="space-y-3 max-h-[calc(100vh-28rem)] overflow-y-auto pr-1">
                    {categorized.ia.map((finding: any) => {
                      const idx = getGlobalIndex(finding)
                      return (
                        <FindingCard
                          key={idx}
                          finding={finding}
                          globalIndex={idx}
                          onUpdate={updateFinding}
                          onDelete={deleteFinding}
                        />
                      )
                    })}
                  </div>
                </TabsContent>

                {/* Visual/Geometry Tab */}
                <TabsContent value="visual" className="mt-0">
                  <div className="space-y-4 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
                    {/* Contrast Violations */}
                    {report.contrast_violations && report.contrast_violations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-gradient-to-r from-slate-900 to-slate-300" />
                          Contrast Violations ({report.contrast_violations.length})
                        </h3>
                        <div className="space-y-2">
                          {report.contrast_violations.map((cv: any, i: number) => (
                            <div key={i} className={`rounded-lg p-3 text-xs ${
                              cv.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{cv.type}</span>
                                <SeverityBadge severity={cv.severity} />
                              </div>
                              <p className="text-muted-foreground">{cv.description}</p>
                              {cv.ratio && <p className="mt-1">Contrast ratio: <strong>{cv.ratio.toFixed(2)}:1</strong></p>}
                              {cv.recommendation && <p className="mt-1 text-blue-700">{cv.recommendation}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Geometry Violations */}
                    {report.geometry_violations && report.geometry_violations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Geometry Violations ({report.geometry_violations.length})
                        </h3>
                        <div className="space-y-2">
                          {report.geometry_violations.map((gv: any, i: number) => (
                            <div key={i} className={`rounded-lg p-3 text-xs ${
                              gv.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium capitalize">{gv.type.replace(/_/g, ' ')}</span>
                                <SeverityBadge severity={gv.severity} />
                              </div>
                              <p className="text-muted-foreground">{gv.description}</p>
                              <div className="flex gap-4 mt-1">
                                <span>Expected: <strong>{gv.expected}</strong></span>
                                <span>Actual: <strong>{gv.actual}</strong></span>
                              </div>
                              <p className="mt-1 font-mono text-primary">{gv.regulation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Multilanguage Issues */}
                    {report.multilanguage_issues && report.multilanguage_issues.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          Language Issues ({report.multilanguage_issues.length})
                        </h3>
                        <div className="space-y-2">
                          {report.multilanguage_issues.map((ml: any, i: number) => (
                            <div key={i} className="rounded-lg p-3 text-xs bg-amber-50 border border-amber-200">
                              <p className="text-muted-foreground">{ml.description}</p>
                              {ml.detectedLanguages?.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {ml.detectedLanguages.map((l: string, j: number) => (
                                    <Badge key={j} variant="outline" className="text-xs">{l}</Badge>
                                  ))}
                                </div>
                              )}
                              {ml.missingFields?.length > 0 && (
                                <p className="mt-1 text-red-700">Missing: {ml.missingFields.join(', ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!report.contrast_violations?.length && !report.geometry_violations?.length && !report.multilanguage_issues?.length && (
                      <div className="text-center py-8">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">No Visual/Geometry Issues</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            {/* ─── FDA Review Checklist ─── */}
            <Card className="p-5 border-indigo-200 bg-indigo-50/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                  <h2 className="font-semibold text-sm text-indigo-900">FDA Review Checklist</h2>
                </div>
                <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700">
                  {checklistComplete}/{FDA_CHECKLIST.length} completed
                </Badge>
              </div>
              <Progress value={(checklistComplete / FDA_CHECKLIST.length) * 100} className="h-1.5 mb-4" />
              <div className="space-y-2">
                {FDA_CHECKLIST.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                      checklist[item.id] ? 'bg-green-50 border border-green-200' : 'bg-white border border-slate-200'
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={!!checklist[item.id]}
                      onCheckedChange={(checked) =>
                        setChecklist((prev) => ({ ...prev, [item.id]: !!checked }))
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={item.id} className="text-xs font-medium cursor-pointer block">
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs text-primary font-mono">{item.cfr}</code>
                        <span className="text-xs text-muted-foreground">{'- '}{item.hint}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ─── Review Decision Station ─── */}
            <Card className="p-5 border-slate-300">
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Save className="h-4 w-4" />
                Review Decision
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-xs mb-1.5 block">Overall Assessment</Label>
                  <Select value={overallAssessment} onValueChange={setOverallAssessment}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select assessment..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliant">Compliant - No Issues</SelectItem>
                      <SelectItem value="minor_issues">Minor Issues - Acceptable</SelectItem>
                      <SelectItem value="major_issues">Major Issues - Needs Revision</SelectItem>
                      <SelectItem value="non_compliant">Non-Compliant - Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Checklist Progress</Label>
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/30">
                    <span className="text-xs text-muted-foreground">
                      {checklistComplete}/{FDA_CHECKLIST.length} items verified
                    </span>
                    {checklistComplete === FDA_CHECKLIST.length && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto" />
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-xs mb-1.5 block">Review Notes</Label>
                <Textarea
                  placeholder="Add your expert notes, observations, and reasoning here..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Publish
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Enhanced Finding Card (Editable)
// ────────────────────────────────────────────────────────────

interface FindingCardProps {
  finding: any
  globalIndex: number
  onUpdate: (index: number, field: string, value: any) => void
  onDelete: (index: number) => void
}

function FindingCard({ finding, globalIndex, onUpdate, onDelete }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false)

  const borderClass = finding.severity === 'critical'
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
                onChange={(e) => onUpdate(globalIndex, 'severity', e.target.value)}
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
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                finding.risk_score >= 7 ? 'bg-red-100 text-red-700' :
                finding.risk_score >= 4 ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
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
          onChange={(e) => onUpdate(globalIndex, 'regulation_reference', e.target.value)}
          className="w-full text-xs font-mono bg-white/60 border rounded px-2 py-1.5"
          placeholder="e.g., 21 CFR 101.9"
        />
      </div>

      {/* Suggested Fix */}
      <div className="bg-blue-50/50 rounded-lg p-2.5 mb-2 border border-blue-100">
        <Label className="text-xs font-medium text-blue-800 mb-1 block">Suggested Fix:</Label>
        <Textarea
          value={finding.suggested_fix}
          onChange={(e) => onUpdate(globalIndex, 'suggested_fix', e.target.value)}
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
              <span className="text-xs font-medium text-slate-500">Legal Basis:</span>
              <p className="text-xs text-slate-700">{finding.legal_basis}</p>
            </div>
          )}
          {finding.enforcement_context && (
            <div>
              <span className="text-xs font-medium text-slate-500">Enforcement Context:</span>
              <p className="text-xs text-slate-700">{finding.enforcement_context}</p>
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
            {finding.citations.length} Citation{finding.citations.length !== 1 ? 's' : ''}
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2 pl-2 border-l-2 border-primary/20">
              {finding.citations.map((citation: any, citIdx: number) => (
                <div key={citIdx} className="bg-white/80 rounded p-2.5 text-xs border">
                  <p className="font-medium text-foreground mb-1">{citation.section || citation.regulation_id}</p>
                  {citation.text && (
                    <blockquote className="text-muted-foreground italic text-xs leading-relaxed mb-1.5">
                      {'"'}{citation.text}{'"'}
                    </blockquote>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>Source: {citation.source}</span>
                    <span className={`font-medium ${
                      citation.relevance_score >= 0.8 ? 'text-green-600' :
                      citation.relevance_score >= 0.5 ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      Relevance: {(citation.relevance_score * 100).toFixed(0)}%
                    </span>
                    {citation.relevance_tier && (
                      <Badge variant="outline" className="text-xs capitalize">{citation.relevance_tier}</Badge>
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
