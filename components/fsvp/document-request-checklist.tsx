'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  FileText,
  Send,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Ship,
  Factory,
  Sparkles,
  Clock,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

interface Supplier {
  id: string
  supplier_name: string
  email: string | null
  country: string | null
}

interface ChecklistItem {
  documentType: FSVPDocumentTypeId
  isSelected: boolean
  isRequired: boolean
  customDescription?: string
}

interface DocumentRequestChecklistProps {
  productName?: string
  productCategory?: ProductCategoryId
  supplierId?: string
  onRequestCreated?: (requestId: string) => void
  onCancel?: () => void
}

export function DocumentRequestChecklist({
  productName: initialProductName = '',
  productCategory: initialCategory,
  supplierId: initialSupplierId,
  onRequestCreated,
  onCancel,
}: DocumentRequestChecklistProps) {
  const router = useRouter()
  const { t, language } = useTranslation()
  const supabase = createClient()

  // Form state
  const [productName, setProductName] = useState(initialProductName)
  const [productCategory, setProductCategory] = useState<ProductCategoryId | ''>(initialCategory || '')
  const [isSahcodha, setIsSahcodha] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId || '')
  const [supplierEmail, setSupplierEmail] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [showAllDocuments, setShowAllDocuments] = useState(false)

  // UI state
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [aiSuggestionApplied, setAiSuggestionApplied] = useState(false)

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true)
      try {
        const { data, error } = await supabase
          .from('fsvp_suppliers')
          .select('id, supplier_name, email, country')
          .order('supplier_name')

        if (!error && data) {
          setSuppliers(data)
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      } finally {
        setIsLoadingSuppliers(false)
      }
    }

    fetchSuppliers()
  }, [supabase])

  // Update SAHCODHA status when category changes
  useEffect(() => {
    if (productCategory) {
      const categoryIsSahcodha = isSahcodhaCategory(productCategory)
      setIsSahcodha(categoryIsSahcodha)
    }
  }, [productCategory])

  // Initialize checklist when category or SAHCODHA status changes
  useEffect(() => {
    if (productCategory) {
      const requiredDocs = getRequiredDocuments(productCategory, isSahcodha)
      const suggestedDocs = getSuggestedDocuments(productCategory, isSahcodha)

      const items: ChecklistItem[] = Object.keys(FSVP_DOCUMENT_TYPES).map((key) => {
        const docType = key as FSVPDocumentTypeId
        const isRequired = requiredDocs.includes(docType)
        const isSuggested = suggestedDocs.includes(docType)

        return {
          documentType: docType,
          isSelected: isRequired || isSuggested,
          isRequired,
        }
      })

      setChecklistItems(items)
      setAiSuggestionApplied(true)
    }
  }, [productCategory, isSahcodha])

  // Calculate selected counts
  const selectedItems = useMemo(() => {
    return checklistItems.filter((item) => item.isSelected)
  }, [checklistItems])

  const requiredItems = useMemo(() => {
    return checklistItems.filter((item) => item.isRequired && item.isSelected)
  }, [checklistItems])

  // Toggle item selection
  const toggleItem = (documentType: FSVPDocumentTypeId) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.documentType === documentType
          ? { ...item, isSelected: !item.isSelected }
          : item
      )
    )
  }

  // Get selected supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId)
  }, [suppliers, selectedSupplierId])

  // Validate form
  const isFormValid = useMemo(() => {
    return (
      productName.trim() !== '' &&
      productCategory !== '' &&
      (selectedSupplierId !== '' || supplierEmail.trim() !== '') &&
      selectedItems.length > 0
    )
  }, [productName, productCategory, selectedSupplierId, supplierEmail, selectedItems])

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid) return

    setIsSubmitting(true)
    try {
      // Create request
      const requestData = {
        product_name: productName,
        product_category: productCategory,
        is_sahcodha: isSahcodha,
        supplier_id: selectedSupplierId || null,
        supplier_email: selectedSupplierId ? selectedSupplier?.email : supplierEmail,
        deadline: deadline || null,
        importer_notes: notes || null,
        applicable_cfr_sections: ['§1.504', '§1.505', '§1.506'],
        ai_suggestion_used: aiSuggestionApplied,
        status: 'sent',
      }

      const response = await fetch('/api/fsvp/document-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: requestData,
          items: selectedItems.map((item, index) => ({
            document_type: item.documentType,
            document_name: FSVP_DOCUMENT_TYPES[item.documentType].name,
            description: item.customDescription || FSVP_DOCUMENT_TYPES[item.documentType].description,
            is_required: item.isRequired,
            cfr_reference: FSVP_DOCUMENT_TYPES[item.documentType].cfrReference,
            sort_order: index,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create request')
      }

      const result = await response.json()
      setShowConfirmDialog(false)

      if (onRequestCreated) {
        onRequestCreated(result.id)
      } else {
        router.push(`/dashboard/fsvp/requests/${result.id}`)
      }
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Failed to create document request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get minimum deadline date (tomorrow)
  const minDeadline = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }, [])

  // Visible documents based on showAllDocuments toggle
  const visibleItems = useMemo(() => {
    if (showAllDocuments) {
      return checklistItems
    }
    // Show required + suggested + selected items
    return checklistItems.filter(
      (item) => item.isRequired || item.isSelected || FSVP_DOCUMENT_TYPES[item.documentType].defaultRequired
    )
  }, [checklistItems, showAllDocuments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {language === 'vi' ? 'Yêu cầu Tài liệu FSVP' : 'FSVP Document Request'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'vi'
              ? 'Chọn các tài liệu cần yêu cầu từ nhà cung cấp theo 21 CFR Part 1, Subpart L'
              : 'Select documents to request from supplier per 21 CFR Part 1, Subpart L'}
          </p>
        </div>
        {aiSuggestionApplied && productCategory && (
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="h-3 w-3" />
            {language === 'vi' ? 'AI đã gợi ý' : 'AI Suggested'}
          </Badge>
        )}
      </div>

      {/* Product & Supplier Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'vi' ? 'Thông tin Sản phẩm & Nhà cung cấp' : 'Product & Supplier Info'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="productName">
                {language === 'vi' ? 'Tên Sản phẩm' : 'Product Name'} *
              </Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={language === 'vi' ? 'VD: Cashews, Tôm đông lạnh...' : 'e.g., Cashews, Frozen Shrimp...'}
              />
            </div>

            {/* Product Category */}
            <div className="space-y-2">
              <Label htmlFor="productCategory">
                {language === 'vi' ? 'Danh mục Sản phẩm' : 'Product Category'} *
              </Label>
              <Select value={productCategory} onValueChange={(v) => setProductCategory(v as ProductCategoryId)}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'vi' ? 'Chọn danh mục...' : 'Select category...'} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {language === 'vi' ? cat.nameVi : cat.name}
                        {cat.isSahcodha && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                            SAHCODHA
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SAHCODHA Warning */}
          {isSahcodha && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">
                {language === 'vi' ? 'Sản phẩm SAHCODHA' : 'SAHCODHA Product'}
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {language === 'vi'
                  ? 'Sản phẩm này thuộc danh mục SAHCODHA và yêu cầu Kiểm toán Hàng năm theo §1.506(d)(2).'
                  : 'This product is subject to SAHCODHA requirements and requires Annual Onsite Audit per §1.506(d)(2).'}
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Supplier Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">
                {language === 'vi' ? 'Chọn Nhà cung cấp' : 'Select Supplier'}
              </Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'vi' ? 'Chọn từ danh sách...' : 'Select from list...'} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSuppliers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {language === 'vi' ? 'Chưa có nhà cung cấp nào' : 'No suppliers found'}
                    </div>
                  ) : (
                    suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <Factory className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{supplier.supplier_name}</span>
                          {supplier.country && (
                            <span className="text-xs text-muted-foreground">({supplier.country})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Or enter email directly */}
            <div className="space-y-2">
              <Label htmlFor="supplierEmail">
                {language === 'vi' ? 'Hoặc nhập Email Nhà cung cấp' : 'Or Enter Supplier Email'}
              </Label>
              <Input
                id="supplierEmail"
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                placeholder="supplier@company.com"
                disabled={!!selectedSupplierId}
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {language === 'vi' ? 'Hạn chót' : 'Deadline'}
              </Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={minDeadline}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'vi' ? 'Ghi chú cho Nhà cung cấp' : 'Notes for Supplier'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'vi' ? 'Ghi chú bổ sung...' : 'Additional notes...'}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                {language === 'vi' ? 'Danh sách Tài liệu Yêu cầu' : 'Document Checklist'}
              </CardTitle>
              <CardDescription>
                {language === 'vi'
                  ? `Đã chọn ${selectedItems.length} tài liệu (${requiredItems.length} bắt buộc)`
                  : `${selectedItems.length} documents selected (${requiredItems.length} required)`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllDocuments(!showAllDocuments)}
            >
              {showAllDocuments ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  {language === 'vi' ? 'Thu gọn' : 'Show Less'}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  {language === 'vi' ? 'Xem tất cả' : 'Show All'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleItems.map((item) => {
              const docType = FSVP_DOCUMENT_TYPES[item.documentType]
              return (
                <div
                  key={item.documentType}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    item.isSelected
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/30 border-transparent hover:border-muted'
                  }`}
                >
                  <Checkbox
                    id={item.documentType}
                    checked={item.isSelected}
                    onCheckedChange={() => toggleItem(item.documentType)}
                    disabled={item.isRequired}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label
                        htmlFor={item.documentType}
                        className="font-medium cursor-pointer"
                      >
                        {language === 'vi' ? docType.nameVi : docType.name}
                      </Label>
                      {item.isRequired && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          {language === 'vi' ? 'Bắt buộc' : 'Required'}
                        </Badge>
                      )}
                      {docType.cfrReference && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                          {docType.cfrReference}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {language === 'vi' ? docType.descriptionVi : docType.description}
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">{docType.cfrReference || 'FSVP Requirement'}</p>
                        <p className="text-xs mt-1">
                          {language === 'vi' ? docType.descriptionVi : docType.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )
            })}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            {language === 'vi'
              ? 'Tài liệu theo yêu cầu 21 CFR Part 1, Subpart L'
              : 'Documents per 21 CFR Part 1, Subpart L requirements'}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </Button>
            )}
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!isFormValid}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {language === 'vi' ? 'Gửi Yêu cầu' : 'Send Request'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Summary Card */}
      {selectedItems.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">
                  {language === 'vi' ? 'Tóm tắt Yêu cầu' : 'Request Summary'}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {productName || (language === 'vi' ? 'Chưa nhập tên sản phẩm' : 'Product name not entered')}
                  {selectedSupplier && ` - ${selectedSupplier.supplier_name}`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{selectedItems.length}</div>
                <div className="text-xs text-muted-foreground">
                  {language === 'vi' ? 'tài liệu' : 'documents'}
                </div>
              </div>
            </div>
            {deadline && (
              <div className="flex items-center gap-2 mt-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {language === 'vi' ? 'Hạn chót:' : 'Deadline:'}{' '}
                  {new Date(deadline).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'vi' ? 'Xác nhận Gửi Yêu cầu' : 'Confirm Send Request'}
            </DialogTitle>
            <DialogDescription>
              {language === 'vi'
                ? 'Bạn sắp gửi yêu cầu tài liệu đến nhà cung cấp. Họ sẽ nhận được thông báo để upload các tài liệu được yêu cầu.'
                : 'You are about to send a document request to the supplier. They will receive a notification to upload the requested documents.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedSupplier?.supplier_name || supplierEmail}
                </span>
              </div>
              <Badge>{selectedItems.length} {language === 'vi' ? 'tài liệu' : 'docs'}</Badge>
            </div>

            <div className="text-sm space-y-1">
              {selectedItems.slice(0, 5).map((item) => (
                <div key={item.documentType} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>{FSVP_DOCUMENT_TYPES[item.documentType].name}</span>
                </div>
              ))}
              {selectedItems.length > 5 && (
                <div className="text-muted-foreground pl-5">
                  +{selectedItems.length - 5} {language === 'vi' ? 'tài liệu khác' : 'more documents'}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'vi' ? 'Đang gửi...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {language === 'vi' ? 'Gửi Yêu cầu' : 'Send Request'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
