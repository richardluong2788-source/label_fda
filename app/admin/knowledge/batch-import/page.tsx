'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileJson, CheckCircle, AlertCircle, Loader2, Play, Pause } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

interface BatchInfo {
  batchNumber: number
  totalBatches: number
  sectionsInBatch: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  recordsInserted?: number
  error?: string
}

export default function BatchImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [processing, setProcessing] = useState(false)
  const [paused, setPaused] = useState(false)
  const [currentBatch, setCurrentBatch] = useState(0)
  const [batchSize, setBatchSize] = useState(50)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/json') {
        setError('Vui lòng chọn file JSON')
        return
      }
      setFile(selectedFile)
      setError(null)
      setBatches([])
      setCurrentBatch(0)
      console.log('[v0] File selected:', selectedFile.name, (selectedFile.size / 1024 / 1024).toFixed(2), 'MB')
    }
  }

  const analyzeBatches = async () => {
    if (!file) return

    try {
      console.log('[v0] Analyzing file to calculate batches...')
      const fileContent = await file.text()
      const jsonData = JSON.parse(fileContent)

      // Parse sections from various JSON structures
      let sections: any[] = []
      
      if (Array.isArray(jsonData)) {
        sections = jsonData
      } else if (jsonData.sections) {
        sections = jsonData.sections
      } else if (jsonData.regulations) {
        sections = jsonData.regulations
      } else {
        sections = Object.entries(jsonData).map(([key, value]) => ({
          section: key,
          content: typeof value === 'string' ? value : JSON.stringify(value)
        }))
      }

      const totalSections = sections.length
      const totalBatches = Math.ceil(totalSections / batchSize)

      console.log('[v0] Total sections:', totalSections)
      console.log('[v0] Batch size:', batchSize)
      console.log('[v0] Total batches:', totalBatches)

      const batchInfos: BatchInfo[] = []
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const end = Math.min(start + batchSize, totalSections)
        batchInfos.push({
          batchNumber: i + 1,
          totalBatches: totalBatches,
          sectionsInBatch: end - start,
          status: 'pending'
        })
      }

      setBatches(batchInfos)
      console.log('[v0] Batches prepared:', batchInfos.length)

    } catch (err: any) {
      console.error('[v0] Analysis error:', err)
      setError(err.message || 'Lỗi khi phân tích file')
    }
  }

  const processBatch = async (batchNumber: number) => {
    if (!file) return

    try {
      console.log(`[v0] Processing batch ${batchNumber}/${batches.length}...`)

      // Update batch status to processing
      setBatches(prev => prev.map(b => 
        b.batchNumber === batchNumber 
          ? { ...b, status: 'processing' } 
          : b
      ))

      const fileContent = await file.text()
      const jsonData = JSON.parse(fileContent)

      // Parse sections
      let sections: any[] = []
      if (Array.isArray(jsonData)) {
        sections = jsonData
      } else if (jsonData.sections) {
        sections = jsonData.sections
      } else if (jsonData.regulations) {
        sections = jsonData.regulations
      } else {
        sections = Object.entries(jsonData).map(([key, value]) => ({
          section: key,
          content: typeof value === 'string' ? value : JSON.stringify(value)
        }))
      }

      // Extract batch
      const start = (batchNumber - 1) * batchSize
      const end = Math.min(start + batchSize, sections.length)
      const batchSections = sections.slice(start, end)

      console.log(`[v0] Batch ${batchNumber}: Processing ${batchSections.length} sections (${start} to ${end})`)

      // Send batch data directly to API (no storage upload needed)
      console.log(`[v0] Batch ${batchNumber}: Sending ${batchSections.length} sections to API`)

      const processResponse = await fetch('/api/knowledge/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: batchSections,
          isBatch: true,
          batchNumber: batchNumber,
          totalBatches: batches.length,
        }),
      })

      const data = await processResponse.json()

      if (!processResponse.ok) {
        throw new Error(data.error || 'Processing failed')
      }

      console.log(`[v0] Batch ${batchNumber} completed:`, data.stats?.records_inserted, 'records')

      // Update batch status to completed
      setBatches(prev => prev.map(b => 
        b.batchNumber === batchNumber 
          ? { ...b, status: 'completed', recordsInserted: data.stats?.records_inserted ?? data.recordsInserted ?? 0 } 
          : b
      ))

      return data

    } catch (err: any) {
      console.error(`[v0] Batch ${batchNumber} error:`, err)
      
      setBatches(prev => prev.map(b => 
        b.batchNumber === batchNumber 
          ? { ...b, status: 'error', error: err.message } 
          : b
      ))

      throw err
    }
  }

  const startProcessing = async () => {
    setProcessing(true)
    setPaused(false)
    setError(null)

    try {
      for (let i = currentBatch; i < batches.length; i++) {
        if (paused) {
          console.log('[v0] Processing paused at batch', i + 1)
          setCurrentBatch(i)
          break
        }

        setCurrentBatch(i)
        await processBatch(i + 1)

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      if (!paused) {
        console.log('[v0] All batches completed!')
        setCurrentBatch(batches.length)
      }

    } catch (err: any) {
      console.error('[v0] Processing stopped with error:', err)
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const pauseProcessing = () => {
    setPaused(true)
    console.log('[v0] Pause requested')
  }

  const resumeProcessing = () => {
    setPaused(false)
    startProcessing()
  }

  const completedBatches = batches.filter(b => b.status === 'completed').length
  const totalRecords = batches.reduce((sum, b) => sum + (b.recordsInserted || 0), 0)
  const overallProgress = batches.length > 0 ? (completedBatches / batches.length) * 100 : 0

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Batch Import - 21 CFR Part 101</CardTitle>
          <CardDescription>
            Upload file JSON lớn và xử lý từng batch để tránh timeout (60s/batch)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block mb-2 text-sm font-medium">Chọn file JSON</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4" />
                <span>Chọn file</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {file && (
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="secondary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Batch Size Config */}
          {file && batches.length === 0 && (
            <div>
              <label className="block mb-2 text-sm font-medium">Batch Size (sections per batch)</label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                min={10}
                max={100}
                step={10}
                className="w-32 px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Khuyến nghị: 50 sections/batch (an toan, tranh timeout). Toi da 100.
              </p>
              <Button onClick={analyzeBatches} className="mt-4">
                Phân tích file
              </Button>
            </div>
          )}

          {/* Batches Overview */}
          {batches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tổng quan</p>
                  <p className="text-xs text-muted-foreground">
                    {batches.length} batches • {totalRecords} records đã import
                  </p>
                </div>
                <div className="flex gap-2">
                  {!processing && completedBatches < batches.length && (
                    <Button onClick={startProcessing}>
                      <Play className="mr-2 h-4 w-4" />
                      {completedBatches > 0 ? 'Tiếp tục' : 'Bắt đầu'}
                    </Button>
                  )}
                  {processing && !paused && (
                    <Button onClick={pauseProcessing} variant="outline">
                      <Pause className="mr-2 h-4 w-4" />
                      Tạm dừng
                    </Button>
                  )}
                  {processing && paused && (
                    <Button onClick={resumeProcessing}>
                      <Play className="mr-2 h-4 w-4" />
                      Tiếp tục
                    </Button>
                  )}
                </div>
              </div>

              <Progress value={overallProgress} className="h-2" />

              {/* Batch List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {batches.map((batch) => (
                  <div
                    key={batch.batchNumber}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      batch.status === 'processing' ? 'border-blue-500 bg-blue-50' :
                      batch.status === 'completed' ? 'border-green-500 bg-green-50' :
                      batch.status === 'error' ? 'border-red-500 bg-red-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {batch.status === 'pending' && <FileJson className="h-5 w-5 text-gray-400" />}
                      {batch.status === 'processing' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                      {batch.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {batch.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                      
                      <div>
                        <p className="text-sm font-medium">
                          Batch {batch.batchNumber}/{batch.totalBatches}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {batch.sectionsInBatch} sections
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {batch.status === 'completed' && (
                        <Badge variant="default">{batch.recordsInserted} records</Badge>
                      )}
                      {batch.status === 'error' && (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Completion Message */}
          {completedBatches === batches.length && batches.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Hoàn tất! Đã import {totalRecords} records vào Knowledge Base.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
