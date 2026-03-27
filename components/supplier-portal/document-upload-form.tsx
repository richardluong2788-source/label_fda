'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  X, 
  FileText, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  File,
  Trash2
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { SUPPLIER_DOCUMENT_TYPES, type UploadedDocument } from '@/lib/supplier-portal-types'

interface DocumentUploadFormProps {
  requestId: string
  token: string
  sessionId: string
  requestedDocuments: string[]
  uploadedDocuments: UploadedDocument[]
  onUploadSuccess: () => void
}

interface PendingFile {
  file: File
  documentType: string
  notes: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export function DocumentUploadForm({
  requestId,
  token,
  sessionId,
  requestedDocuments,
  uploadedDocuments,
  onUploadSuccess
}: DocumentUploadFormProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [selectedDocType, setSelectedDocType] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter document types to show only requested ones that aren't uploaded yet
  const availableDocTypes = SUPPLIER_DOCUMENT_TYPES.filter(dt => {
    const isRequested = requestedDocuments.includes(dt.value)
    const isUploaded = uploadedDocuments.some(ud => ud.document_type === dt.value && ud.status !== 'rejected')
    return isRequested && !isUploaded
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedDocType) {
      setError('Please select a document type first')
      return
    }

    const newFiles: PendingFile[] = acceptedFiles.map(file => ({
      file,
      documentType: selectedDocType,
      notes: notes,
      progress: 0,
      status: 'pending'
    }))

    setPendingFiles(prev => [...prev, ...newFiles])
    setError(null)
    setNotes('')
  }, [selectedDocType, notes])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: !selectedDocType
  })

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (pendingFiles.length === 0) {
      setError('No files to upload')
      return
    }

    setUploading(true)
    setError(null)

    for (let i = 0; i < pendingFiles.length; i++) {
      const pendingFile = pendingFiles[i]
      if (pendingFile.status !== 'pending') continue

      try {
        // Update status to uploading
        setPendingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading' as const, progress: 0 } : f
        ))

        const formData = new FormData()
        formData.append('file', pendingFile.file)
        formData.append('document_type', pendingFile.documentType)
        formData.append('notes', pendingFile.notes)
        formData.append('request_id', requestId)
        formData.append('session_id', sessionId)

        const response = await fetch(`/api/supplier-portal/${token}/upload`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        // Update status to done
        setPendingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'done' as const, progress: 100 } : f
        ))

      } catch (err) {
        // Update status to error
        setPendingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : f
        ))
      }
    }

    setUploading(false)
    
    // Check if all uploads succeeded
    const allDone = pendingFiles.every(f => f.status === 'done' || f.status === 'error')
    if (allDone) {
      onUploadSuccess()
    }
  }

  const getDocTypeLabel = (value: string) => {
    return SUPPLIER_DOCUMENT_TYPES.find(d => d.value === value)?.label || value
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const allUploaded = availableDocTypes.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
        <CardDescription>
          {allUploaded 
            ? 'All requested documents have been uploaded'
            : 'Select document type and upload your files'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {allUploaded ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All requested documents have been uploaded. The importer will review your submissions.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Document type selector */}
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type to upload" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocTypes.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>
                      <div className="flex flex-col">
                        <span>{dt.label}</span>
                        <span className="text-xs text-muted-foreground">{dt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this document..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                ${!selectedDocType ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              {!selectedDocType ? (
                <p className="text-sm text-muted-foreground">
                  Please select a document type first
                </p>
              ) : isDragActive ? (
                <p className="text-sm text-primary">Drop files here...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 10MB)
                  </p>
                </>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Pending files list */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Files to Upload</Label>
                <div className="space-y-2">
                  {pendingFiles.map((pf, index) => (
                    <div 
                      key={index}
                      className={`
                        flex items-center gap-3 p-3 rounded-md border
                        ${pf.status === 'done' ? 'bg-green-50 border-green-200' : ''}
                        ${pf.status === 'error' ? 'bg-red-50 border-red-200' : ''}
                        ${pf.status === 'pending' || pf.status === 'uploading' ? 'bg-muted/30' : ''}
                      `}
                    >
                      <File className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pf.file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(pf.file.size)}</span>
                          <span>-</span>
                          <Badge variant="outline" className="text-xs">
                            {getDocTypeLabel(pf.documentType)}
                          </Badge>
                        </div>
                        {pf.status === 'uploading' && (
                          <Progress value={pf.progress} className="h-1 mt-2" />
                        )}
                        {pf.status === 'error' && (
                          <p className="text-xs text-red-600 mt-1">{pf.error}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {pf.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removePendingFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {pf.status === 'uploading' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {pf.status === 'done' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {pf.status === 'error' && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={uploadFiles} 
                  disabled={uploading || pendingFiles.every(f => f.status !== 'pending')}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {pendingFiles.filter(f => f.status === 'pending').length} File(s)
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Previously uploaded documents */}
        {uploadedDocuments.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <Label>Previously Uploaded</Label>
            <div className="space-y-2">
              {uploadedDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-md border
                    ${doc.status === 'approved' ? 'bg-green-50 border-green-200' : ''}
                    ${doc.status === 'rejected' ? 'bg-red-50 border-red-200' : ''}
                    ${doc.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : ''}
                  `}
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDocTypeLabel(doc.document_type)} - {formatFileSize(doc.file_size)}
                    </p>
                  </div>
                  <Badge 
                    variant="outline"
                    className={`
                      ${doc.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                      ${doc.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' : ''}
                      ${doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                    `}
                  >
                    {doc.status === 'approved' && 'Approved'}
                    {doc.status === 'rejected' && 'Rejected'}
                    {doc.status === 'pending' && 'Under Review'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
