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
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
  FileText,
  Zap,
  ShieldAlert,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

// ====== Types ======

interface PendingRecall {
  id: string
  recall_number: string
  product_description: string
  recalling_firm: string
  reason_for_recall: string
  recall_initiation_date: string | null
  termination_date: string | null
  recall_type: string | null
  voluntary_mandated: string | null
  classification: string | null
  product_type: string
  product_quantity: string | null
  distribution_pattern: string | null
  state: string | null
  country: string | null
  openfda_url: string | null
  extracted_content: string | null
  content_length: number
  status: string
  fetch_method: string
  fetch_error: string | null
  review_notes: string | null
  violations_count: number
  import_result: any
  imported_at: string | null
  fetched_at: string
  created_at: string
}

interface RecallFetchLog {
  id: string
  run_at: string
  product_type: string | null
  recalls_found: number
  recalls_new: number
  recalls_skipped: number
  recalls_failed: number
  fetch_source: string
  duration_ms: number
  error: string | null
  details: any
}

// ====== SWR Fetcher ======

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ====== Classification Badge ======

function ClassBadge({ classification }: { classification: string | null }) {
  if (!classification) return <span className="text-xs text-muted-foreground">-</span>
  const config: Record<string, { variant: "destructive" | "default" | "secondary"; label: string }> = {
    "Class I": { variant: "destructive", label: "Class I" },
    "Class II": { variant: "default", label: "Class II" },
    "Class III": { variant: "secondary", label: "Class III" },
  }
  const c = config[classification] || { variant: "secondary" as const, label: classification }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending_review: { variant: "outline", label: "Pending Review" },
    approved: { variant: "secondary", label: "Approved" },
    processing: { variant: "default", label: "Processing" },
    imported: { variant: "default", label: "Imported" },
    rejected: { variant: "destructive", label: "Rejected" },
    failed: { variant: "destructive", label: "Failed" },
  }
  const c = config[status] || { variant: "outline" as const, label: status }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

function ProductTypeBadge({ type }: { type: string }) {
  const config: Record<string, { className: string; label: string }> = {
    food: { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", label: "Food" },
    drug: { className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20", label: "Drug" },
    device: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", label: "Device" },
    cosmetic: { className: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20", label: "Cosmetic" },
  }
  const c = config[type] || { className: "", label: type }
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  )
}

// ====== Main Component ======

export function FDARecallsPipeline() {
  const [activeTab, setActiveTab] = useState<string>("pending_review")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewRecall, setPreviewRecall] = useState<PendingRecall | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set())
  const [showLogs, setShowLogs] = useState(false)
  const [filterProductType, setFilterProductType] = useState("all")
  const [filterClassification, setFilterClassification] = useState("all")

  // Fetch pending recalls
  const apiUrl = `/api/knowledge/pending-recalls?status=${activeTab}&product_type=${filterProductType}&classification=${filterClassification}&limit=50`
  const { data: recallsData, error: recallsError, isLoading: recallsLoading } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch logs
  const { data: logsData } = useSWR(
    showLogs ? "/api/knowledge/pending-recalls/logs" : null,
    fetcher
  )

  const recalls: PendingRecall[] = recallsData?.recalls || []
  const statusCounts: Record<string, number> = recallsData?.status_counts || {}
  const typeCounts: Record<string, number> = recallsData?.type_counts || {}
  const classCounts: Record<string, number> = recallsData?.class_counts || {}
  const logs: RecallFetchLog[] = logsData?.logs || []

  // ====== Actions ======

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === recalls.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(recalls.map(r => r.id)))
    }
  }, [recalls, selectedIds])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBulkAction = useCallback(async (action: "approve" | "reject" | "re_approve" | "delete") => {
    if (selectedIds.size === 0) return
    setIsProcessing(true)
    try {
      const res = await fetch("/api/knowledge/pending-recalls", {
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
      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-recalls"))

      if (action === "delete") {
        toast({ title: "Deleted", description: `Successfully deleted ${result.deleted || 0} recall(s)` })
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
      const res = await fetch("/api/cron/fetch-recalls", { method: "POST" })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-recalls"))
      toast({ title: "Fetch complete", description: `Found: ${result.recalls_found}, New: ${result.recalls_new}, Failed: ${result.recalls_failed}` })
    } catch (err: any) {
      console.error("Manual fetch error:", err)
      toast({ title: "Fetch failed", description: err.message, variant: "destructive" })
    } finally {
      setIsFetching(false)
    }
  }, [])

  const handleImportSingle = useCallback(async (recall: PendingRecall) => {
    if (!recall.extracted_content) {
      toast({ title: "Warning", description: "No content available for this recall", variant: "destructive" })
      return
    }

    setImportingIds(prev => new Set(prev).add(recall.id))
    try {
      const res = await fetch("/api/knowledge/pending-recalls/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recall_id: recall.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-recalls"))
    } catch (err: any) {
      console.error("Import error:", err)
      toast({ title: "Import failed", description: err.message, variant: "destructive" })
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev)
        next.delete(recall.id)
        return next
      })
    }
  }, [])

  const handleBulkImport = useCallback(async () => {
    const approvedIds = recalls
      .filter(r => r.status === "approved" && selectedIds.has(r.id))
      .map(r => r.id)

    if (approvedIds.length === 0) {
      toast({ title: "Warning", description: "No approved recalls selected for import", variant: "destructive" })
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch("/api/knowledge/pending-recalls/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recall_ids: approvedIds }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setSelectedIds(new Set())
      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-recalls"))
      toast({ title: "Import complete", description: `${result.imported} recalls processed, ${result.total_lessons} lessons extracted.` })
    } catch (err: any) {
      console.error("Bulk import error:", err)
      toast({ title: "Bulk import failed", description: err.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }, [recalls, selectedIds])

  // ====== Tab config ======

  const tabs = [
    { key: "pending_review", label: "Pending Review", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
    { key: "imported", label: "Imported", icon: Download },
    { key: "rejected", label: "Rejected", icon: XCircle },
    { key: "failed", label: "Failed", icon: AlertTriangle },
    { key: "all", label: "All", icon: ShieldAlert },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            FDA Recalls (openFDA)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automated fetching of FDA Enforcement Reports from openFDA API for food, drug, and device recalls
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                if (!confirm(`Import all ${statusCounts["approved"]} approved Recalls into the Knowledge Base?`)) return
                setIsProcessing(true)
                try {
                  // Fetch all approved recall IDs
                  const res = await fetch("/api/knowledge/pending-recalls?status=approved&product_type=all&classification=all&limit=200")
                  const data = await res.json()
                  const allApprovedIds = (data.recalls || []).map((r: PendingRecall) => r.id)
                  if (allApprovedIds.length === 0) return
                  const importRes = await fetch("/api/knowledge/pending-recalls/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ recall_ids: allApprovedIds }),
                  })
                  const result = await importRes.json()
                  if (!importRes.ok) throw new Error(result.error)
                  globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-recalls"))
                  toast({ title: "Import complete", description: `${result.imported} recalls processed, ${result.total_lessons} lessons extracted.` })
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
            {isFetching ? "Fetching from openFDA..." : "Fetch Now"}
          </Button>
        </div>
      </div>

      {/* Type/Class Summary */}
      {(Object.keys(typeCounts).length > 0 || Object.keys(classCounts).length > 0) && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {Object.entries(typeCounts).map(([type, count]) => (
            <span key={type} className="flex items-center gap-1.5">
              <ProductTypeBadge type={type} />
              <span>{count}</span>
            </span>
          ))}
          <span className="text-border">|</span>
          {Object.entries(classCounts).map(([cls, count]) => (
            <span key={cls} className="flex items-center gap-1.5">
              <ClassBadge classification={cls} />
              <span>{count}</span>
            </span>
          ))}
        </div>
      )}

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

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterProductType} onValueChange={setFilterProductType}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Product type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="drug">Drug</SelectItem>
            <SelectItem value="device">Device</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClassification} onValueChange={setFilterClassification}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Classification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="Class I">Class I</SelectItem>
            <SelectItem value="Class II">Class II</SelectItem>
            <SelectItem value="Class III">Class III</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fetch Logs */}
      {showLogs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Fetch Logs</CardTitle>
            <CardDescription>History of automated and manual openFDA fetch runs</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No fetch logs yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
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
                      <TableCell className="text-sm">{log.product_type || "all"}</TableCell>
                      <TableCell>{log.recalls_found}</TableCell>
                      <TableCell className="font-medium">{log.recalls_new}</TableCell>
                      <TableCell>{log.recalls_skipped}</TableCell>
                      <TableCell>{log.recalls_failed}</TableCell>
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
              {selectedIds.size} recall{selectedIds.size > 1 ? "s" : ""} selected
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
              {activeTab === "rejected" && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete ${selectedIds.size} recall(s)? This action cannot be undone.`)) {
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

      {/* Recalls Table */}
      <Card>
        <CardContent className="p-0">
          {recallsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading recalls...</span>
            </div>
          ) : recallsError ? (
            <div className="flex items-center justify-center py-12 text-sm text-destructive">
              Failed to load recalls. Please try again.
            </div>
          ) : recalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No recalls with status &quot;{activeTab.replace("_", " ")}&quot;
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
                  Fetch from openFDA
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
                      checked={selectedIds.size === recalls.length && recalls.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </TableHead>
                  <TableHead>Recall #</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recalls.map(recall => (
                  <TableRow key={recall.id} className={selectedIds.has(recall.id) ? "bg-muted/30" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(recall.id)}
                        onChange={() => handleToggleSelect(recall.id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground">{recall.recall_number}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
                          {recall.recalling_firm}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {recall.reason_for_recall.slice(0, 80)}{recall.reason_for_recall.length > 80 ? "..." : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProductTypeBadge type={recall.product_type} />
                    </TableCell>
                    <TableCell>
                      <ClassBadge classification={recall.classification} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {recall.recall_initiation_date
                        ? new Date(recall.recall_initiation_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={recall.status} />
                      {recall.violations_count > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {recall.violations_count} lessons
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewRecall(recall)}
                          title="Preview content"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {recall.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleImportSingle(recall)}
                            disabled={importingIds.has(recall.id)}
                            title="Import to Knowledge Base"
                          >
                            {importingIds.has(recall.id) ? (
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
      <Dialog open={!!previewRecall} onOpenChange={() => setPreviewRecall(null)}>
        {previewRecall && (
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                {previewRecall.recalling_firm}
                <ClassBadge classification={previewRecall.classification} />
                <ProductTypeBadge type={previewRecall.product_type} />
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <span className="font-mono">{previewRecall.recall_number}</span>
                <span>-</span>
                <span>{previewRecall.recall_initiation_date || "Unknown date"}</span>
                <span>-</span>
                <StatusBadge status={previewRecall.status} />
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto rounded border border-border bg-muted/20 p-4">
              {previewRecall.extracted_content ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Product</h4>
                    <p className="text-sm text-foreground">{previewRecall.product_description}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reason for Recall</h4>
                    <p className="text-sm text-foreground">{previewRecall.reason_for_recall}</p>
                  </div>
                  {previewRecall.distribution_pattern && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Distribution</h4>
                      <p className="text-sm text-foreground">{previewRecall.distribution_pattern}</p>
                    </div>
                  )}
                  {previewRecall.product_quantity && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Quantity</h4>
                      <p className="text-sm text-foreground">{previewRecall.product_quantity}</p>
                    </div>
                  )}
                  <hr className="border-border" />
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Extracted Content</h4>
                    <pre className="text-sm whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                      {previewRecall.extracted_content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <p className="text-sm text-muted-foreground">No content available</p>
                  {previewRecall.fetch_error && (
                    <p className="text-xs text-destructive">{previewRecall.fetch_error}</p>
                  )}
                </div>
              )}
            </div>

            {previewRecall.status === "pending_review" && (
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
                      setSelectedIds(new Set([previewRecall.id]))
                      await handleBulkAction("reject")
                      setPreviewRecall(null)
                    }}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    onClick={async () => {
                      setSelectedIds(new Set([previewRecall.id]))
                      await handleBulkAction("approve")
                      setPreviewRecall(null)
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

            {previewRecall.status === "approved" && (
              <DialogFooter>
                <Button
                  onClick={() => {
                    handleImportSingle(previewRecall)
                    setPreviewRecall(null)
                  }}
                  disabled={importingIds.has(previewRecall.id)}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Import to Knowledge Base
                </Button>
              </DialogFooter>
            )}

            {previewRecall.status === "rejected" && (
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
                      if (confirm('Are you sure you want to permanently delete this recall? This action cannot be undone.')) {
                        setSelectedIds(new Set([previewRecall.id]))
                        handleBulkAction("delete")
                        setPreviewRecall(null)
                      }
                    }}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    onClick={async () => {
                      setSelectedIds(new Set([previewRecall.id]))
                      await handleBulkAction("re_approve")
                      setPreviewRecall(null)
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
