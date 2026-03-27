'use client'

import { useState, useRef } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  FileText, 
  Upload, 
  Download, 
  Search,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FilePlus2,
  RefreshCw,
  Calendar,
  Shield,
  Beaker,
  File,
  X,
  Loader2,
  Sparkles,
  Languages,
  Globe,
  AlertTriangle,
  Info
} from 'lucide-react'
import type { DocumentTemplate, SupportingDocument } from '@/lib/fsvp-supplier-types'
import type { DocumentClassificationResult, FSVPDocumentType } from '@/lib/fsvp-document-classifier'
import { useTranslation } from '@/lib/i18n'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

// Database document type
interface DBDocument {
  id: string
  supplier_id: string | null
  document_type: string
  document_name: string
  description: string | null
  file_url: string | null
  upload_date: string
  expiry_date: string | null
  status: string
  version: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Translation tracking fields (21 CFR 1.510(b)(1))
  original_language?: string
  has_english_translation?: boolean
  translation_file_url?: string | null
  translation_status?: 'not_needed' | 'pending' | 'uploaded' | 'verified' | 'rejected'
  // AI classification fields
  ai_suggested_type?: string
  ai_confidence?: number
  classification_method?: 'ai_vision' | 'keyword_fallback' | 'manual'
  applicable_cfr_sections?: string[]
}

// Language options for document uploads
const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'vietnamese', label: 'Vietnamese / Tiếng Việt' },
  { value: 'chinese', label: 'Chinese / 中文' },
  { value: 'spanish', label: 'Spanish / Español' },
  { value: 'french', label: 'French / Français' },
  { value: 'german', label: 'German / Deutsch' },
  { value: 'japanese', label: 'Japanese / 日本語' },
  { value: 'korean', label: 'Korean / 한국어' },
  { value: 'thai', label: 'Thai / ไทย' },
  { value: 'other', label: 'Other' }
]

// Document Templates
const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-1',
    template_type: 'hazard_analysis',
    template_name: 'FSVP Hazard Analysis Template',
    description: 'Comprehensive hazard analysis form for FSVP compliance per 21 CFR 1.504',
    category: 'Hazard Analysis',
    file_url: '#',
    language: 'English',
    version: '2.0',
    last_updated: '2025-10-01',
    download_count: 1250,
    is_fda_compliant: true,
    regulation_references: ['21 CFR 1.504', '21 CFR 117.130'],
  },
  {
    id: 'tpl-2',
    template_type: 'food_safety_plan',
    template_name: 'Food Safety Plan Template',
    description: 'Complete food safety plan template including preventive controls',
    category: 'Food Safety',
    file_url: '#',
    language: 'English',
    version: '1.5',
    last_updated: '2025-09-15',
    download_count: 890,
    is_fda_compliant: true,
    regulation_references: ['21 CFR 117 Subpart C'],
  },
  {
    id: 'tpl-3',
    template_type: 'supplier_questionnaire',
    template_name: 'Supplier Verification Questionnaire',
    description: 'Questionnaire for US importers to verify supplier food safety practices',
    category: 'Verification',
    file_url: '#',
    language: 'English',
    version: '1.3',
    last_updated: '2025-08-20',
    download_count: 2100,
    is_fda_compliant: true,
    regulation_references: ['21 CFR 1.505', '21 CFR 1.506'],
  },
  {
    id: 'tpl-4',
    template_type: 'certificate_of_analysis',
    template_name: 'Certificate of Analysis (COA) Template',
    description: 'Standard COA template for product testing results',
    category: 'Testing',
    file_url: '#',
    language: 'English',
    version: '1.2',
    last_updated: '2025-07-10',
    download_count: 3200,
    is_fda_compliant: true,
    regulation_references: [],
  },
  {
    id: 'tpl-5',
    template_type: 'letter_of_guarantee',
    template_name: 'Letter of Guarantee Template',
    description: 'Supplier guarantee letter for food safety compliance',
    category: 'Verification',
    file_url: '#',
    language: 'English',
    version: '1.1',
    last_updated: '2025-06-05',
    download_count: 1800,
    is_fda_compliant: true,
    regulation_references: ['21 CFR 1.506'],
  },
  {
    id: 'tpl-6',
    template_type: 'specification_sheet',
    template_name: 'Product Specification Sheet',
    description: 'Detailed product specification template for importers',
    category: 'Product Info',
    file_url: '#',
    language: 'English',
    version: '1.4',
    last_updated: '2025-09-01',
    download_count: 1500,
    is_fda_compliant: true,
    regulation_references: [],
  },
  {
    id: 'tpl-7',
    template_type: 'audit_checklist',
    template_name: 'FSVP Audit Checklist',
    description: 'Comprehensive audit checklist for FSVP compliance verification',
    category: 'Audit',
    file_url: '#',
    language: 'English',
    version: '2.1',
    last_updated: '2025-10-15',
    download_count: 2500,
    is_fda_compliant: true,
    regulation_references: ['21 CFR 1.506(d)', '21 CFR 1.510'],
  },
  {
    id: 'tpl-8',
    template_type: 'sop',
    template_name: 'Allergen Control SOP Template',
    description: 'Standard operating procedure for allergen control',
    category: 'SOPs',
    file_url: '#',
    language: 'English',
    version: '1.0',
    last_updated: '2025-05-20',
    download_count: 950,
    is_fda_compliant: true,
    regulation_references: ['21 CFR 117.135(c)(2)'],
  },
]

export function SupplierDocumentManager() {
  const { t } = useTranslation()
  
  // Fetch documents from API
  const { data: documents, error: documentsError, isLoading, mutate: mutateDocuments } = useSWR<DBDocument[]>(
    '/api/fsvp/documents',
    fetcher
  )
  
  const [templates] = useState<DocumentTemplate[]>(DOCUMENT_TEMPLATES)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DBDocument | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newDocument, setNewDocument] = useState({
    document_type: '',
    document_name: '',
    expiry_date: '',
    description: '',
    original_language: 'english',
    translation_file: null as File | null
  })
  
  // AI Classification state
  const [isClassifying, setIsClassifying] = useState(false)
  const [classificationResult, setClassificationResult] = useState<DocumentClassificationResult | null>(null)
  const [showClassificationOverride, setShowClassificationOverride] = useState(false)
  
  const filteredDocuments = (documents || []).filter(doc => {
    const matchesSearch = doc.document_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit')
        return
      }
      setSelectedFile(file)
      // Auto-fill document name if empty
      if (!newDocument.document_name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setNewDocument(prev => ({ ...prev, document_name: nameWithoutExt }))
      }
      
      // AI Classification - only for PDF and images
      const classifiableTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      if (classifiableTypes.includes(file.type)) {
        setIsClassifying(true)
        setClassificationResult(null)
        
        try {
          const formData = new FormData()
          formData.append('file', file)
          
          const response = await fetch('/api/fsvp/documents/classify', {
            method: 'POST',
            body: formData
          })
          
          if (response.ok) {
            const result: DocumentClassificationResult = await response.json()
            setClassificationResult(result)
            
            // Auto-fill document type if AI is confident enough (>= 0.6)
            if (result.confidence >= 0.6 && result.documentType !== 'unknown') {
              setNewDocument(prev => ({ 
                ...prev, 
                document_type: result.documentType,
                original_language: result.detectedLanguage || 'english'
              }))
            }
            
            // If low confidence or unknown, show override option
            if (result.confidence < 0.6 || result.documentType === 'unknown') {
              setShowClassificationOverride(true)
            }
          }
        } catch (error) {
          console.error('AI classification failed:', error)
          // Silent fail - user can still manually select
        } finally {
          setIsClassifying(false)
        }
      }
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit')
        return
      }
      setSelectedFile(file)
      if (!newDocument.document_name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setNewDocument(prev => ({ ...prev, document_name: nameWithoutExt }))
      }
    }
  }
  
  const clearSelectedFile = () => {
    setSelectedFile(null)
    setClassificationResult(null)
    setShowClassificationOverride(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleUploadDocument = async () => {
    if (!newDocument.document_type || !newDocument.document_name) {
      alert('Please fill in all required fields (Document Type and Document Name)')
      return
    }
    
    // Check translation requirement for non-English documents
    if (newDocument.original_language !== 'english' && !newDocument.translation_file) {
      const proceed = confirm(
        'This document is not in English. Per 21 CFR 1.510(b)(1), ' +
        'FSVP records must be in English or accompanied by an accurate English translation.\n\n' +
        'Do you want to continue without uploading a translation? You can add it later.'
      )
      if (!proceed) return
    }
    
    setIsSubmitting(true)
    setUploadProgress(0)
    
    try {
      // If file is selected, upload with file
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('document_type', newDocument.document_type)
        formData.append('document_name', newDocument.document_name)
        formData.append('original_language', newDocument.original_language)
        
        // Add AI classification data if available
        if (classificationResult) {
          formData.append('ai_suggested_type', classificationResult.documentType)
          formData.append('ai_confidence', String(classificationResult.confidence))
          formData.append('classification_method', classificationResult.classificationMethod)
          if (classificationResult.fsvpRelevance.applicableSections.length > 0) {
            formData.append('applicable_cfr_sections', JSON.stringify(classificationResult.fsvpRelevance.applicableSections))
          }
        }
        
        if (newDocument.expiry_date) {
          formData.append('expiry_date', newDocument.expiry_date)
        }
        if (newDocument.description) {
          formData.append('description', newDocument.description)
        }
        
        // Upload translation file if provided
        if (newDocument.translation_file) {
          formData.append('translation_file', newDocument.translation_file)
        }
        
        setUploadProgress(30)
        
        const response = await fetch('/api/fsvp/documents/upload', {
          method: 'POST',
          body: formData
        })
        
        setUploadProgress(90)
        
        if (response.ok) {
          setUploadProgress(100)
          mutateDocuments()
          setIsUploadDialogOpen(false)
          setNewDocument({ document_type: '', document_name: '', expiry_date: '', description: '', original_language: 'english', translation_file: null })
          setSelectedFile(null)
          setClassificationResult(null)
          setShowClassificationOverride(false)
          alert('Document uploaded successfully!')
        } else {
          const error = await response.json()
          alert(`Failed to upload document: ${error.error || 'Unknown error'}`)
        }
      } else {
        // No file - just create metadata entry
        const response = await fetch('/api/fsvp/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_type: newDocument.document_type,
            document_name: newDocument.document_name,
            expiry_date: newDocument.expiry_date || null,
            description: newDocument.description || null
          })
        })
        
        if (response.ok) {
          mutateDocuments()
          setIsUploadDialogOpen(false)
          setNewDocument({ document_type: '', document_name: '', expiry_date: '', description: '', original_language: 'english', translation_file: null })
          setClassificationResult(null)
          setShowClassificationOverride(false)
          alert('Document record created successfully!')
        } else {
          const error = await response.json()
          alert(`Failed to create document: ${error.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }
  
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/fsvp/documents/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        mutateDocuments()
        alert('Document deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to delete document: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert('Failed to delete document. Please try again.')
    }
  }
  
  const handleViewDocument = (doc: DBDocument) => {
    setSelectedDocument(doc)
    setIsViewDialogOpen(true)
  }
  
  const handleDownloadDocument = async (doc: DBDocument) => {
    // If file_url exists (pathname for private blob), download via API
    if (doc.file_url) {
      try {
        // Open the file serve endpoint in new tab or trigger download
        const fileUrl = `/api/fsvp/documents/file?id=${doc.id}`
        
        // Fetch the file and trigger download
        const response = await fetch(fileUrl)
        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          // Try to get filename from content-disposition or use document name
          const contentDisposition = response.headers.get('content-disposition')
          let filename = doc.document_name
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/)
            if (match) filename = match[1]
          }
          // Add extension if missing
          const contentType = response.headers.get('content-type')
          if (contentType && !filename.includes('.')) {
            const ext = contentType.split('/')[1]?.split(';')[0]
            if (ext) filename += `.${ext}`
          }
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } else {
          alert('Failed to download file')
        }
      } catch (error) {
        console.error('Download error:', error)
        alert('Failed to download file')
      }
    } else {
      // Generate a simple text report as fallback (no file attached)
      const content = `
FSVP Document Report
=====================

Document Name: ${doc.document_name}
Document Type: ${doc.document_type.replace(/_/g, ' ')}
Upload Date: ${new Date(doc.upload_date).toLocaleDateString()}
Expiry Date: ${doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'N/A'}
Status: ${doc.status}
Description: ${doc.description || 'N/A'}
Notes: ${doc.notes || 'N/A'}
Version: ${doc.version || '1.0'}

Generated on: ${new Date().toLocaleString()}

Note: No file was attached to this document record.
      `.trim()
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.document_name.replace(/\s+/g, '_')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
      valid: { variant: 'default', label: 'Valid', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      expired: { variant: 'destructive', label: 'Expired', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      pending_review: { variant: 'secondary', label: 'Pending Review', icon: <Clock className="h-3 w-3 mr-1" /> },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status, icon: null }
    return (
      <Badge variant={config.variant} className="flex items-center">
        {config.icon}
        {config.label}
      </Badge>
    )
  }
  
  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <Shield className="h-4 w-4" />
      case 'test_report':
        return <Beaker className="h-4 w-4" />
      case 'audit_report':
        return <FileCheck className="h-4 w-4" />
      case 'haccp_plan':
        return <FileText className="h-4 w-4" />
      case 'sop':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }
  
  const documentStats = {
    total: (documents || []).length,
    valid: (documents || []).filter(d => d.status === 'valid').length,
    expired: (documents || []).filter(d => d.status === 'expired').length,
    pending: (documents || []).filter(d => d.status === 'pending_review').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
<FileText className="h-6 w-6" />
{t.fsvpSupplier.documentsTitle}
</h2>
          <p className="text-muted-foreground">
            {t.fsvpSupplier.documentsDesc}
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              {t.fsvpSupplier.uploadDocument}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.fsvpSupplier.uploadDocument}</DialogTitle>
              <DialogDescription>
                {t.fsvpSupplier.documentsDesc}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.fsvpSupplier.documentType} *</Label>
                <Select
                  value={newDocument.document_type}
                  onValueChange={(value) => setNewDocument(prev => ({ ...prev, document_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.fsvpSupplier.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">{t.fsvpSupplier.certificate}</SelectItem>
                    <SelectItem value="test_report">{t.fsvpSupplier.testReport}</SelectItem>
                    <SelectItem value="audit_report">{t.fsvpSupplier.auditReport}</SelectItem>
                    <SelectItem value="haccp_plan">{t.fsvpSupplier.haccp}</SelectItem>
                    <SelectItem value="food_safety_plan">Food Safety Plan</SelectItem>
                    <SelectItem value="sop">{t.fsvpSupplier.sop}</SelectItem>
                    <SelectItem value="letter_of_guarantee">Letter of Guarantee</SelectItem>
                    <SelectItem value="specification_sheet">Specification Sheet</SelectItem>
                    <SelectItem value="coa">Certificate of Analysis (COA)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.fsvpSupplier.documentName} *</Label>
                <Input 
                  placeholder="e.g., FSSC 22000 Certificate 2025" 
                  value={newDocument.document_name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, document_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.fsvpSupplier.expiryDate}</Label>
                <Input 
                  type="date" 
                  value={newDocument.expiry_date}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>File (Optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                {selectedFile ? (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <File className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={clearSelectedFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {isSubmitting && uploadProgress > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    )}
                    
                    {/* AI Classification Status */}
                    {isClassifying && (
                      <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                          <span className="text-sm font-medium">AI analyzing document...</span>
                        </div>
                        <Progress value={33} className="h-1 mt-2" />
                      </div>
                    )}
                    
                    {/* AI Classification Result */}
                    {classificationResult && !isClassifying && (
                      <div className="mt-3 p-3 bg-muted/50 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">AI Classification</span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge 
                                  variant={classificationResult.confidence >= 0.8 ? 'default' : 
                                           classificationResult.confidence >= 0.6 ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {Math.round(classificationResult.confidence * 100)}% confident
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>AI scanned the first page to classify this document</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {classificationResult.documentType !== 'unknown' && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Detected type: </span>
                            <span className="font-medium capitalize">
                              {classificationResult.documentType.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        
                        {classificationResult.detectedLanguage && classificationResult.detectedLanguage !== 'english' && (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <Languages className="h-3 w-3" />
                            <span>Non-English document detected ({classificationResult.detectedLanguage})</span>
                          </div>
                        )}
                        
                        {classificationResult.fsvpRelevance.applicableSections.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {classificationResult.fsvpRelevance.applicableSections.map((section, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {section}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {(classificationResult.confidence < 0.6 || classificationResult.documentType === 'unknown') && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 mt-2">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Low confidence - please verify the document type above</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX, XLS, XLSX, Images up to 10MB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                    >
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Original Language Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Original Language</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Per 21 CFR 1.510(b)(1), FSVP records must be in English or accompanied by an accurate English translation.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={newDocument.original_language}
                  onValueChange={(value) => setNewDocument(prev => ({ ...prev, original_language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          {lang.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Translation Upload - only show if non-English */}
              {newDocument.original_language !== 'english' && (
                <div className="space-y-3 p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        English Translation Required
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Per 21 CFR 1.510(b)(1), records must be in English or have an English translation available for FDA inspection.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Upload English Translation (Optional)</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setNewDocument(prev => ({ ...prev, translation_file: file }))
                        }
                      }}
                      className="text-sm"
                    />
                    {newDocument.translation_file && (
                      <div className="flex items-center justify-between text-sm bg-background p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Languages className="h-4 w-4 text-primary" />
                          <span className="truncate max-w-[200px]">{newDocument.translation_file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setNewDocument(prev => ({ ...prev, translation_file: null }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsUploadDialogOpen(false)
                setSelectedFile(null)
                setClassificationResult(null)
                setShowClassificationOverride(false)
                setNewDocument({ document_type: '', document_name: '', expiry_date: '', description: '', original_language: 'english', translation_file: null })
              }}>
                {t.fsvpSupplier.cancel}
              </Button>
              <Button 
                onClick={handleUploadDocument}
                disabled={!newDocument.document_type || !newDocument.document_name || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {selectedFile ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedFile ? 'Upload File' : t.fsvpSupplier.uploadDocument}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Document Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documentStats.total}</p>
                <p className="text-sm text-muted-foreground">{t.fsvpSupplier.documents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documentStats.valid}</p>
                <p className="text-sm text-muted-foreground">{t.fsvpSupplier.valid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documentStats.expired}</p>
                <p className="text-sm text-muted-foreground">{t.fsvpSupplier.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documentStats.pending}</p>
                <p className="text-sm text-muted-foreground">{t.fsvpSupplier.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Expired Documents Alert */}
      {documentStats.expired > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.fsvpSupplier.expiredDocuments}</AlertTitle>
          <AlertDescription>
            {t.fsvpSupplier.expiredDocumentsDesc.replace('{count}', String(documentStats.expired))}
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">{t.fsvpSupplier.myDocuments}</TabsTrigger>
          <TabsTrigger value="templates">{t.fsvpSupplier.templates}</TabsTrigger>
        </TabsList>
        
        {/* My Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.fsvpSupplier.searchDocuments}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.fsvpSupplier.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.fsvpSupplier.allStatus}</SelectItem>
                <SelectItem value="valid">{t.fsvpSupplier.valid}</SelectItem>
                <SelectItem value="expired">{t.fsvpSupplier.expired}</SelectItem>
                <SelectItem value="pending_review">{t.fsvpSupplier.pendingReview}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.fsvpSupplier.type} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.fsvpSupplier.allTypes}</SelectItem>
                <SelectItem value="certificate">Certificates</SelectItem>
                <SelectItem value="test_report">Test Reports</SelectItem>
                <SelectItem value="audit_report">Audit Reports</SelectItem>
                <SelectItem value="haccp_plan">HACCP Plans</SelectItem>
                <SelectItem value="sop">SOPs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Documents Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
              <CardTitle className="text-base">Documents</CardTitle>
              <Button variant="outline" size="sm" onClick={() => mutateDocuments()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : documentsError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                  <p>Failed to load documents</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => mutateDocuments()}>
                    Try Again
                  </Button>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {(documents || []).length === 0 
                      ? 'No documents uploaded yet' 
                      : 'No documents match your filters'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Upload Document" to add your first document
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.fsvpSupplier.document}</TableHead>
                      <TableHead>{t.fsvpSupplier.type}</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>{t.fsvpSupplier.uploaded}</TableHead>
                      <TableHead>{t.fsvpSupplier.expiry}</TableHead>
                      <TableHead>{t.fsvpSupplier.status}</TableHead>
                      <TableHead className="text-right">{t.fsvpSupplier.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDocTypeIcon(doc.document_type)}
                            <span className="font-medium">{doc.document_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {doc.document_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="capitalize text-sm">
                              {doc.original_language || 'english'}
                            </span>
                            {doc.original_language && doc.original_language !== 'english' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    {doc.translation_status === 'verified' ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    ) : doc.translation_status === 'uploaded' ? (
                                      <Languages className="h-3.5 w-3.5 text-blue-500" />
                                    ) : (
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {doc.translation_status === 'verified' 
                                      ? 'English translation verified'
                                      : doc.translation_status === 'uploaded'
                                      ? 'English translation uploaded'
                                      : 'English translation needed (21 CFR 1.510(b)(1))'
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(doc.upload_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {doc.expiry_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(doc.expiry_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="View Details"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Download"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Delete"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Alert>
            <FileCheck className="h-4 w-4" />
            <AlertTitle>FDA-Compliant Templates</AlertTitle>
            <AlertDescription>
              These templates are designed to meet FDA requirements for FSVP documentation.
              Download and customize them for your facility.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FilePlus2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{template.template_name}</CardTitle>
                    </div>
                    {template.is_fda_compliant && (
                      <Badge variant="default" className="bg-green-600">FDA Compliant</Badge>
                    )}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Version</span>
                    <span>{template.version}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{new Date(template.last_updated).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Downloads</span>
                    <span>{template.download_count.toLocaleString()}</span>
                  </div>
                  {template.regulation_references.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.regulation_references.map((ref, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button className="flex-1" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              View document information and metadata
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {getDocTypeIcon(selectedDocument.document_type)}
                <div>
                  <p className="font-medium">{selectedDocument.document_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedDocument.document_type.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              
              {/* File Preview Section */}
              {selectedDocument.file_url && (
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  <div className="p-2 bg-muted border-b flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      File Preview
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const fileUrl = `/api/fsvp/documents/file?id=${selectedDocument.id}`
                        window.open(fileUrl, '_blank')
                      }}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                  <div className="relative min-h-[300px] max-h-[400px] overflow-hidden">
                    {/* Check file extension to determine preview type */}
                    {(() => {
                      const fileUrl = selectedDocument.file_url.toLowerCase()
                      const isPdf = fileUrl.endsWith('.pdf')
                      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileUrl)
                      
                      if (isPdf) {
                        return (
                          <iframe
                            src={`/api/fsvp/documents/file?id=${selectedDocument.id}`}
                            className="w-full h-[400px] border-0"
                            title={selectedDocument.document_name}
                          />
                        )
                      } else if (isImage) {
                        return (
                          <div className="flex items-center justify-center p-4 h-[300px]">
                            <img
                              src={`/api/fsvp/documents/file?id=${selectedDocument.id}`}
                              alt={selectedDocument.document_name}
                              className="max-w-full max-h-full object-contain rounded"
                            />
                          </div>
                        )
                      } else {
                        // For other file types (doc, docx, xls, xlsx, etc.)
                        return (
                          <div className="flex flex-col items-center justify-center p-8 h-[300px] text-center">
                            <File className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="font-medium">{selectedDocument.document_name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Preview not available for this file type
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => handleDownloadDocument(selectedDocument)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download to View
                            </Button>
                          </div>
                        )
                      }
                    })()}
                  </div>
                </div>
              )}
              
              {/* No file attached message */}
              {!selectedDocument.file_url && (
                <div className="border rounded-lg p-6 text-center bg-muted/30">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">No File Attached</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This document record does not have a file attached
                  </p>
                </div>
              )}
              
              <div className="grid gap-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedDocument.status)}
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Upload Date</span>
                  <span>{new Date(selectedDocument.upload_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Expiry Date</span>
                  <span>
                    {selectedDocument.expiry_date 
                      ? new Date(selectedDocument.expiry_date).toLocaleDateString() 
                      : 'No expiry'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Version</span>
                  <span>{selectedDocument.version || '1.0'}</span>
                </div>
                {selectedDocument.description && (
                  <div className="py-2 border-b">
                    <span className="text-muted-foreground block mb-1">Description</span>
                    <p className="text-sm">{selectedDocument.description}</p>
                  </div>
                )}
                {selectedDocument.notes && (
                  <div className="py-2">
                    <span className="text-muted-foreground block mb-1">Notes</span>
                    <p className="text-sm">{selectedDocument.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedDocument && selectedDocument.file_url && (
              <Button onClick={() => handleDownloadDocument(selectedDocument)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
