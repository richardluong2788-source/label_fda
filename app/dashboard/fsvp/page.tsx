'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ClipboardCheck,
  Download,
  Plus,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  Users,
  Calendar,
  ChevronRight,
  Beaker,
  FileWarning,
  ShieldCheck,
  Target,
  Building2,
  Ship,
  Factory,
  GraduationCap,
  UserCheck,
  FileSearch,
  ListChecks,
  UserPlus,
  Send,
  Inbox,
  Package
} from 'lucide-react'
import { SupplierHazardAnalysisTool } from '@/components/fsvp/supplier-hazard-analysis'
import { SupplierSelfAssessmentTool } from '@/components/fsvp/supplier-self-assessment'
import { SupplierDocumentManager } from '@/components/fsvp/supplier-document-manager'
import { SupplierAuditReadiness } from '@/components/fsvp/supplier-audit-readiness'
import { SAHCODHARiskAssessmentTool } from '@/components/fsvp/sahcodha-risk-assessment'
import { FSVPSupplierManager } from '@/components/fsvp-supplier-manager'
import { FSVPRecordsManager } from '@/components/fsvp-records-manager'
import { FSVPProductManager } from '@/components/fsvp-product-manager'
import { QIAssignmentManager } from '@/components/fsvp/qi-assignment-manager'
import { DocumentRequestChecklist } from '@/components/fsvp/document-request-checklist'
import { SupplierDocumentRequests } from '@/components/fsvp/supplier-document-requests'
import type { SupplierDashboardStats } from '@/lib/fsvp-supplier-types'
import { useTranslation } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

// Account type from database
type AccountType = 'importer' | 'supplier' | 'qi'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

// Default empty stats
const defaultStats: SupplierDashboardStats = {
  compliance_score: 0,
  audit_readiness_score: 0,
  total_products: 0,
  products_with_hazard_analysis: 0,
  products_pending_analysis: 0,
  sahcodha_products: 0,
  certifications_active: 0,
  certifications_expiring_soon: 0,
  documents_up_to_date: 0,
  documents_needing_update: 0,
  open_corrective_actions: 0,
  overdue_corrective_actions: 0,
  us_importers_count: 0,
  last_audit_date: undefined,
  next_audit_due: undefined,
  days_until_next_audit: undefined
}

function ComplianceScoreCard({ score, label, isLoading }: { score: number; label: string; isLoading?: boolean }) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-500'
    if (s >= 70) return 'text-amber-500'
    return 'text-red-500'
  }
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>
    )
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
      />
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FSVPDashboardPage() {
  const { t, locale } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [currentRole, setCurrentRole] = useState<AccountType>('importer')
  const [isLoadingRole, setIsLoadingRole] = useState(true)
  
  // Load account_type from Supabase user on mount
  useEffect(() => {
    async function loadAccountType() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.user_metadata?.account_type) {
          setCurrentRole(user.user_metadata.account_type as AccountType)
        } else {
          // Fallback: try to fetch from user_profiles table
          if (user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('account_type')
              .eq('id', user.id)
              .single()
            
            if (profile?.account_type) {
              setCurrentRole(profile.account_type as AccountType)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load account type:', error)
      } finally {
        setIsLoadingRole(false)
      }
    }
    
    loadAccountType()
  }, [])
  
  // Fetch stats from API
  const { data: stats, error, isLoading, mutate } = useSWR<SupplierDashboardStats & { 
    total_suppliers?: number
    approved_suppliers?: number
    sahcodha_suppliers?: number
    pending_suppliers?: number
    has_qualified_individual?: boolean
    has_duns?: boolean
    fsvp_program_active?: boolean
  }>(
    '/api/fsvp/stats',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // Refresh every minute
    }
  )
  
  // Use fetched stats or default empty stats
  const displayStats = stats || defaultStats
  
  const getReadinessStatus = (score: number) => {
    if (score >= 90) return { label: t.fsvpSupplier.ready, color: 'bg-green-500' }
    if (score >= 70) return { label: t.fsvpSupplier.almostReady, color: 'bg-amber-500' }
    if (score >= 50) return { label: t.fsvpSupplier.needsWork, color: 'bg-orange-500' }
    return { label: t.fsvpSupplier.notReady, color: 'bg-red-500' }
  }
  
  const readinessStatus = getReadinessStatus(displayStats.audit_readiness_score)

  const handleRefresh = () => {
    mutate()
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  // Role-specific configurations
  const roleConfig = {
    importer: {
      title: locale === 'vi' ? 'FSVP Importer Dashboard' : 'FSVP Importer Dashboard',
      subtitle: locale === 'vi' 
        ? 'Quản lý Foreign Supplier Verification Program cho nhà nhập khẩu' 
        : 'Manage Foreign Supplier Verification Program for Importers',
      icon: Ship,
      color: 'bg-blue-600',
      primaryAction: locale === 'vi' ? 'Thêm Supplier' : 'Add Supplier',
    },
    supplier: {
      title: locale === 'vi' ? 'FSVP Supplier Portal' : 'FSVP Supplier Portal',
      subtitle: locale === 'vi' 
        ? 'Chuẩn bị tài liệu FSVP cho US Importers' 
        : 'Prepare FSVP documentation for US Importers',
      icon: Factory,
      color: 'bg-emerald-600',
      primaryAction: locale === 'vi' ? 'Tự đánh giá' : 'Self-Assessment',
    },
    qi: {
      title: locale === 'vi' ? 'FSVP QI Dashboard' : 'FSVP QI Dashboard',
      subtitle: locale === 'vi' 
        ? 'Qualified Individual - Quản lý và phê duyệt FSVP activities' 
        : 'Qualified Individual - Manage and approve FSVP activities',
      icon: GraduationCap,
      color: 'bg-violet-600',
      primaryAction: locale === 'vi' ? 'Xem Assignments' : 'View Assignments',
    },
  }
  
  const config = roleConfig[currentRole]
  const RoleIcon = config.icon

  // Show loading state while fetching account type
  if (isLoadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    currentRole === 'supplier' ? 'bg-emerald-600' : 
                    currentRole === 'qi' ? 'bg-violet-600' : 'bg-blue-600'
                  }`}>
                  <RoleIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        currentRole === 'supplier' ? 'border-emerald-500 text-emerald-700' : 
                        currentRole === 'qi' ? 'border-violet-500 text-violet-700' :
                        'border-blue-500 text-blue-700'
                      }`}
                    >
                      {currentRole === 'supplier' 
                        ? (locale === 'vi' ? 'Supplier' : 'Supplier') 
                        : currentRole === 'qi'
                        ? 'QI'
                        : (locale === 'vi' ? 'Importer' : 'Importer')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.subtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t.fsvpSupplier.refresh}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t.fsvp.exportDossier}
              </Button>
              {currentRole === 'importer' ? (
                <Button size="sm" onClick={() => setActiveTab('suppliers')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.fsvpSupplier.add} Supplier
                </Button>
              ) : currentRole === 'qi' ? (
                <Button size="sm" onClick={() => setActiveTab('qi-assignments')} className="bg-violet-600 hover:bg-violet-700">
                  <ListChecks className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Xem Assignments' : 'View Assignments'}
                </Button>
              ) : (
                <Button size="sm" onClick={() => setActiveTab('self-assessment')} className="bg-emerald-600 hover:bg-emerald-700">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Tự đánh giá' : 'Self-Assessment'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading data</AlertTitle>
            <AlertDescription>
              Could not load FSVP statistics. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Urgent Alerts */}
        {!isLoading && !error && (displayStats.overdue_corrective_actions > 0 || (displayStats.days_until_next_audit !== undefined && displayStats.days_until_next_audit !== null && displayStats.days_until_next_audit <= 7)) && (
          <div className="space-y-3 mb-6">
            {displayStats.overdue_corrective_actions > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.fsvpSupplier.overdueCorrectiveActions}</AlertTitle>
                <AlertDescription>
                  {t.fsvpSupplier.overdueCorrectiveActionsDesc.replace('{count}', String(displayStats.overdue_corrective_actions))}
                </AlertDescription>
              </Alert>
            )}
            {displayStats.days_until_next_audit !== undefined && displayStats.days_until_next_audit !== null && displayStats.days_until_next_audit <= 7 && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <Calendar className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">{t.fsvpSupplier.upcomingAudit}</AlertTitle>
                <AlertDescription className="text-amber-600">
                  {t.fsvpSupplier.upcomingAuditDesc.replace('{days}', String(displayStats.days_until_next_audit))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Setup Alert - show when no data */}
        {!isLoading && !error && stats?.total_suppliers === 0 && (
          <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
            <Building2 className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Get Started with FSVP</AlertTitle>
            <AlertDescription className="text-blue-600">
              Start by adding your foreign suppliers to begin tracking FSVP compliance. Click "Add Supplier" to add your first supplier.
            </AlertDescription>
          </Alert>
        )}

        {/* Compliance & Readiness Overview */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <ComplianceScoreCard score={displayStats.compliance_score} label={t.fsvpSupplier.complianceScore} />
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
                      <ComplianceScoreCard score={displayStats.audit_readiness_score} label={t.fsvpSupplier.auditReadiness} />
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
                        <p className="text-2xl font-bold">{displayStats.sahcodha_products}</p>
                        <p className="text-sm text-muted-foreground">{t.fsvpSupplier.sahcodhaProducts}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Role-specific fourth metric card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentRole === 'importer' ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                            <Building2 className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stats?.total_suppliers || 0}</p>
                            <p className="text-sm text-muted-foreground">
                              {locale === 'vi' ? 'Tổng Suppliers' : 'Total Suppliers'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                            <Ship className="h-6 w-6 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{displayStats.us_importers_count || 0}</p>
                            <p className="text-sm text-muted-foreground">
                              {locale === 'vi' ? 'US Importers' : 'US Importers'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Tabs - Role-based */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full lg:w-auto lg:grid-cols-none lg:flex ${
            currentRole === 'supplier' ? 'grid-cols-8' : 
            currentRole === 'qi' ? 'grid-cols-4' : 'grid-cols-7'
          }`}>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{t.fsvpSupplier.tabOverview}</span>
            </TabsTrigger>
            
            {/* Importer-specific tabs */}
            {currentRole === 'importer' && (
              <>
                <TabsTrigger value="document-requests" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Yêu cầu Tài liệu' : 'Doc Requests'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Nhà cung cấp' : 'Suppliers'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="qi-management" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Qualified Individual' : 'Qualified Individual'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="fsvp-records" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'FSVP Records' : 'FSVP Records'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Sản phẩm' : 'Products'}
                  </span>
                </TabsTrigger>
              </>
            )}
            
            {/* Supplier-specific tabs */}
            {currentRole === 'supplier' && (
              <>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Sản phẩm' : 'Products'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="incoming-requests" className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Yêu cầu Tài liệu' : 'Doc Requests'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="self-assessment" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Tự đánh giá' : 'Self-Assessment'}
                  </span>
                </TabsTrigger>
              </>
            )}
            
            {/* QI-specific tabs */}
            {currentRole === 'qi' && (
              <>
                <TabsTrigger value="qi-assignments" className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Assignments' : 'Assignments'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="qi-reviews" className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'vi' ? 'Pending Reviews' : 'Pending Reviews'}
                  </span>
                </TabsTrigger>
              </>
            )}
            
            {/* Supplier-only tabs: Hazard Analysis, Documents, Audit Readiness, SAHCODHA */}
            {currentRole === 'supplier' && (
              <>
                <TabsTrigger value="hazard-analysis" className="flex items-center gap-2">
                  <Beaker className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.fsvpSupplier.tabHazardAnalysis}</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.fsvpSupplier.tabDocuments}</span>
                </TabsTrigger>
                <TabsTrigger value="audit-readiness" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.fsvpSupplier.tabAuditReadiness}</span>
                </TabsTrigger>
                <TabsTrigger value="sahcodha" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.fsvpSupplier.tabSahcodha}</span>
                </TabsTrigger>
              </>
            )}
            
            {/* Importer: View supplier's hazard analyses (read-only review) */}
            {currentRole === 'importer' && (
              <TabsTrigger value="supplier-hazard-review" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {locale === 'vi' ? 'Xem Hazard Analysis' : 'Review Hazard Analysis'}
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Document Requests Summary - Importer only */}
              {currentRole === 'importer' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      {locale === 'vi' ? 'Yêu cầu Tài liệu' : 'Document Requests'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Đang chờ phản hồi' : 'Pending Response'}
                          </span>
                          <Badge variant="outline">0</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Đã nhận tài liệu' : 'Documents Received'}
                          </span>
                          <Badge variant="default" className="bg-green-500">0</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Quá hạn' : 'Overdue'}
                          </span>
                          <Badge variant="destructive">0</Badge>
                        </div>
                        <Separator />
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab('document-requests')}>
                          {locale === 'vi' ? 'Quản lý Yêu cầu' : 'Manage Requests'}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Products Summary - Supplier only */}
              {currentRole === 'supplier' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Beaker className="h-4 w-4" />
                      {t.fsvpSupplier.productsHazardAnalysis}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t.fsvpSupplier.totalProducts}</span>
                          <span className="font-semibold">{displayStats.total_products}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t.fsvpSupplier.withHazardAnalysis}</span>
                          <span className="font-semibold text-green-600">{displayStats.products_with_hazard_analysis}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t.fsvpSupplier.pendingAnalysis}</span>
                          <span className="font-semibold text-amber-600">{displayStats.products_pending_analysis}</span>
                        </div>
                        <Separator />
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab('hazard-analysis')}>
                          {t.fsvpSupplier.manageHazardAnalysis}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Suppliers Summary - Importer only */}
              {currentRole === 'importer' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {locale === 'vi' ? 'Nhà cung cấp nước ngoài' : 'Foreign Suppliers'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Tổng số Suppliers' : 'Total Suppliers'}
                          </span>
                          <span className="font-semibold">{stats?.total_suppliers || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Đã phê duyệt' : 'Approved'}
                          </span>
                          <Badge variant="default" className="bg-green-500">{stats?.approved_suppliers || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">SAHCODHA Risk</span>
                          {(stats?.sahcodha_suppliers || 0) > 0 ? (
                            <Badge variant="destructive">{stats?.sahcodha_suppliers}</Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Chờ xem xét' : 'Pending Review'}
                          </span>
                          <Badge variant="outline">{stats?.pending_suppliers || 0}</Badge>
                        </div>
                        <Separator />
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab('suppliers')}>
                          {locale === 'vi' ? 'Quản lý Suppliers' : 'Manage Suppliers'}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* US Importers Summary - Supplier only */}
              {currentRole === 'supplier' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      {locale === 'vi' ? 'US Importers' : 'US Importers'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Tổng số Importers' : 'Total Importers'}
                          </span>
                          <span className="font-semibold">{displayStats.us_importers_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Yêu cầu đang chờ' : 'Pending Requests'}
                          </span>
                          <Badge variant="outline">0</Badge>
                        </div>
                        <Separator />
                        <div className="text-sm text-muted-foreground">
                          {locale === 'vi' 
                            ? 'US Importers cần xác minh FSVP từ bạn trước khi nhập khẩu sản phẩm.'
                            : 'US Importers need FSVP verification from you before importing products.'}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* QI Clients Summary - QI only */}
              {currentRole === 'qi' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {locale === 'vi' ? 'Clients của bạn' : 'Your Clients'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Active Importers' : 'Active Importers'}
                          </span>
                          <span className="font-semibold">0</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Pending Invitations' : 'Pending Invitations'}
                          </span>
                          <Badge variant="outline">0</Badge>
                        </div>
                        <Separator />
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab('qi-assignments')}>
                          {locale === 'vi' ? 'Xem Assignments' : 'View Assignments'}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Documents Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t.fsvpSupplier.documentationStatus}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t.fsvpSupplier.upToDate}</span>
                        <span className="font-semibold text-green-600">{displayStats.documents_up_to_date}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t.fsvpSupplier.needsUpdate}</span>
                        <span className="font-semibold text-amber-600">{displayStats.documents_needing_update}</span>
                      </div>
                      <Separator />
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab('documents')}>
                        {t.fsvpSupplier.manageDocuments}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Corrective Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileWarning className="h-4 w-4" />
                    {t.fsvpSupplier.correctiveActions}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t.fsvpSupplier.openActions}</span>
                        <Badge variant="secondary">{displayStats.open_corrective_actions}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t.fsvpSupplier.overdue}</span>
                        {displayStats.overdue_corrective_actions > 0 ? (
                          <Badge variant="destructive">{displayStats.overdue_corrective_actions}</Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </div>
                      {displayStats.overdue_corrective_actions > 0 && (
                        <>
                          <Separator />
                          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                              <AlertCircle className="h-4 w-4" />
                              {displayStats.overdue_corrective_actions} overdue action(s) require attention
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Next Audit */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t.fsvpSupplier.nextAudit}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t.fsvpSupplier.scheduledDate}</span>
                        <span className="font-semibold">{formatDate(displayStats.next_audit_due)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t.fsvpSupplier.daysRemaining}</span>
                        {displayStats.days_until_next_audit !== undefined && displayStats.days_until_next_audit !== null ? (
                          <Badge className={displayStats.days_until_next_audit <= 7 ? 'bg-red-500' : displayStats.days_until_next_audit <= 30 ? 'bg-amber-500' : 'bg-green-500'}>
                            {displayStats.days_until_next_audit} {t.fsvpSupplier.days}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t.fsvpSupplier.readinessStatus}</span>
                        <Badge className={readinessStatus.color}>{readinessStatus.label}</Badge>
                      </div>
                      <Separator />
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab('audit-readiness')}>
                        {t.fsvpSupplier.viewAuditChecklist}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Program Status - Role-specific */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {currentRole === 'supplier' 
                      ? (locale === 'vi' ? 'Trạng thái Compliance' : 'Compliance Status')
                      : 'FSVP Program Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : currentRole === 'importer' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Qualified Individual</span>
                        {stats?.has_qualified_individual ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Not Set
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">DUNS Number</span>
                        {stats?.has_duns ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Registered
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Program Active</span>
                        {stats?.fsvp_program_active ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </>
                  ) : (
                    // Supplier-specific status
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {locale === 'vi' ? 'Tự đánh giá hoàn thành' : 'Self-Assessment Complete'}
                        </span>
                        <Badge variant="outline" className="text-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {locale === 'vi' ? 'Chưa hoàn thành' : 'Incomplete'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {locale === 'vi' ? 'Tài liệu cập nhật' : 'Documents Updated'}
                        </span>
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {displayStats.documents_up_to_date}/{displayStats.documents_up_to_date + displayStats.documents_needing_update}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {locale === 'vi' ? 'Sẵn sàng cung cấp' : 'Ready to Supply'}
                        </span>
                        {displayStats.compliance_score >= 70 ? (
                          <Badge variant="default" className="bg-green-500">
                            {locale === 'vi' ? 'Sẵn sàng' : 'Ready'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {locale === 'vi' ? 'Cần chuẩn bị' : 'Needs Work'}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions - Role-based */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.fsvpSupplier.quickActions}</CardTitle>
                <CardDescription>
                  {currentRole === 'supplier' 
                    ? (locale === 'vi' ? 'Các tác vụ phổ biến cho nhà cung cấp' : 'Common tasks for suppliers')
                    : t.fsvpSupplier.commonTasks}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {/* IMPORTER Quick Actions */}
                  {currentRole === 'importer' && (
                    <>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('suppliers')}>
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <span>{locale === 'vi' ? 'Thêm Supplier' : 'Add Supplier'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('document-requests')}>
                        <Send className="h-6 w-6 text-blue-600" />
                        <span>{locale === 'vi' ? 'Yêu cầu Tài liệu' : 'Request Documents'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('qi-management')}>
                        <GraduationCap className="h-6 w-6 text-blue-600" />
                        <span>{locale === 'vi' ? 'Gán QI' : 'Assign QI'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('supplier-hazard-review')}>
                        <FileSearch className="h-6 w-6 text-blue-600" />
                        <span>{locale === 'vi' ? 'Xem Hazard Analysis' : 'Review Hazard Analysis'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
                        <a href="https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-6 w-6 text-blue-600" />
                          <span>{locale === 'vi' ? 'Hướng dẫn FDA' : 'FDA Guidance'}</span>
                        </a>
                      </Button>
                    </>
                  )}
                  
                  {/* SUPPLIER Quick Actions */}
                  {currentRole === 'supplier' && (
                    <>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('self-assessment')}>
                        <ClipboardCheck className="h-6 w-6 text-emerald-600" />
                        <span>{locale === 'vi' ? 'Tự đánh giá' : 'Self-Assessment'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('hazard-analysis')}>
                        <Beaker className="h-6 w-6 text-emerald-600" />
                        <span>{locale === 'vi' ? 'Phân tích Mối nguy' : 'Hazard Analysis'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('documents')}>
                        <FileText className="h-6 w-6 text-emerald-600" />
                        <span>{locale === 'vi' ? 'Upload Chứng chỉ' : 'Upload Certificates'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('audit-readiness')}>
                        <Target className="h-6 w-6 text-emerald-600" />
                        <span>{locale === 'vi' ? 'Sẵn sàng Audit' : 'Audit Readiness'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('sahcodha')}>
                        <ShieldCheck className="h-6 w-6 text-emerald-600" />
                        <span>{locale === 'vi' ? 'Kiểm tra SAHCODHA' : 'SAHCODHA Check'}</span>
                      </Button>
                    </>
                  )}
                  
                  {/* QI Quick Actions */}
                  {currentRole === 'qi' && (
                    <>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('qi-assignments')}>
                        <ListChecks className="h-6 w-6 text-violet-600" />
                        <span>{locale === 'vi' ? 'Xem Assignments' : 'View Assignments'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('qi-reviews')}>
                        <FileSearch className="h-6 w-6 text-violet-600" />
                        <span>{locale === 'vi' ? 'Pending Reviews' : 'Pending Reviews'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('hazard-analysis')}>
                        <Beaker className="h-6 w-6 text-violet-600" />
                        <span>{locale === 'vi' ? 'Review Hazard Analysis' : 'Review Hazard Analysis'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('documents')}>
                        <FileText className="h-6 w-6 text-violet-600" />
                        <span>{locale === 'vi' ? 'Review Documents' : 'Review Documents'}</span>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('sahcodha')}>
                        <ShieldCheck className="h-6 w-6 text-violet-600" />
                        <span>{locale === 'vi' ? 'SAHCODHA Review' : 'SAHCODHA Review'}</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* FDA Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.fsvpSupplier.fdaResources}</CardTitle>
                <CardDescription>{t.fsvpSupplier.fsvpGuidance}</CardDescription>
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

          {/* Document Requests Tab - Importer only */}
          {currentRole === 'importer' && (
            <TabsContent value="document-requests">
              <DocumentRequestChecklist 
                onRequestCreated={(requestId) => {
                  // Optionally navigate or show success
                  console.log('Request created:', requestId)
                }}
              />
            </TabsContent>
          )}

          {/* Suppliers Tab - Importer only */}
          {currentRole === 'importer' && (
            <TabsContent value="suppliers">
              <FSVPSupplierManager userId="" />
            </TabsContent>
          )}

          {/* QI Management Tab - Importer only */}
          {currentRole === 'importer' && (
            <TabsContent value="qi-management">
              <QIAssignmentManager />
            </TabsContent>
          )}

{/* FSVP Records Tab - Importer only */}
          {currentRole === 'importer' && (
            <TabsContent value="fsvp-records">
              <FSVPRecordsManager userId="" />
            </TabsContent>
          )}

          {/* Products Tab - Both Importer and Supplier */}
          {currentRole === 'importer' && (
            <TabsContent value="products">
              <FSVPProductManager userId="" role="importer" />
            </TabsContent>
          )}
          
          {currentRole === 'supplier' && (
            <TabsContent value="products">
              <FSVPProductManager userId="" role="supplier" />
            </TabsContent>
          )}
          
          {/* Incoming Document Requests Tab - Supplier only */}
          {currentRole === 'supplier' && (
            <TabsContent value="incoming-requests">
              <SupplierDocumentRequests />
            </TabsContent>
          )}

          {/* Self-Assessment Tab - Supplier only */}
          {currentRole === 'supplier' && (
            <TabsContent value="self-assessment">
              <div className="space-y-6">
                {/* Supplier Self-Assessment Introduction */}
                <Alert className="border-emerald-500/50 bg-emerald-50">
                  <Factory className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">
                    {locale === 'vi' ? 'Tự đánh giá FSVP cho Nhà cung cấp' : 'FSVP Self-Assessment for Suppliers'}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    {locale === 'vi' 
                      ? 'Hoàn thành bảng đánh giá này để chuẩn bị tài liệu cần thiết cho US Importers thực hiện FSVP compliance.'
                      : 'Complete this assessment to prepare the necessary documentation for US Importers to conduct FSVP compliance.'}
                  </AlertDescription>
                </Alert>
                <SupplierSelfAssessmentTool />
              </div>
            </TabsContent>
          )}

          {/* Hazard Analysis Tab - Supplier only */}
          {currentRole === 'supplier' && (
            <TabsContent value="hazard-analysis">
              <div className="space-y-6">
                <Alert className="border-emerald-500/50 bg-emerald-50">
                  <Beaker className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">
                    {locale === 'vi' ? 'Phân tích Mối nguy' : 'Hazard Analysis'}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    {locale === 'vi' 
                      ? 'Xem và bổ sung thông tin phân tích mối nguy cho sản phẩm của bạn. Thông tin này sẽ được chia sẻ với US Importers.'
                      : 'Review and supplement hazard analysis information for your products. This information will be shared with US Importers.'}
                  </AlertDescription>
                </Alert>
                <SupplierHazardAnalysisTool />
              </div>
            </TabsContent>
          )}

          {/* Supplier Hazard Review Tab - Importer only (read-only view of supplier's hazard analyses) */}
          {currentRole === 'importer' && (
            <TabsContent value="supplier-hazard-review">
              <div className="space-y-6">
                <Alert className="border-blue-500/50 bg-blue-50">
                  <FileSearch className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">
                    {locale === 'vi' ? 'Xem Hazard Analysis từ Suppliers' : 'Review Supplier Hazard Analyses'}
                  </AlertTitle>
                  <AlertDescription className="text-blue-700">
                    {locale === 'vi' 
                      ? 'Xem các bản phân tích mối nguy mà Suppliers đã cung cấp. Theo 21 CFR 1.505, bạn phải xác định và đánh giá các hazards đã biết hoặc có thể dự đoán được.'
                      : 'Review hazard analyses submitted by your suppliers. Per 21 CFR 1.505, you must identify and evaluate known or reasonably foreseeable hazards.'}
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Beaker className="h-5 w-5" />
                      {locale === 'vi' ? 'Hazard Analyses từ Suppliers' : 'Supplier Hazard Analyses'}
                    </CardTitle>
                    <CardDescription>
                      {locale === 'vi' 
                        ? 'Danh sách các bản phân tích mối nguy đã được suppliers gửi'
                        : 'List of hazard analyses submitted by your suppliers'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-sm mb-2">
                        {locale === 'vi' 
                          ? 'Chưa có hazard analyses từ suppliers.'
                          : 'No hazard analyses from suppliers yet.'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {locale === 'vi' 
                          ? 'Khi suppliers upload hazard analyses, chúng sẽ xuất hiện ở đây để bạn review.'
                          : 'When suppliers upload hazard analyses, they will appear here for your review.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Documents Tab - Supplier only */}
          {currentRole === 'supplier' && (
            <TabsContent value="documents">
              <div className="space-y-6">
                <Alert className="border-emerald-500/50 bg-emerald-50">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">
                    {locale === 'vi' ? 'Quản lý Tài liệu' : 'Document Management'}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    {locale === 'vi' 
                      ? 'Upload các tài liệu như HACCP plan, certificates, test reports để hỗ trợ US Importers với FSVP compliance.'
                      : 'Upload documents such as HACCP plans, certificates, and test reports to support US Importers with FSVP compliance.'}
                  </AlertDescription>
                </Alert>
                <SupplierDocumentManager />
              </div>
            </TabsContent>
          )}

          {/* Audit Readiness Tab - Supplier only */}
          {currentRole === 'supplier' && (
            <TabsContent value="audit-readiness">
              <div className="space-y-6">
                <Alert className="border-emerald-500/50 bg-emerald-50">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">
                    {locale === 'vi' ? 'Sẵn sàng Kiểm toán' : 'Audit Readiness'}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    {locale === 'vi' 
                      ? 'Kiểm tra và chuẩn bị cho các cuộc kiểm toán từ US Importers hoặc third-party auditors.'
                      : 'Check and prepare for audits from US Importers or third-party auditors.'}
                  </AlertDescription>
                </Alert>
                <SupplierSelfAssessmentTool />
                <SupplierAuditReadiness />
              </div>
            </TabsContent>
          )}

          {/* SAHCODHA Tab - Supplier only */}
          {currentRole === 'supplier' && (
            <TabsContent value="sahcodha">
              <div className="space-y-6">
                <Alert className="border-amber-500/50 bg-amber-50">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">
                    {locale === 'vi' ? 'Đánh giá SAHCODHA' : 'SAHCODHA Assessment'}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    {locale === 'vi' 
                      ? 'SAHCODHA (Serious Adverse Health Consequences or Death to Humans or Animals) yêu cầu kiểm tra onsite hàng năm theo 21 CFR 1.506(d).'
                      : 'SAHCODHA products require annual onsite audits per 21 CFR 1.506(d). Review your products for SAHCODHA classification.'}
                  </AlertDescription>
                </Alert>
                <SAHCODHARiskAssessmentTool />
              </div>
            </TabsContent>
          )}

          {/* QI Assignments Tab - QI only */}
          {currentRole === 'qi' && (
            <TabsContent value="qi-assignments">
              <div className="space-y-6">
                <Alert className="border-violet-500/50 bg-violet-50">
                  <GraduationCap className="h-4 w-4 text-violet-600" />
                  <AlertTitle className="text-violet-800">
                    {locale === 'vi' ? 'Assignments của bạn' : 'Your Assignments'}
                  </AlertTitle>
                  <AlertDescription className="text-violet-700">
                    {locale === 'vi' 
                      ? 'Danh sách các Importers đã assign bạn làm Qualified Individual cho FSVP program của họ.'
                      : 'List of Importers who have assigned you as their Qualified Individual for FSVP programs.'}
                  </AlertDescription>
                </Alert>
                
                {/* QI Assignments List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      {locale === 'vi' ? 'Active Assignments' : 'Active Assignments'}
                    </CardTitle>
                    <CardDescription>
                      {locale === 'vi' 
                        ? 'Importers bạn đang hỗ trợ với FSVP compliance'
                        : 'Importers you are currently supporting with FSVP compliance'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-sm">
                        {locale === 'vi' 
                          ? 'Chưa có assignments. Importers sẽ gửi lời mời khi họ cần QI support.'
                          : 'No assignments yet. Importers will send invitations when they need QI support.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* QI Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                          <Users className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">0</p>
                          <p className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Active Clients' : 'Active Clients'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                          <FileSearch className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">0</p>
                          <p className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Pending Reviews' : 'Pending Reviews'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">0</p>
                          <p className="text-sm text-muted-foreground">
                            {locale === 'vi' ? 'Completed Reviews' : 'Completed Reviews'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {/* QI Pending Reviews Tab - QI only */}
          {currentRole === 'qi' && (
            <TabsContent value="qi-reviews">
              <div className="space-y-6">
                <Alert className="border-amber-500/50 bg-amber-50">
                  <FileSearch className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">
                    {locale === 'vi' ? 'Pending Reviews' : 'Pending Reviews'}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    {locale === 'vi' 
                      ? 'Các items cần bạn review và phê duyệt theo 21 CFR 1.502-1.510.'
                      : 'Items requiring your review and approval per 21 CFR 1.502-1.510.'}
                  </AlertDescription>
                </Alert>

                {/* Pending Reviews List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      {locale === 'vi' ? 'Items cần Review' : 'Items Requiring Review'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Categories of review items */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-dashed">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Beaker className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">Hazard Analysis</p>
                                  <p className="text-sm text-muted-foreground">
                                    {locale === 'vi' ? 'Chờ phê duyệt' : 'Awaiting approval'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">0</Badge>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-dashed">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="font-medium">Supplier Evaluations</p>
                                  <p className="text-sm text-muted-foreground">
                                    {locale === 'vi' ? 'Chờ đánh giá' : 'Awaiting evaluation'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">0</Badge>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-dashed">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-violet-600" />
                                <div>
                                  <p className="font-medium">Verification Plans</p>
                                  <p className="text-sm text-muted-foreground">
                                    {locale === 'vi' ? 'Chờ sign-off' : 'Awaiting sign-off'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">0</Badge>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-dashed">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <div>
                                  <p className="font-medium">Corrective Actions</p>
                                  <p className="text-sm text-muted-foreground">
                                    {locale === 'vi' ? 'Chờ sign-off' : 'Awaiting sign-off'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">0</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
