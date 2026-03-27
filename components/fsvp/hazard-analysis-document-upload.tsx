'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  FileCheck,
  X,
  File,
  Loader2,
  Shield,
} from 'lucide-react'
import {
  FSVP_DOCUMENT_TYPES,
  getRequiredDocuments,
  isSahcodhaCategory,
  type FSVPDocumentTypeId,
  type ProductCategoryId,
} from '@/lib/fsvp-document-request-types'

interface HazardAnalysisDocumentUploadProps {
  hazardAnalysisId: string
  productCategory?: string | null
  isSahcodha: boolean
  language?: 'en' | 'vi'
}

interface UploadedDoc {
  docType: FSVPDocumentTypeId
  fileName: string
  uploadedAt: Date
  fileUrl?: string
}

export function HazardAnalysisDocumentUpload({
  hazardAnalysisId,
  productCategory,
  isSahcodha,
  language = 'en'
}: HazardAnalysisDocumentUploadProps) {
  const { toast } = useToast()
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [uploadingDocType, setUploadingDocType] = useState<FSVPDocumentTypeId | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  
  // Get required documents based on product category and SAHCODHA status
  const requiredDocs = useMemo(() => {
    const category = (productCategory?.toLowerCase() || 'other') as ProductCategoryId
    // supplierOnly = true to filter out importer-only documents
    return getRequiredDocuments(category, isSahcodha, true)
  }, [productCategory, isSahcodha])
  
  // Calculate progress
  const progress = useMemo(() => {
    const uploaded = requiredDocs.filter(d => uploadedDocs.some(u => u.docType === d)).length
    return {
      uploaded,
      total: requiredDocs.length,
      percentage: requiredDocs.length > 0 ? Math.round((uploaded / requiredDocs.length) * 100) : 0
    }
  }, [requiredDocs, uploadedDocs])
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && uploadingDocType) {
      await handleUpload(e.dataTransfer.files[0])
    }
  }, [uploadingDocType])
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleUpload(e.target.files[0])
    }
  }
  
  const handleUpload = async (file: File) => {
    if (!uploadingDocType) return
    
    setIsUploading(true)
    
    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('hazardAnalysisId', hazardAnalysisId)
      formData.append('documentType', uploadingDocType)
      
      // Upload to API
      const response = await fetch('/api/fsvp/documents/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const result = await response.json()
      
      // Add to uploaded docs
      setUploadedDocs(prev => [...prev, {
        docType: uploadingDocType,
        fileName: file.name,
        uploadedAt: new Date(),
        fileUrl: result.fileUrl,
      }])
      
      toast({
        title: language === 'vi' ? 'Tải lên thành công' : 'Upload Successful',
        description: language === 'vi' 
          ? `Đã tải lên ${file.name}` 
          : `Uploaded ${file.name}`,
      })
      
      setShowUploadDialog(false)
      setUploadingDocType(null)
    } catch (error) {
      toast({
        title: language === 'vi' ? 'Lỗi tải lên' : 'Upload Error',
        description: language === 'vi'
          ? 'Không thể tải lên tài liệu. Vui lòng thử lại.'
          : 'Failed to upload document. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  const openUploadDialog = (docType: FSVPDocumentTypeId) => {
    setUploadingDocType(docType)
    setShowUploadDialog(true)
  }
  
  const getDocStatus = (docType: FSVPDocumentTypeId) => {
    return uploadedDocs.find(d => d.docType === docType)
  }
  
  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                {language === 'vi' ? 'Tài liệu Yêu cầu' : 'Required Documents'}
                <Badge variant="secondary" className="ml-2">
                  {progress.uploaded}/{progress.total}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {language === 'vi' 
                  ? 'Upload tài liệu theo 21 CFR Part 1 Subpart L để sẵn sàng gửi cho Importer'
                  : 'Upload documents per 21 CFR Part 1 Subpart L to be ready for your Importer'}
              </CardDescription>
            </div>
            {progress.percentage === 100 && (
              <Badge className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {language === 'vi' ? 'Hoàn tất' : 'Complete'}
              </Badge>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 space-y-1">
            <Progress value={progress.percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress.percentage}% {language === 'vi' ? 'đã upload' : 'uploaded'}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {requiredDocs.map(docType => {
              const doc = FSVP_DOCUMENT_TYPES[docType]
              const uploadedDoc = getDocStatus(docType)
              const isRequired = doc.defaultRequired || (isSahcodha && doc.requiredFor.includes('sahcodha'))
              
              return (
                <div 
                  key={docType}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    uploadedDoc 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {uploadedDoc ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium truncate ${uploadedDoc ? 'text-green-700' : ''}`}>
                          {language === 'vi' ? doc.nameVi : doc.name}
                        </span>
                        {doc.cfrReference && (
                          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                            {doc.cfrReference}
                          </Badge>
                        )}
                        {isRequired && !uploadedDoc && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 shrink-0">
                            {language === 'vi' ? 'Bắt buộc' : 'Required'}
                          </Badge>
                        )}
                      </div>
                      
                      {uploadedDoc && (
                        <p className="text-xs text-green-600 mt-0.5 truncate">
                          {uploadedDoc.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={uploadedDoc ? 'outline' : 'default'}
                    className={`shrink-0 ml-2 ${uploadedDoc ? 'border-green-300 text-green-700' : ''}`}
                    onClick={() => openUploadDialog(docType)}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadedDoc 
                      ? (language === 'vi' ? 'Thay' : 'Replace')
                      : (language === 'vi' ? 'Upload' : 'Upload')
                    }
                  </Button>
                </div>
              )
            })}
          </div>
          
          {/* Summary Footer */}
          {progress.uploaded > 0 && progress.uploaded < progress.total && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">
                  {language === 'vi'
                    ? `Còn ${progress.total - progress.uploaded} tài liệu cần upload để hoàn tất.`
                    : `${progress.total - progress.uploaded} more document(s) needed to complete.`}
                </p>
              </div>
            </div>
          )}
          
          {progress.percentage === 100 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm text-green-700">
                  {language === 'vi'
                    ? 'Tất cả tài liệu đã sẵn sàng! Importer có thể bắt đầu verification.'
                    : 'All documents ready! Your Importer can begin verification.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadingDocType && (language === 'vi' 
                ? `Upload ${FSVP_DOCUMENT_TYPES[uploadingDocType].nameVi}`
                : `Upload ${FSVP_DOCUMENT_TYPES[uploadingDocType].name}`
              )}
            </DialogTitle>
            <DialogDescription>
              {language === 'vi'
                ? 'Kéo thả hoặc chọn file PDF để upload'
                : 'Drag and drop or select a PDF file to upload'}
            </DialogDescription>
          </DialogHeader>
          
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {language === 'vi' ? 'Đang tải lên...' : 'Uploading...'}
                </p>
              </div>
            ) : (
              <>
                <File className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  {language === 'vi'
                    ? 'Kéo thả file vào đây hoặc'
                    : 'Drag and drop your file here, or'}
                </p>
                <label>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>
                      {language === 'vi' ? 'Chọn file' : 'Browse files'}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-3">
                  PDF, DOC, DOCX (max 10MB)
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
