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
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Ship,
  XCircle,
} from "lucide-react"

// ====== Types ======

interface PendingImportAlert {
  id: string
  alert_number: string
  alert_title: string
  industry_type: string
  reason_for_alert: string
  action_type: string
  red_list_entities: { name: string; is_active?: boolean; country?: string }[]
  effective_date: string | null
  last_updated_date: string | null
  extracted_content: string | null
  source_url: string | null
  status: string
  fetch_method: string | null
  fetch_error: string | null
  review_notes: string | null
  reviewed_at: string | null
  fetched_at: string
  created_at: string
}

interface ImportAlertFetchLog {
  id: string
  run_at: string
  alerts_found: number
  alerts_new: number
  alerts_updated: number
  alerts_failed: number
  fetch_source: string
  duration_ms: number | null
  error: string | null
}

// ====== SWR Fetcher ======

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ====== Sub-components ======

function IndustryBadge({ type }: { type: string }) {
  const config: Record<string, { className: string; label: string }> = {
    food:                 { className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", label: "Food" },
    drug:                 { className: "bg-blue-500/10 text-blue-700 border-blue-500/20", label: "Drug" },
    device:               { className: "bg-amber-500/10 text-amber-700 border-amber-500/20", label: "Device" },
    cosmetic:             { className: "bg-pink-500/10 text-pink-700 border-pink-500/20", label: "Cosmetic" },
    "dietary-supplement": { className: "bg-purple-500/10 text-purple-700 border-purple-500/20", label: "Dietary Supp." },
  }
  const c = config[type] || { className: "bg-slate-100 text-slate-700", label: type }
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>
}

function ActionTypeBadge({ type }: { type: string }) {
  if (type === "DWPE") return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">DWPE</Badge>
  if (type === "Automatic Detention") return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">Auto Detention</Badge>
  return <Badge variant="secondary">{type}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending_review: { variant: "outline", label: "Pending Review" },
    approved:       { variant: "secondary", label: "Approved" },
    rejected:       { variant: "destructive", label: "Rejected" },
    failed:         { variant: "destructive", label: "Failed" },
  }
  const c = config[status] || { variant: "outline" as const, label: status }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

// ====== Main Component ======

export function FDAImportAlertsPipeline() {
  const [activeStatus, setActiveStatus] = useState<string>("pending_review")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewAlert, setPreviewAlert] = useState<PendingImportAlert | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [filterIndustry, setFilterIndustry] = useState("all")
  const [filterAction, setFilterAction] = useState("all")

  const apiUrl = `/api/knowledge/pending-import-alerts?status=${activeStatus}&industry_type=${filterIndustry}&action_type=${filterAction}&limit=50`
  const { data, isLoading } = useSWR(apiUrl, fetcher, { refreshInterval: 30000 })

  const { data: logsData } = useSWR(
    showLogs ? "/api/knowledge/pending-import-alerts/logs" : null,
    fetcher
  )

  const alerts: PendingImportAlert[] = data?.alerts || []
  const statusCounts: Record<string, number> = data?.status_counts || {}
  const logs: ImportAlertFetchLog[] = logsData?.logs || []

  // ====== Selection ======

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === alerts.length ? new Set() : new Set(alerts.map(a => a.id))
    )
  }, [alerts])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // ====== Actions ======

  const handleBulkAction = useCallback(async (action: "approve" | "reject" | "re_approve" | "delete") => {
    if (selectedIds.size === 0) return
    setIsProcessing(true)
    try {
      const res = await fetch("/api/knowledge/pending-import-alerts", {
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
      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-import-alerts"))
    } catch (err: any) {
      alert(`Action failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedIds, reviewNotes])

  const handleManualFetch = useCallback(async () => {
    setIsFetching(true)
    try {
      const res = await fetch("/api/cron/fetch-import-alerts", { method: "POST" })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      globalMutate((key: string) => typeof key === "string" && key.startsWith("/api/knowledge/pending-import-alerts"))
      alert(`Fetch complete! Found: ${result.alerts_found ?? 0}, New: ${result.alerts_new ?? 0}, Updated: ${result.alerts_updated ?? 0}`)
    } catch (err: any) {
      alert(`Fetch failed: ${err.message}`)
    } finally {
      setIsFetching(false)
    }
  }, [])

  // ====== Tab config ======

  const statusTabs = [
    { key: "pending_review", label: "Pending Review", icon: Clock },
    { key: "approved",       label: "Approved",       icon: CheckCircle2 },
    { key: "rejected",       label: "Rejected",       icon: XCircle },
    { key: "failed",         label: "Failed",         icon: AlertTriangle },
    { key: "all",            label: "All",            icon: Ship },
  ]

  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            FDA Import Alerts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Border enforcement alerts (DWPE) fetched from FDA Import Alert system. Used as Layer 4 risk context in AI analysis — not for citations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLogs(!showLogs)}>
            <FileText className="h-4 w-4 mr-2" />
            {showLogs ? "Hide" : "Show"} Fetch Logs
          </Button>
          <Button onClick={handleManualFetch} disabled={isFetching} size="sm">
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isFetching ? "Fetching..." : "Fetch Now"}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
        <Ship className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          Import Alerts authorize FDA to detain shipments at US ports <strong>WITHOUT physical examination (DWPE)</strong>.
          Approve alerts here to activate them in the RAG pipeline. Approved alerts will be matched against product labels
          during AI analysis to flag potential border enforcement risks.
        </p>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statusTabs.map(tab => (
          <Card
            key={tab.key}
            className={`cursor-pointer transition-colors hover:border-foreground/30 ${
              activeStatus === tab.key ? "border-foreground bg-muted/50" : ""
            }`}
            onClick={() => { setActiveStatus(tab.key); setSelectedIds(new Set()) }}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <tab.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground leading-none">
                  {tab.key === "all" ? totalAll : statusCounts[tab.key] || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{tab.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Industry type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="drug">Drug</SelectItem>
            <SelectItem value="device">Device</SelectItem>
            <SelectItem value="cosmetic">Cosmetic</SelectItem>
            <SelectItem value="dietary-supplement">Dietary Supplement</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="DWPE">DWPE</SelectItem>
            <SelectItem value="Automatic Detention">Automatic Detention</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fetch Logs */}
      {showLogs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Fetch Logs</CardTitle>
            <CardDescription>History of automated and manual Import Alert fetch runs</CardDescription>
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
                    <TableHead>Updated</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{new Date(log.run_at).toLocaleString()}</TableCell>
                      <TableCell>{log.alerts_found}</TableCell>
                      <TableCell className="font-medium">{log.alerts_new}</TableCell>
                      <TableCell>{log.alerts_updated}</TableCell>
                      <TableCell>{log.alerts_failed}</TableCell>
                      <TableCell>{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "-"}</TableCell>
                      <TableCell>
                        {log.error ? <Badge variant="destructive">Error</Badge> : <Badge variant="secondary">OK</Badge>}
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
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
            <span className="text-sm font-medium">{selectedIds.size} alert{selectedIds.size > 1 ? "s" : ""} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <Textarea
                placeholder="Review notes (optional)..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                className="h-8 min-h-0 w-48 resize-none text-xs py-1"
              />
              {activeStatus === "pending_review" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction("reject")} disabled={isProcessing}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => handleBulkAction("approve")} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Approve
                  </Button>
                </>
              )}
              {activeStatus === "rejected" && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => handleBulkAction("re_approve")} disabled={isProcessing}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Re-approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")} disabled={isProcessing}>
                    <XCircle className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Ship className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No alerts with status &quot;{activeStatus}&quot;
              </p>
              <Button variant="outline" size="sm" onClick={handleManualFetch} disabled={isFetching}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Fetch from FDA
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === alerts.length && alerts.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </TableHead>
                  <TableHead className="w-28">Alert #</TableHead>
                  <TableHead>Title / Reason</TableHead>
                  <TableHead className="w-32">Industry</TableHead>
                  <TableHead className="w-28">Action</TableHead>
                  <TableHead className="w-24">Red List</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Effective</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map(alert => {
                  const activeEntities = (alert.red_list_entities || []).filter(e => e.is_active !== false)
                  return (
                    <TableRow key={alert.id} className={selectedIds.has(alert.id) ? "bg-muted/40" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(alert.id)}
                          onChange={() => handleToggleSelect(alert.id)}
                          className="rounded border-border"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-medium">{alert.alert_number}</span>
                          {alert.source_url && (
                            <a href={alert.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium leading-tight line-clamp-1">{alert.alert_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.reason_for_alert}</p>
                      </TableCell>
                      <TableCell><IndustryBadge type={alert.industry_type} /></TableCell>
                      <TableCell><ActionTypeBadge type={alert.action_type} /></TableCell>
                      <TableCell>
                        {activeEntities.length > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            {activeEntities.length} firm{activeEntities.length > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Category-wide</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={alert.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {alert.effective_date ? new Date(alert.effective_date).getFullYear() : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setPreviewAlert(alert)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Preview Dialog */}
      <Dialog open={!!previewAlert} onOpenChange={open => !open && setPreviewAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {previewAlert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Ship className="h-5 w-5 text-amber-600" />
                  Import Alert {previewAlert.alert_number}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {previewAlert.alert_title}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-2 mt-1">
                <IndustryBadge type={previewAlert.industry_type} />
                <ActionTypeBadge type={previewAlert.action_type} />
                <StatusBadge status={previewAlert.status} />
                {previewAlert.effective_date && (
                  <Badge variant="outline" className="text-xs">
                    Effective: {new Date(previewAlert.effective_date).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              <div className="space-y-4 mt-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reason for Alert</p>
                  <p className="text-sm">{previewAlert.reason_for_alert}</p>
                </div>

                {previewAlert.red_list_entities && previewAlert.red_list_entities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Red List Entities ({previewAlert.red_list_entities.length})
                    </p>
                    <div className="max-h-36 overflow-y-auto rounded border border-border divide-y divide-border text-sm">
                      {previewAlert.red_list_entities.map((e, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                          <span>{e.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {e.country && <span className="text-xs text-muted-foreground">{e.country}</span>}
                            <Badge
                              variant={e.is_active !== false ? "destructive" : "secondary"}
                              className="text-xs h-5"
                            >
                              {e.is_active !== false ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewAlert.review_notes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Review Notes</p>
                    <p className="text-sm text-muted-foreground">{previewAlert.review_notes}</p>
                  </div>
                )}

                {previewAlert.fetch_error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-xs font-medium text-destructive mb-1">Fetch Error</p>
                    <p className="text-xs text-destructive/80">{previewAlert.fetch_error}</p>
                  </div>
                )}

                {previewAlert.source_url && (
                  <a
                    href={previewAlert.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View on FDA.gov
                  </a>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                {previewAlert.status === "pending_review" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsProcessing(true)
                        try {
                          const res = await fetch("/api/knowledge/pending-import-alerts", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ids: [previewAlert.id], action: "reject" }),
                          })
                          if (!res.ok) throw new Error((await res.json()).error)
                          globalMutate((k: string) => k.startsWith("/api/knowledge/pending-import-alerts"))
                          setPreviewAlert(null)
                        } catch (e: any) { alert(e.message) }
                        finally { setIsProcessing(false) }
                      }}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setIsProcessing(true)
                        try {
                          const res = await fetch("/api/knowledge/pending-import-alerts", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ids: [previewAlert.id], action: "approve" }),
                          })
                          if (!res.ok) throw new Error((await res.json()).error)
                          globalMutate((k: string) => k.startsWith("/api/knowledge/pending-import-alerts"))
                          setPreviewAlert(null)
                        } catch (e: any) { alert(e.message) }
                        finally { setIsProcessing(false) }
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                  </>
                )}
                {previewAlert.status === "rejected" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      setIsProcessing(true)
                      try {
                        const res = await fetch("/api/knowledge/pending-import-alerts", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ids: [previewAlert.id], action: "re_approve" }),
                        })
                        if (!res.ok) throw new Error((await res.json()).error)
                        globalMutate((k: string) => k.startsWith("/api/knowledge/pending-import-alerts"))
                        setPreviewAlert(null)
                      } catch (e: any) { alert(e.message) }
                      finally { setIsProcessing(false) }
                    }}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Re-approve
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
