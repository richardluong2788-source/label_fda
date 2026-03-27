'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Ship,
  ShieldAlert,
  FileCheck,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  Factory,
  FileText,
  Send,
  Link2,
  Plus,
  Package,
  Building2,
  ExternalLink,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { RoleSelectionDialog, type FSVPUserRole } from '@/components/fsvp/role-selection-dialog'
import { createClient } from '@/lib/supabase/client'
import type { AuditReport } from '@/lib/types'
import { FceConsultationDialog } from './fce-consultation-dialog'
import { FfrConsultationDialog } from './ffr-consultation-dialog'
import { RegistrationStatusChecker } from './registration-status-checker'

// Data structure for pre-filling product form from label scan
export interface LabelScanProductData {
  productName: string
  brandName?: string
  productCategory?: string
  ingredientList?: string
  allergenDeclaration?: string
  netWeight?: string
  countryOfOrigin?: string
  labelImageUrl?: string
  productDescription?: string
  isSahcodha?: boolean
}

interface LinkedHazardAnalysis {
  id: string
  product_name: string
  status: string
  created_at: string
}

interface ExistingProductMatch {
  id: string
  product_name: string
  brand_name: string
  label_count: number
  hazard_analysis_id?: string
  supplier_name?: string
}

interface FSVPIntegrationBannerProps {
  report: AuditReport
  productName?: string
  productCategory?: string
  countryOfOrigin?: string
  isImported?: boolean
  onRequestDocument?: (data: LabelScanProductData) => void
}

export function FSVPIntegrationBanner({
  report,
  productName,
  productCategory,
  countryOfOrigin,
  isImported = false,
  onRequestDocument,
}: FSVPIntegrationBannerProps) {
  const router = useRouter()
  const { locale } = useTranslation()
  
  // Core state
  const [isCreating, setIsCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedAnalysis, setLinkedAnalysis] = useState<LinkedHazardAnalysis | null>(null)
  const [isCheckingLinked, setIsCheckingLinked] = useState(true)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState<FSVPUserRole | null>(null)
  const [pendingAction, setPendingAction] = useState<'create' | 'view' | null>(null)
  const [existingProduct, setExistingProduct] = useState<ExistingProductMatch | null>(null)
  const [isCheckingExisting, setIsCheckingExisting] = useState(true)
  
  // Consultation dialogs
  const [showFceDialog, setShowFceDialog] = useState(false)
  const [showFfrDialog, setShowFfrDialog] = useState(false)
  
  // Registration status for upsell flow
  const [registrationStatus, setRegistrationStatus] = useState<{
    hasFFR: boolean | null
    hasFCESID: boolean | null
  }>({ hasFFR: null, hasFCESID: null })

  // Check for user's account_type
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const accountType = user.user_metadata?.account_type as FSVPUserRole | undefined
          if (accountType && ['importer', 'supplier', 'qi'].includes(accountType)) {
            setSelectedRole(accountType)
            return
          }
          
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('account_type')
            .eq('id', user.id)
            .single()
          
          if (profile?.account_type && ['importer', 'supplier', 'qi'].includes(profile.account_type)) {
            setSelectedRole(profile.account_type as FSVPUserRole)
            return
          }
        }
        
        const savedRole = localStorage.getItem('fsvp_user_role') as FSVPUserRole | null
        if (savedRole && ['importer', 'supplier', 'qi'].includes(savedRole)) {
          setSelectedRole(savedRole)
        }
      } catch {
        const savedRole = localStorage.getItem('fsvp_user_role') as FSVPUserRole | null
        if (savedRole && ['importer', 'supplier', 'qi'].includes(savedRole)) {
          setSelectedRole(savedRole)
        }
      }
    }
    checkUserRole()
  }, [])
  
  // Check linked analysis
  useEffect(() => {
    const checkLinkedAnalysis = async () => {
      try {
        const response = await fetch(`/api/fsvp/hazard-analyses?linkedReportId=${report.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.analyses?.length > 0) {
            setLinkedAnalysis(data.analyses[0])
          }
        }
      } catch {
        // Ignore
      } finally {
        setIsCheckingLinked(false)
      }
    }
    
    if (report.id) {
      checkLinkedAnalysis()
    } else {
      setIsCheckingLinked(false)
    }
  }, [report.id])
  
  // Check existing product
  useEffect(() => {
    const checkExistingProduct = async () => {
      try {
        const reportData = report as Record<string, unknown>
        const brandName = (reportData?.brand_name as string) || ''
        const actualProductName = productName || (reportData?.product_name as string) || ''
        
        if (!actualProductName && !brandName) {
          setIsCheckingExisting(false)
          return
        }
        
        const params = new URLSearchParams()
        if (brandName) params.set('brandName', brandName)
        if (actualProductName) params.set('productName', actualProductName)
        params.set('checkDuplicate', 'true')
        
        const response = await fetch(`/api/fsvp/products/check-existing?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          if (data.existingProduct) {
            setExistingProduct(data.existingProduct)
          }
        }
      } catch {
        // Ignore
      } finally {
        setIsCheckingExisting(false)
      }
    }
    checkExistingProduct()
  }, [report, productName])

  // FSVP requirement check
  const checkFSVPRequirement = () => {
    const reportData = report as Record<string, unknown>
    const actualProductName = productName || (reportData?.product_name as string) || (reportData?.brand_name as string) || ''
    const actualCategory = productCategory || (reportData?.product_category as string) || (reportData?.product_type as string) || ''
    
    const name = actualProductName.toLowerCase()
    const category = actualCategory.toLowerCase()
    
    const sahcodhaPatterns = [
      'pangasius', 'cá tra', 'basa', 'catfish', 'shrimp', 'tôm', 'fish', 'cá',
      'salmon', 'tuna', 'mackerel', 'oyster', 'clam', 'mussel', 'crab', 'lobster',
      'seafood', 'shellfish', 'cashew', 'hạt điều', 'peanut', 'đậu phộng', 'almond', 
      'walnut', 'pistachio', 'spice', 'gia vị', 'pepper', 'tiêu', 'paprika', 'cumin',
      'turmeric', 'cinnamon', 'oregano', 'sichuan', 'peppercorn', 'sprout', 'leafy green',
      'lettuce', 'spinach', 'cilantro', 'tomato', 'melon', 'berry', 'raspberry', 
      'strawberry', 'canned', 'đồ hộp', 'pickle', 'acidified', 'supplement', 'vitamin',
      'thực phẩm chức năng', 'infant', 'baby food', 'sữa công thức', 'juice', 'nước ép',
      'cheese', 'phô mai', 'raw milk',
    ]
    
    const fceSidPatterns = [
      'canned', 'retort', 'pouch', 'jarred', 'preserved', 'đồ hộp', 'đóng hộp', 
      'thịt hộp', 'cá hộp', 'pickled', 'acidified', 'pickles', 'artichoke',
      'dưa chua', 'dưa muối', 'ớt ngâm', 'măng',
    ]
    
    const ingredients = ((reportData?.ingredient_list as string) || (reportData?.ingredients as string) || '').toLowerCase()
    const manufacturerInfo = ((reportData?.manufacturer_info as string) || (reportData?.manufacturer as string) || '').toLowerCase()
    const rawText = ((reportData?.raw_text as string) || '').toLowerCase()
    const netWeight = ((reportData?.net_quantity as string) || (reportData?.net_weight as string) || '').toLowerCase()
    const allText = `${name} ${category} ${ingredients} ${manufacturerInfo} ${rawText}`
    
    const isSAHCODHA = sahcodhaPatterns.some(p => allText.includes(p))
    
    // Detect canned products: check packaging indicators
    // - "drained weight" indicates liquid-packed canned goods
    // - metal can packaging
    // - retort pouch indicators
    const cannedIndicators = [
      'canned', 'retort', 'đồ hộp', 'đóng hộp', 'hộp',
      'drained weight', 'drained wt', 'net wt', // liquid-packed canned
      'in water', 'in brine', 'in oil', 'in syrup', // packing medium
      'sterilized', 'hermetically sealed',
    ]
    const isLACF = cannedIndicators.some(k => allText.includes(k) || netWeight.includes(k))
    
    const requiresFceSid = fceSidPatterns.some(p => allText.includes(p)) || isLACF
    const isAcidified = ['pickled', 'acidified', 'pickles', 'dưa chua', 'dưa muối', 'ớt ngâm'].some(k => allText.includes(k))
    
    // Extract country from multiple sources
    // Check "PRODUCT OF X" or "MADE IN X" patterns in raw text
    let detectedCountry = countryOfOrigin || (reportData?.country_of_origin as string) || ''
    if (!detectedCountry) {
      const productOfMatch = allText.match(/product of\s+([a-zA-Z\s]+)/i)
      const madeInMatch = allText.match(/made in\s+([a-zA-Z\s]+)/i)
      const originMatch = allText.match(/origin:\s*([a-zA-Z\s]+)/i)
      detectedCountry = (productOfMatch?.[1] || madeInMatch?.[1] || originMatch?.[1] || '').trim()
    }
    
    const countryText = detectedCountry.toLowerCase()
    const isHighRiskOrigin = ['vietnam', 'việt nam', 'china', 'trung quốc', 'thailand', 'thái lan', 'india', 'ấn độ']
      .some(c => countryText.includes(c))
    
    // FSVP is required for:
    // 1. Explicitly marked as imported
    // 2. High-risk origin countries (Vietnam, China, Thailand, India)
    // 3. SAHCODHA products (seafood, spices, etc.)
    // 4. LACF/Acidified products (canned goods) - these are almost always imported
    const fsvpRequired = isImported || isHighRiskOrigin || isSAHCODHA || requiresFceSid
    
    return {
      required: fsvpRequired,
      isSAHCODHA,
      isHighRiskOrigin,
      verificationType: isSAHCODHA ? 'annual_onsite_audit' : 'risk_based',
      detectedName: actualProductName,
      detectedCategory: actualCategory,
      detectedCountry,
      requiresFceSid,
      fceSidType: isLACF ? 'lacf' : isAcidified ? 'acidified' : null,
      fceSidRegulation: isLACF ? '21 CFR 108.25 (LACF)' : isAcidified ? '21 CFR 108.35 (Acidified)' : null,
    }
  }

  let fsvpCheck: ReturnType<typeof checkFSVPRequirement>
  try {
    fsvpCheck = checkFSVPRequirement()
  } catch {
    return null
  }
  
  if (!fsvpCheck.required) return null

  // Handlers
  const handleRoleSelected = (role: FSVPUserRole) => {
    setSelectedRole(role)
    if (pendingAction === 'create') {
      if (role === 'importer') {
        executeCreateFSVP()
      } else {
        router.push(`/dashboard/fsvp-supplier?tab=self-assessment&product=${encodeURIComponent(productName || '')}`)
      }
    } else if (pendingAction === 'view') {
      router.push('/dashboard/fsvp-supplier')
    }
    setPendingAction(null)
  }

  const handleCreateFSVP = async () => {
    if (!selectedRole) {
      setPendingAction('create')
      setShowRoleDialog(true)
      return
    }
    if (selectedRole === 'supplier') {
      await executeCreateFSVPForSupplier()
      return
    }
    executeCreateFSVP()
  }

  const buildLabelScanData = (): LabelScanProductData => {
    const reportData = report as Record<string, unknown>
    const actualProductName = productName || (reportData?.product_name as string) || (reportData?.brand_name as string) || ''
    const ingredients = (reportData?.ingredient_list as string) || (reportData?.ingredients as string) || ''
    
    const parts = []
    if (reportData?.brand_name) parts.push(reportData.brand_name as string)
    if (actualProductName && actualProductName !== reportData?.brand_name) parts.push(actualProductName)
    if (reportData?.net_quantity) parts.push(`(${reportData.net_quantity})`)
    
    return {
      productName: actualProductName,
      brandName: (reportData?.brand_name as string) || '',
      productCategory: productCategory || (reportData?.product_category as string) || '',
      ingredientList: ingredients,
      allergenDeclaration: (reportData?.allergen_declaration as string) || '',
      netWeight: (reportData?.net_quantity as string) || '',
      countryOfOrigin: countryOfOrigin || (reportData?.country_of_origin as string) || '',
      labelImageUrl: (reportData?.label_image_url as string) || ((reportData?.label_images as string[])?.[0]) || '',
      productDescription: parts.join(' - ') || `Imported product from ${countryOfOrigin || reportData?.country_of_origin || 'unknown origin'}`,
      isSahcodha: fsvpCheck.isSAHCODHA,
    }
  }

  const handleRequestDocument = () => {
    if (onRequestDocument) {
      onRequestDocument(buildLabelScanData())
    } else {
      const labelData = buildLabelScanData()
      const params = new URLSearchParams({
        tab: 'products',
        action: 'add',
        productName: labelData.productName,
        brandName: labelData.brandName || '',
        productCategory: labelData.productCategory || '',
        countryOfOrigin: labelData.countryOfOrigin || '',
        isSahcodha: String(labelData.isSahcodha || false),
        fromLabelScan: 'true',
      })
      router.push(`/dashboard/fsvp?${params.toString()}`)
    }
  }

  const handleAddLabelToExisting = async () => {
    if (!existingProduct) return
    setIsCreating(true)
    try {
      const reportData = report as Record<string, unknown>
      const response = await fetch(`/api/fsvp/hazard-analyses/${existingProduct.hazard_analysis_id}/link-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditReportId: report.id,
          labelImageUrl: (reportData?.label_image_url as string) || ((reportData?.label_images as string[])?.[0]) || '',
          netWeight: (reportData?.net_quantity as string) || '',
          changeReason: 'Additional packaging level/label scan',
        }),
      })
      
      if (response.ok) {
        setCreated(true)
        router.push(`/dashboard/fsvp-supplier/hazard-analysis/${existingProduct.hazard_analysis_id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to link label')
      }
    } catch {
      setError('Network error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const buildFSVPPayload = () => {
    const reportData = report as Record<string, unknown>
    const actualProductName = productName || (reportData?.product_name as string) || (reportData?.brand_name as string) || 'Unknown Product'
    const ingredients = (reportData?.ingredient_list as string) || (reportData?.ingredients as string) || ''
    const detectedIngredients = ingredients 
      ? ingredients.split(',').map((i: string) => i.trim()).filter(Boolean).slice(0, 5)
      : [actualProductName]
    
    return {
      reportId: report.id,
      productName: actualProductName,
      detectedIngredients,
      originCountry: countryOfOrigin || (reportData?.country_of_origin as string),
      userId: report.user_id,
      auditReportData: {
        brandName: reportData?.brand_name,
        productCategory: productCategory || reportData?.product_category,
        ingredientList: reportData?.ingredient_list,
        allergenDeclaration: reportData?.allergen_declaration,
        labelImageUrl: (reportData?.label_image_url as string) || ((reportData?.label_images as string[])?.[0]),
        netWeight: reportData?.net_quantity,
        nutritionFacts: reportData?.nutrition_facts,
        detectedLanguages: reportData?.detected_languages,
      },
    }
  }

  const executeCreateFSVP = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/fsvp/link-from-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFSVPPayload()),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create FSVP hazard analysis')
      
      setCreated(true)
      const hazardAnalysisId = result.results?.hazardAnalysesCreated?.[0]
      setTimeout(() => {
        if (hazardAnalysisId) {
          router.push(`/dashboard/fsvp-supplier/hazard-analysis/${hazardAnalysisId}`)
        } else {
          router.push('/dashboard/fsvp-supplier?tab=hazard-analysis')
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const executeCreateFSVPForSupplier = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const payload = buildFSVPPayload()
      const response = await fetch('/api/fsvp/link-from-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create FSVP hazard analysis')
      
      setCreated(true)
      const hazardAnalysisId = result.results?.hazardAnalysesCreated?.[0]
      const isSahcodha = fsvpCheck?.isSAHCODHA || false
      
      setTimeout(() => {
        const params = new URLSearchParams({
          tab: 'prepare-docs',
          product: payload.productName,
          ...(hazardAnalysisId && { hazardAnalysisId }),
          ...(payload.auditReportData?.productCategory && { category: payload.auditReportData.productCategory as string }),
          ...(payload.originCountry && { country: payload.originCountry }),
          ...(isSahcodha && { sahcodha: 'true' }),
          new: 'true',
        })
        router.push(`/dashboard/fsvp-supplier?${params.toString()}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewFSVP = () => router.push('/dashboard/fsvp')
  const handleViewLinkedAnalysis = () => {
    if (linkedAnalysis) router.push(`/dashboard/fsvp-supplier/hazard-analysis/${linkedAnalysis.id}`)
  }

  // Loading state
  if (isCheckingLinked) return null

  const reportData = report as Record<string, unknown>
  const actualProductName = productName || (reportData?.product_name as string) || (reportData?.brand_name as string) || ''

  // Role dialog
  const roleDialog = (
    <RoleSelectionDialog
      open={showRoleDialog}
      onOpenChange={setShowRoleDialog}
      onRoleSelected={handleRoleSelected}
      productName={actualProductName}
      isSAHCODHA={fsvpCheck.isSAHCODHA}
    />
  )

  // Success state
  if (created) {
    return (
      <>
        {roleDialog}
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            {locale === 'vi' ? 'Da tao FSVP Hazard Analysis' : 'FSVP Hazard Analysis Created'}
          </AlertTitle>
          <AlertDescription className="text-green-700">
            {locale === 'vi' ? 'Dang chuyen huong...' : 'Redirecting...'}
          </AlertDescription>
        </Alert>
      </>
    )
  }
  
  // Linked analysis exists
  if (linkedAnalysis) {
    return (
      <>
        {roleDialog}
        <Alert className="border-green-500 bg-green-50 mt-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 flex items-center gap-2">
            <span>{locale === 'vi' ? 'FSVP Hazard Analysis da ton tai' : 'FSVP Hazard Analysis Exists'}</span>
            <Badge className="bg-green-600 text-white text-[10px]">
              {linkedAnalysis.status === 'draft' ? (locale === 'vi' ? 'BAN NHAP' : 'DRAFT') : linkedAnalysis.status.toUpperCase()}
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-green-700 mt-2">
            <div className="space-y-3">
              <p>{locale === 'vi' ? 'San pham nay da co FSVP Hazard Analysis.' : 'This product already has an FSVP Hazard Analysis.'}</p>
              <div className="text-sm text-green-600">
                <span className="font-medium">{locale === 'vi' ? 'San pham: ' : 'Product: '}</span>
                {linkedAnalysis.product_name}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleViewLinkedAnalysis} className="bg-green-600 hover:bg-green-700 text-white">
                  <Eye className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Xem Hazard Analysis' : 'View Hazard Analysis'}
                </Button>
                <Button variant="outline" onClick={handleViewFSVP} className="border-green-500 text-green-700 hover:bg-green-100">
                  <Ship className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Xem FSVP Portal' : 'View FSVP Portal'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </>
    )
  }
  
  // Existing product found
  if (existingProduct && !isCheckingExisting) {
    return (
      <>
        {roleDialog}
        <Alert className="border-purple-400 bg-purple-50 mt-4">
          <Package className="h-5 w-5 text-purple-600" />
          <AlertTitle className="text-purple-800 flex items-center gap-2">
            <span>{locale === 'vi' ? 'San pham da ton tai' : 'Product Already Exists'}</span>
            <Badge className="bg-purple-600 text-white text-[10px]">
              {existingProduct.label_count} {locale === 'vi' ? 'NHAN' : 'LABEL(S)'}
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-purple-700 mt-2">
            <div className="space-y-3">
              <p>
                {locale === 'vi' 
                  ? `San pham "${existingProduct.brand_name} - ${existingProduct.product_name}" da co FSVP record.`
                  : `Product "${existingProduct.brand_name} - ${existingProduct.product_name}" already has an FSVP record.`}
              </p>
              <div className="bg-purple-100 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">{locale === 'vi' ? 'Ban co the:' : 'You can:'}</span>
                </div>
                <ul className="space-y-1 ml-6 list-disc">
                  <li>{locale === 'vi' ? 'Them nhan vao san pham hien co (khuyen nghi)' : 'Add this label to existing product (recommended)'}</li>
                  <li>{locale === 'vi' ? 'Hoac tao FSVP moi' : 'Or create new FSVP'}</li>
                </ul>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" /><span>{error}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleAddLabelToExisting} disabled={isCreating} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                  {locale === 'vi' ? 'Them nhan vao san pham' : 'Add Label to Product'}
                </Button>
                <Button variant="outline" onClick={() => router.push(`/dashboard/fsvp-supplier/hazard-analysis/${existingProduct.hazard_analysis_id}`)} className="border-purple-400 text-purple-700 hover:bg-purple-100">
                  <Eye className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Xem san pham' : 'View Product'}
                </Button>
                <Button variant="ghost" onClick={() => setExistingProduct(null)} className="text-purple-600 hover:bg-purple-100">
                  <Plus className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Tao FSVP moi' : 'Create New FSVP'}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </>
    )
  }
  
  // SAHCODHA product
  if (fsvpCheck.isSAHCODHA) {
    return (
      <>
        {roleDialog}
        <FceConsultationDialog
          open={showFceDialog}
          onOpenChange={setShowFceDialog}
          locale={locale}
          productName={actualProductName}
          productCategory={productCategory}
          countryOfOrigin={countryOfOrigin}
          auditReportId={report.id}
          fceSidCategory={fsvpCheck.fceSidType}
        />
        <Alert className="border-amber-500 bg-amber-50 mt-4">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 flex items-center gap-2">
            <span>{locale === 'vi' ? 'YEU CAU FSVP - San pham SAHCODHA' : 'FSVP REQUIRED - SAHCODHA Product'}</span>
            <Badge className="bg-amber-600 text-white text-[10px]">
              {locale === 'vi' ? 'ANNUAL AUDIT BAT BUOC' : 'ANNUAL AUDIT REQUIRED'}
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-amber-700 mt-2">
            <div className="space-y-3">
              <p>
                <strong>{fsvpCheck.detectedName || productName || 'This product'}</strong>
                {locale === 'vi' 
                  ? ` thuoc danh muc SAHCODHA. Theo 21 CFR 1.506(d)(2), san pham nay yeu cau annual onsite audit.`
                  : ` is classified as SAHCODHA. Per 21 CFR 1.506(d)(2), this requires annual onsite audit.`}
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{locale === 'vi' ? 'Hazard Analysis bat buoc cho foreign supplier' : 'Mandatory Hazard Analysis for foreign supplier'}</li>
                <li>{locale === 'vi' ? 'Annual onsite audit' : 'Annual onsite audit'}</li>
                <li>{locale === 'vi' ? 'Supplier verification documentation' : 'Supplier verification documentation'}</li>
              </ul>
              
              {fsvpCheck.requiresFceSid && (
                <div className="bg-amber-100 rounded-lg p-3 text-sm border border-amber-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-amber-700" />
                    <span className="font-semibold text-amber-800">{locale === 'vi' ? 'Yeu cau them: FCE/SID' : 'Additional: FCE/SID Required'}</span>
                    <Badge className="bg-amber-700 text-white text-[9px]">{fsvpCheck.fceSidRegulation}</Badge>
                  </div>
                  <p className="text-amber-700 mb-2">
                    {locale === 'vi' 
                      ? 'San pham nay can FCE Number va SID theo 21 CFR 108.'
                      : 'This product requires FCE Number and SID per 21 CFR 108.'}
                  </p>
                  <a href="https://www.fda.gov/food/registration-food-facilities/food-canning-establishment-registration"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 underline text-xs">
                    <ExternalLink className="h-3 w-3" />{locale === 'vi' ? 'Tra cuu FCE' : 'Search FCE Database'}
                  </a>
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" /><span>{error}</span>
                </div>
              )}
              
              <div className="flex flex-wrap gap-3 pt-2">
                {selectedRole === 'importer' && (
                  <Button onClick={handleRequestDocument} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="h-4 w-4 mr-2" />{locale === 'vi' ? 'Yeu cau ho so' : 'Request Documents'}
                  </Button>
                )}
                {selectedRole === 'supplier' && (
                  <Button onClick={handleCreateFSVP} disabled={isCreating} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    {locale === 'vi' ? 'Tao FSVP & Upload' : 'Create FSVP & Upload'}
                  </Button>
                )}
                {!selectedRole && (
                  <>
                    <Button onClick={() => { setSelectedRole('importer'); handleRequestDocument() }} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="h-4 w-4 mr-2" />{locale === 'vi' ? 'Importer: Yeu cau ho so' : 'Importer: Request Docs'}
                    </Button>
                    <Button onClick={() => { setPendingAction('create'); setShowRoleDialog(true) }} disabled={isCreating} className="bg-amber-600 hover:bg-amber-700 text-white">
                      <FileText className="h-4 w-4 mr-2" />{locale === 'vi' ? 'Supplier: Tao FSVP' : 'Supplier: Create FSVP'}
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={handleViewFSVP} className="border-amber-500 text-amber-700 hover:bg-amber-100">
                  <Ship className="h-4 w-4 mr-2" />{locale === 'vi' ? 'Xem FSVP Portal' : 'View FSVP Portal'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </>
    )
  }
  
  // FCE/SID required (non-SAHCODHA)
  if (fsvpCheck.requiresFceSid && !fsvpCheck.isSAHCODHA) {
    return (
      <>
        {roleDialog}
        <FceConsultationDialog
          open={showFceDialog}
          onOpenChange={setShowFceDialog}
          locale={locale}
          productName={actualProductName}
          productCategory={productCategory}
          countryOfOrigin={countryOfOrigin}
          auditReportId={report.id}
          fceSidCategory={fsvpCheck.fceSidType}
        />
        <FfrConsultationDialog
          open={showFfrDialog}
          onOpenChange={setShowFfrDialog}
          locale={locale}
          productName={actualProductName}
          productCategory={productCategory}
          countryOfOrigin={countryOfOrigin}
          auditReportId={report.id}
          onSubmitSuccess={() => setRegistrationStatus(prev => ({ ...prev, hasFFR: true }))}
        />
        <Alert className="border-orange-500 bg-orange-50 mt-4">
          <Building2 className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-800 flex items-center gap-2">
            <span>{locale === 'vi' ? 'YEU CAU FCE/SID - San pham LACF/Acidified' : 'FCE/SID REQUIRED - LACF/Acidified Product'}</span>
            <Badge className="bg-orange-600 text-white text-[10px]">{fsvpCheck.fceSidRegulation || '21 CFR 108'}</Badge>
          </AlertTitle>
          <AlertDescription className="text-orange-700 mt-2">
            <div className="space-y-3">
              <p>
                <strong>{fsvpCheck.detectedName || productName || 'This product'}</strong>
                {locale === 'vi' 
                  ? ` la san pham ${fsvpCheck.fceSidType === 'lacf' ? 'Low-Acid Canned Food (LACF)' : 'Acidified Food'}.`
                  : ` is a ${fsvpCheck.fceSidType === 'lacf' ? 'Low-Acid Canned Food (LACF)' : 'Acidified Food'} product.`}
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>FCE Number</strong> - {locale === 'vi' ? 'So dang ky Food Canning Establishment' : 'Food Canning Establishment registration'}</li>
                <li><strong>SID</strong> - {locale === 'vi' ? 'Submission Identifier cho process filing' : 'Submission Identifier for process filing'}</li>
                <li>{locale === 'vi' ? 'Better Process Control School training' : 'Better Process Control School training'}</li>
              </ul>
              
              <RegistrationStatusChecker
                locale={locale}
                registrationStatus={registrationStatus}
                onConfirmFFR={() => setRegistrationStatus(prev => ({ ...prev, hasFFR: true }))}
                onRequestFFRHelp={() => setShowFfrDialog(true)}
                onConfirmFCESID={handleCreateFSVP}
                onRequestFCESIDHelp={() => setShowFceDialog(true)}
                onSkip={handleCreateFSVP}
                fceSidRegulation={fsvpCheck.fceSidRegulation}
                isCreating={isCreating}
              />
              
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" /><span>{error}</span>
                </div>
              )}
              
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="outline" onClick={handleViewFSVP} className="border-orange-500 text-orange-700 hover:bg-orange-100">
                  <Ship className="h-4 w-4 mr-2" />{locale === 'vi' ? 'Xem FSVP Portal' : 'View FSVP Portal'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </>
    )
  }
  
  // Standard FSVP (non-SAHCODHA, non-FCE/SID)
  return (
    <>
      {roleDialog}
      <Alert className="border-blue-400 bg-blue-50 mt-4">
        <Ship className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800 flex items-center gap-2">
          <span>{locale === 'vi' ? 'FSVP YEU CAU - San pham nhap khau' : 'FSVP REQUIRED - Imported Product'}</span>
          <Badge variant="outline" className="border-blue-400 text-blue-700 text-[10px]">
            {locale === 'vi' ? 'VERIFICATION LINH HOAT' : 'FLEXIBLE VERIFICATION'}
          </Badge>
        </AlertTitle>
        <AlertDescription className="text-blue-700 mt-2">
          <div className="space-y-3">
            <p>
              {locale === 'vi' 
                ? 'San pham nhap khau can co FSVP Hazard Analysis theo 21 CFR Part 1 Subpart L.'
                : 'Imported product requires FSVP Hazard Analysis per 21 CFR Part 1 Subpart L.'}
            </p>
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" /><span>{error}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleCreateFSVP} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
                {locale === 'vi' ? 'Tao FSVP Hazard Analysis' : 'Create FSVP Hazard Analysis'}
              </Button>
              <Button variant="outline" onClick={handleViewFSVP} className="border-blue-400 text-blue-700 hover:bg-blue-100">
                <Ship className="h-4 w-4 mr-2" />{locale === 'vi' ? 'Xem FSVP Portal' : 'View FSVP Portal'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </>
  )
}
