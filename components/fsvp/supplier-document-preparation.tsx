'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Shield,
  Beaker,
  FileCheck,
  ChevronRight,
  Info,
  ExternalLink,
  FolderOpen,
  Sparkles,
  Send,
  Loader2,
  Users
} from 'lucide-react'
import {
  FSVP_DOCUMENT_TYPES,
  PRODUCT_CATEGORIES,
  getRequiredDocuments,
  getSuggestedDocuments,
  isSahcodhaCategory,
  type FSVPDocumentTypeId,
  type ProductCategoryId,
} from '@/lib/fsvp-document-request-types'
import { useTranslation } from '@/lib/i18n'

// Props interface for product data from label scan
interface ProductData {
  productName: string
  productCategory?: ProductCategoryId
  ingredients?: string[]
  allergens?: string[]
  countryOfOrigin?: string
  isSahcodha?: boolean
  hazardAnalysisId?: string
}

interface SupplierDocumentPreparationProps {
  productData?: ProductData
  onNavigateToDocuments?: () => void
  // Callback to send the prepared documents/FSVP to Importer
  onSendToImporter?: (data: { productData: ProductData, readyDocuments: string[] }) => Promise<void>
  language?: 'en' | 'vi'
}

export function SupplierDocumentPreparation({ 
  productData,
  onNavigateToDocuments,
  onSendToImporter,
  language = 'en'
}: SupplierDocumentPreparationProps) {
  const { t } = useTranslation()
  
  // Determine SAHCODHA status and required documents
  const analysisResult = useMemo(() => {
    if (!productData) return null
    
    const category = productData.productCategory || 'other'
    const isSahcodha = productData.isSahcodha ?? isSahcodhaCategory(category)
    const requiredDocs = getRequiredDocuments(category, isSahcodha)
    const suggestedDocs = getSuggestedDocuments(category, isSahcodha)
    
    // Add allergen control plan if allergens detected
    if (productData.allergens && productData.allergens.length > 0) {
      if (!suggestedDocs.includes('allergen_control_plan')) {
        suggestedDocs.push('allergen_control_plan')
      }
    }
    
    return {
      category,
      isSahcodha,
      requiredDocs,
      suggestedDocs,
      categoryName: PRODUCT_CATEGORIES[category]?.name || 'Unknown',
    }
  }, [productData])
  
  // Track which documents supplier has ready
  const [documentsReady, setDocumentsReady] = useState<Set<FSVPDocumentTypeId>>(new Set())
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  
  const toggleDocumentReady = (docType: FSVPDocumentTypeId) => {
    setDocumentsReady(prev => {
      const next = new Set(prev)
      if (next.has(docType)) {
        next.delete(docType)
      } else {
        next.add(docType)
      }
      return next
    })
  }
  
  // Calculate readiness progress
  const readinessProgress = useMemo(() => {
    if (!analysisResult) return 0
    const totalRequired = analysisResult.requiredDocs.length
    const ready = analysisResult.requiredDocs.filter(d => documentsReady.has(d)).length
    return totalRequired > 0 ? Math.round((ready / totalRequired) * 100) : 0
  }, [analysisResult, documentsReady])
  
  // Handle sending documents to Importer
  const handleSendToImporter = async () => {
    if (!productData || !onSendToImporter) return
    
    // Check if at least some required documents are ready
    const requiredReady = analysisResult?.requiredDocs.filter(d => documentsReady.has(d)) || []
    if (requiredReady.length === 0) {
      alert(language === 'vi' 
        ? 'Vui lòng đánh dấu ít nhất một tài liệu bắt buộc đã sẵn sàng'
        : 'Please mark at least one required document as ready')
      return
    }
    
    setIsSending(true)
    try {
      await onSendToImporter({
        productData,
        readyDocuments: Array.from(documentsReady)
      })
      setSendSuccess(true)
    } catch (error) {
      console.error('Failed to send to importer:', error)
      alert(language === 'vi' 
        ? 'Không thể gửi cho Importer. Vui lòng thử lại.'
        : 'Failed to send to Importer. Please try again.')
    } finally {
      setIsSending(false)
    }
  }
  
  if (!productData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {language === 'vi' ? 'Chuẩn bị Tài liệu cho Importer' : 'Document Preparation for Importer'}
          </CardTitle>
          <CardDescription>
            {language === 'vi' 
              ? 'Quét nhãn sản phẩm để xem các tài liệu cần chuẩn bị theo 21 CFR Part 1'
              : 'Scan a product label to see required documents per 21 CFR Part 1'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{language === 'vi' ? 'Chưa có sản phẩm' : 'No Product Selected'}</AlertTitle>
            <AlertDescription>
              {language === 'vi'
                ? 'Hãy quét nhãn sản phẩm từ trang Phân tích và nhấn "Tạo FSVP Hazard Analysis" để xem danh sách tài liệu cần chuẩn bị.'
                : 'Scan a product label from the Analysis page and click "Create FSVP Hazard Analysis" to see required documents.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Product Info Banner */}
      <Card className={analysisResult?.isSahcodha ? 'border-amber-500' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                {productData.productName}
              </CardTitle>
              <CardDescription className="mt-1">
                {language === 'vi' ? 'Danh mục: ' : 'Category: '}
                <Badge variant="outline">{analysisResult?.categoryName}</Badge>
                {productData.countryOfOrigin && (
                  <span className="ml-2">
                    | {language === 'vi' ? 'Xuất xứ: ' : 'Origin: '}
                    {productData.countryOfOrigin}
                  </span>
                )}
              </CardDescription>
            </div>
            {analysisResult?.isSahcodha && (
              <Badge className="bg-amber-500 text-white">
                <AlertTriangle className="h-3 w-3 mr-1" />
                SAHCODHA
              </Badge>
            )}
          </div>
        </CardHeader>
        
        {analysisResult?.isSahcodha && (
          <CardContent className="pt-0">
            <Alert className="border-amber-500 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">
                {language === 'vi' ? 'Sản phẩm SAHCODHA - Yêu cầu đặc biệt' : 'SAHCODHA Product - Special Requirements'}
              </AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                {language === 'vi'
                  ? 'Theo 21 CFR 1.506(d)(2), sản phẩm này yêu cầu Annual Onsite Audit Report bắt buộc.'
                  : 'Per 21 CFR 1.506(d)(2), this product requires a mandatory Annual Onsite Audit Report.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
      
      {/* Readiness Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {language === 'vi' ? 'Tiến độ Chuẩn bị' : 'Preparation Progress'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'vi' ? 'Tài liệu bắt buộc đã sẵn sàng' : 'Required documents ready'}
              </span>
              <span className="font-medium">{readinessProgress}%</span>
            </div>
            <Progress value={readinessProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {documentsReady.size} / {analysisResult?.requiredDocs.length || 0} {language === 'vi' ? 'tài liệu' : 'documents'}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Required Documents Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-red-500" />
            {language === 'vi' ? 'Tài liệu BẮT BUỘC' : 'REQUIRED Documents'}
            <Badge variant="destructive" className="ml-2">
              {language === 'vi' ? 'Bắt buộc' : 'Mandatory'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {language === 'vi'
              ? 'Các tài liệu này Importer sẽ yêu cầu theo 21 CFR Part 1 Subpart L'
              : 'These documents will be requested by your US Importer per 21 CFR Part 1 Subpart L'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysisResult?.requiredDocs.map(docType => {
              const doc = FSVP_DOCUMENT_TYPES[docType]
              const isReady = documentsReady.has(docType)
              
              return (
                <div 
                  key={docType}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isReady ? 'bg-green-50 border-green-200' : 'bg-background hover:bg-muted/50'
                  }`}
                >
                  <Checkbox 
                    checked={isReady}
                    onCheckedChange={() => toggleDocumentReady(docType)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isReady ? 'text-green-700' : ''}`}>
                        {language === 'vi' ? doc.nameVi : doc.name}
                      </span>
                      {doc.cfrReference && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {doc.cfrReference}
                        </Badge>
                      )}
                      {isReady && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === 'vi' ? doc.descriptionVi : doc.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Suggested Documents */}
      {analysisResult && analysisResult.suggestedDocs.length > analysisResult.requiredDocs.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              {language === 'vi' ? 'Tài liệu Khuyến nghị' : 'Recommended Documents'}
              <Badge variant="secondary" className="ml-2">
                {language === 'vi' ? 'Tùy chọn' : 'Optional'}
              </Badge>
            </CardTitle>
            <CardDescription>
              {language === 'vi'
                ? 'Các tài liệu này giúp tăng độ tin cậy với Importer'
                : 'These documents help increase trust with your Importer'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysisResult.suggestedDocs
                .filter(d => !analysisResult.requiredDocs.includes(d))
                .map(docType => {
                  const doc = FSVP_DOCUMENT_TYPES[docType]
                  const isReady = documentsReady.has(docType)
                  
                  return (
                    <div 
                      key={docType}
                      className={`flex items-start gap-3 p-2 rounded-lg border transition-colors ${
                        isReady ? 'bg-purple-50 border-purple-200' : 'bg-background hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox 
                        checked={isReady}
                        onCheckedChange={() => toggleDocumentReady(docType)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <span className={`text-sm ${isReady ? 'text-purple-700 font-medium' : ''}`}>
                          {language === 'vi' ? doc.nameVi : doc.name}
                        </span>
                        {doc.cfrReference && (
                          <Badge variant="outline" className="ml-2 text-[10px] px-1.5">
                            {doc.cfrReference}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          {sendSuccess ? (
            <Alert className="border-green-500 bg-green-50 mb-4">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                {language === 'vi' ? 'Đã gửi cho Importer thành công!' : 'Successfully Sent to Importer!'}
              </AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                {language === 'vi'
                  ? 'Importer sẽ nhận được thông báo và có thể xem hồ sơ FSVP của bạn.'
                  : 'The Importer will receive a notification and can view your FSVP documentation.'}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Send to Importer - Primary action for supplier flow */}
              {onSendToImporter && (
                <div className="mb-4">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSendToImporter}
                    disabled={isSending || readinessProgress === 0}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'vi' ? 'Đang gửi...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {language === 'vi' ? 'Gửi cho Importer' : 'Send to Importer'}
                      </>
                    )}
                  </Button>
                  {readinessProgress > 0 && readinessProgress < 100 && (
                    <p className="text-xs text-amber-600 text-center mt-2">
                      {language === 'vi'
                        ? `Lưu ý: Chỉ ${readinessProgress}% tài liệu bắt buộc đã sẵn sàng`
                        : `Note: Only ${readinessProgress}% of required documents are ready`}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1"
              variant={sendSuccess ? "default" : "outline"}
              onClick={onNavigateToDocuments}
            >
              <Upload className="h-4 w-4 mr-2" />
              {language === 'vi' ? 'Tải lên Tài liệu Ngay' : 'Upload Documents Now'}
            </Button>
            <Button variant="outline" className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              {language === 'vi' ? 'Xem hướng dẫn CFR' : 'View CFR Guidelines'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            {language === 'vi'
              ? 'Chuẩn bị sẵn các tài liệu này sẽ giúp quá trình verification với Importer nhanh hơn'
              : 'Having these documents ready will speed up the verification process with your Importer'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
