'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileText,
  Search,
  Filter,
  Trash2,
  Edit,
  Save,
  X,
  BookOpen,
  Database,
  Tag,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppHeader } from '@/components/app-header'
import { CfrDiffViewer } from '@/components/cfr-diff-viewer'
import { EcfrSyncPanel } from '@/components/ecfr-sync-panel'
import { toast } from '@/hooks/use-toast'

interface KnowledgeEntry {
  id: string
  content: string
  metadata: {
    industry?: string
    doc_type?: string
    section?: string
    severity?: string
    source?: string
    title?: string
  }
  created_at: string
}

interface Props {
  userId: string
  userRole: string
  userEmail?: string
}

const INDUSTRIES = [
  'Beverage',
  'Supplement',
  'Meat',
  'Dairy',
  'Seafood',
  'Bakery',
  'Cosmetics',
  'General',
]

const DOC_TYPES = [
  'CFR_Law',
  'FDA_Guidance',
  'Internal_Checklist',
  'Case_Study',
  'Best_Practice',
]

const SEVERITIES = ['Critical', 'Warning', 'Info']

export function KnowledgeManagement({ userId, userRole, userEmail }: Props) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterIndustry, setFilterIndustry] = useState<string>('all')
  const [filterDocType, setFilterDocType] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [groupBy, setGroupBy] = useState<'none' | 'section' | 'source'>('section')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updateResults, setUpdateResults] = useState<any>(null)
  const [showUpdatePanel, setShowUpdatePanel] = useState(false)
  const [diffPart, setDiffPart] = useState<string | null>(null)
  const [importingParts, setImportingParts] = useState<Set<string>>(new Set())
  const [bulkImporting, setBulkImporting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    industry: '',
    docType: '',
    section: '',
    severity: '',
    source: '',
  })

  const supabase = createClient()

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('compliance_knowledge')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setEntries(data)
    }
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!formData.content || !formData.title) {
      toast({ title: 'Thieu thong tin', description: 'Vui long nhap tieu de va noi dung', variant: 'destructive' })
      return
    }

    setUploading(true)

    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          metadata: {
            title: formData.title,
            industry: formData.industry || 'General',
            doc_type: formData.docType || 'Internal_Checklist',
            section: formData.section,
            severity: formData.severity || 'Info',
            source: formData.source || 'Internal',
          },
        }),
      })

      if (response.ok) {
        toast({ title: 'Thanh cong', description: 'Tai len thanh cong!' })
        setShowUploadForm(false)
        setFormData({
          title: '',
          content: '',
          industry: '',
          docType: '',
          section: '',
          severity: '',
          source: '',
        })
        loadEntries()
      } else {
        toast({ title: 'Loi', description: 'Loi khi tai len', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Loi', description: 'Loi khi tai len', variant: 'destructive' })
    }

    setUploading(false)
  }

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true)
    setShowUpdatePanel(true)
    try {
      const response = await fetch('/api/knowledge/check-updates')
      const data = await response.json()
      if (data.success) {
        setUpdateResults(data)
        toast({
          title: 'Kiem tra hoan tat',
          description: `${data.needs_update} / ${data.total_parts} parts can cap nhat`,
        })
      } else {
        toast({ title: 'Loi', description: data.error, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: 'Loi', description: error.message, variant: 'destructive' })
    }
    setCheckingUpdates(false)
  }

  // Upload one or more JSON files generated by fetch-ecfr-to-json.mjs
  const handleImportJsonFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBulkImporting(true)
    let successCount = 0
    let errorCount = 0

    for (const file of Array.from(files)) {
      // Extract part number from filename e.g. 21cfr101.json → "101"
      const partMatch = file.name.match(/(\d+)\.json$/i)
      const partNum = partMatch?.[1] ?? file.name

      setImportingParts(prev => new Set(prev).add(partNum))
      try {
        const text = await file.text()
        const json = JSON.parse(text)

        const response = await fetch('/api/knowledge/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...json, fileName: file.name }),
        })
        const data = await response.json()
        if (response.ok && data.success) {
          successCount++
        } else {
          errorCount++
          console.error(`[v0] Import failed for ${file.name}:`, data.error)
        }
      } catch (err: any) {
        errorCount++
        console.error(`[v0] Parse/upload error for ${file.name}:`, err.message)
      } finally {
        setImportingParts(prev => {
          const next = new Set(prev)
          next.delete(partNum)
          return next
        })
      }
    }

    setBulkImporting(false)
    toast({
      title: successCount > 0 ? 'Import hoan tat' : 'Import that bai',
      description: `${successCount} file thanh cong${errorCount > 0 ? `, ${errorCount} loi` : ''}. Dang tai lai danh sach...`,
      variant: errorCount > 0 && successCount === 0 ? 'destructive' : 'default',
    })
    if (successCount > 0) {
      loadEntries()
      // Re-run check so panel refreshes to green
      handleCheckUpdates()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa mục này?')) return

    const { error } = await supabase.from('compliance_knowledge').delete().eq('id', id)

    if (!error) {
      loadEntries()
    }
  }

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchQuery === '' ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.metadata.title?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesIndustry =
      filterIndustry === 'all' || entry.metadata.industry === filterIndustry

    const matchesDocType =
      filterDocType === 'all' || entry.metadata.doc_type === filterDocType

    return matchesSearch && matchesIndustry && matchesDocType
  })

  // Group entries by section or source
  const groupedEntries = () => {
    if (groupBy === 'none') {
      return { 'all': filteredEntries }
    }
    
    const groups: Record<string, KnowledgeEntry[]> = {}
    
    for (const entry of filteredEntries) {
      const key = groupBy === 'section' 
        ? (entry.metadata.section || 'Không có section')
        : (entry.metadata.source || 'Không có nguồn')
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(entry)
    }
    
    return groups
  }

  const groups = groupedEntries()
  const groupKeys = Object.keys(groups).sort()
  
  // Pagination for groups
  const ITEMS_PER_PAGE = 20
  const totalPages = Math.ceil(groupKeys.length / ITEMS_PER_PAGE)
  const paginatedGroupKeys = groupKeys.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const isAdmin = ['admin', 'superadmin', 'expert'].includes(userRole)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={userEmail} isAdmin={isAdmin} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Quản lý Tri thức (Knowledge Base)</h1>
              <p className="text-sm text-muted-foreground">
                Nạp và quản lý tài liệu luật, checklist cho hệ thống AI
              </p>
            </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCheckUpdates}
              disabled={checkingUpdates}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
              {checkingUpdates ? 'Dang kiem tra...' : 'Kiem tra cap nhat FDA'}
            </Button>
            <Link href="/admin/knowledge/fda-pipeline">
              <Button variant="outline">
                <AlertTriangle className="h-4 w-4 mr-2" />
                FDA Warning Letters Pipeline
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (!confirm(`Bạn có chắc muốn XÓA TẤT CẢ ${entries.length} records?\n\nHành động này KHÔNG THỂ hoàn tác!`)) {
                  return
                }
                try {
                  const response = await fetch('/api/knowledge/bulk-delete', {
                    method: 'DELETE',
                  })
                  const data = await response.json()
                  if (data.success) {
                    toast({ title: 'Thanh cong', description: `Da xoa thanh cong ${data.deleted_count} records!` })
                    window.location.reload()
                  } else {
                    toast({ title: 'Loi', description: 'Loi: ' + data.error, variant: 'destructive' })
                  }
                } catch (error: any) {
                  toast({ title: 'Loi', description: 'Loi: ' + error.message, variant: 'destructive' })
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa tất cả
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/knowledge/re-import">
                <Upload className="mr-2 h-4 w-4" />
                Re-Import (Tối ưu)
              </a>
            </Button>
            <Button onClick={() => setShowUploadForm(!showUploadForm)}>
              {showUploadForm ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Hủy
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Nạp tài liệu mới
                </>
              )}
            </Button>
          </div>
        </div>

        {showUploadForm && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Tải lên tài liệu mới</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tiêu đề tài liệu *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: FDA Guidance on Nutrition Labeling"
                />
              </div>

              <div>
                <Label>Nhóm ngành</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngành" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Loại tài liệu</Label>
                <Select
                  value={formData.docType}
                  onValueChange={(value) => setFormData({ ...formData, docType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mức độ nghiêm trọng</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((sev) => (
                      <SelectItem key={sev} value={sev}>
                        {sev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Số hiệu điều khoản (Section)</Label>
                <Input
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="VD: 21 CFR 101.9"
                />
              </div>

              <div>
                <Label>Nguồn</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="VD: FDA.gov"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Nội dung *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập nội dung tài liệu luật hoặc checklist..."
                  rows={8}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Đang tải lên...' : 'Tải lên và Embedding'}
              </Button>
            </div>
          </Card>
        )}

        {/* Auto-sync from eCFR API — no local script needed */}
        <EcfrSyncPanel onComplete={() => { loadEntries(); handleCheckUpdates() }} />

        {/* Version Check Results Panel */}
        {showUpdatePanel && updateResults && (() => {
          const notImported = updateResults.parts?.filter((p: any) => p.dbChunkCount === 0) ?? []
          const needsRefresh = updateResults.parts?.filter((p: any) => p.needsUpdate && p.dbChunkCount > 0) ?? []
          const upToDate = updateResults.parts?.filter((p: any) => !p.needsUpdate) ?? []
          return (
            <Card className="p-6 mb-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold">Kiem tra phien ban CFR</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    So sanh du lieu trong DB voi phien ban moi nhat tren eCFR.gov
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notImported.length > 0 && (
                    <Badge variant="destructive">{notImported.length} chua import</Badge>
                  )}
                  {needsRefresh.length > 0 && (
                    <Badge variant="outline" className="border-orange-400 text-orange-600">{needsRefresh.length} can cap nhat</Badge>
                  )}
                  {upToDate.length > 0 && (
                    <Badge variant="outline" className="border-green-500 text-green-700">{upToDate.length} da moi nhat</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowUpdatePanel(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Section A: Not imported yet */}
              {notImported.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-destructive/20" />
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                      Chua co trong Database ({notImported.length} parts)
                    </span>
                    <div className="h-px flex-1 bg-destructive/20" />
                  </div>

                  {/* Upload instruction box */}
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 mb-3">
                    <p className="text-sm font-medium mb-1">
                      Ban da chay script thanh cong tren may local. De import vao he thong:
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside mb-3">
                      <li>Mo thu muc <code className="font-mono bg-background px-1 rounded text-xs">scripts/output/</code> tren may tinh cua ban</li>
                      <li>Chon cac file JSON can import (co the chon nhieu file cung luc)</li>
                      <li>Nhan nut upload phia duoi — he thong se tu dong xu ly</li>
                    </ol>
                    <label className="cursor-pointer inline-flex">
                      <input
                        type="file"
                        accept=".json"
                        multiple
                        className="sr-only"
                        disabled={bulkImporting}
                        onChange={(e) => handleImportJsonFiles(e.target.files)}
                      />
                      <Button
                        variant="default"
                        size="sm"
                        disabled={bulkImporting}
                        className="pointer-events-none"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {bulkImporting ? 'Dang import...' : 'Chon file JSON de import'}
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Chon nhieu file cung luc (Ctrl+Click / Cmd+Click) de import theo lo.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {notImported.map((p: any) => (
                      <div
                        key={p.part}
                        className="flex items-center gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5"
                      >
                        {importingParts.has(p.part) ? (
                          <RefreshCw className="h-3.5 w-3.5 text-destructive animate-spin shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <span className="text-sm font-medium">Part {p.part}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section B: Needs refresh (has data but outdated) */}
              {needsRefresh.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-orange-300" />
                    <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                      Can cap nhat ({needsRefresh.length} parts)
                    </span>
                    <div className="h-px flex-1 bg-orange-300" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {needsRefresh.map((p: any) => (
                      <div
                        key={p.part}
                        className="flex items-center gap-3 p-3 rounded-lg border border-orange-300 bg-orange-50"
                      >
                        <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">Part {p.part}</div>
                          <div className="text-xs text-muted-foreground">{p.reason}</div>
                          <div className="text-xs text-muted-foreground">{p.dbChunkCount} chunks trong DB</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-7 text-xs border-orange-300 text-orange-600 hover:bg-orange-100"
                          onClick={() => setDiffPart(p.part)}
                        >
                          Xem thay doi
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section C: Up to date */}
              {upToDate.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-green-200" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Da moi nhat ({upToDate.length} parts)
                    </span>
                    <div className="h-px flex-1 bg-green-200" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {upToDate.map((p: any) => (
                      <div
                        key={p.part}
                        className="flex items-center gap-2 p-2 rounded-lg border border-green-200 bg-green-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span className="text-sm font-medium text-green-800">Part {p.part}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CLI command hint for refresh */}
              {(notImported.length > 0 || needsRefresh.length > 0) && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Neu chua chay script, chay lenh nay tren may local de tao cac file JSON:
                  </p>
                  <code className="text-xs bg-background p-2 rounded block font-mono break-all">
                    node scripts/fetch-ecfr-to-json.mjs{' '}
                    {[...notImported, ...needsRefresh].map((p: any) => p.part).join(' ')}
                  </code>
                </div>
              )}
            </Card>
          )
        })()}

        {/* Filters and Grouping */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm trong nội dung..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterIndustry} onValueChange={setFilterIndustry}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Lọc theo ngành" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ngành</SelectItem>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDocType} onValueChange={setFilterDocType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Loại tài liệu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Gom theo:</Label>
            <Select value={groupBy} onValueChange={(val) => { 
              setGroupBy(val as 'none' | 'section' | 'source')
              setCurrentPage(1)
              setExpandedGroups(new Set())
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="section">Section/Chapter</SelectItem>
                <SelectItem value="source">Nguồn</SelectItem>
                <SelectItem value="none">Không gom nhóm</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              Tổng: {filteredEntries.length} records | {groupKeys.length} nhóm
            </Badge>
          </div>
        </div>
      </div>

      {/* Knowledge Entries List with Grouping */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
        ) : filteredEntries.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterIndustry !== 'all' || filterDocType !== 'all'
                ? 'Không tìm thấy kết quả phù hợp'
                : 'Chưa có tài liệu nào. Hãy tải lên tài liệu đầu tiên!'}
            </p>
          </Card>
        ) : groupBy === 'none' ? (
          // No grouping - show flat list with pagination
          <>
            {filteredEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((entry) => (
              <Card key={entry.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">
                        {entry.metadata.title || 'Không có tiêu đề'}
                      </h3>
                    </div>
                    <div className="flex gap-2 mb-3">
                      {entry.metadata.industry && (
                        <Badge variant="outline">{entry.metadata.industry}</Badge>
                      )}
                      {entry.metadata.doc_type && (
                        <Badge variant="secondary">{entry.metadata.doc_type}</Badge>
                      )}
                      {entry.metadata.section && (
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {entry.metadata.section}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                  {entry.content.slice(0, 300)}
                  {entry.content.length > 300 && '...'}
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Nguồn: {entry.metadata.source || 'N/A'} | Tạo lúc:{' '}
                  {new Date(entry.created_at).toLocaleString('vi-VN')}
                </div>
              </Card>
            ))}
          </>
        ) : (
          // Grouped display
          paginatedGroupKeys.map((groupKey) => {
            const groupEntries = groups[groupKey]
            const isExpanded = expandedGroups.has(groupKey)
            
            return (
              <Card key={groupKey} className="overflow-hidden">
                <div 
                  className="p-4 bg-muted/50 cursor-pointer hover:bg-muted flex items-center justify-between"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{groupKey}</h3>
                      <p className="text-sm text-muted-foreground">
                        {groupEntries.length} records
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                  </Button>
                </div>
                
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {groupEntries.map((entry) => (
                      <div key={entry.id} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-primary" />
                              <h4 className="font-medium text-sm">
                                {entry.metadata.title || 'Không có tiêu đề'}
                              </h4>
                            </div>
                            <div className="flex gap-2 mb-2">
                              {entry.metadata.industry && (
                                <Badge variant="outline" className="text-xs">{entry.metadata.industry}</Badge>
                              )}
                              {entry.metadata.doc_type && (
                                <Badge variant="secondary" className="text-xs">{entry.metadata.doc_type}</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                          {entry.content.slice(0, 200)}
                          {entry.content.length > 200 && '...'}
                        </div>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Trước
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}
              {totalPages > 5 && <span className="text-muted-foreground">...</span>}
              {totalPages > 5 && (
                <Button
                  variant={currentPage === totalPages ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Sau
            </Button>
          </div>
        )}
      </div>

      {/* CFR Diff Viewer Dialog */}
      <CfrDiffViewer
        open={diffPart !== null}
        onClose={() => setDiffPart(null)}
        partNumber={diffPart || ''}
      />
    </div>
    </div>
  )
}
