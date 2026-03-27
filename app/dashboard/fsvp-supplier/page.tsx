'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Building2, 
  ClipboardCheck,
  Download,
  Plus,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  FileCheck,
  Users,
  Calendar,
  ChevronRight,
  Beaker,
  FileWarning,
  ShieldCheck,
  Target,
  FolderOpen
} from 'lucide-react'
import { SupplierHazardAnalysisTool } from '@/components/fsvp/supplier-hazard-analysis'
import { SupplierSelfAssessmentTool } from '@/components/fsvp/supplier-self-assessment'
import { SupplierDocumentManager } from '@/components/fsvp/supplier-document-manager'
import { SupplierAuditReadiness } from '@/components/fsvp/supplier-audit-readiness'
import { SAHCODHARiskAssessmentTool } from '@/components/fsvp/sahcodha-risk-assessment'
import { SupplierHistoricalAlerts } from '@/components/fsvp/supplier-historical-alerts'
import { SupplierDocumentPreparation } from '@/components/fsvp/supplier-document-preparation'
import type { SupplierDashboardStats } from '@/lib/fsvp-supplier-types'

// Mock data for demo
const mockStats: SupplierDashboardStats = {
  compliance_score: 78,
  audit_readiness_score: 65,
  total_products: 12,
  products_with_hazard_analysis: 8,
  products_pending_analysis: 4,
  sahcodha_products: 2,
  certifications_active: 5,
  certifications_expiring_soon: 1,
  documents_up_to_date: 18,
  documents_needing_update: 3,
  open_corrective_actions: 2,
  overdue_corrective_actions: 1,
  us_importers_count: 3,
  last_audit_date: '2025-09-15',
  next_audit_due: '2026-03-15',
  days_until_next_audit: 4
}

function ComplianceScoreCard({ score, label }: { score: number; label: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-500'
    if (s >= 70) return 'text-amber-500'
    return 'text-red-500'
  }
  
  const getProgressColor = (s: number) => {
    if (s >= 90) return 'bg-green-500'
    if (s >= 70) return 'bg-amber-500'
    return 'bg-red-500'
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
      </div>
      <Progress 
        value={score} 
        className="h-2"
        style={{ 
          '--progress-background': 'hsl(var(--muted))',
        } as React.CSSProperties}
      />
    </div>
  )
}

export default function FSVPSupplierPortalPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  // Get initial tab from URL params
  const tabParam = searchParams.get('tab')
  const highlightId = searchParams.get('highlight')
  const isNew = searchParams.get('new') === 'true'
  const productParam = searchParams.get('product') // For supplier self-assessment flow
  const hazardAnalysisIdParam = searchParams.get('hazardAnalysisId') // New HA created from label scan
  const categoryParam = searchParams.get('category') // Product category from label scan
  const sahcodhaParam = searchParams.get('sahcodha') === 'true' // SAHCODHA flag
  const countryParam = searchParams.get('country') // Country of origin
  
  const [activeTab, setActiveTab] = useState(tabParam || 'overview')
  const [stats] = useState<SupplierDashboardStats>(mockStats)
  
  // Handle URL params on mount
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
    
    // Show toast when redirected from creating new hazard analysis
    if (isNew && highlightId) {
      toast({
        title: 'FSVP Hazard Analysis Created',
        description: 'Your hazard analysis has been created successfully. Review and complete the draft below.',
      })
    }
    
    // Show toast when supplier created hazard analysis from label scan
    if (isNew && productParam) {
      toast({
        title: hazardAnalysisIdParam 
          ? 'FSVP Hazard Analysis Created' 
          : 'Document Preparation Ready',
        description: hazardAnalysisIdParam
          ? `Hazard analysis for "${productParam}" created. Now prepare documents for your US importer below.`
          : `Review and prepare required documents for "${productParam}" to speed up verification with your US importer.`,
        duration: 8000,
      })
      
      // Auto-switch to prepare-docs tab if coming from label scan
      if (tabParam === 'prepare-docs') {
        setActiveTab('prepare-docs')
      }
    }
  }, [tabParam, isNew, highlightId, productParam, hazardAnalysisIdParam, toast])
  
  const getReadinessStatus = (score: number) => {
    if (score >= 90) return { label: 'Ready', color: 'bg-green-500' }
    if (score >= 70) return { label: 'Almost Ready', color: 'bg-amber-500' }
    if (score >= 50) return { label: 'Needs Work', color: 'bg-orange-500' }
    return { label: 'Not Ready', color: 'bg-red-500' }
  }
  
  const readinessStatus = getReadinessStatus(stats.audit_readiness_score)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">FSVP Supplier Portal</h1>
                  <p className="text-sm text-muted-foreground">
                    Foreign Supplier Verification Program Compliance Dashboard
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Dossier
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Urgent Alerts */}
        {(stats.overdue_corrective_actions > 0 || stats.days_until_next_audit! <= 7) && (
          <div className="space-y-3 mb-6">
            {stats.overdue_corrective_actions > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Overdue Corrective Actions</AlertTitle>
                <AlertDescription>
                  You have {stats.overdue_corrective_actions} overdue corrective action(s) that require immediate attention.
                </AlertDescription>
              </Alert>
            )}
            {stats.days_until_next_audit! <= 7 && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <Calendar className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">Upcoming Audit</AlertTitle>
                <AlertDescription className="text-amber-600">
                  Your next audit is scheduled in {stats.days_until_next_audit} days. Ensure all documentation is ready.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Compliance & Readiness Overview */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <ComplianceScoreCard score={stats.compliance_score} label="Compliance Score" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <ComplianceScoreCard score={stats.audit_readiness_score} label="Audit Readiness" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.sahcodha_products}</p>
                    <p className="text-sm text-muted-foreground">SAHCODHA Products</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.us_importers_count}</p>
                    <p className="text-sm text-muted-foreground">US Importers</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="prepare-docs" className="flex items-center gap-2 relative">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Prepare Docs</span>
              {productParam && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="self-assessment" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Self-Assessment</span>
            </TabsTrigger>
            <TabsTrigger value="hazard-analysis" className="flex items-center gap-2">
              <Beaker className="h-4 w-4" />
              <span className="hidden sm:inline">Hazard Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="audit-readiness" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Audit Readiness</span>
            </TabsTrigger>
            <TabsTrigger value="sahcodha" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">SAHCODHA</span>
            </TabsTrigger>
            <TabsTrigger value="fda-history" className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              <span className="hidden sm:inline">FDA History</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Products Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Beaker className="h-4 w-4" />
                    Products & Hazard Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Products</span>
                    <span className="font-semibold">{stats.total_products}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">With Hazard Analysis</span>
                    <span className="font-semibold text-green-600">{stats.products_with_hazard_analysis}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Analysis</span>
                    <span className="font-semibold text-amber-600">{stats.products_pending_analysis}</span>
                  </div>
                  <Separator />
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('hazard-analysis')}>
                    Manage Hazard Analysis
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Certifications Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Certifications</span>
                    <Badge variant="default" className="bg-green-500">{stats.certifications_active}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expiring Soon</span>
                    {stats.certifications_expiring_soon > 0 ? (
                      <Badge variant="destructive">{stats.certifications_expiring_soon}</Badge>
                    ) : (
                      <Badge variant="secondary">0</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>FSSC 22000</span>
                      <Badge variant="outline" className="ml-auto">Valid</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>HACCP Certified</span>
                      <Badge variant="outline" className="ml-auto">Valid</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>ISO 22000</span>
                      <Badge variant="outline" className="ml-auto text-amber-600">Expires in 30d</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentation Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Up to Date</span>
                    <span className="font-semibold text-green-600">{stats.documents_up_to_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Needs Update</span>
                    <span className="font-semibold text-amber-600">{stats.documents_needing_update}</span>
                  </div>
                  <Separator />
                </CardContent>
              </Card>

              {/* Corrective Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileWarning className="h-4 w-4" />
                    Corrective Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Open Actions</span>
                    <Badge variant="secondary">{stats.open_corrective_actions}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overdue</span>
                    {stats.overdue_corrective_actions > 0 ? (
                      <Badge variant="destructive">{stats.overdue_corrective_actions}</Badge>
                    ) : (
                      <Badge variant="secondary">0</Badge>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        Update allergen control procedure
                      </div>
                      <p className="text-xs text-red-600 mt-1">Due: 3 days overdue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Audit */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Next Audit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Scheduled Date</span>
                    <span className="font-semibold">{stats.next_audit_due}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Days Remaining</span>
                    <Badge className={stats.days_until_next_audit! <= 7 ? 'bg-red-500' : stats.days_until_next_audit! <= 30 ? 'bg-amber-500' : 'bg-green-500'}>
                      {stats.days_until_next_audit} days
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Readiness Status</span>
                    <Badge className={readinessStatus.color}>{readinessStatus.label}</Badge>
                  </div>
                  <Separator />
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('audit-readiness')}>
                    View Audit Checklist
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* US Importers */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    US Importers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">ABC Foods Inc.</p>
                        <p className="text-xs text-muted-foreground">DUNS: 12-345-6789</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Global Imports LLC</p>
                        <p className="text-xs text-muted-foreground">DUNS: 98-765-4321</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Fresh Trade Co.</p>
                        <p className="text-xs text-muted-foreground">DUNS: 55-555-5555</p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>Common tasks to maintain your FSVP compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('hazard-analysis')}>
                    <Beaker className="h-6 w-6 text-primary" />
                    <span>Create Hazard Analysis</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('audit-readiness')}>
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    <span>Self-Assessment</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('sahcodha')}>
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <span>SAHCODHA Assessment</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* FDA Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">FSVP Resources</CardTitle>
                <CardDescription>Official FDA guidance and regulations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <Button variant="ghost" className="justify-start h-auto py-2" asChild>
                    <a href="https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      FDA FSVP Final Rule
                    </a>
                  </Button>
                  <Button variant="ghost" className="justify-start h-auto py-2" asChild>
                    <a href="https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-L" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      21 CFR Part 1, Subpart L
                    </a>
                  </Button>
                  <Button variant="ghost" className="justify-start h-auto py-2" asChild>
                    <a href="https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/guidance-documents-regulatory-information-topic-food-and-dietary-supplements" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      FDA Guidance Documents
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Prepare Docs Tab - Proactive Document Preparation */}
          <TabsContent value="prepare-docs">
            <SupplierDocumentPreparation 
              productData={productParam ? {
                productName: productParam,
                productCategory: categoryParam as any,
                isSahcodha: sahcodhaParam,
                countryOfOrigin: countryParam || undefined,
                hazardAnalysisId: hazardAnalysisIdParam || undefined,
              } : undefined}
              language="vi"
            />
          </TabsContent>

          {/* Self-Assessment Tab - For Supplier Role */}
          <TabsContent value="self-assessment">
            {activeTab === 'self-assessment' && (
              <>
                {productParam && (
                  <Alert className={`mb-6 ${hazardAnalysisIdParam ? 'border-green-500 bg-green-50' : 'border-emerald-500 bg-emerald-50'}`}>
                    <ClipboardCheck className={`h-4 w-4 ${hazardAnalysisIdParam ? 'text-green-600' : 'text-emerald-600'}`} />
                    <AlertTitle className={hazardAnalysisIdParam ? 'text-green-800' : 'text-emerald-800'}>
                      {hazardAnalysisIdParam 
                        ? 'FSVP Hazard Analysis Created Successfully!'
                        : 'Supplier Self-Assessment'}
                    </AlertTitle>
                    <AlertDescription className={hazardAnalysisIdParam ? 'text-green-700' : 'text-emerald-700'}>
                      {hazardAnalysisIdParam ? (
                        <>
                          <p className="mb-2">
                            Hazard analysis for <strong>{productParam}</strong> has been created with data auto-mapped from your label scan.
                          </p>
                          <div className="flex gap-3 mt-3">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => router.push(`/dashboard/fsvp-supplier/hazard-analysis/${hazardAnalysisIdParam}`)}
                            >
                              <Beaker className="h-4 w-4 mr-2" />
                              View Hazard Analysis
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-green-500 text-green-700"
                              onClick={() => setActiveTab('hazard-analysis')}
                            >
                              View All Analyses
                            </Button>
                          </div>
                          <p className="mt-3 text-sm">
                            Now complete the self-assessment below to help your US importers verify your food safety controls.
                          </p>
                        </>
                      ) : (
                        <>
                          Complete this self-assessment for <strong>{productParam}</strong> to prepare for FSVP compliance. 
                          This will help your US importers verify your food safety controls.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <SupplierSelfAssessmentTool />
              </>
            )}
          </TabsContent>
          
          {/* Hazard Analysis Tab */}
          <TabsContent value="hazard-analysis">
            {activeTab === 'hazard-analysis' && <SupplierHazardAnalysisTool />}
          </TabsContent>

          {/* Audit Readiness Tab */}
          <TabsContent value="audit-readiness">
            {activeTab === 'audit-readiness' && <SupplierAuditReadiness />}
          </TabsContent>

          {/* SAHCODHA Tab */}
          <TabsContent value="sahcodha">
            <SAHCODHARiskAssessmentTool />
          </TabsContent>

          {/* FDA History Tab */}
          <TabsContent value="fda-history">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5" />
                    FDA Historical Data Analysis
                  </CardTitle>
                  <CardDescription>
                    Search and analyze FDA Warning Letters and Import Alerts related to your products and suppliers.
                    This helps identify potential compliance risks based on historical enforcement patterns.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Automatic Risk Detection</AlertTitle>
                    <AlertDescription>
                      The system automatically searches for FDA Warning Letters and Import Alerts related to:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Your supplier countries (e.g., Vietnam)</li>
                        <li>Product categories (e.g., Cashew, Pangasius)</li>
                        <li>Known hazards (e.g., Salmonella, Listeria)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
              
              {/* Show example search for Vietnamese products */}
              <SupplierHistoricalAlerts 
                productCategory="cashew"
                country="Vietnam"
              />
              
              <SupplierHistoricalAlerts 
                productCategory="pangasius"
                country="Vietnam"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
