'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Loader2, Play, Pause } from 'lucide-react'

interface Status {
  total: number
  withEmbedding: number
  withoutEmbedding: number
  progress: string
}

interface BatchResult {
  message: string
  processed: number
  success: number
  failed: number
  remaining: number
  errors?: string[]
  hint?: string
}

export default function ReEmbedPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const shouldStopRef = React.useRef(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/re-embed')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setStatus(data)
        setError(null)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const runBatch = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/re-embed?secret=sprint2-fix', {
        method: 'POST'
      })
      const data: BatchResult = await res.json()
      
      if (data.error) {
        setLogs(prev => [...prev, `ERROR: ${data.error}`])
        return false
      }

      setLogs(prev => [
        ...prev,
        `Batch: ${data.success}/${data.processed} success, ${data.remaining} remaining`
      ])

      await fetchStatus()

      return data.remaining > 0
    } catch (err: any) {
      setLogs(prev => [...prev, `ERROR: ${err.message}`])
      return false
    }
  }

  const startAutoRun = async () => {
    shouldStopRef.current = false
    setIsRunning(true)
    setLogs([`Starting auto re-embed at ${new Date().toLocaleTimeString()}`])

    let hasMore = true
    let batchCount = 0
    while (hasMore && !shouldStopRef.current) {
      hasMore = await runBatch()
      batchCount++
      setLogs(prev => [...prev, `Batch #${batchCount} done`])
      if (hasMore && !shouldStopRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setLogs(prev => [...prev, shouldStopRef.current ? 'Stopped by user' : `Completed at ${new Date().toLocaleTimeString()}`])
    setIsRunning(false)
  }

  const stopRun = () => {
    shouldStopRef.current = true
    setIsRunning(false)
    setLogs(prev => [...prev, 'Stopping after current batch...'])
  }

  const progressPercent = status 
    ? (status.withEmbedding / status.total) * 100 
    : 0

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Re-Embed Compliance Knowledge</CardTitle>
          <CardDescription>
            Fix embedding dimensions from 19,161 to 1,536 (text-embedding-3-small)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {status && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Progress: {status.withEmbedding} / {status.total}</span>
                <Badge variant={status.withoutEmbedding === 0 ? 'default' : 'secondary'}>
                  {status.progress}
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-3" />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">{status.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{status.withEmbedding}</div>
                  <div className="text-xs text-muted-foreground">Embedded</div>
                </div>
                <div className="p-3 bg-orange-50 rounded">
                  <div className="text-2xl font-bold text-orange-600">{status.withoutEmbedding}</div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isRunning ? (
              <Button onClick={startAutoRun} disabled={status?.withoutEmbedding === 0}>
                <Play className="h-4 w-4 mr-2" />
                Start Auto Re-Embed
              </Button>
            ) : (
              <Button onClick={stopRun} variant="destructive">
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            <Button onClick={fetchStatus} variant="outline" disabled={isRunning}>
              Refresh Status
            </Button>
          </div>

          {status?.withoutEmbedding === 0 && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
              <CheckCircle2 className="h-4 w-4" />
              All records have been re-embedded successfully!
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Logs</h4>
              <div className="bg-muted p-3 rounded max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={log.startsWith('ERROR') ? 'text-red-600' : ''}>
                    {log}
                  </div>
                ))}
                {isRunning && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing...
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
