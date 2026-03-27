'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Shield,
  ShieldAlert,
  ShieldX,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface RecallMatch {
  id: string
  recall_number: string
  recalling_firm: string
  product_description: string | null
  reason_for_recall: string | null
  recall_classification: string | null
  recall_initiation_date: string | null
  termination_date: string | null
  match_type: string
  match_confidence: number
  review_status: 'pending' | 'confirmed' | 'dismissed' | 'under_review'
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null
}

interface SupplierRecallWarningProps {
  supplierId: string
  supplierName?: string
  showCompact?: boolean // For inline display in other components
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SupplierRecallWarning({ 
  supplierId, 
  supplierName,
  showCompact = false 
}: SupplierRecallWarningProps) {
  const { language } = useTranslation()
  const [isChecking, setIsChecking] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Fetch recall data for this supplier
  const { data, error, isLoading, mutate } = useSWR<{
    supplier_id: string
    supplier_name: string
    has_recall_history: boolean
    recall_count: number
    recall_severity: 'none' | 'class_i' | 'class_ii' | 'class_iii' | null
    last_recall_date: string | null
    last_checked_at: string | null
    warning_message: string | null
    matches: RecallMatch[]
  }>(
    `/api/fsvp/suppliers/${supplierId}/recall-check`,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

  // Run a new recall check
  const handleCheckRecalls = async () => {
    setIsChecking(true)
    try {
      const response = await fetch(`/api/fsvp/suppliers/${supplierId}/recall-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      if (response.ok) {
        mutate() // Refresh data
      }
    } catch (error) {
      console.error('Error checking recalls:', error)
    } finally {
      setIsChecking(false)
    }
  }

  // Get severity icon and color
  const getSeverityBadge = (severity: string | null | undefined) => {
    switch (severity) {
      case 'class_i':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldX className="h-3 w-3" />
            Class I - {language === 'vi' ? 'Nghiem trong' : 'Critical'}
          </Badge>
        )
      case 'class_ii':
        return (
          <Badge variant="outline" className="gap-1 border-amber-500 bg-amber-50 text-amber-700">
            <ShieldAlert className="h-3 w-3" />
            Class II - {language === 'vi' ? 'Cao' : 'High'}
          </Badge>
        )
      case 'class_iii':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 bg-yellow-50 text-yellow-700">
            <Shield className="h-3 w-3" />
            Class III - {language === 'vi' ? 'Trung binh' : 'Medium'}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 border-green-500 bg-green-50 text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            {language === 'vi' ? 'Khong co recall' : 'No recalls'}
          </Badge>
        )
    }
  }

  // Get alert variant based on severity
  const getAlertVariant = (severity: string | null | undefined) => {
    if (severity === 'class_i') return 'destructive'
    return 'default'
  }

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{language === 'vi' ? 'Dang kiem tra...' : 'Checking...'}</span>
      </div>
    )
  }

  if (error) {
    return null // Silently fail for compact view
  }

  // Compact inline view (for use in other components)
  if (showCompact) {
    if (!data?.has_recall_history) {
      return null // No recall history, don't show anything in compact mode
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={data.recall_severity === 'class_i' ? 'destructive' : 'outline'}
              className={`gap-1 cursor-pointer ${
                data.recall_severity === 'class_i'
                  ? ''
                  : data.recall_severity === 'class_ii'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-yellow-500 bg-yellow-50 text-yellow-700'
              }`}
              onClick={() => setShowDetails(true)}
            >
              <AlertTriangle className="h-3 w-3" />
              {data.recall_count} Recall{data.recall_count !== 1 ? 's' : ''}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium">
              {language === 'vi' ? 'Canh bao Recall' : 'Recall Warning'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.warning_message || (language === 'vi' 
                ? 'Nha cung cap co lich su recall. Nhan de xem chi tiet.'
                : 'This supplier has recall history. Click to view details.')}
            </p>
          </TooltipContent>
        </Tooltip>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {language === 'vi' ? 'Lich su Recall FDA' : 'FDA Recall History'}
              </DialogTitle>
              <DialogDescription>
                {supplierName || data.supplier_name}
              </DialogDescription>
            </DialogHeader>
            <RecallDetailsTable 
              matches={data.matches} 
              language={language} 
              formatDate={formatDate}
            />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
  }

  // Full card view
  return (
    <Card className={data?.has_recall_history ? 'border-amber-200' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${data?.has_recall_history ? 'text-amber-500' : 'text-green-500'}`} />
            <CardTitle className="text-lg">
              {language === 'vi' ? 'Lich su Recall FDA' : 'FDA Recall History'}
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckRecalls}
            disabled={isChecking}
            className="gap-2"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {language === 'vi' ? 'Kiem tra' : 'Check Now'}
          </Button>
        </div>
        <CardDescription>
          {language === 'vi'
            ? 'Theo 21 CFR 1.505: Danh gia nha cung cap can xem xet lich su recall'
            : 'Per 21 CFR 1.505: Supplier evaluation should consider recall history'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warning Alert */}
        {data?.warning_message && (
          <Alert variant={getAlertVariant(data.recall_severity)}>
            {data.recall_severity === 'class_i' ? (
              <ShieldX className="h-4 w-4" />
            ) : data.recall_severity === 'class_ii' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            <AlertTitle>
              {data.recall_severity === 'class_i'
                ? (language === 'vi' ? 'CANH BAO NGHIEM TRONG' : 'CRITICAL WARNING')
                : data.recall_severity === 'class_ii'
                ? (language === 'vi' ? 'CANH BAO' : 'WARNING')
                : (language === 'vi' ? 'THONG BAO' : 'NOTICE')}
            </AlertTitle>
            <AlertDescription>{data.warning_message}</AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{data?.recall_count || 0}</div>
            <div className="text-xs text-muted-foreground">
              {language === 'vi' ? 'Tong Recall' : 'Total Recalls'}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            {getSeverityBadge(data?.recall_severity)}
            <div className="text-xs text-muted-foreground mt-1">
              {language === 'vi' ? 'Muc do nghiem trong nhat' : 'Most Severe'}
            </div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium">
              {data?.last_recall_date ? formatDate(data.last_recall_date) : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {language === 'vi' ? 'Recall gan nhat' : 'Last Recall'}
            </div>
          </div>
        </div>

        {/* Last checked info */}
        {data?.last_checked_at && (
          <div className="text-xs text-muted-foreground text-center">
            {language === 'vi' ? 'Kiem tra lan cuoi:' : 'Last checked:'}{' '}
            {formatDate(data.last_checked_at)}
          </div>
        )}

        {/* Recall Details Table */}
        {data?.matches && data.matches.length > 0 && (
          <RecallDetailsTable 
            matches={data.matches} 
            language={language} 
            formatDate={formatDate}
          />
        )}

        {/* No recalls message */}
        {!data?.has_recall_history && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
            <p className="font-medium text-green-700">
              {language === 'vi' 
                ? 'Khong tim thay lich su recall' 
                : 'No recall history found'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'vi'
                ? 'Nha cung cap nay khong co ban ghi recall trong co so du lieu FDA'
                : 'This supplier has no recall records in FDA database'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Recall details table component
function RecallDetailsTable({ 
  matches, 
  language,
  formatDate,
}: { 
  matches: RecallMatch[]
  language: string
  formatDate: (date: string | null) => string
}) {
  const getClassificationBadge = (classification: string | null) => {
    if (!classification) return null
    
    const isClassI = classification.includes('I') && !classification.includes('II')
    const isClassII = classification.includes('II') && !classification.includes('III')
    
    return (
      <Badge
        variant={isClassI ? 'destructive' : 'outline'}
        className={
          isClassI ? '' :
          isClassII ? 'border-amber-500 bg-amber-50 text-amber-700' :
          'border-yellow-500 bg-yellow-50 text-yellow-700'
        }
      >
        {classification}
      </Badge>
    )
  }

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="destructive" className="text-[10px]">{language === 'vi' ? 'Xac nhan' : 'Confirmed'}</Badge>
      case 'dismissed':
        return <Badge variant="secondary" className="text-[10px]">{language === 'vi' ? 'Bo qua' : 'Dismissed'}</Badge>
      case 'under_review':
        return <Badge variant="outline" className="text-[10px]">{language === 'vi' ? 'Dang xem xet' : 'Under Review'}</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{language === 'vi' ? 'Cho xem xet' : 'Pending'}</Badge>
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">{language === 'vi' ? 'So Recall' : 'Recall #'}</TableHead>
            <TableHead>{language === 'vi' ? 'Ly do' : 'Reason'}</TableHead>
            <TableHead className="w-[100px]">{language === 'vi' ? 'Phan loai' : 'Class'}</TableHead>
            <TableHead className="w-[100px]">{language === 'vi' ? 'Ngay' : 'Date'}</TableHead>
            <TableHead className="w-[100px]">{language === 'vi' ? 'Trang thai' : 'Status'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="font-mono text-xs">
                {match.recall_number}
              </TableCell>
              <TableCell>
                <div className="max-w-[300px]">
                  <p className="text-sm line-clamp-2">{match.reason_for_recall || '-'}</p>
                  {match.product_description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {match.product_description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getClassificationBadge(match.recall_classification)}
              </TableCell>
              <TableCell className="text-xs">
                {formatDate(match.recall_initiation_date)}
              </TableCell>
              <TableCell>
                {getReviewStatusBadge(match.review_status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
