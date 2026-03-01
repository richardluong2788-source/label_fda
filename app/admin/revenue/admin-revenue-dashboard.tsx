'use client'

import { useMemo, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  ArrowLeft,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import type { AdminUser } from '@/lib/types'

interface Transaction {
  id: string
  user_id: string
  plan_id: string
  amount_vnd: number
  status: string
  vnpay_bank_code?: string
  vnpay_txn_ref?: string
  created_at: string
}

interface Subscription {
  plan_id: string
  status: string
  created_at: string
  last_payment_at?: string
}

interface Plan {
  id: string
  name: string
  price_vnd: number
  reports_limit: number
}

interface Props {
  transactions: Transaction[]
  subscriptions: Subscription[]
  plans: Plan[]
  userEmail: string
  adminUser: AdminUser
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: 'Thành công', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  pending:   { label: 'Chờ TT',    color: 'text-amber-600 bg-amber-50 border-amber-200',  icon: Clock },
  failed:    { label: 'Thất bại',  color: 'text-red-600 bg-red-50 border-red-200',        icon: XCircle },
  expired:   { label: 'Hết hạn',  color: 'text-slate-600 bg-slate-50 border-slate-200',  icon: XCircle },
  refunded:  { label: 'Hoàn tiền', color: 'text-blue-600 bg-blue-50 border-blue-200',     icon: ArrowLeft },
}

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-slate-100 text-slate-700',
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-amber-100 text-amber-700',
}

function formatVND(amount: number) {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M ₫'
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'K ₫'
  return amount.toLocaleString('vi-VN') + ' ₫'
}

function formatVNDFull(amount: number) {
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export function AdminRevenueDashboard({ transactions, subscriptions, plans, userEmail, adminUser }: Props) {
  const isAdmin = ['admin', 'superadmin', 'expert'].includes(adminUser.role)
  const [txnFilter, setTxnFilter] = useState<string>('all')

  // ── Computed stats ────────────────────────────────────────────────────
  const completedTxns = useMemo(
    () => transactions.filter((t) => t.status === 'completed'),
    [transactions]
  )

  const totalRevenue = useMemo(
    () => completedTxns.reduce((s, t) => s + (t.amount_vnd ?? 0), 0),
    [completedTxns]
  )

  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), [])
  const mrr = useMemo(
    () =>
      completedTxns
        .filter((t) => new Date(t.created_at) >= thirtyDaysAgo)
        .reduce((s, t) => s + (t.amount_vnd ?? 0), 0),
    [completedTxns, thirtyDaysAgo]
  )

  const activeSubscribers = subscriptions.filter((s) => s.status === 'active').length

  // Plan breakdown
  const planBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of subscriptions) {
      if (s.status === 'active') counts[s.plan_id] = (counts[s.plan_id] ?? 0) + 1
    }
    return plans.map((p) => ({ ...p, count: counts[p.id] ?? 0 }))
  }, [subscriptions, plans])

  // Monthly revenue chart (6 months)
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    for (const t of completedTxns) {
      if (new Date(t.created_at) < sixMonthsAgo) continue
      const key = t.created_at.slice(0, 7)
      map[key] = (map[key] ?? 0) + t.amount_vnd
    }
    // Fill last 6 months including empty ones
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
      result.push({ month: label, total: map[key] ?? 0, key })
    }
    return result
  }, [completedTxns])

  // Filtered transactions list
  const filteredTxns = useMemo(() => {
    if (txnFilter === 'all') return transactions
    return transactions.filter((t) => t.status === txnFilter)
  }, [transactions, txnFilter])

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={userEmail} isAdmin={isAdmin} />

      {/* Sub-header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Admin
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Tổng quan doanh thu</h1>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/pricing">
                <CreditCard className="h-4 w-4 mr-1" />
                Quản lý giá gói
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-foreground">{formatVND(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Tất cả thời gian</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Doanh thu tháng này</p>
                <p className="text-2xl font-bold text-foreground">{formatVND(mrr)}</p>
                <p className="text-xs text-muted-foreground mt-1">30 ngày qua</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subscribers đang hoạt động</p>
                <p className="text-2xl font-bold text-foreground">{activeSubscribers}</p>
                <p className="text-xs text-muted-foreground mt-1">Trong {subscriptions.length} tổng</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Giao dịch thành công</p>
                <p className="text-2xl font-bold text-foreground">{completedTxns.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Trong {transactions.length} tổng</p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Chart + Plan Breakdown */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <Card className="lg:col-span-2 p-6">
            <h2 className="text-sm font-semibold mb-5">Doanh thu 6 tháng gần nhất</h2>
            {monthlyData.every((d) => d.total === 0) ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Chưa có dữ liệu giao dịch thành công
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatVND(v)}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatVNDFull(v), 'Doanh thu']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Plan Breakdown */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-5">Người dùng theo gói</h2>
            <div className="space-y-3">
              {planBreakdown.map((plan) => {
                const pct = activeSubscribers > 0
                  ? Math.round((plan.count / activeSubscribers) * 100)
                  : 0
                return (
                  <div key={plan.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[plan.id] ?? 'bg-muted text-muted-foreground'}`}>
                          {plan.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {plan.price_vnd > 0 ? formatVND(plan.price_vnd) + '/th' : 'Miễn phí'}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{plan.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {planBreakdown.every((p) => p.count === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Chưa có người dùng nào đăng ký gói
                </p>
              )}
            </div>

            {activeSubscribers > 0 && (
              <>
                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground">
                  Tổng active: <span className="font-semibold text-foreground">{activeSubscribers}</span>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold">Lịch sử giao dịch gần đây</h2>
            <div className="flex gap-2">
              {(['all', 'completed', 'pending', 'failed'] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={txnFilter === s ? 'default' : 'outline'}
                  className="h-7 text-xs px-3"
                  onClick={() => setTxnFilter(s)}
                >
                  {s === 'all' ? 'Tất cả' : STATUS_CONFIG[s]?.label ?? s}
                </Button>
              ))}
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Không có giao dịch nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 text-xs font-medium text-muted-foreground">Mã GD</th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground">Gói</th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground">Số tiền</th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground">Ngân hàng</th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTxns.map((txn) => {
                    const statusCfg = STATUS_CONFIG[txn.status] ?? {
                      label: txn.status,
                      color: 'text-muted-foreground bg-muted border-border',
                      icon: Clock,
                    }
                    const StatusIcon = statusCfg.icon
                    return (
                      <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs text-muted-foreground">
                            {txn.vnpay_txn_ref?.slice(-8) ?? txn.id.slice(-8)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[txn.plan_id] ?? 'bg-muted text-muted-foreground'}`}>
                            {planName(txn.plan_id)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-semibold">
                          {formatVNDFull(txn.amount_vnd)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {txn.vnpay_bank_code ?? '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {new Date(txn.created_at).toLocaleString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
