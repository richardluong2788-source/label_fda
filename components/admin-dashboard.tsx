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
  XCircle,
  Database,
  Upload,
  TestTube,
  TrendingUp,
  Tag,
  MessageCircle,
  Loader2,
  User,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import type { AdminUser } from '@/lib/types'
import { AppHeader } from '@/components/app-header'

interface UserData {
  email?: string
}

interface AdminDashboardWithUserProps {
  adminUser: AdminUser
  pendingReports: any[]
  attentionReports: any[]
  user?: UserData
}

interface AdminDashboardProps {
  adminUser: AdminUser
  pendingReports: any[]
  attentionReports: any[]
  userEmail?: string
}

export function AdminDashboard({
  adminUser,
  pendingReports,
  attentionReports,
  userEmail,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'attention' | 'expert_queue'>('pending')
  const [expertQueue, setExpertQueue] = useState<any[]>([])
  const [expertQueueLoading, setExpertQueueLoading] = useState(false)
  const isAdmin = ['admin', 'superadmin', 'expert'].includes(adminUser.role)

  const fetchExpertQueue = async (status = 'pending') => {
    setExpertQueueLoading(true)
    try {
      const res = await fetch(`/api/admin/expert-queue?status=${status}`)
      const data = await res.json()
      setExpertQueue(data.requests ?? [])
    } catch {
      setExpertQueue([])
    } finally {
      setExpertQueueLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'expert_queue') fetchExpertQueue()
  }, [activeTab])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <AppHeader email={userEmail} isAdmin={isAdmin} />

      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Bảng điều khiển Kiểm duyệt</h2>
              <p className="text-xs text-muted-foreground">
                Quản lý báo cáo compliance cần kiểm duyệt
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {adminUser.role.toUpperCase()}
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/revenue">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Doanh thu
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/pricing">
                  <Tag className="mr-2 h-4 w-4" />
                  Quản lý giá
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/knowledge/batch-import">
                  <Upload className="mr-2 h-4 w-4" />
                  Batch Import
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/test-rag">
                  <TestTube className="mr-2 h-4 w-4" />
                  Test RAG
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Chờ kiểm duyệt</span>
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold">{pendingReports.length}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Cần chú ý</span>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold">{attentionReports.length}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Xác nhận hôm nay</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold">0</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Bị từ chối</span>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold">0</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex gap-4 mb-6 flex-wrap">
            <Button
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              onClick={() => setActiveTab('pending')}
            >
              <Clock className="mr-2 h-4 w-4" />
              Chờ kiểm duyệt ({pendingReports.length})
            </Button>
            <Button
              variant={activeTab === 'attention' ? 'default' : 'outline'}
              onClick={() => setActiveTab('attention')}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Cần chú ý ({attentionReports.length})
            </Button>
            <Button
              variant={activeTab === 'expert_queue' ? 'default' : 'outline'}
              onClick={() => setActiveTab('expert_queue')}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Expert Queue
            </Button>
          </div>

          <div className="space-y-4">
            {activeTab === 'pending' &&
              (pendingReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Không có báo cáo chờ kiểm duyệt</p>
                </div>
              ) : (
                pendingReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              ))}

            {activeTab === 'attention' &&
              (attentionReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Không có báo cáo cần chú ý</p>
                </div>
              ) : (
                attentionReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              ))}

            {activeTab === 'expert_queue' && (
              expertQueueLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : expertQueue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Không có yêu cầu tư vấn nào đang chờ</p>
                </div>
              ) : (
                expertQueue.map((req) => (
                  <ExpertQueueCard key={req.id} request={req} onAssigned={() => fetchExpertQueue()} />
                ))
              )
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}

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

  const statusColor: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700 border-amber-200',
    in_review: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold">
              {report?.product_name || report?.file_name || 'Sản phẩm không tên'}
            </h3>
            <Badge className={`text-xs border ${statusColor[request.status] ?? ''}`}>
              {request.status === 'pending' ? 'Chờ xử lý' : request.status === 'in_review' ? 'Đang review' : 'Hoàn thành'}
            </Badge>
            {request.is_paid && (
              <Badge variant="secondary" className="text-xs">Gói trả phí</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
            <span>
              <User className="inline h-3 w-3 mr-1" />
              {request.target_market ?? 'US'}
            </span>
            {report?.overall_result && (
              <Badge variant={report.overall_result === 'fail' ? 'destructive' : 'outline'} className="text-xs">
                {report.overall_result.toUpperCase()}
              </Badge>
            )}
            {report?.overall_risk_score && (
              <span>Risk: {report.overall_risk_score}/10</span>
            )}
            <span>{new Date(request.created_at).toLocaleString('vi-VN')}</span>
          </div>
          {request.user_context && (
            <p className="text-xs text-muted-foreground italic line-clamp-2 mb-2">
              "{request.user_context}"
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

function ReportCard({ report }: { report: any }) {
  const findings = report.findings || []
  const criticalCount = findings.filter((f: any) => f.severity === 'critical').length
  const warningCount = findings.filter((f: any) => f.severity === 'warning').length

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold">{report.file_name || 'Báo cáo không tên'}</h3>
            {report.needs_expert_review && (
              <Badge variant="destructive" className="text-xs">
                Cần kiểm duyệt
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {report.citation_count || 0} Citations
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span>
              {criticalCount} Nghiêm trọng
            </span>
            <span>
              {warningCount} Cảnh báo
            </span>
            <span>
              {new Date(report.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/review/${report.id}`}>Kiểm duyệt</Link>
        </Button>
      </div>
    </Card>
  )
}
