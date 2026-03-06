'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  ShieldAlert,
  Database,
  Upload,
  TestTube,
  TrendingUp,
  Tag,
  MessageCircle,
  Loader2,
  User,
  ArrowRight,
  Eye,
  Bell,
  CircleDollarSign,
} from 'lucide-react'
import Link from 'next/link'
import type { AdminUser } from '@/lib/types'
import { AppHeader } from '@/components/app-header'

interface UserData {
  email?: string
}

interface AdminDashboardProps {
  adminUser: AdminUser
  riskReports: any[]
  expertQueueCount: number
  expertInReviewCount: number
  userEmail?: string
}

export function AdminDashboard({
  adminUser,
  riskReports,
  expertQueueCount,
  expertInReviewCount,
  userEmail,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'expert_queue' | 'risk_monitor'>('expert_queue')
  const [expertQueue, setExpertQueue] = useState<any[]>([])
  const [expertQueueLoading, setExpertQueueLoading] = useState(false)
  const [liveExpertCount, setLiveExpertCount] = useState(expertQueueCount)
  const isAdmin = ['admin', 'superadmin', 'expert'].includes(adminUser.role)

  const fetchExpertQueue = async (status = 'pending') => {
    setExpertQueueLoading(true)
    try {
      const res = await fetch(`/api/admin/expert-queue?status=${status}`)
      const data = await res.json()
      const items = data.requests ?? []
      setExpertQueue(items)
      if (status === 'pending') setLiveExpertCount(items.length)
    } catch {
      setExpertQueue([])
    } finally {
      setExpertQueueLoading(false)
    }
  }

  useEffect(() => {
    fetchExpertQueue()
  }, [])

  useEffect(() => {
    if (activeTab === 'expert_queue') fetchExpertQueue()
  }, [activeTab])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={userEmail} isAdmin={isAdmin} />

      {/* Page header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Bảng điều khiển Admin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quản lý yêu cầu tư vấn chuyên gia và giám sát rủi ro AI
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs font-medium">
                {adminUser.role.toUpperCase()}
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/revenue">
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                  Doanh thu
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/pricing">
                  <Tag className="mr-1.5 h-3.5 w-3.5" />
                  Quản lý giá
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/knowledge/batch-import">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Batch Import
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/test-rag">
                  <TestTube className="mr-1.5 h-3.5 w-3.5" />
                  Test RAG
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border-l-4 border-l-primary">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Chờ tư vấn
              </span>
              <CircleDollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">{liveExpertCount}</p>
            <p className="text-xs text-muted-foreground mt-1">User đã trả phí / dùng quota</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Đang review
              </span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{expertInReviewCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Expert đang xử lý</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Risk cao (AI flag)
              </span>
              <ShieldAlert className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold">{riskReports.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Chưa có yêu cầu tư vấn</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Hoàn thành hôm nay
              </span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-xs text-muted-foreground mt-1">Expert review đã xong</p>
          </Card>
        </div>

        {/* Tab switcher */}
        <Card className="p-6">
          <div className="flex gap-3 mb-6 flex-wrap">
            {/* Expert Queue — primary tab */}
            <button
              onClick={() => setActiveTab('expert_queue')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'expert_queue'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <CircleDollarSign className="h-4 w-4" />
              Expert Queue
              {liveExpertCount > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[20px] ${
                  activeTab === 'expert_queue'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {liveExpertCount}
                </span>
              )}
            </button>

            {/* Risk Monitor — secondary tab */}
            <button
              onClick={() => setActiveTab('risk_monitor')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'risk_monitor'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Risk Monitor (AI flag)
              {riskReports.length > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[20px] ${
                  activeTab === 'risk_monitor'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {riskReports.length}
                </span>
              )}
            </button>
          </div>

          {/* Expert Queue tab */}
          {activeTab === 'expert_queue' && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Hàng đợi tư vấn chuyên gia</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Chỉ hiển thị các yêu cầu user đã trả phí hoặc sử dụng quota gói. Đây là nhiệm vụ có cam kết dịch vụ.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchExpertQueue()}
                  disabled={expertQueueLoading}
                >
                  {expertQueueLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Làm mới'}
                </Button>
              </div>

              {expertQueueLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : expertQueue.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium">Hàng đợi trống</p>
                  <p className="text-sm mt-1">Không có yêu cầu tư vấn nào đang chờ xử lý.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expertQueue.map((req) => (
                    <ExpertQueueCard
                      key={req.id}
                      request={req}
                      onAssigned={() => fetchExpertQueue()}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Risk Monitor tab */}
          {activeTab === 'risk_monitor' && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Giám sát rủi ro (AI flag)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Các báo cáo mà AI tự động đánh dấu risk cao. Đây là công cụ theo dõi nội bộ — admin không có nghĩa vụ xử lý, nhưng có thể mời user mua Expert Review.
                  </p>
                </div>
              </div>

              {riskReports.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-amber-300" />
                  <p className="font-medium">Không có báo cáo risk cao</p>
                  <p className="text-sm mt-1">Tất cả sản phẩm đang ở mức an toàn.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {riskReports.map((report) => (
                    <RiskReportCard key={report.id} report={report} />
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}

// ─── Expert Queue Card ───────────────────────────────────────────────────────

function ExpertQueueCard({ request, onAssigned }: { request: any; onAssigned: () => void }) {
  const [assigning, setAssigning] = useState(false)
  const report = request.audit_reports

  const handleAssign = async () => {
    setAssigning(true)
    try {
      await fetch('/api/admin/expert-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: request.id, action: 'assign' }),
      })
      onAssigned()
    } finally {
      setAssigning(false)
    }
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending:   { label: 'Chờ xử lý',    className: 'bg-amber-50 text-amber-700 border-amber-200' },
    in_review: { label: 'Đang review',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
    completed: { label: 'Hoàn thành',    className: 'bg-green-50 text-green-700 border-green-200' },
  }
  const status = statusConfig[request.status] ?? statusConfig.pending

  return (
    <Card className="p-4 hover:shadow-sm transition-shadow border-l-4 border-l-primary">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="font-semibold">
              {report?.product_name || report?.file_name || 'Sản phẩm không tên'}
            </h3>
            <Badge className={`text-xs border ${status.className}`}>{status.label}</Badge>
            {request.is_paid && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CircleDollarSign className="h-3 w-3" />
                Trả phí
              </Badge>
            )}
            {report?.overall_risk_score && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  report.overall_risk_score >= 7
                    ? 'border-red-300 text-red-600'
                    : report.overall_risk_score >= 4
                    ? 'border-amber-300 text-amber-600'
                    : 'border-green-300 text-green-600'
                }`}
              >
                Risk: {report.overall_risk_score}/10
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{request.target_market ?? 'US'}</span>
            {report?.overall_result && (
              <Badge
                variant={report.overall_result === 'fail' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {report.overall_result.toUpperCase()}
              </Badge>
            )}
            <span>{new Date(request.created_at).toLocaleString('vi-VN')}</span>
          </div>
          {request.user_context && (
            <p className="text-xs text-muted-foreground italic line-clamp-2 mt-1.5 border-l-2 border-muted pl-2">
              {request.user_context}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {request.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={handleAssign} disabled={assigning}>
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Nhận việc'}
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/admin/expert-review/${request.id}`}>
              <ArrowRight className="h-4 w-4 mr-1" />
              {request.status === 'in_review' ? 'Tiếp tục' : 'Xem'}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Risk Monitor Card ───────────────────────────────────────────────────────

function RiskReportCard({ report }: { report: any }) {
  const findings = report.findings || []
  const criticalCount = findings.filter((f: any) => f.severity === 'critical').length
  const warningCount = findings.filter((f: any) => f.severity === 'warning').length
  const productName = report.product_name || report.brand_name || report.file_name || 'Sản phẩm không tên'
  const userEmail = report.user_email || 'Unknown user'
  const riskScore = report.overall_risk_score ?? 0

  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="font-semibold truncate" title={productName}>
              {productName}
            </h3>
            <Badge
              variant="outline"
              className={`text-xs shrink-0 ${
                riskScore >= 7
                  ? 'border-red-300 text-red-600 bg-red-50'
                  : 'border-amber-300 text-amber-600 bg-amber-50'
              }`}
            >
              <ShieldAlert className="h-3 w-3 mr-1" />
              Risk {riskScore}/10
            </Badge>
            <Badge variant="outline" className="text-xs shrink-0">
              {report.citation_count || 0} Citations
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm mb-1.5">
            {criticalCount > 0 && (
              <span className="text-red-600 font-medium text-xs">{criticalCount} Nghiêm trọng</span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-600 font-medium text-xs">{warningCount} Cảnh báo</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[200px]" title={userEmail}>
                {userEmail}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(report.created_at).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Actions: view only, no "Kiểm duyệt" obligation */}
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/review/${report.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              Xem
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
