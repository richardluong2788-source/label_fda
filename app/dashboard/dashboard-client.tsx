'use client'

import { Card } from '@/components/ui/card'
import {
  FileText, AlertTriangle, CheckCircle2, TrendingUp, Clock,
  Activity, ShieldCheck, Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from '@/lib/i18n'
import type { AuditReport } from '@/lib/types'

interface DashboardClientProps {
  allReports: AuditReport[]
  planName: string
  reportsLimit: number
  reportsUsed: number
  planId: string
  isAdmin: boolean
}

export function DashboardClient({
  allReports,
  planName,
  reportsLimit,
  reportsUsed,
  planId,
  isAdmin,
}: DashboardClientProps) {
  const { t } = useTranslation()
  const d = t.dashboard

  const totalReports = allReports.length
  const completedReports = allReports.filter(
    (r) => r.status === 'ai_completed' || r.status === 'verified'
  ).length
  const pendingReports = allReports.filter(
    (r) => r.status === 'pending' || r.status === 'processing'
  ).length
  const criticalViolations = allReports.reduce(
    (sum, r) => sum + (r.violations?.filter((v) => v.severity === 'critical').length || 0),
    0
  )
  const passCount = allReports.filter((r) => r.overall_result === 'pass').length
  const warningCount = allReports.filter((r) => r.overall_result === 'warning').length
  const failCount = allReports.filter((r) => r.overall_result === 'fail').length

  const reportsWithRisk = allReports.filter((r) => r.overall_risk_score != null)
  const avgRiskScore =
    reportsWithRisk.length > 0
      ? (
          reportsWithRisk.reduce((s, r) => s + (r.overall_risk_score || 0), 0) /
          reportsWithRisk.length
        ).toFixed(1)
      : '0.0'

  const isFreePlan = planId === 'free'
  const isUnlimited = isAdmin || reportsLimit === -1
  const quotaPercent = isUnlimited
    ? 0
    : Math.min(Math.round((reportsUsed / reportsLimit) * 100), 100)

  const recentReports = allReports.slice(0, 5)

  const stats = [
    { label: d.totalReports, value: totalReports, icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: d.completed, value: completedReports, icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: d.criticalFindings, value: criticalViolations, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
    { label: d.avgRiskScore, value: avgRiskScore, icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50', suffix: '/10' },
    { label: d.pending, value: pendingReports, icon: Clock, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: d.currentPlan, value: planName, icon: ShieldCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  ]

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: d.reportStatus.pending || status },
      processing: { variant: 'default', label: d.reportStatus.processing || status },
      ai_completed: { variant: 'default', label: d.reportStatus.ai_completed || status },
      verified: { variant: 'default', label: d.reportStatus.verified || status },
      error: { variant: 'destructive', label: d.reportStatus.error || status },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getResultBadge = (result: string | null) => {
    if (!result) return null
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      pass: { variant: 'default', label: d.reportResult.pass || result },
      warning: { variant: 'secondary', label: d.reportResult.warning || result },
      fail: { variant: 'destructive', label: d.reportResult.fail || result },
    }
    const { variant, label } = config[result] || { variant: 'secondary' as const, label: result }
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{d.title}</h1>
          <p className="text-muted-foreground mt-1">{d.subtitle}</p>
        </div>
        <Link href="/analyze">
          <Button size="lg">
            <FileText className="mr-2 h-4 w-4" />
            {d.newAnalysis}
          </Button>
        </Link>
      </div>

      {/* Quota Banner */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {isFreePlan ? d.quotaTitle : d.quotaMonthly}
            </span>
            <Badge variant="outline">{planName}</Badge>
            {isUnlimited && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                {d.unlimited}
              </Badge>
            )}
          </div>
          {!isUnlimited && (
            <Link href="/settings?tab=billing">
              <Button variant="outline" size="sm">{d.upgradePlan}</Button>
            </Link>
          )}
        </div>
        {isUnlimited ? (
          <p className="text-sm text-muted-foreground">
            {d.unlimitedDesc(planName)}
          </p>
        ) : (
          <>
            <Progress value={quotaPercent} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">
              {d.usedOf(reportsUsed, reportsLimit)}
              {quotaPercent >= 100 ? (
                <span className="ml-2 text-red-600 font-medium">{d.quotaExhaustedLabel}</span>
              ) : quotaPercent >= 80 ? (
                <span className="ml-2 text-amber-600 font-medium">{d.almostOut}</span>
              ) : null}
            </p>
          </>
        )}
      </Card>

      {/* Stats */}
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

      {/* Result Distribution */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{d.resultDistribution}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{passCount}</div>
            <div className="text-sm text-muted-foreground mt-1">{d.pass}</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-3xl font-bold text-amber-600">{warningCount}</div>
            <div className="text-sm text-muted-foreground mt-1">{d.warning}</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{failCount}</div>
            <div className="text-sm text-muted-foreground mt-1">{d.fail}</div>
          </div>
        </div>
      </Card>

      {/* Recent Reports */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{d.recentReports}</h2>
          <Link href="/history">
            <Button variant="ghost" size="sm">{d.viewAll}</Button>
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{d.noReports}</p>
            <Link href="/analyze">
              <Button className="mt-4">{d.createFirst}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((report) => (
              <Link key={report.id} href={`/audit/${report.id}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-medium truncate">{report.product_name || d.unnamedProduct}</p>
                      {getStatusBadge(report.status)}
                      {getResultBadge(report.overall_result)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(report.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {report.violations && report.violations.length > 0 && (
                      <p className="text-sm font-medium text-red-600">
                        {report.violations.filter((v) => v.severity === 'critical').length} {d.critical}
                      </p>
                    )}
                    {report.overall_risk_score != null && (
                      <p className="text-xs text-muted-foreground">
                        {d.risk}: {report.overall_risk_score}/10
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{d.recentActivity}</h2>
        </div>
        <div className="space-y-3">
          {allReports.slice(0, 3).map((report) => (
            <div key={report.id} className="flex items-start gap-3 text-sm">
              <div
                className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                  report.status === 'ai_completed' || report.status === 'verified'
                    ? 'bg-green-500'
                    : report.status === 'processing'
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">
                  {d.reportPrefix}{' '}
                  <span className="font-medium">{report.product_name || d.unnamed}</span>
                  {' '}&mdash;{' '}
                  {report.status === 'ai_completed' || report.status === 'verified'
                    ? d.statusDone
                    : report.status === 'processing'
                    ? d.statusProcessing
                    : d.statusPending}
                </p>
                <p className="text-muted-foreground text-xs">
                  {new Date(report.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          ))}
          {allReports.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{d.noActivity}</p>
          )}
        </div>
      </Card>
    </div>
  )
}
