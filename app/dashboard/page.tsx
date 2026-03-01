import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Activity,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { AuditReport } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch reports
  const { data: reports } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as { data: AuditReport[] | null }

  const allReports = reports || []

  // Thống kê
  const totalReports    = allReports.length
  const completedReports = allReports.filter(r => r.status === 'ai_completed' || r.status === 'verified').length
  const pendingReports  = allReports.filter(r => r.status === 'pending' || r.status === 'processing').length
  const criticalViolations = allReports.reduce((sum, r) =>
    sum + (r.violations?.filter(v => v.severity === 'critical').length || 0), 0)

  const passCount    = allReports.filter(r => r.overall_result === 'pass').length
  const warningCount = allReports.filter(r => r.overall_result === 'warning').length
  const failCount    = allReports.filter(r => r.overall_result === 'fail').length

  const reportsWithRisk = allReports.filter(r => r.overall_risk_score != null)
  const avgRiskScore = reportsWithRisk.length > 0
    ? (reportsWithRisk.reduce((s, r) => s + (r.overall_risk_score || 0), 0) / reportsWithRisk.length).toFixed(1)
    : '0.0'

  // Subscription / quota
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(name, reports_limit)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  // Check admin role để điều chỉnh UI quota
  const { data: adminRecord } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin =
    adminRecord?.role === 'admin' ||
    adminRecord?.role === 'superadmin' ||
    adminRecord?.role === 'expert'

  const planName     = (subscription?.subscription_plans as any)?.name ?? 'Free Trial'
  const reportsLimit = (subscription?.subscription_plans as any)?.reports_limit ?? 1
  const reportsUsed  = subscription?.reports_used ?? 0
  const planId       = subscription?.plan_id ?? 'free'
  const isFreePlan   = planId === 'free'
  // reports_limit = -1 nghĩa là không giới hạn (gói Enterprise/Admin)
  const isUnlimited  = isAdmin || reportsLimit === -1
  const quotaPercent = isUnlimited ? 0 : Math.min(Math.round((reportsUsed / reportsLimit) * 100), 100)

  const recentReports = allReports.slice(0, 5)

  const stats = [
    {
      label: 'Tổng báo cáo',
      value: totalReports,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Hoàn thành',
      value: completedReports,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Vi phạm nghiêm trọng',
      value: criticalViolations,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Điểm rủi ro TB',
      value: avgRiskScore,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      suffix: '/10',
    },
    {
      label: 'Đang xử lý',
      value: pendingReports,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Gói hiện tại',
      value: planName,
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending:      { variant: 'secondary',    label: 'Chờ xử lý' },
      processing:   { variant: 'default',      label: 'Đang phân tích' },
      ai_completed: { variant: 'default',      label: 'Hoàn thành' },
      verified:     { variant: 'default',      label: 'Đã xác minh' },
      error:        { variant: 'destructive',  label: 'Lỗi' },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getResultBadge = (result: string | null) => {
    if (!result) return null
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      pass:    { variant: 'default',     label: 'Đạt' },
      warning: { variant: 'secondary',   label: 'Cảnh báo' },
      fail:    { variant: 'destructive', label: 'Không đạt' },
    }
    const { variant, label } = config[result] || { variant: 'secondary' as const, label: result }
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
          <p className="text-muted-foreground mt-1">Theo dõi báo cáo kiểm tra nhãn FDA của bạn</p>
        </div>
        <Link href="/analyze">
          <Button size="lg">
            <FileText className="mr-2 h-4 w-4" />
            Phân tích mới
          </Button>
        </Link>
      </div>

      {/* Quota Banner */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {isFreePlan ? 'Lượt phân tích của bạn' : 'Lượt phân tích tháng này'}
            </span>
            <Badge variant="outline">{planName}</Badge>
            {isUnlimited && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Không giới hạn</Badge>
            )}
          </div>
          {!isUnlimited && (
            <Link href="/settings?tab=billing">
              <Button variant="outline" size="sm">Nâng cấp gói</Button>
            </Link>
          )}
        </div>
        {isUnlimited ? (
          <p className="text-sm text-muted-foreground">
            Tài khoản của bạn có quyền truy cập <span className="font-semibold text-emerald-600">không giới hạn</span> — không có hạn mức hàng tháng.
          </p>
        ) : (
          <>
            <Progress value={quotaPercent} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">
              Đã dùng <span className="font-semibold text-foreground">{reportsUsed}</span> / {reportsLimit} lượt
              {quotaPercent >= 80 && (
                <span className="ml-2 text-amber-600 font-medium">— sắp hết hạn mức</span>
              )}
            </p>
          </>
        )}
      </Card>

      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">
                    {stat.value}
                    {stat.suffix && <span className="text-lg text-muted-foreground">{stat.suffix}</span>}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Phân bổ kết quả */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Phân bổ kết quả</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{passCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Đạt</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-3xl font-bold text-amber-600">{warningCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Cảnh báo</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{failCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Không đạt</div>
          </div>
        </div>
      </Card>

      {/* Báo cáo gần đây */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Báo cáo gần đây</h2>
          <Link href="/history">
            <Button variant="ghost" size="sm">Xem tất cả</Button>
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Chưa có báo cáo nào</p>
            <Link href="/analyze">
              <Button className="mt-4">Tạo báo cáo đầu tiên</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((report) => (
              <Link key={report.id} href={`/audit/${report.id}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-medium truncate">{report.product_name || 'Sản phẩm chưa đặt tên'}</p>
                      {getStatusBadge(report.status)}
                      {getResultBadge(report.overall_result)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(report.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {report.violations && report.violations.length > 0 && (
                      <p className="text-sm font-medium text-red-600">
                        {report.violations.filter(v => v.severity === 'critical').length} nghiêm trọng
                      </p>
                    )}
                    {report.overall_risk_score != null && (
                      <p className="text-xs text-muted-foreground">
                        Rủi ro: {report.overall_risk_score}/10
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Hoat dong gan day */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Hoạt động gần đây</h2>
        </div>
        <div className="space-y-3">
          {allReports.slice(0, 3).map((report) => (
            <div key={report.id} className="flex items-start gap-3 text-sm">
              <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                report.status === 'ai_completed' || report.status === 'verified'
                  ? 'bg-green-500'
                  : report.status === 'processing'
                  ? 'bg-blue-500'
                  : 'bg-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">
                  Báo cáo <span className="font-medium">{report.product_name || 'không tên'}</span>
                  {' '}— {
                    report.status === 'ai_completed' || report.status === 'verified'
                      ? 'đã hoàn thành'
                      : report.status === 'processing'
                      ? 'đang xử lý'
                      : 'chờ xử lý'
                  }
                </p>
                <p className="text-muted-foreground text-xs">
                  {new Date(report.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          ))}
          {allReports.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Chưa có hoạt động nào</p>
          )}
        </div>
      </Card>
    </div>
  )
}
