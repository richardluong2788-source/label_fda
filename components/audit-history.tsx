'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, AlertCircle, Clock, Trash2, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import type { AuditReport } from '@/lib/types'
import { FormatDate } from '@/components/format-date'
import { useTranslation } from '@/lib/i18n'

interface AuditHistoryProps {
  reports: AuditReport[]
  currentPage: number
  totalPages: number
  totalCount: number
}

function getResultIcon(result?: string) {
  switch (result) {
    case 'pass':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />
    case 'fail':
      return <AlertCircle className="h-4 w-4 text-destructive" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

export function AuditHistory({ reports, currentPage, totalPages, totalCount }: AuditHistoryProps) {
  const { t } = useTranslation()
  const h = t.history
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(reportId: string) {
    setDeletingId(reportId)
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        console.error('Failed to delete report')
      }
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setDeletingId(null)
    }
  }

  function getResultBadge(result?: string) {
    const label = result ? (h.resultLabels[result] || result) : h.resultLabels.processing
    switch (result) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{label}</Badge>
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">{label}</Badge>
      case 'fail':
        return <Badge variant="destructive">{label}</Badge>
      default:
        return <Badge variant="secondary">{label}</Badge>
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{h.title}</h3>
        <div className="text-sm text-muted-foreground">
          {h.pageInfo(currentPage, totalPages, totalCount)}
        </div>
      </div>
      <div className="space-y-3">
        {reports.map((report) => {
          const violationCount = report.violations ? (Array.isArray(report.violations) ? report.violations.length : 0) : 0
          
          const productName = report.product_name || report.brand_name || h.defaultName
          const categoryDisplay = report.product_category ? 
            report.product_category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
            h.uncategorized
          
          const reportLink = report.report_unlocked || report.payment_status === 'paid' 
            ? `/audit/${report.id}` 
            : `/audit/${report.id}/preview`
          
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <Link href={reportLink} className="block p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getResultIcon(report.overall_result)}
                      <h4 className="font-semibold text-base truncate">
                        {productName}
                      </h4>
                      {getResultBadge(report.overall_result)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1">
                      <span className="font-medium text-foreground">{categoryDisplay}</span>
                      <span>{'·'}</span>
                      <FormatDate date={report.created_at} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{h.statusPrefix}: {report.status}</span>
                      <span>{'·'}</span>
                      <span className={violationCount > 0 ? "font-medium text-destructive" : ""}>
                        {violationCount > 0 ? h.violations(violationCount) : h.noViolationData}
                      </span>
                      {report.brand_name && report.product_name && (
                        <>
                          <span>{'·'}</span>
                          <span>{h.brandPrefix}: {report.brand_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="bg-transparent">
                      {h.viewReport}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.preventDefault()}
                        >
                          {deletingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{h.deleteConfirmTitle || 'Delete Report?'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {h.deleteConfirmDesc || 'This action cannot be undone. This will permanently delete the audit report and all associated data.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{h.cancel || 'Cancel'}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(report.id)}
                          >
                            {h.delete || 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Link>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            asChild
          >
            <Link href={`/history?page=${currentPage - 1}`}>{h.prev}</Link>
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  asChild
                >
                  <Link href={`/history?page=${pageNum}`}>{pageNum}</Link>
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            asChild
          >
            <Link href={`/history?page=${currentPage + 1}`}>{h.next}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
