'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
  Ship,
  Calendar,
  Eye,
  FileCheck,
  RefreshCw,
  Sparkles,
  AlertCircle,
  File,
  X,
  ShieldCheck,
  ShieldAlert,
  Stamp,
  PenTool,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  FSVP_DOCUMENT_TYPES,
  ITEM_STATUS,
  REQUEST_STATUS,
  DOCUMENT_INTEGRITY_STATUS,
  calculateProgress,
  requiresIntegrityCheck,
  type FSVPDocumentRequestWithItems,
  type FSVPDocumentRequestItem,
  type ItemStatusId,
  type DocumentIntegrityStatusId,
} from '@/lib/fsvp-document-request-types'
import { useTranslation } from '@/lib/i18n'

interface SupplierDocumentRequestsProps {
  supplierId?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SupplierDocumentRequests({ supplierId }: SupplierDocumentRequestsProps) {
  const { t, language } = useTranslation()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch requests for this supplier
  const { data: requests, error, isLoading, mutate } = useSWR<FSVPDocumentRequestWithItems[]>(
    `/api/fsvp/document-requests/supplier${supplierId ? `?supplier_id=${supplierId}` : ''}`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  // Upload state
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [currentItem, setCurrentItem] = useState<FSVPDocumentRequestItem | null>(null)
  const [currentRequest, setCurrentRequest] = useState<FSVPDocumentRequestWithItems | null>(null)

  // AI classification state
  const [isClassifying, setIsClassifying] = useState(false)
  const [classificationResult, setClassificationResult] = useState<{
    documentType: string
    confidence: number
    matches: boolean
  } | null>(null)

  // Handle file selection for upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Only accept PDF
    if (file.type !== 'application/pdf') {
      alert(language === 'vi' ? 'Chỉ chấp nhận file PDF' : 'Only PDF files are accepted')
      return
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'vi' ? 'File không được vượt quá 10MB' : 'File must not exceed 10MB')
      return
    }

    setSelectedFile(file)

    // AI Classification
    if (currentItem) {
      setIsClassifying(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/fsvp/documents/classify', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          const expectedType = currentItem.document_type
          const matches = result.documentType === expectedType || result.confidence < 0.6

          setClassificationResult({
            documentType: result.documentType,
            confidence: result.confidence,
            matches,
          })
        }
      } catch (error) {
        console.error('Classification failed:', error)
      } finally {
        setIsClassifying(false)
      }
    }
  }

  // Handle document upload
  const handleUpload = async () => {
    if (!selectedFile || !currentItem || !currentRequest) return

    setUploadingItemId(currentItem.id)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('request_id', currentRequest.id)
      formData.append('item_id', currentItem.id)
      formData.append('document_type', currentItem.document_type)
      formData.append('document_name', currentItem.document_name)

      if (classificationResult) {
        formData.append('ai_verified', 'true')
        formData.append('ai_confidence', String(classificationResult.confidence))
        formData.append('ai_document_type_match', String(classificationResult.matches))
      }

      setUploadProgress(30)

      const response = await fetch('/api/fsvp/document-requests/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(70)

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      setUploadProgress(100)

      // Reset state
      setTimeout(() => {
        setShowUploadDialog(false)
        setSelectedFile(null)
        setClassificationResult(null)
        setUploadingItemId(null)
        setUploadProgress(0)
        setCurrentItem(null)
        setCurrentRequest(null)
        mutate() // Refresh data
      }, 500)
    } catch (error) {
      console.error('Upload error:', error)
      alert(language === 'vi' ? 'Tải lên thất bại. Vui lòng thử lại.' : 'Upload failed. Please try again.')
      setUploadingItemId(null)
      setUploadProgress(0)
    }
  }

  // Open upload dialog for a specific item
  const openUploadDialog = (request: FSVPDocumentRequestWithItems, item: FSVPDocumentRequestItem) => {
    setCurrentRequest(request)
    setCurrentItem(item)
    setShowUploadDialog(true)
    setSelectedFile(null)
    setClassificationResult(null)
  }

  // Get status icon
  const getStatusIcon = (status: ItemStatusId) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'uploaded':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'waived':
        return <CheckCircle2 className="h-5 w-5 text-gray-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500" />
    }
  }

  // Get days until deadline text
  const getDeadlineText = (days: number | null) => {
    if (days === null) return null
    if (days < 0) return language === 'vi' ? 'Đã quá hạn' : 'Overdue'
    if (days === 0) return language === 'vi' ? 'Hôm nay' : 'Today'
    if (days === 1) return language === 'vi' ? 'Ngày mai' : 'Tomorrow'
    return language === 'vi' ? `${days} ngày còn lại` : `${days} days left`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{language === 'vi' ? 'Lỗi' : 'Error'}</AlertTitle>
        <AlertDescription>
          {language === 'vi'
            ? 'Không thể tải danh sách yêu cầu. Vui lòng thử lại.'
            : 'Failed to load requests. Please try again.'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">
            {language === 'vi' ? 'Chưa có yêu cầu nào' : 'No Requests Yet'}
          </h3>
          <p className="text-muted-foreground mt-2">
            {language === 'vi'
              ? 'Bạn sẽ nhận được thông báo khi có yêu cầu tài liệu từ Importer.'
              : 'You will receive a notification when an Importer requests documents.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {language === 'vi' ? 'Yêu cầu Tài liệu' : 'Document Requests'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'vi'
              ? 'Quản lý và upload tài liệu theo yêu cầu từ Importer'
              : 'Manage and upload documents requested by Importers'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {language === 'vi' ? 'Làm mới' : 'Refresh'}
        </Button>
      </div>

      {/* Request List */}
      <Accordion type="single" collapsible className="space-y-4">
        {requests.map((request) => {
          const progress = calculateProgress(request.items)
          const daysLeft = request.deadline
            ? Math.ceil((new Date(request.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null
          const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0
          const isOverdue = daysLeft !== null && daysLeft < 0

          return (
            <AccordionItem key={request.id} value={request.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{request.product_name}</span>
                        {request.is_sahcodha && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            SAHCODHA
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {request.request_number}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Progress */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={progress.percentage} className="h-2 w-20" />
                      <span className="text-sm font-medium">{progress.percentage}%</span>
                    </div>

                    {/* Deadline */}
                    {daysLeft !== null && (
                      <Badge
                        variant={isOverdue ? 'destructive' : isUrgent ? 'outline' : 'secondary'}
                        className={isUrgent && !isOverdue ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {getDeadlineText(daysLeft)}
                      </Badge>
                    )}

                    {/* Status */}
                    <Badge className={REQUEST_STATUS[request.status].color}>
                      {language === 'vi'
                        ? REQUEST_STATUS[request.status].labelVi
                        : REQUEST_STATUS[request.status].label}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                {/* Request Info */}
                {request.importer_notes && (
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>{language === 'vi' ? 'Ghi chú từ Importer' : 'Notes from Importer'}</AlertTitle>
                    <AlertDescription>{request.importer_notes}</AlertDescription>
                  </Alert>
                )}

                {/* Document Items */}
                <div className="space-y-3">
                  {request.items.map((item) => {
                    const docType = FSVP_DOCUMENT_TYPES[item.document_type]
                    const itemStatus = ITEM_STATUS[item.status]
                    const isUploading = uploadingItemId === item.id

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          item.status === 'approved'
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                            : item.status === 'rejected'
                            ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                            : item.status === 'uploaded'
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                            : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(item.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {language === 'vi' ? docType?.nameVi : docType?.name}
                              </span>
                              {item.is_required && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                  {language === 'vi' ? 'Bắt buộc' : 'Required'}
                                </Badge>
                              )}
                              {item.cfr_reference && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                  {item.cfr_reference}
                                </Badge>
                              )}
                            </div>
{/* Uploaded file info and AI verification */}
                                            {(item.status === 'approved' || item.status === 'uploaded') && item.uploaded_file_name && (
                                              <div className="flex items-center gap-2 text-sm mt-1 flex-wrap">
                                                <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-muted-foreground font-mono text-xs truncate max-w-[200px]">
                                                  {item.uploaded_file_name}
                                                </span>
                                                {item.ai_verified && item.ai_confidence && (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-50 text-purple-700 border-purple-200">
                                                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                                    AI: {Math.round(item.ai_confidence * 100)}%
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                            {/* Document Integrity Status (FDA 483 compliance) */}
                                            {(item.status === 'approved' || item.status === 'uploaded') && requiresIntegrityCheck(item.document_type) && (
                                              <div className="flex items-center gap-2 text-sm mt-1">
                                                {item.document_integrity_status === 'verified_complete' ? (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-50 text-green-700 border-green-200">
                                                    <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                                                    {language === 'vi' ? 'QA & Dấu OK' : 'QA & Stamp OK'}
                                                  </Badge>
                                                ) : item.document_integrity_status === 'missing_signature' ? (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                                                    <PenTool className="h-2.5 w-2.5 mr-0.5" />
                                                    {language === 'vi' ? 'Thiếu chữ ký QA' : 'Missing QA Signature'}
                                                  </Badge>
                                                ) : item.document_integrity_status === 'missing_stamp' ? (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                                                    <Stamp className="h-2.5 w-2.5 mr-0.5" />
                                                    {language === 'vi' ? 'Thiếu con dấu' : 'Missing Stamp'}
                                                  </Badge>
                                                ) : item.document_integrity_status === 'incomplete' ? (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-50 text-red-700 border-red-200">
                                                    <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                                                    {language === 'vi' ? 'Thiếu QA & Dấu' : 'Missing QA & Stamp'}
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-gray-50 text-gray-600 border-gray-200">
                                                    <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                                                    {language === 'vi' ? 'Chờ kiểm tra' : 'Pending Check'}
                                                  </Badge>
                                                )}
                                                {/* Show AI detection if available */}
                                                {item.ai_detected_signature !== null && (
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger>
                                                        <Badge variant="ghost" className="text-[10px] px-1 py-0 h-4">
                                                          <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <div className="text-xs space-y-1">
                                                          <div className="flex items-center gap-1">
                                                            <PenTool className="h-3 w-3" />
                                                            {language === 'vi' ? 'Chữ ký:' : 'Signature:'}{' '}
                                                            {item.ai_detected_signature ? (
                                                              <span className="text-green-600">{language === 'vi' ? 'Phát hiện' : 'Detected'}</span>
                                                            ) : (
                                                              <span className="text-red-600">{language === 'vi' ? 'Không tìm thấy' : 'Not found'}</span>
                                                            )}
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                            <Stamp className="h-3 w-3" />
                                                            {language === 'vi' ? 'Con dấu:' : 'Stamp:'}{' '}
                                                            {item.ai_detected_stamp ? (
                                                              <span className="text-green-600">{language === 'vi' ? 'Phát hiện' : 'Detected'}</span>
                                                            ) : (
                                                              <span className="text-red-600">{language === 'vi' ? 'Không tìm thấy' : 'Not found'}</span>
                                                            )}
                                                          </div>
                                                          {item.ai_integrity_confidence && (
                                                            <div className="text-muted-foreground">
                                                              {language === 'vi' ? 'Độ tin cậy:' : 'Confidence:'} {Math.round(item.ai_integrity_confidence * 100)}%
                                                            </div>
                                                          )}
                                                        </div>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                )}
                                              </div>
                                            )}
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                              {item.status === 'approved' && (
                                                <span className="text-green-600 font-medium">
                                                  {language === 'vi' ? 'Da duoc duyet' : 'Approved'}
                                                </span>
                                              )}
                                              {item.status === 'uploaded' && (
                                                <span className="text-blue-600">
                                                  {language === 'vi' ? 'Dang cho xet duyet' : 'Awaiting review'}
                                                </span>
                                              )}
                                              {item.status === 'rejected' && (
                                                <span className="text-red-600">
                                                  {item.rejection_reason ||
                                                    (language === 'vi' ? 'Can tai len lai' : 'Needs re-upload')}
                                                </span>
                                              )}
                                              {item.status === 'pending' && (
                                                <span>
                                                  {language === 'vi' ? docType?.descriptionVi : docType?.description}
                                                </span>
                                              )}
                                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.status === 'pending' || item.status === 'rejected' ? (
                            <Button
                              size="sm"
                              onClick={() => openUploadDialog(request, item)}
                              disabled={isUploading}
                              className="gap-2"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {uploadProgress}%
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4" />
                                  {language === 'vi' ? 'Tải lên PDF' : 'Upload PDF'}
                                </>
                              )}
                            </Button>
                          ) : item.status === 'uploaded' || item.status === 'approved' ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    {language === 'vi' ? 'Xem' : 'View'}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {language === 'vi' ? 'Xem tài liệu đã tải' : 'View uploaded document'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Progress Summary */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {language === 'vi'
                      ? `${progress.completed}/${progress.total} tài liệu đã hoàn thành`
                      : `${progress.completed}/${progress.total} documents completed`}
                  </div>
                  {progress.percentage === 100 && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {language === 'vi' ? 'Hoàn thành' : 'Complete'}
                    </Badge>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === 'vi' ? 'Tải lên Tài liệu' : 'Upload Document'}
            </DialogTitle>
            <DialogDescription>
              {currentItem && (
                <>
                  {language === 'vi'
                    ? FSVP_DOCUMENT_TYPES[currentItem.document_type]?.nameVi
                    : FSVP_DOCUMENT_TYPES[currentItem.document_type]?.name}
                  {' - '}
                  {currentRequest?.product_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                selectedFile
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <File className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium truncate max-w-[250px]">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFile(null)
                        setClassificationResult(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* AI Classification Result */}
                  {isClassifying && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      {language === 'vi' ? 'AI đang xác minh...' : 'AI verifying...'}
                    </div>
                  )}

                  {classificationResult && !isClassifying && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        classificationResult.matches
                          ? 'bg-green-50 border border-green-200 text-green-700'
                          : 'bg-amber-50 border border-amber-200 text-amber-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {classificationResult.matches ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {classificationResult.matches
                            ? language === 'vi'
                              ? 'AI xác nhận đúng loại tài liệu'
                              : 'AI confirms document type matches'
                            : language === 'vi'
                            ? 'AI phát hiện không khớp - vui lòng kiểm tra'
                            : 'AI detected mismatch - please verify'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs">
                        {language === 'vi' ? 'Độ tin cậy:' : 'Confidence:'}{' '}
                        {Math.round(classificationResult.confidence * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {language === 'vi'
                      ? 'Kéo thả file PDF vào đây hoặc click để chọn'
                      : 'Drag & drop PDF file here or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'vi' ? 'Chỉ chấp nhận PDF, tối đa 10MB' : 'PDF only, max 10MB'}
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              {!selectedFile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {language === 'vi' ? 'Chọn File' : 'Select File'}
                </Button>
              )}
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {language === 'vi' ? 'Đang tải lên...' : 'Uploading...'} {uploadProgress}%
                </p>
              </div>
            )}

            {/* CFR Reference */}
            {currentItem?.cfr_reference && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>{currentItem.cfr_reference}</AlertTitle>
                <AlertDescription className="text-xs">
                  {language === 'vi'
                    ? FSVP_DOCUMENT_TYPES[currentItem.document_type]?.descriptionVi
                    : FSVP_DOCUMENT_TYPES[currentItem.document_type]?.description}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false)
                setSelectedFile(null)
                setClassificationResult(null)
              }}
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadProgress > 0}
              className="gap-2"
            >
              {uploadProgress > 0 ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {language === 'vi' ? 'Tải lên' : 'Upload'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
