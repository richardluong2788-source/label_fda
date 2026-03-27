'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { PRODUCT_HAZARD_MAPPING, type MandatoryHazard } from '@/lib/fsvp-product-hazard-mapping'
import { HazardAnalysisDocumentUpload } from '@/components/fsvp/hazard-analysis-document-upload'
import { 
  ArrowLeft,
  Save,
  CheckCircle,
  AlertTriangle,
  Info,
  Bug,
  Atom,
  Droplet,
  Wheat,
  ShieldAlert,
  FileText,
  Building2,
  Calendar,
  User,
  ExternalLink,
  ImageIcon,
  Loader2,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import type { HazardItem } from '@/lib/fsvp-supplier-types'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

interface HazardAnalysis {
  id: string
  importer_user_id: string
  supplier_id: string | null
  product_name: string
  product_category: string | null
  product_description: string | null
  brand_name?: string | null
  ingredient_list?: string | null
  allergen_declaration?: string | null
  net_weight?: string | null
  label_image_url?: string | null
  fda_product_code: string | null
  intended_use: string | null
  biological_hazards: HazardItem[]
  chemical_hazards: HazardItem[]
  physical_hazards: HazardItem[]
  radiological_hazards: HazardItem[]
  allergen_hazards: HazardItem[]
  known_hazards: HazardItem[]
  is_sahcodha_product: boolean
  sahcodha_category: string | null
  sahcodha_justification: string | null
  requires_annual_audit: boolean
  verification_type: string | null
  verification_frequency: string | null
  verification_options: string[] | null
  fsvp_required: boolean
  control_measures: unknown[]
  supplier_controls: Record<string, unknown>
  analysis_date: string
  analyzed_by: string | null
  qualified_individual_credentials: string | null
  status: string
  linked_audit_report_id: string | null
  auto_generated: boolean
  auto_generated_from: string | null
  created_at: string
  updated_at: string
}

export default function HazardAnalysisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const id = params.id as string
  
  const { data: analysis, error, isLoading, mutate } = useSWR<HazardAnalysis>(
    `/api/fsvp/hazard-analyses/${id}`,
    fetcher
  )
  
  // Note: In Supplier Portal, we don't need to fetch suppliers list
  // because the current user IS the supplier. The supplier_id is auto-linked.
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('biological')
  
  // Form state - Note: supplier_id is not editable in Supplier Portal
  // because the current user IS the supplier
  const [formData, setFormData] = useState({
    product_name: '',
    product_category: '',
    product_description: '',
    analyzed_by: '',
    qualified_individual_credentials: '',
    status: 'draft',
  })
  
  // Initialize form data when analysis loads
  useEffect(() => {
    if (analysis) {
      setFormData({
        product_name: analysis.product_name || '',
        product_category: analysis.product_category || '',
        product_description: analysis.product_description || '',
        analyzed_by: analysis.analyzed_by || '',
        qualified_individual_credentials: analysis.qualified_individual_credentials || '',
        status: analysis.status || 'draft',
      })
      
      // Auto-enable editing for new draft analyses
      if (analysis.auto_generated && analysis.status === 'draft') {
        setIsEditing(true)
      }
    }
  }, [analysis])
  
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/fsvp/hazard-analyses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...formData,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save')
      }
      
      await mutate()
      setIsEditing(false)
      toast({
        title: locale === 'vi' ? 'Đã lưu thành công' : 'Saved successfully',
        description: locale === 'vi' ? 'Hazard analysis đã được cập nhật.' : 'Hazard analysis has been updated.',
      })
    } catch (err) {
      toast({
        title: locale === 'vi' ? 'Lỗi' : 'Error',
        description: locale === 'vi' ? 'Không thể lưu thay đổi.' : 'Failed to save changes.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; labelVi: string }> = {
      draft: { variant: 'outline', label: 'Draft', labelVi: 'Bản nháp' },
      pending_review: { variant: 'secondary', label: 'Pending Review', labelVi: 'Chờ duyệt' },
      approved: { variant: 'default', label: 'Approved', labelVi: 'Đã duyệt' },
      needs_revision: { variant: 'destructive', label: 'Needs Revision', labelVi: 'Cần sửa' },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status, labelVi: status }
    return <Badge variant={config.variant}>{locale === 'vi' ? config.labelVi : config.label}</Badge>
  }
  
  const getHazardTypeIcon = (type: string) => {
    switch (type) {
      case 'biological': return <Bug className="h-4 w-4 text-green-600" />
      case 'chemical': return <Atom className="h-4 w-4 text-purple-600" />
      case 'physical': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'radiological': return <Droplet className="h-4 w-4 text-blue-600" />
      case 'allergen': return <Wheat className="h-4 w-4 text-amber-600" />
      default: return <ShieldAlert className="h-4 w-4" />
    }
  }
  
  // Function to enrich hazard with evidence from mapping if missing
  const enrichHazardWithEvidence = (hazard: HazardItem, productCategory: string | undefined): any => {
    const h = hazard as any
    
    // If hazard already has evidence, return as-is
    if (h.fda_import_alert || h.warning_letters?.length > 0 || h.cfr_reference) {
      return h
    }
    
    // Try to find matching hazard from mapping
    const category = productCategory?.toLowerCase() || 'other'
    const profile = PRODUCT_HAZARD_MAPPING[category] || PRODUCT_HAZARD_MAPPING['other']
    
    if (profile?.mandatory_hazards) {
      const matchingHazard = profile.mandatory_hazards.find(
        (mh: MandatoryHazard) => mh.hazard_name.toLowerCase() === hazard.hazard_name?.toLowerCase()
      )
      
      if (matchingHazard) {
        return {
          ...h,
          cfr_reference: matchingHazard.cfr_reference,
          fda_import_alert: matchingHazard.fda_import_alert,
          fda_import_alert_url: matchingHazard.fda_import_alert_url,
          warning_letters: matchingHazard.warning_letters,
          outbreak_history: matchingHazard.outbreak_history,
          scientific_references: matchingHazard.scientific_references,
          fda_guidance_url: matchingHazard.fda_guidance_url,
          country_risk_note: matchingHazard.country_risk_note,
          source: matchingHazard.source,
        }
      }
    }
    
    return h
  }
  
  const renderHazardList = (hazards: HazardItem[] | undefined, type: string) => {
    if (!hazards || hazards.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">
          {locale === 'vi' ? 'Không có hazard nào được xác định' : 'No hazards identified'}
        </p>
      )
    }
    
    return (
      <div className="space-y-4">
        {hazards.map((hazard, index) => {
          // Enrich hazard with evidence from mapping if missing
          const h = enrichHazardWithEvidence(hazard, analysis?.product_category)
          return (
            <div key={hazard.id || index} className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getHazardTypeIcon(type)}
                  <span className="font-medium">{hazard.hazard_name}</span>
                </div>
                <div className="flex gap-1">
                  {hazard.severity && (
                    <Badge variant="outline" className="text-xs">
                      {hazard.severity}
                    </Badge>
                  )}
                  {hazard.likelihood && (
                    <Badge variant="outline" className="text-xs">
                      {hazard.likelihood}
                    </Badge>
                  )}
                </div>
              </div>
              {hazard.description && (
                <p className="text-sm text-muted-foreground mt-2">{hazard.description}</p>
              )}
              {hazard.control_measure && (
                <div className="mt-3 text-sm">
                  <span className="font-medium text-foreground">
                    {locale === 'vi' ? 'Biện pháp kiểm soát: ' : 'Control measure: '}
                  </span>
                  <span className="text-muted-foreground">{hazard.control_measure}</span>
                </div>
              )}
              
              {/* Evidence & References Section */}
              {(h.fda_import_alert || h.warning_letters?.length > 0 || h.outbreak_history?.length > 0 || h.cfr_reference) && (
                <div className="mt-4 pt-3 border-t border-dashed space-y-3">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {locale === 'vi' ? 'Bằng chứng & Tham chiếu' : 'Evidence & References'}
                  </p>
                  
                  {/* CFR Reference */}
                  {h.cfr_reference && (
                    <div className="flex items-start gap-2 text-xs">
                      <FileText className="h-3 w-3 mt-0.5 text-blue-600 shrink-0" />
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{locale === 'vi' ? 'Quy định: ' : 'Regulation: '}</span>
                        {h.cfr_reference}
                      </span>
                    </div>
                  )}
                  
                  {/* FDA Import Alert */}
                  {h.fda_import_alert && (
                    <div className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{locale === 'vi' ? 'FDA Import Alert: ' : 'FDA Import Alert: '}</span>
                        {h.fda_import_alert_url ? (
                          <a href={h.fda_import_alert_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {h.fda_import_alert} <ExternalLink className="h-3 w-3 inline" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{h.fda_import_alert}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Warning Letters */}
                  {h.warning_letters?.length > 0 && (
                    <div className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="h-3 w-3 text-red-600 shrink-0" />
                        <span className="font-medium text-foreground">{locale === 'vi' ? 'FDA Warning Letters:' : 'FDA Warning Letters:'}</span>
                      </div>
                      <ul className="ml-5 space-y-1 text-muted-foreground">
                        {h.warning_letters.map((wl: string, i: number) => (
                          <li key={i} className="list-disc">{wl}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Outbreak History */}
                  {h.outbreak_history?.length > 0 && (
                    <div className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Bug className="h-3 w-3 text-red-600 shrink-0" />
                        <span className="font-medium text-foreground">{locale === 'vi' ? 'Lịch sử vụ dịch:' : 'Outbreak History:'}</span>
                      </div>
                      <ul className="ml-5 space-y-1 text-muted-foreground">
                        {h.outbreak_history.map((ob: string, i: number) => (
                          <li key={i} className="list-disc">{ob}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Scientific References */}
                  {h.scientific_references?.length > 0 && (
                    <div className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-3 w-3 text-purple-600 shrink-0" />
                        <span className="font-medium text-foreground">{locale === 'vi' ? 'Tài liệu khoa học:' : 'Scientific References:'}</span>
                      </div>
                      <ul className="ml-5 space-y-1 text-muted-foreground">
                        {h.scientific_references.map((ref: string, i: number) => (
                          <li key={i} className="list-disc">{ref}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Country Risk Note */}
                  {h.country_risk_note && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                      <Info className="h-3 w-3 mt-0.5 text-amber-600 shrink-0" />
                      <span className="text-amber-800">{h.country_risk_note}</span>
                    </div>
                  )}
                  
                  {/* FDA Guidance Link */}
                  {h.fda_guidance_url && (
                    <a 
                      href={h.fda_guidance_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {locale === 'vi' ? 'Xem FDA Guidance' : 'View FDA Guidance'}
                    </a>
                  )}
                </div>
              )}
              
              {hazard.justification && (
                <div className="mt-2 text-xs text-muted-foreground italic">
                  {hazard.justification}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error || !analysis) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{locale === 'vi' ? 'Lỗi' : 'Error'}</AlertTitle>
          <AlertDescription>
            {locale === 'vi' 
              ? 'Không thể tải hazard analysis. Vui lòng thử lại.'
              : 'Failed to load hazard analysis. Please try again.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {locale === 'vi' ? 'Quay lại' : 'Go Back'}
        </Button>
      </div>
    )
  }
  
  const totalHazards = 
    (analysis.biological_hazards?.length || 0) +
    (analysis.chemical_hazards?.length || 0) +
    (analysis.physical_hazards?.length || 0) +
    (analysis.allergen_hazards?.length || 0) +
    (analysis.radiological_hazards?.length || 0)
  
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/fsvp-supplier?tab=hazard-analysis')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {locale === 'vi' ? 'Quay lại' : 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{analysis.product_name}</h1>
            <p className="text-sm text-muted-foreground">
              {locale === 'vi' ? 'FSVP Hazard Analysis' : 'FSVP Hazard Analysis'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(analysis.status)}
          {analysis.is_sahcodha_product && (
            <Badge className="bg-amber-600 text-white">SAHCODHA</Badge>
          )}
          {analysis.auto_generated && (
            <Badge variant="outline" className="text-xs">
              {locale === 'vi' ? 'Tự động tạo' : 'Auto-generated'}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Auto-generated notice */}
      {analysis.auto_generated && analysis.status === 'draft' && (
        <Alert className="mb-6 border-blue-500 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">
            {locale === 'vi' ? 'Bản nháp tự động' : 'Auto-generated Draft'}
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            {locale === 'vi' 
              ? 'Hazard analysis này được tạo tự động từ quét nhãn. Vui lòng xem xét và hoàn thiện thông tin trước khi phê duyệt.'
              : 'This hazard analysis was auto-generated from label scan. Please review and complete the information before approval.'}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{locale === 'vi' ? 'Thông tin sản phẩm' : 'Product Information'}</CardTitle>
                <CardDescription>
                  {locale === 'vi' ? 'Chi tiết sản phẩm và hazard analysis' : 'Product details and hazard analysis'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      {locale === 'vi' ? 'Hủy' : 'Cancel'}
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {locale === 'vi' ? 'Lưu' : 'Save'}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    {locale === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{locale === 'vi' ? 'Tên sản phẩm' : 'Product Name'}</Label>
                      <Input 
                        value={formData.product_name}
                        onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{locale === 'vi' ? 'Danh mục' : 'Category'}</Label>
                      <Select 
                        value={formData.product_category}
                        onValueChange={(v) => setFormData({ ...formData, product_category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seafood">Seafood</SelectItem>
                          <SelectItem value="produce">Produce</SelectItem>
                          <SelectItem value="dairy">Dairy</SelectItem>
                          <SelectItem value="meat">Meat</SelectItem>
                          <SelectItem value="spices">Spices</SelectItem>
                          <SelectItem value="nuts">Nuts</SelectItem>
                          <SelectItem value="grains">Grains</SelectItem>
                          <SelectItem value="beverages">Beverages</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{locale === 'vi' ? 'Mô tả' : 'Description'}</Label>
                    <Textarea 
                      value={formData.product_description}
                      onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
  rows={3}
  />
  </div>
  
  {/* Read-only Ingredients & Allergens Section in Edit Mode */}
  {(analysis.ingredient_list || analysis.allergen_declaration) && (
    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Wheat className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">
          {locale === 'vi' ? 'Thành phần & Dị ứng (từ nhãn)' : 'Ingredients & Allergens (from label)'}
        </p>
      </div>
      
      {analysis.ingredient_list && (
        <div className="mb-3">
          <p className="text-xs text-amber-700 uppercase tracking-wide mb-1">
            {locale === 'vi' ? 'Thành phần' : 'Ingredients'}
          </p>
          <p className="text-sm text-amber-900 bg-white/60 rounded-md p-2">
            {analysis.ingredient_list}
          </p>
        </div>
      )}
      
      {analysis.allergen_declaration && (
        <div>
          <p className="text-xs text-amber-700 uppercase tracking-wide mb-1">
            {locale === 'vi' ? 'Công bố dị ứng' : 'Allergen Declaration'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.allergen_declaration.split(/[,;]/).map((allergen, idx) => {
              const trimmed = allergen.trim()
              if (!trimmed) return null
              return (
                <Badge 
                  key={idx} 
                  variant="destructive"
                  className="bg-red-100 text-red-700 border border-red-300"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {trimmed}
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )}
  
  {/* 
                    Note: In Supplier Portal, we don't show supplier dropdown 
                    because the current user IS the supplier. Supplier info is 
                    auto-linked via importer_user_id or supplier_user_id.
                    
                    This dropdown is only shown in Importer Portal where importer 
                    needs to select which supplier the product comes from.
                  */}
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{locale === 'vi' ? 'Người phân tích' : 'Analyzed By'}</Label>
                      <Input 
                        value={formData.analyzed_by}
                        onChange={(e) => setFormData({ ...formData, analyzed_by: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{locale === 'vi' ? 'Chứng chỉ' : 'Credentials'}</Label>
                      <Input 
                        value={formData.qualified_individual_credentials}
                        onChange={(e) => setFormData({ ...formData, qualified_individual_credentials: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{locale === 'vi' ? 'Trạng thái' : 'Status'}</Label>
                    <Select 
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{locale === 'vi' ? 'Bản nháp' : 'Draft'}</SelectItem>
                        <SelectItem value="pending_review">{locale === 'vi' ? 'Chờ duyệt' : 'Pending Review'}</SelectItem>
                        <SelectItem value="approved">{locale === 'vi' ? 'Đã duyệt' : 'Approved'}</SelectItem>
                        <SelectItem value="needs_revision">{locale === 'vi' ? 'Cần sửa' : 'Needs Revision'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{locale === 'vi' ? 'Tên sản phẩm' : 'Product Name'}</p>
                      <p className="font-medium">{analysis.product_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{locale === 'vi' ? 'Danh mục' : 'Category'}</p>
                      <p className="font-medium capitalize">{analysis.product_category || '-'}</p>
                    </div>
                  </div>
                  {analysis.brand_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">{locale === 'vi' ? 'Thương hiệu' : 'Brand'}</p>
                      <p className="font-medium">{analysis.brand_name}</p>
                    </div>
                  )}
                  {analysis.product_description && (
                    <div>
                      <p className="text-sm text-muted-foreground">{locale === 'vi' ? 'Mô tả' : 'Description'}</p>
                      <p>{analysis.product_description}</p>
                    </div>
                  )}
                  {/* Ingredients & Allergens Section */}
                  {(analysis.ingredient_list || analysis.allergen_declaration || (analysis.allergen_hazards && analysis.allergen_hazards.length > 0)) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <Wheat className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-semibold text-foreground">
                          {locale === 'vi' ? 'Thành phần & Dị ứng' : 'Ingredients & Allergens'}
                        </p>
                      </div>
                      
                      {/* Ingredient List */}
                      {analysis.ingredient_list && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {locale === 'vi' ? 'Thành phần' : 'Ingredients'}
                          </p>
                          <p className="text-sm bg-muted/50 rounded-md p-2 leading-relaxed">
                            {analysis.ingredient_list}
                          </p>
                        </div>
                      )}
                      
                      {/* Allergen Declaration */}
                      {analysis.allergen_declaration && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {locale === 'vi' ? 'Công bố dị ứng' : 'Allergen Declaration'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.allergen_declaration.split(/[,;]/).map((allergen, idx) => {
                              const trimmed = allergen.trim()
                              if (!trimmed) return null
                              return (
                                <Badge 
                                  key={idx} 
                                  variant="destructive"
                                  className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {trimmed}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Auto-detected Allergen Hazards from Analysis */}
                      {!analysis.allergen_declaration && analysis.allergen_hazards && analysis.allergen_hazards.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {locale === 'vi' ? 'Dị ứng phát hiện' : 'Detected Allergens'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.allergen_hazards.map((hazard, idx) => (
                              <Badge 
                                key={idx} 
                                variant="destructive"
                                className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {hazard.hazard_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Hazards Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                {locale === 'vi' ? 'Phân tích Hazard' : 'Hazard Analysis'}
                <Badge variant="secondary">{totalHazards}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="biological" className="flex items-center gap-1">
                    <Bug className="h-3 w-3" />
                    <span className="hidden sm:inline">Bio</span>
                    <Badge variant="outline" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                      {analysis.biological_hazards?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="chemical" className="flex items-center gap-1">
                    <Atom className="h-3 w-3" />
                    <span className="hidden sm:inline">Chem</span>
                    <Badge variant="outline" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                      {analysis.chemical_hazards?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="physical" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="hidden sm:inline">Phys</span>
                    <Badge variant="outline" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                      {analysis.physical_hazards?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="allergen" className="flex items-center gap-1">
                    <Wheat className="h-3 w-3" />
                    <span className="hidden sm:inline">Allergen</span>
                    <Badge variant="outline" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                      {analysis.allergen_hazards?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="radiological" className="flex items-center gap-1">
                    <Droplet className="h-3 w-3" />
                    <span className="hidden sm:inline">Radio</span>
                    <Badge variant="outline" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                      {analysis.radiological_hazards?.length || 0}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="biological" className="mt-4">
                  {renderHazardList(analysis.biological_hazards, 'biological')}
                </TabsContent>
                <TabsContent value="chemical" className="mt-4">
                  {renderHazardList(analysis.chemical_hazards, 'chemical')}
                </TabsContent>
                <TabsContent value="physical" className="mt-4">
                  {renderHazardList(analysis.physical_hazards, 'physical')}
                </TabsContent>
                <TabsContent value="allergen" className="mt-4">
                  {renderHazardList(analysis.allergen_hazards, 'allergen')}
                </TabsContent>
                <TabsContent value="radiological" className="mt-4">
                  {renderHazardList(analysis.radiological_hazards, 'radiological')}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Document Upload Section - Inline for Supplier */}
          <HazardAnalysisDocumentUpload
            hazardAnalysisId={id}
            productCategory={analysis.product_category}
            isSahcodha={analysis.is_sahcodha_product}
            language={locale === 'vi' ? 'vi' : 'en'}
          />
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Label Image */}
          {analysis.label_image_url && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {locale === 'vi' ? 'Hình ảnh nhãn' : 'Label Image'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={analysis.label_image_url}
                    alt="Product label"
                    fill
                    className="object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* SAHCODHA Info */}
          {analysis.is_sahcodha_product && (
            <Card className="border-amber-500">
              <CardHeader className="pb-2 bg-amber-50">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          <ShieldAlert className="h-4 w-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" align="start" className="max-w-[280px] p-3">
                        <div className="text-xs space-y-2">
                          <p className="font-semibold text-foreground">
                            FDA high-risk foods requiring annual onsite audit per 21 CFR 1.506(d)(2)
                          </p>
                          <p className="text-muted-foreground">
                            Thực phẩm rủi ro cao của FDA yêu cầu kiểm tra thực địa hàng năm theo 21 CFR 1.506(d)(2)
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  SAHCODHA
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">{locale === 'vi' ? 'Danh mục' : 'Category'}</p>
                  <p className="font-medium capitalize">{analysis.sahcodha_category || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{locale === 'vi' ? 'Yêu cầu audit' : 'Audit Requirement'}</p>
                  <p className="font-medium">
                    {analysis.requires_annual_audit 
                      ? (locale === 'vi' ? 'Annual Onsite Audit (bắt buộc)' : 'Annual Onsite Audit (required)')
                      : (locale === 'vi' ? 'Không bắt buộc' : 'Not required')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Verification Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {locale === 'vi' ? 'Verification' : 'Verification'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">{locale === 'vi' ? 'Loại verification' : 'Verification Type'}</p>
                <p className="font-medium capitalize">
                  {analysis.verification_type?.replace(/_/g, ' ') || '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{locale === 'vi' ? 'Tần suất' : 'Frequency'}</p>
                <p className="font-medium capitalize">
                  {analysis.verification_frequency?.replace(/_/g, ' ') || '-'}
                </p>
              </div>
              {analysis.verification_options && analysis.verification_options.length > 0 && (
                <div>
                  <p className="text-muted-foreground">{locale === 'vi' ? 'Tùy chọn' : 'Options'}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.verification_options.map((opt, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {opt.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Metadata */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                {locale === 'vi' ? 'Thông tin khác' : 'Metadata'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{locale === 'vi' ? 'Ngày tạo:' : 'Created:'}</span>
                <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
              </div>
              {analysis.analyzed_by && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{locale === 'vi' ? 'Người phân tích:' : 'Analyzed by:'}</span>
                  <span>{analysis.analyzed_by}</span>
                </div>
              )}
              {analysis.linked_audit_report_id && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Link 
                    href={`/audit/${analysis.linked_audit_report_id}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {locale === 'vi' ? 'Xem báo cáo gốc' : 'View original report'}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
