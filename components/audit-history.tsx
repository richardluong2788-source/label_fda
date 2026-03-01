'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import type { AuditReport } from '@/lib/types'
import { FormatDate } from '@/components/format-date'

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

function getResultBadge(result?: string) {
  switch (result) {
    case 'pass':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đạt chuẩn</Badge>
    case 'warning':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Cảnh báo</Badge>
    case 'fail':
      return <Badge variant="destructive">Cần kiểm duyệt</Badge>
    default:
      return <Badge variant="secondary">Đang xử lý</Badge>
  }
}

// Simple placeholder - 1x1 transparent pixel
const PLACEHOLDER_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

export function AuditHistory({ reports, currentPage, totalPages, totalCount }: AuditHistoryProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Lịch sử kiểm tra</h3>
        <div className="text-sm text-muted-foreground">
          Trang {currentPage} / {totalPages} • Tổng: {totalCount} báo cáo
        </div>
      </div>
      <div className="space-y-3">
        {reports.map((report) => {
          const violationCount = report.violations ? (Array.isArray(report.violations) ? report.violations.length : 0) : 0
          
          // Get product info
          const productName = report.product_name || report.brand_name || 'Báo cáo kiểm tra'
          const categoryDisplay = report.product_category ? 
            report.product_category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
            'Chưa phân loại'
          
          // Determine which page to link to based on payment status
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
                      <span>•</span>
                      <FormatDate date={report.created_at} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">Trạng thái: {report.status}</span>
                      <span>•</span>
                      <span className={violationCount > 0 ? "font-medium text-destructive" : ""}>
                        {violationCount > 0 ? `${violationCount} vi phạm` : 'Chưa có dữ liệu'}
                      </span>
                      {report.brand_name && report.product_name && (
                        <>
                          <span>•</span>
                          <span>Nhãn hiệu: {report.brand_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="flex-shrink-0 bg-transparent">
                    Xem báo cáo
                  </Button>
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
            <Link href={`/dashboard?page=${currentPage - 1}`}>Trước</Link>
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
                  <Link href={`/dashboard?page=${pageNum}`}>{pageNum}</Link>
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
            <Link href={`/dashboard?page=${currentPage + 1}`}>Sau</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
