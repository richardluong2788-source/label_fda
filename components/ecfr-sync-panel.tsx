'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
} from 'lucide-react'
// Human-readable labels — inlined to avoid circular/missing export during build
const CFR_PART_LABELS: Record<string, string> = {
  '1':   'Registration / Prior Notice / FSVP',
  '7':   'Recalls & Enforcement',
  '11':  'Electronic Records & Signatures',
  '101': 'Food Labeling',
  '102': 'Common or Usual Name',
  '104': 'Nutritional Quality Guidelines',
  '105': 'Foods for Special Dietary Use',
  '110': 'Current GMP — Food',
  '111': 'Dietary Supplement GMP',
  '112': 'Produce Safety',
  '114': 'Acidified Foods',
  '117': 'FSMA Preventive Controls',
  '123': 'Seafood HACCP',
  '131': 'Milk & Cream Standards',
  '145': 'Canned Fruits Standards',
  '146': 'Fruit Juice Standards',
  '161': 'Fish & Shellfish Standards',
  '170': 'Food Additives — General',
  '172': 'Food Additives — Direct',
  '182': 'GRAS Substances',
  '184': 'GRAS Affirmed — Direct',
  '190': 'Dietary Supplement Labeling',
  '201': 'Drug Labeling',
  '700': 'Cosmetics — General',
  '701': 'Cosmetics Labeling',
  '710': 'Cosmetics Registration',
  '720': 'Voluntary Cosmetics Reporting',
  '740': 'Cosmetic Warning Statements',
  '801': 'Medical Device Labeling',
  '807': 'Device Establishment Registration',
  '820': 'Quality System Regulation',
}

// All Parts Vexim needs — mirrors fetch-ecfr-to-json.mjs --all
const ALL_VEXIM_PARTS = [
  '1','7','101','102','111','112','117','123',
  '131','145','146','161','170','172','182','184',
  '700','701','710','720','740',
  '801','807','820',
]

type SyncMode = 'skip_existing' | 'replace_all'

interface PartStatus {
  part: string
  state: 'idle' | 'running' | 'done' | 'skipped' | 'error' | 'empty'
  message: string
  chunks?: number
  lastAmendedDate?: string
}

interface Props {
  onComplete?: () => void
}

export function EcfrSyncPanel({ onComplete }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_VEXIM_PARTS))
  const [mode, setMode] = useState<SyncMode>('skip_existing')
  const [running, setRunning] = useState(false)
  const [partStatuses, setPartStatuses] = useState<Record<string, PartStatus>>({})
  const [log, setLog] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  const togglePart = (part: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(part) ? next.delete(part) : next.add(part)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(prev =>
      prev.size === ALL_VEXIM_PARTS.length ? new Set() : new Set(ALL_VEXIM_PARTS)
    )
  }

  const appendLog = (msg: string) => {
    setLog(prev => [...prev.slice(-200), msg])
    setTimeout(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  const updatePart = (part: string, update: Partial<PartStatus>) => {
    setPartStatuses(prev => ({
      ...prev,
      [part]: { part, state: 'idle', message: '', ...prev[part], ...update },
    }))
  }

  const handleSync = async () => {
    if (!selected.size) return
    setRunning(true)
    setLog([])
    // Reset statuses for selected parts
    const reset: Record<string, PartStatus> = {}
    for (const part of selected) {
      reset[part] = { part, state: 'idle', message: 'Cho...' }
    }
    setPartStatuses(prev => ({ ...prev, ...reset }))

    try {
      const res = await fetch('/api/knowledge/sync-ecfr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: Array.from(selected), mode }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            const { type, part, message, chunks, lastAmendedDate, results } = event

            switch (type) {
              case 'start':
                updatePart(part, { state: 'running', message })
                appendLog(`[${part}] ${message}`)
                break
              case 'info':
              case 'progress':
                updatePart(part, { state: 'running', message: message ?? `${event.inserted}/${event.total} chunks...` })
                if (message) appendLog(`[${part}] ${message}`)
                break
              case 'done':
                updatePart(part, { state: 'done', message, chunks, lastAmendedDate })
                appendLog(`[${part}] ${message}`)
                break
              case 'skip':
                updatePart(part, { state: 'skipped', message })
                appendLog(`[${part}] ${message}`)
                break
              case 'empty':
                updatePart(part, { state: 'empty', message })
                appendLog(`[${part}] ${message}`)
                break
              case 'error':
                updatePart(part, { state: 'error', message })
                appendLog(`[${part}] LOI: ${message}`)
                break
              case 'warn':
                appendLog(`[${part}] CANH BAO: ${message}`)
                break
              case 'summary':
                appendLog('=== HOAN TAT ===')
                if (results) {
                  const success = results.filter((r: any) => r.status === 'success').length
                  const skipped = results.filter((r: any) => r.status === 'skipped').length
                  const errors  = results.filter((r: any) => r.status === 'error').length
                  appendLog(`Thanh cong: ${success} | Bo qua: ${skipped} | Loi: ${errors}`)
                }
                onComplete?.()
                break
            }
          } catch {
            // ignore malformed JSON line
          }
        }
      }
    } catch (err: any) {
      appendLog(`LOI: ${err.message}`)
    }

    setRunning(false)
  }

  const doneCount   = Object.values(partStatuses).filter(p => p.state === 'done').length
  const errorCount  = Object.values(partStatuses).filter(p => p.state === 'error').length
  const skipCount   = Object.values(partStatuses).filter(p => p.state === 'skipped').length

  return (
    <Card className="mb-6">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base">Tu dong dong bo tu eCFR.gov</p>
            <p className="text-sm text-muted-foreground">
              Fetch truc tiep tu eCFR API — khong can may local, khong can script thu cong
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {running && <Badge variant="outline" className="animate-pulse">Dang dong bo...</Badge>}
          {!running && doneCount > 0 && <Badge variant="default">{doneCount} da import</Badge>}
          {!running && errorCount > 0 && <Badge variant="destructive">{errorCount} loi</Badge>}
          {!running && skipCount > 0 && <Badge variant="outline">{skipCount} bo qua</Badge>}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t pt-4 space-y-4">
          {/* Mode selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium shrink-0">Che do:</span>
            <div className="flex rounded-lg border overflow-hidden">
              {[
                { value: 'skip_existing', label: 'Bo qua neu da co' },
                { value: 'replace_all',   label: 'Xoa va import lai' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    mode === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setMode(opt.value as SyncMode)}
                  disabled={running}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {mode === 'replace_all' && (
              <Badge variant="destructive" className="text-xs">Se xoa du lieu cu truoc khi import</Badge>
            )}
          </div>

          {/* Part selector grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Chon Parts can import ({selected.size}/{ALL_VEXIM_PARTS.length}):</span>
              <Button variant="ghost" size="sm" onClick={toggleAll} disabled={running}>
                {selected.size === ALL_VEXIM_PARTS.length ? 'Bo chon tat ca' : 'Chon tat ca'}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ALL_VEXIM_PARTS.map(part => {
                const status = partStatuses[part]
                const isSelected = selected.has(part)
                const label = CFR_PART_LABELS[part] ?? `Part ${part}`

                return (
                  <button
                    key={part}
                    onClick={() => !running && togglePart(part)}
                    disabled={running}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      !status || status.state === 'idle'
                        ? isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background opacity-50'
                        : status.state === 'running'
                          ? 'border-blue-400 bg-blue-50'
                          : status.state === 'done'
                            ? 'border-green-400 bg-green-50'
                            : status.state === 'skipped'
                              ? 'border-border bg-muted/40'
                              : status.state === 'error'
                                ? 'border-destructive/50 bg-destructive/5'
                                : 'border-border bg-muted/20'
                    }`}
                  >
                    {/* Status icon */}
                    <div className="shrink-0">
                      {status?.state === 'running' && (
                        <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                      )}
                      {status?.state === 'done' && (
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      )}
                      {status?.state === 'skipped' && (
                        <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {status?.state === 'error' && (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      {status?.state === 'empty' && (
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                      )}
                      {(!status || status.state === 'idle') && (
                        <div className={`h-3.5 w-3.5 rounded-full border-2 ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`} />
                      )}
                    </div>

                    {/* Part info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold leading-none mb-0.5">Part {part}</div>
                      <div className="text-xs text-muted-foreground truncate leading-tight">{label}</div>
                      {status?.state === 'done' && status.chunks !== undefined && (
                        <div className="text-xs text-green-700 mt-0.5">{status.chunks} chunks</div>
                      )}
                      {status?.state === 'running' && (
                        <div className="text-xs text-blue-600 mt-0.5 truncate">{status.message}</div>
                      )}
                      {status?.state === 'error' && (
                        <div className="text-xs text-destructive mt-0.5 truncate">{status.message}</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleSync}
              disabled={running || !selected.size}
              className="gap-2"
            >
              {running ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {running
                ? 'Dang dong bo...'
                : `Bat dau dong bo ${selected.size} Part${selected.size !== 1 ? 's' : ''}`}
            </Button>
            <p className="text-xs text-muted-foreground">
              Du lieu duoc lay tu <code className="font-mono">ecfr.gov</code> — khong can script, khong can upload thu cong.
            </p>
          </div>

          {/* Live log */}
          {log.length > 0 && (
            <div
              ref={logRef}
              className="h-40 overflow-y-auto rounded-lg bg-black/90 p-3 font-mono text-xs text-green-400 space-y-0.5"
            >
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
