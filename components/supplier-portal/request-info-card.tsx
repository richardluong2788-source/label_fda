'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Calendar, 
  Clock, 
  FileText, 
  Package, 
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react'
import type { DocumentRequestWithDetails } from '@/lib/supplier-portal-types'
import { SUPPLIER_DOCUMENT_TYPES } from '@/lib/supplier-portal-types'

interface RequestInfoCardProps {
  request: DocumentRequestWithDetails
}

export function RequestInfoCard({ request }: RequestInfoCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'pending': return <Circle className="h-4 w-4 text-yellow-600" />
      case 'cancelled': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'in_progress': return 'In Progress'
      case 'pending': return 'Pending'
      case 'cancelled': return 'Cancelled'
      case 'expired': return 'Expired'
      default: return status
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = request.due_date && new Date(request.due_date) < new Date() && request.status !== 'completed'

  // Get document type labels
  const getDocumentLabel = (docType: string) => {
    const found = SUPPLIER_DOCUMENT_TYPES.find(d => d.value === docType)
    return found?.label || docType
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">Document Request</CardTitle>
            <CardDescription>
              From {request.importer?.company_name || request.importer?.email || 'Importer'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getPriorityColor(request.priority)}>
              {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status and dates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getStatusIcon(request.status)}
              Status
            </p>
            <p className="font-medium">{getStatusLabel(request.status)}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Requested
            </p>
            <p className="font-medium">{formatDate(request.created_at)}</p>
          </div>
          
          <div className="space-y-1">
            <p className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
              <Clock className="h-3 w-3" />
              Due Date
            </p>
            <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
              {formatDate(request.due_date)}
              {isOverdue && ' (Overdue)'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Request Type
            </p>
            <p className="font-medium capitalize">{request.request_type?.replace(/_/g, ' ') || 'Document Request'}</p>
          </div>
        </div>

        <Separator />

        {/* Product info if available */}
        {request.hazard_analysis && (
          <>
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Product</p>
                <p className="text-sm text-muted-foreground">
                  {request.hazard_analysis.product_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Category: {request.hazard_analysis.product_category}
                </p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Importer info */}
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Requesting Company</p>
            <p className="text-sm text-muted-foreground">
              {request.importer?.company_name || 'Company name not provided'}
            </p>
            <p className="text-xs text-muted-foreground">
              {request.importer?.email}
            </p>
          </div>
        </div>

        {/* Notes */}
        {request.notes && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Additional Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {request.notes}
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* Requested documents */}
        <div>
          <p className="text-sm font-medium mb-3">Requested Documents</p>
          <div className="space-y-2">
            {request.requested_documents?.map((docType, index) => {
              const uploaded = request.uploaded_documents?.find(d => d.document_type === docType)
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md border ${
                    uploaded ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {uploaded ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{getDocumentLabel(docType)}</span>
                  </div>
                  {uploaded && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Uploaded
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
