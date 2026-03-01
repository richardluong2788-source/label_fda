'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
  FileText,
  AlertTriangle,
  Minus,
  Plus,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Word-level diff algorithm (Myers-like, optimized for regulatory text)
// ─────────────────────────────────────────────────────────────────────────────

interface DiffToken {
  type: 'equal' | 'added' | 'removed'
  value: string
}

/**
 * Compute a word-level diff between two strings.
 * Uses a longest common subsequence approach on word arrays.
 */
function computeWordDiff(oldText: string, newText: string): DiffToken[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  // LCS table (optimized for memory with only 2 rows)
  const m = oldWords.length
  const n = newWords.length

  // For very large texts, fall back to line-level diff
  if (m * n > 2_000_000) {
    return computeLineDiff(oldText, newText)
  }

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to build diff
  const result: DiffToken[] = []
  let i = m, j = n

  const tempResult: DiffToken[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      tempResult.push({ type: 'equal', value: oldWords[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempResult.push({ type: 'added', value: newWords[j - 1] })
      j--
    } else {
      tempResult.push({ type: 'removed', value: oldWords[i - 1] })
      i--
    }
  }

  // Reverse to get correct order
  for (let k = tempResult.length - 1; k >= 0; k--) {
    result.push(tempResult[k])
  }

  // Merge consecutive tokens of same type
  return mergeTokens(result)
}

function computeLineDiff(oldText: string, newText: string): DiffToken[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  const result: DiffToken[] = []

  // Simple line-by-line comparison
  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      result.push({ type: 'equal', value: (oldLine || '') + '\n' })
    } else {
      if (oldLine !== undefined && !newSet.has(oldLine)) {
        result.push({ type: 'removed', value: oldLine + '\n' })
      }
      if (newLine !== undefined && !oldSet.has(newLine)) {
        result.push({ type: 'added', value: newLine + '\n' })
      }
    }
  }

  return mergeTokens(result)
}

function mergeTokens(tokens: DiffToken[]): DiffToken[] {
  if (tokens.length === 0) return tokens
  const merged: DiffToken[] = [tokens[0]]
  for (let i = 1; i < tokens.length; i++) {
    const prev = merged[merged.length - 1]
    if (prev.type === tokens[i].type) {
      prev.value += tokens[i].value
    } else {
      merged.push({ ...tokens[i] })
    }
  }
  return merged
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface DiffSection {
  id: string
  title: string
  content: string
}

interface CfrDiffViewerProps {
  open: boolean
  onClose: () => void
  partNumber: string
}

export function CfrDiffViewer({ open, onClose, partNumber }: CfrDiffViewerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbSections, setDbSections] = useState<DiffSection[]>([])
  const [ecfrSections, setEcfrSections] = useState<DiffSection[]>([])
  const [dbDate, setDbDate] = useState<string | null>(null)
  const [ecfrDate, setEcfrDate] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'changes' | 'all'>('changes')

  useEffect(() => {
    if (open && partNumber) {
      fetchDiffData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partNumber])

  const fetchDiffData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/knowledge/diff?part=${partNumber}`)
      const data = await res.json()
      if (data.error && !data.dbSections) {
        setError(data.error)
      } else {
        setDbSections(data.dbSections || [])
        setEcfrSections(data.ecfrSections || [])
        setDbDate(data.dbDate || null)
        setEcfrDate(data.ecfrDate || null)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  // Build a unified section list for comparison
  const sectionPairs = useMemo(() => {
    const dbMap = new Map(dbSections.map(s => [s.id, s]))
    const ecfrMap = new Map(ecfrSections.map(s => [s.id, s]))

    const allIds = new Set([
      ...dbSections.map(s => s.id),
      ...ecfrSections.map(s => s.id),
    ])

    const pairs = [...allIds]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map(id => {
        const db = dbMap.get(id)
        const ecfr = ecfrMap.get(id)

        let status: 'unchanged' | 'modified' | 'added' | 'removed'
        if (!db && ecfr) {
          status = 'added'
        } else if (db && !ecfr) {
          status = 'removed'
        } else if (db && ecfr) {
          // Normalize whitespace for comparison
          const dbNorm = db.content.replace(/\s+/g, ' ').trim()
          const ecfrNorm = ecfr.content.replace(/\s+/g, ' ').trim()
          status = dbNorm === ecfrNorm ? 'unchanged' : 'modified'
        } else {
          status = 'unchanged'
        }

        return {
          id,
          title: ecfr?.title || db?.title || id,
          dbContent: db?.content || '',
          ecfrContent: ecfr?.content || '',
          status,
        }
      })

    return pairs
  }, [dbSections, ecfrSections])

  const changedPairs = useMemo(
    () => sectionPairs.filter(p => p.status !== 'unchanged'),
    [sectionPairs]
  )

  const displayPairs = viewMode === 'changes' ? changedPairs : sectionPairs

  const stats = useMemo(() => ({
    total: sectionPairs.length,
    modified: sectionPairs.filter(p => p.status === 'modified').length,
    added: sectionPairs.filter(p => p.status === 'added').length,
    removed: sectionPairs.filter(p => p.status === 'removed').length,
    unchanged: sectionPairs.filter(p => p.status === 'unchanged').length,
  }), [sectionPairs])

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedSections(new Set(displayPairs.map(p => p.id)))
  }, [displayPairs])

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set())
  }, [])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                So sanh thay doi - 21 CFR Part {partNumber}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>DB: {dbDate || 'khong ro'}</span>
                <ArrowLeftRight className="h-3 w-3" />
                <span>eCFR: {ecfrDate || 'khong ro'}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!loading && !error && (
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                {stats.total} sections
              </Badge>
              {stats.modified > 0 && (
                <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                  {stats.modified} sua doi
                </Badge>
              )}
              {stats.added > 0 && (
                <Badge className="gap-1 bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                  <Plus className="h-3 w-3" />
                  {stats.added} moi
                </Badge>
              )}
              {stats.removed > 0 && (
                <Badge className="gap-1 bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
                  <Minus className="h-3 w-3" />
                  {stats.removed} xoa
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                {stats.unchanged} khong doi
              </Badge>

              <div className="ml-auto flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'changes' | 'all')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="changes" className="text-xs h-7 px-3">
                      Chi thay doi ({changedPairs.length})
                    </TabsTrigger>
                    <TabsTrigger value="all" className="text-xs h-7 px-3">
                      Tat ca ({sectionPairs.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline" size="sm" onClick={expandAll} className="h-7 text-xs">
                  Mo tat ca
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} className="h-7 text-xs">
                  Thu tat ca
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Dang tai du lieu tu eCFR va so sanh voi DB...
              </p>
              <p className="text-xs text-muted-foreground">
                Co the mat 10-30 giay tuy do lon cua Part
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchDiffData}>
                Thu lai
              </Button>
            </div>
          )}

          {!loading && !error && displayPairs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {viewMode === 'changes'
                  ? 'Khong co thay doi nao giua DB va eCFR!'
                  : 'Khong tim thay section nao.'}
              </p>
            </div>
          )}

          {!loading && !error && displayPairs.length > 0 && (
            <div className="space-y-2">
              {displayPairs.map((pair) => (
                <SectionDiffCard
                  key={pair.id}
                  pair={pair}
                  isExpanded={expandedSections.has(pair.id)}
                  onToggle={() => toggleSection(pair.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Diff Card
// ─────────────────────────────────────────────────────────────────────────────

interface SectionDiffPair {
  id: string
  title: string
  dbContent: string
  ecfrContent: string
  status: 'unchanged' | 'modified' | 'added' | 'removed'
}

function SectionDiffCard({
  pair,
  isExpanded,
  onToggle,
}: {
  pair: SectionDiffPair
  isExpanded: boolean
  onToggle: () => void
}) {
  const statusConfig = {
    unchanged: { label: 'Khong doi', bg: 'bg-muted/30', border: 'border-border', badge: 'bg-muted text-muted-foreground' },
    modified: { label: 'Sua doi', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
    added: { label: 'Moi them', bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
    removed: { label: 'Da xoa', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
  }

  const config = statusConfig[pair.status]

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/5 transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-sm font-medium">{pair.id}</span>
        <span className="text-sm text-muted-foreground truncate flex-1">
          {pair.title.replace(/^§\s*\d+\.\d+[a-z]?\s*/, '')}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.label}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border/50 bg-background">
          {pair.status === 'added' && (
            <div className="p-4">
              <div className="text-xs font-medium text-green-700 mb-2 uppercase tracking-wide">
                Noi dung moi tren eCFR (chua co trong DB)
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-green-50 p-3 rounded border border-green-200 max-h-96 overflow-auto leading-relaxed">
                {pair.ecfrContent.slice(0, 5000)}
                {pair.ecfrContent.length > 5000 && '\n\n... (truncated)'}
              </pre>
            </div>
          )}

          {pair.status === 'removed' && (
            <div className="p-4">
              <div className="text-xs font-medium text-red-700 mb-2 uppercase tracking-wide">
                Noi dung trong DB (da bi xoa tren eCFR)
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-red-50 p-3 rounded border border-red-200 max-h-96 overflow-auto leading-relaxed">
                {pair.dbContent.slice(0, 5000)}
                {pair.dbContent.length > 5000 && '\n\n... (truncated)'}
              </pre>
            </div>
          )}

          {pair.status === 'modified' && (
            <DiffInlineView oldText={pair.dbContent} newText={pair.ecfrContent} />
          )}

          {pair.status === 'unchanged' && (
            <div className="p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground max-h-48 overflow-auto leading-relaxed">
                {pair.dbContent.slice(0, 2000)}
                {pair.dbContent.length > 2000 && '\n\n... (truncated)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Diff View (side-by-side with highlighted words)
// ─────────────────────────────────────────────────────────────────────────────

function DiffInlineView({ oldText, newText }: { oldText: string; newText: string }) {
  const [mode, setMode] = useState<'sidebyside' | 'inline'>('sidebyside')

  // Truncate very long texts for performance
  const maxChars = 8000
  const truncOld = oldText.length > maxChars ? oldText.slice(0, maxChars) + '\n\n... (truncated)' : oldText
  const truncNew = newText.length > maxChars ? newText.slice(0, maxChars) + '\n\n... (truncated)' : newText

  const diff = useMemo(() => computeWordDiff(truncOld, truncNew), [truncOld, truncNew])

  const changeCount = diff.filter(t => t.type !== 'equal').length

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-muted-foreground">
          {changeCount} doan thay doi
        </span>
        <div className="ml-auto flex">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'sidebyside' | 'inline')}>
            <TabsList className="h-7">
              <TabsTrigger value="sidebyside" className="text-xs h-6 px-2">
                Song song
              </TabsTrigger>
              <TabsTrigger value="inline" className="text-xs h-6 px-2">
                Noi dong
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {mode === 'sidebyside' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-red-700 mb-1 uppercase tracking-wide">
              Trong DB (cu)
            </div>
            <div className="text-xs font-mono whitespace-pre-wrap bg-red-50/50 p-3 rounded border border-red-200/50 max-h-96 overflow-auto leading-relaxed">
              {diff.map((token, i) => {
                if (token.type === 'added') return null
                if (token.type === 'removed') {
                  return (
                    <span key={i} className="bg-red-200 text-red-900 px-0.5 rounded-sm">
                      {token.value}
                    </span>
                  )
                }
                return <span key={i}>{token.value}</span>
              })}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-green-700 mb-1 uppercase tracking-wide">
              Tren eCFR (moi)
            </div>
            <div className="text-xs font-mono whitespace-pre-wrap bg-green-50/50 p-3 rounded border border-green-200/50 max-h-96 overflow-auto leading-relaxed">
              {diff.map((token, i) => {
                if (token.type === 'removed') return null
                if (token.type === 'added') {
                  return (
                    <span key={i} className="bg-green-200 text-green-900 px-0.5 rounded-sm">
                      {token.value}
                    </span>
                  )
                }
                return <span key={i}>{token.value}</span>
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-3 rounded border max-h-96 overflow-auto leading-relaxed">
          {diff.map((token, i) => {
            if (token.type === 'removed') {
              return (
                <span key={i} className="bg-red-200 text-red-900 line-through px-0.5 rounded-sm">
                  {token.value}
                </span>
              )
            }
            if (token.type === 'added') {
              return (
                <span key={i} className="bg-green-200 text-green-900 px-0.5 rounded-sm">
                  {token.value}
                </span>
              )
            }
            return <span key={i}>{token.value}</span>
          })}
        </div>
      )}
    </div>
  )
}
