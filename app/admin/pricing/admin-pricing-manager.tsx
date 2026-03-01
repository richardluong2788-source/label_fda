'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Pencil, Save, X, Tag, Users, FileText, Clock, CalendarDays, TrendingDown, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'

interface Plan {
  id: string
  name: string
  price_vnd: number
  annual_price_vnd: number          // Giá năm (thường discount 20%)
  annual_discount_percent: number   // % giảm so với giá tháng x12
  expert_review_price_vnd: number   // 0 = miễn phí trong gói, >0 = trả lẻ
  reports_limit: number
  expert_reviews_limit: number
  storage_days: number | null
  features: string[]
  is_active: boolean
  sort_order: number
}

interface Props {
  initialPlans: Plan[]
}

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-slate-100 text-slate-700 border-slate-200',
  starter:    'bg-blue-50 text-blue-700 border-blue-200',
  pro:        'bg-indigo-50 text-indigo-700 border-indigo-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function AdminPricingManager({ initialPlans }: Props) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [featuresRaw, setFeaturesRaw] = useState('')

  // Inline expert price editing state
  const [expertEditing, setExpertEditing] = useState<string | null>(null) // plan id
  const [expertDraft, setExpertDraft] = useState<{ expert_reviews_limit: number; expert_review_price_vnd: number } | null>(null)
  const [expertSaving, setExpertSaving] = useState(false)

  const openExpertEdit = (plan: Plan) => {
    setExpertEditing(plan.id)
    setExpertDraft({ expert_reviews_limit: plan.expert_reviews_limit, expert_review_price_vnd: plan.expert_review_price_vnd })
  }

  const cancelExpertEdit = () => {
    setExpertEditing(null)
    setExpertDraft(null)
  }

  const saveExpertPrice = async (plan: Plan) => {
    if (!expertDraft) return
    setExpertSaving(true)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...plan, ...expertDraft }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Lỗi cập nhật')
      setPlans((prev) => prev.map((p) => (p.id === json.plan.id ? json.plan : p)))
      toast({ title: 'Đã lưu giá chuyên gia', description: `Gói "${json.plan.name}" đã cập nhật.` })
      cancelExpertEdit()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' })
    } finally {
      setExpertSaving(false)
    }
  }

  const openEdit = (plan: Plan) => {
    setEditing({ ...plan })
    setFeaturesRaw(plan.features.join('\n'))
  }

  const closeEdit = () => {
    setEditing(null)
    setFeaturesRaw('')
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)

    const parsedFeatures = featuresRaw
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)

    const payload: Plan = { ...editing, features: parsedFeatures }

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Lỗi cập nhật')

      setPlans((prev) => prev.map((p) => (p.id === json.plan.id ? json.plan : p)))
      toast({ title: 'Lưu thành công', description: `Gói "${json.plan.name}" đã được cập nhật.` })
      closeEdit()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Admin
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Quản lý giá gói</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <p className="text-sm text-muted-foreground mb-6">
          Chỉnh sửa tên, giá, số lượt, tính năng và trạng thái của từng gói dịch vụ. Thay đổi có hiệu lực ngay lập tức.
        </p>

        {/* Expert Review Pricing — Inline Editable */}
        <Card className="mb-6 border-2 border-indigo-100">
          <div className="px-5 py-4 flex items-center gap-2 border-b bg-indigo-50/60 rounded-t-lg">
            <UserCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-indigo-900">Quản lý giá chuyên gia</h2>
            <Badge variant="secondary" className="ml-auto text-xs bg-indigo-100 text-indigo-700">
              Expert Review
            </Badge>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground mb-4">
              Chỉnh sửa trực tiếp số lượt và giá tư vấn lẻ cho từng gói. Nhấn icon bút để chỉnh, nhấn lưu để áp dụng ngay.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gói</TableHead>
                  <TableHead className="text-center">Expert / tháng</TableHead>
                  <TableHead className="text-center">Giá lẻ (VND/lần)</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const isEditingThis = expertEditing === plan.id
                  return (
                    <TableRow key={plan.id} className={isEditingThis ? 'bg-indigo-50/40' : ''}>
                      <TableCell className="font-medium">{plan.name}</TableCell>

                      {/* Expert / tháng */}
                      <TableCell className="text-center">
                        {isEditingThis && expertDraft ? (
                          <Input
                            type="number"
                            className="h-8 w-24 mx-auto text-center text-sm"
                            value={expertDraft.expert_reviews_limit}
                            onChange={(e) => setExpertDraft({ ...expertDraft, expert_reviews_limit: Number(e.target.value) })}
                            title="-1 = không giới hạn, 0 = không có"
                          />
                        ) : (
                          plan.expert_reviews_limit === -1 ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Không giới hạn</Badge>
                          ) : plan.expert_reviews_limit === 0 ? (
                            <Badge variant="secondary">Không có</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{plan.expert_reviews_limit} lần</Badge>
                          )
                        )}
                      </TableCell>

                      {/* Giá lẻ */}
                      <TableCell className="text-center">
                        {isEditingThis && expertDraft ? (
                          <Input
                            type="number"
                            className="h-8 w-28 mx-auto text-center text-sm"
                            value={expertDraft.expert_review_price_vnd}
                            onChange={(e) => setExpertDraft({ ...expertDraft, expert_review_price_vnd: Number(e.target.value) })}
                            placeholder="499000"
                          />
                        ) : (
                          plan.expert_review_price_vnd > 0 ? (
                            <span className="font-semibold text-amber-700">
                              {plan.expert_review_price_vnd.toLocaleString('vi-VN')}₫
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Miễn phí / N/A</span>
                          )
                        )}
                      </TableCell>

                      {/* Trạng thái */}
                      <TableCell className="text-center">
                        <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                          {plan.is_active ? 'Hiển thị' : 'Ẩn'}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {isEditingThis ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => saveExpertPrice(plan)}
                              disabled={expertSaving}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              {expertSaving ? '...' : 'Lưu'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={cancelExpertEdit}
                              disabled={expertSaving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs ml-auto flex"
                            onClick={() => openExpertEdit(plan)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Sửa
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Expert / tháng: -1 = không giới hạn, 0 = không có (chỉ mua lẻ). Giá lẻ = 0 nếu miễn phí trong gói.
            </p>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-5">
          {plans.map((plan) => {
            const colorCls = PLAN_COLORS[plan.id] ?? 'bg-card text-foreground border-border'
            return (
              <Card key={plan.id} className={`border-2 ${plan.is_active ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`rounded-t-lg px-5 py-4 flex items-center justify-between ${colorCls}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{plan.name}</span>
                    {!plan.is_active && (
                      <Badge variant="secondary" className="text-xs">Ẩn</Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="h-8 bg-white/80" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Sửa
                  </Button>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">
                        {plan.price_vnd === 0
                          ? 'Miễn phí'
                          : plan.price_vnd.toLocaleString('vi-VN') + '₫'}
                      </span>
                      {plan.price_vnd > 0 && (
                        <span className="text-muted-foreground text-sm mb-0.5">/tháng</span>
                      )}
                    </div>
                    {plan.annual_price_vnd > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          {plan.annual_price_vnd.toLocaleString('vi-VN')}₫/năm
                        </span>
                        {plan.annual_discount_percent > 0 && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            -{plan.annual_discount_percent}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span>
                        {plan.reports_limit === -1 ? 'Không giới hạn' : `${plan.reports_limit} lượt AI`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {plan.expert_reviews_limit === -1
                          ? 'Không giới hạn expert'
                          : plan.expert_reviews_limit === 0
                          ? 'Expert: ' + (plan.expert_review_price_vnd > 0
                              ? plan.expert_review_price_vnd.toLocaleString('vi-VN') + '₫/lần'
                              : 'Không có')
                          : `${plan.expert_reviews_limit} expert review`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {plan.storage_days == null ? 'Lưu vĩnh viễn' : `Lưu ${plan.storage_days} ngày`}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <ul className="text-sm space-y-1">
                    {(plan.features as string[]).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">·</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )
          })}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa gói — {editing?.name}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Tên gói</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              {/* Pricing Section */}
              <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  Cấu hình giá
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Giá tháng (VND)</Label>
                    <Input
                      type="number"
                      value={editing.price_vnd}
                      onChange={(e) => setEditing({ ...editing, price_vnd: Number(e.target.value) })}
                      placeholder="899000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Giá năm (VND)</Label>
                    <Input
                      type="number"
                      value={editing.annual_price_vnd || ''}
                      onChange={(e) => setEditing({ ...editing, annual_price_vnd: Number(e.target.value) || 0 })}
                      placeholder="8630400"
                    />
                    <p className="text-xs text-muted-foreground">
                      Để trống hoặc 0 = không hiển thị giá năm
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>% giảm giá năm</Label>
                    <Input
                      type="number"
                      value={editing.annual_discount_percent || ''}
                      onChange={(e) => setEditing({ ...editing, annual_discount_percent: Number(e.target.value) || 0 })}
                      placeholder="20"
                      min={0}
                      max={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Hiển thị badge "-20%" cho khách
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Tính toán tham khảo</Label>
                    <div className="text-sm bg-muted/50 rounded px-3 py-2">
                      {editing.price_vnd > 0 ? (
                        <>
                          <div>Giá tháng x 12 = {(editing.price_vnd * 12).toLocaleString('vi-VN')}₫</div>
                          {editing.annual_discount_percent > 0 && (
                            <div className="text-green-600">
                              Sau giảm {editing.annual_discount_percent}% = {Math.round(editing.price_vnd * 12 * (1 - editing.annual_discount_percent / 100)).toLocaleString('vi-VN')}₫
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Nhập giá tháng để xem</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Số lượt AI / tháng</Label>
                  <Input
                    type="number"
                    value={editing.reports_limit}
                    onChange={(e) => setEditing({ ...editing, reports_limit: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">-1 = không giới hạn</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Expert Review / tháng</Label>
                  <Input
                    type="number"
                    value={editing.expert_reviews_limit}
                    onChange={(e) =>
                      setEditing({ ...editing, expert_reviews_limit: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">-1 = không giới hạn, 0 = không có</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Giá tư vấn lẻ (VND/lần)</Label>
                <Input
                  type="number"
                  value={editing.expert_review_price_vnd}
                  onChange={(e) =>
                    setEditing({ ...editing, expert_review_price_vnd: Number(e.target.value) })
                  }
                  placeholder="499000"
                />
                <p className="text-xs text-muted-foreground">
                  Giá user trả khi mua lẻ 1 lần tư vấn (0 = miễn phí trong gói / không áp dụng)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Lưu báo cáo (ngày)</Label>
                  <Input
                    type="number"
                    placeholder="Để trống = vĩnh viễn"
                    value={editing.storage_days ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        storage_days: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Thứ tự hiển thị</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tính năng (mỗi dòng một tính năng)</Label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  value={featuresRaw}
                  onChange={(e) => setFeaturesRaw(e.target.value)}
                  placeholder="5 lượt AI/tháng&#10;Lưu báo cáo 60 ngày&#10;Xuất PDF"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Hiển thị gói</p>
                  <p className="text-xs text-muted-foreground">Bật để gói xuất hiện trên trang giá</p>
                </div>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(checked) => setEditing({ ...editing, is_active: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Huỷ
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
