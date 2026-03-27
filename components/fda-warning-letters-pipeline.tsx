"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
  FileText,
  Zap,
  Filter,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

// ====== Types ======

type ProductCategory = 'food' | 'drug' | 'cosmetic' | 'device' | 'tobacco' | 'veterinary' | 'biologics' | 'unknown'

interface PendingLetter {
  id: string
  letter_id: string
  company_name: string
  subject: string
  issue_date: string
  fda_url: string
  issuing_office: string
  product_type: ProductCategory | null
  extracted_content: string | null
  content_length: number
  status: string
  fetch_method: string
  fetched_at: string
  fetch_error: string | null
  review_notes: string | null
  violations_count: number
  import_result: any
  imported_at: string | null
  created_at: string
}

interface FetchLog {
  id: string
  run_at: string
  letters_found: number
  letters_new: number
  letters_skipped: number
  letters_failed: number
  fetch_source: string
  duration_ms: number
  error: string | null
  details: any
}

// ====== SWR Fetcher ======

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ====== Status Badge ======

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending_review: { variant: "outline", label: "Pending Review" },
    approved: { variant: "secondary", label: "Approved" },
    processing: { variant: "default", label: "Processing" },
    imported: { variant: "default", label: "Imported" },
    rejected: { variant: "destructive", label: "Rejected" },
    fetch_failed: { variant: "destructive", label: "Fetch Failed" },
  }
  const c = config[status] || { variant: "outline" as const, label: status }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

// ====== Product Type Badge ======

const CATEGORY_CONFIG: Record<ProductCategory, { label: string; className: string }> = {
  food:        { label: "Food",        className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  drug:        { label: "Drug",        className: "bg-blue-100 text-blue-800 border-blue-200" },
  cosmetic:    { label: "Cosmetic",    className: "bg-pink-100 text-pink-800 border-pink-200" },
  device:      { label: "Device",      className: "bg-violet-100 text-violet-800 border-violet-200" },
  tobacco:     { label: "Tobacco",     className: "bg-orange-100 text-orange-800 border-orange-200" },
  veterinary:  { label: "Veterinary",  className: "bg-amber-100 text-amber-800 border-amber-200" },
  biologics:   { label: "Biologics",   className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  unknown:     { label: "Unknown",     className: "bg-muted text-muted-foreground border-border" },
}

function ProductTypeBadge({ type }: { type: ProductCategory | null | undefined }) {
  const cat = (type ?? 'unknown') as ProductCategory
  const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.unknown
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ====== Main Component ======

export function FDAWarningLettersPipeline() {
  const [activeTab, setActiveTab] = useState<string>("pending_review")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewLetter, setPreviewLetter] = useState<PendingLetter | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set())
  const [showLogs, setShowLogs] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Fetch pending letters
  const { data: lettersData, error: lettersError, isLoading: lettersLoading } = useSWR(
    `/api/knowledge/pending-letters?status=${activeTab}&limit=50${categoryFilter !== "all" ? `&product_type=${categoryFilter}` : ""}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch logs
  const { data: logsData } = useSWR(
    showLogs ? "/api/knowledge/pending-letters/logs" : null,
    fetcher
  )

  const letters: PendingLetter[] = lettersData?.letters || []
  const statusCounts: Record<string, number> = lettersData?.status_counts || {}
  const logs: FetchLog[] = logsData?.logs || []

  // ====== Actions ======

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === letters.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(letters.map(l => l.id)))
    }
  }, [letters, selectedIds])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleBulkAction = useCallback(async (action: "approve" | "reject" | "retry_fetch" | "re_approve" | "delete") => {
    if (selectedIds.size === 0) return
    setIsProcessing(true)
    try {
      const res = await fetch("/api/knowledge/pending-letters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action,
          review_notes: reviewNotes || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setSelectedIds(new Set())
      setReviewNotes("")
      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-letters"))
      
      // Show success message for delete action
      if (action === "delete") {
        toast({ title: "Deleted", description: `Successfully deleted ${result.deleted || 0} letter(s)` })
      }
    } catch (err: any) {
      console.error("Bulk action error:", err)
      toast({ title: "Error", description: `Action failed: ${err.message}`, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }, [selectedIds, reviewNotes])

  const handleManualFetch = useCallback(async () => {
    setIsFetching(true)
    try {
      const res = await fetch("/api/cron/fetch-warning-letters", { method: "POST" })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-letters"))
      toast({ title: "Fetch complete", description: `Found: ${result.letters_found}, New: ${result.letters_new}, Failed: ${result.letters_failed}` })
    } catch (err: any) {
      console.error("Manual fetch error:", err)
      toast({ title: "Fetch failed", description: err.message, variant: "destructive" })
    } finally {
      setIsFetching(false)
    }
  }, [])

  const handleImportSingle = useCallback(async (letter: PendingLetter) => {
    if (!letter.extracted_content) {
      toast({ title: "Warning", description: "No content available for this letter", variant: "destructive" })
      return
    }

    setImportingIds(prev => new Set(prev).add(letter.id))
    try {
      const res = await fetch("/api/knowledge/pending-letters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter_id: letter.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-letters"))
    } catch (err: any) {
      console.error("Import error:", err)
      toast({ title: "Import failed", description: err.message, variant: "destructive" })
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev)
        next.delete(letter.id)
        return next
      })
    }
  }, [])

  const handleBulkImport = useCallback(async () => {
    const approvedIds = letters
      .filter(l => l.status === "approved" && selectedIds.has(l.id))
      .map(l => l.id)

    if (approvedIds.length === 0) {
      toast({ title: "Warning", description: "No approved letters selected for import", variant: "destructive" })
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch("/api/knowledge/pending-letters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter_ids: approvedIds }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setSelectedIds(new Set())
      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-letters"))
      toast({ title: "Import complete", description: `${result.imported} letters processed, ${result.total_violations} violations extracted.` })
    } catch (err: any) {
      console.error("Bulk import error:", err)
      toast({ title: "Bulk import failed", description: err.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }, [letters, selectedIds])

  // ====== Tab config ======

  const tabs = [
    { key: "pending_review", label: "Pending Review", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
    { key: "imported", label: "Imported", icon: Download },
    { key: "rejected", label: "Rejected", icon: XCircle },
    { key: "fetch_failed", label: "Failed", icon: AlertTriangle },
    { key: "all", label: "All", icon: FileText },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            FDA Warning Letters
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automated fetching and review of FDA Warning Letters for knowledge base import
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setSelectedIds(new Set()) }}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="drug">Drug</SelectItem>
              <SelectItem value="cosmetic">Cosmetic</SelectItem>
              <SelectItem value="device">Device</SelectItem>
              <SelectItem value="tobacco">Tobacco</SelectItem>
              <SelectItem value="veterinary">Veterinary</SelectItem>
              <SelectItem value="biologics">Biologics</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {showLogs ? "Hide" : "Show"} Fetch Logs
          </Button>
          {(statusCounts["approved"] || 0) > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (!confirm(`Import all ${statusCounts["approved"]} approved Warning Letters into the Knowledge Base?`)) return
                setIsProcessing(true)
                try {
                  // Fetch all approved letter IDs
                  const res = await fetch("/api/knowledge/pending-letters?status=approved&limit=200")
                  const data = await res.json()
                  const allApprovedIds = (data.letters || []).map((l: PendingLetter) => l.id)
                  if (allApprovedIds.length === 0) return
                  const importRes = await fetch("/api/knowledge/pending-letters/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ letter_ids: allApprovedIds }),
                  })
                  const result = await importRes.json()
                  if (!importRes.ok) throw new Error(result.error)
                  globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-letters"))
                  toast({ title: "Import complete", description: `${result.imported} letters processed, ${result.total_violations} violations extracted.` })
                } catch (err: any) {
                  toast({ title: "Import failed", description: err.message, variant: "destructive" })
                } finally {
                  setIsProcessing(false)
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Import All Approved ({statusCounts["approved"]})
            </Button>
          )}
          <Button
            onClick={handleManualFetch}
            disabled={isFetching}
            size="sm"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isFetching ? "Fetching from FDA..." : "Fetch Now"}
          </Button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tabs.map(tab => (
          <Card
            key={tab.key}
            className={`cursor-pointer transition-colors hover:border-foreground/30 ${
              activeTab === tab.key ? "border-foreground bg-muted/50" : ""
            }`}
            onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()) }}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <tab.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground leading-none">
                  {tab.key === "all"
                    ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                    : statusCounts[tab.key] || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{tab.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fetch Logs */}
      {showLogs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Fetch Logs</CardTitle>
            <CardDescription>History of automated and manual FDA fetch runs</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No fetch logs yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Found</TableHead>
                    <TableHead>New</TableHead>
                    <TableHead>Skipped</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.run_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.letters_found}</TableCell>
                      <TableCell className="font-medium">{log.letters_new}</TableCell>
                      <TableCell>{log.letters_skipped}</TableCell>
                      <TableCell>{log.letters_failed}</TableCell>
                      <TableCell>{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "-"}</TableCell>
                      <TableCell>
                        {log.error ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-foreground/20 bg-muted/30">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} letter{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              {activeTab === "pending_review" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("reject")}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction("approve")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                </>
              )}
              {activeTab === "approved" && (
                <Button
                  size="sm"
                  onClick={handleBulkImport}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1" />
                  )}
                  Import to Knowledge Base
                </Button>
              )}
              {activeTab === "fetch_failed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("retry_fetch")}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry Fetch
                </Button>
              )}
              {activeTab === "rejected" && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete ${selectedIds.size} letter(s)? This action cannot be undone.`)) {
                        handleBulkAction("delete")
                      }
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction("re_approve")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Re-approve
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Letters Table */}
      <Card>
        <CardContent className="p-0">
          {lettersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading letters...</span>
            </div>
          ) : lettersError ? (
            <div className="flex items-center justify-center py-12 text-sm text-destructive">
              Failed to load letters. Please try again.
            </div>
          ) : letters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No letters with status &quot;{activeTab.replace("_", " ")}&quot;
              </p>
              {activeTab === "pending_review" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualFetch}
                  disabled={isFetching}
                  className="mt-2 bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Fetch from FDA
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === letters.length && letters.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {letters.map(letter => (
                  <TableRow key={letter.id} className={selectedIds.has(letter.id) ? "bg-muted/30" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(letter.id)}
                        onChange={() => handleToggleSelect(letter.id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm text-foreground truncate max-w-[250px]">
                          {letter.company_name}
                        </span>
                        {letter.subject && letter.subject !== letter.company_name && (
                          <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {letter.subject}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {letter.issue_date ? new Date(letter.issue_date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <ProductTypeBadge type={letter.product_type} />
                        {letter.issuing_office && letter.issuing_office !== "Unknown" && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {letter.issuing_office}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {letter.content_length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {(letter.content_length / 1000).toFixed(1)}k chars
                        </span>
                      ) : (
                        <span className="text-sm text-destructive">No content</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={letter.status} />
                      {letter.violations_count > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {letter.violations_count} violations
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewLetter(letter)}
                          title="Preview content"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a
                          href={letter.fda_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open on FDA.gov"
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                        {letter.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleImportSingle(letter)}
                            disabled={importingIds.has(letter.id)}
                            title="Import to Knowledge Base"
                          >
                            {importingIds.has(letter.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewLetter} onOpenChange={() => setPreviewLetter(null)}>
        {previewLetter && (
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {previewLetter.company_name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <span>{previewLetter.letter_id}</span>
                <span>-</span>
                <span>{previewLetter.issue_date}</span>
                <span>-</span>
                <ProductTypeBadge type={previewLetter.product_type} />
                <span>-</span>
                <StatusBadge status={previewLetter.status} />
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto rounded border border-border bg-muted/20 p-4">
              {previewLetter.extracted_content ? (
                <pre className="text-sm whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                  {previewLetter.extracted_content}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <p className="text-sm text-muted-foreground">No content available</p>
                  {previewLetter.fetch_error && (
                    <p className="text-xs text-destructive">{previewLetter.fetch_error}</p>
                  )}
                </div>
              )}
            </div>

            {previewLetter.status === "pending_review" && (
              <div className="flex flex-col gap-3 pt-2">
                <Textarea
                  placeholder="Review notes (optional)..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="min-h-[60px]"
                />
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await handleBulkAction("reject")
                      setSelectedIds(new Set([previewLetter.id]))
                      setPreviewLetter(null)
                    }}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    onClick={async () => {
                      setSelectedIds(new Set([previewLetter.id]))
                      await handleBulkAction("approve")
                      setPreviewLetter(null)
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                </DialogFooter>
              </div>
            )}

            {previewLetter.status === "approved" && (
              <DialogFooter>
                <Button
                  onClick={() => {
                    handleImportSingle(previewLetter)
                    setPreviewLetter(null)
                  }}
                  disabled={importingIds.has(previewLetter.id)}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Import to Knowledge Base
                </Button>
              </DialogFooter>
            )}

            {previewLetter.status === "rejected" && (
              <div className="flex flex-col gap-3 pt-2">
                <Textarea
                  placeholder="Review notes (optional)..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="min-h-[60px]"
                />
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to permanently delete this letter? This action cannot be undone.')) {
                        setSelectedIds(new Set([previewLetter.id]))
                        handleBulkAction("delete")
                        setPreviewLetter(null)
                      }
                    }}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    onClick={async () => {
                      setSelectedIds(new Set([previewLetter.id]))
                      await handleBulkAction("re_approve")
                      setPreviewLetter(null)
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Re-approve
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
