'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileJson, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // Check if JSON
      if (!selectedFile.name.endsWith('.json')) {
        setError('Vui lòng chọn file JSON')
        return
      }
      
      // Check file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File quá lớn. Tối đa 50MB')
        return
      }
      
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)
    setResult(null)

    try {
      console.log('[v0] Step 1: Reading JSON file...')
      setProgress(5)

      // Step 1: Read and parse JSON file
      const text = await file.text()
      const jsonData = JSON.parse(text)
      
      console.log('[v0] JSON data keys:', Object.keys(jsonData))
      
      // Support multiple JSON structures (matches API logic)
      let sections = []
      if (jsonData.sections && Array.isArray(jsonData.sections)) {
        sections = jsonData.sections
      } else if (Array.isArray(jsonData)) {
        sections = jsonData
      } else if (jsonData.regulations && Array.isArray(jsonData.regulations)) {
        sections = jsonData.regulations
      } else if (jsonData.cfr && Array.isArray(jsonData.cfr)) {
        sections = jsonData.cfr
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        sections = jsonData.data
      } else {
        // Single object, wrap in array
        sections = [jsonData]
      }
      
      if (sections.length === 0) {
        throw new Error('Không tìm thấy dữ liệu trong file JSON. Vui lòng kiểm tra cấu trúc file.')
      }

      const totalSections = sections.length
      console.log('[v0] Found', totalSections, 'sections in file')
      setProgress(10)

      // Step 2: Process in small batches to avoid timeout
      const BATCH_SIZE = 100 // Process 100 sections at a time
      const totalBatches = Math.ceil(totalSections / BATCH_SIZE)
      
      let totalInserted = 0
      let totalSkipped = 0
      let totalChunks = 0

      console.log('[v0] Will process in', totalBatches, 'batches of', BATCH_SIZE, 'sections')

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, totalSections)
        const batchSections = sections.slice(start, end)

        console.log(`[v0] Processing batch ${batchIndex + 1}/${totalBatches} (sections ${start + 1}-${end})`)

        // Send batch to API
        const response = await fetch('/api/knowledge/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sections: batchSections,
            batchInfo: {
              current: batchIndex + 1,
              total: totalBatches,
              sectionsRange: `${start + 1}-${end}`,
            }
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Batch ${batchIndex + 1} failed`)
        }

        const data = await response.json()
        
        totalInserted += data.stats?.records_inserted || 0
        totalSkipped += data.stats?.sections_skipped || 0
        totalChunks += data.stats?.chunks_created || 0

        // Update progress
        const progressPercent = 10 + ((batchIndex + 1) / totalBatches) * 90
        setProgress(Math.round(progressPercent))

        console.log(`[v0] Batch ${batchIndex + 1} complete:`, {
          inserted: data.stats?.records_inserted,
          skipped: data.stats?.sections_skipped,
          chunks: data.stats?.chunks_created,
        })

        // Small delay between batches
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setProgress(100)
      setResult({
        success: true,
        stats: {
          sections_processed: totalSections,
          records_inserted: totalInserted,
          sections_skipped: totalSkipped,
          chunks_created: totalChunks,
        }
      })
      console.log('[v0] All batches complete!')

    } catch (err: any) {
      console.error('[v0] Upload error:', err)
      setError(err.message || 'Lỗi khi upload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bulk Import 21 CFR Regulations</h1>
        <p className="text-muted-foreground">
          Upload file JSON chứa quy định FDA để thêm vào Knowledge Base
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Yêu cầu file JSON</CardTitle>
          <CardDescription>
            File JSON cần có cấu trúc phù hợp với 21 CFR Part 101
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-2">Cấu trúc JSON mong đợi:</p>
              <pre className="text-sm overflow-x-auto">
{`{
  "sections": [
    {
      "id": "101.9",
      "title": "Nutrition labeling of food",
      "content": "Full regulation text...",
      "subsections": [
        {
          "id": "101.9(a)",
          "title": "General requirements",
          "content": "..."
        }
      ]
    }
  ]
}`}
              </pre>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hệ thống sẽ tự động:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Chunk content thành các đoạn nhỏ (600 ký tự - TỐI ƯU)</strong></li>
                  <li>Generate embeddings cho mỗi chunk với text-embedding-3-small</li>
                  <li>Insert vào compliance_knowledge table</li>
                  <li>Link với metadata (regulation_id, section, source)</li>
                  <li><strong>Kết quả: Similarity Score 80-99% (Hybrid Search)</strong></li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                {file ? (
                  <>
                    <FileJson className="h-12 w-12 text-green-600" />
                    <p className="font-semibold">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <p className="font-semibold">Chọn file JSON</p>
                    <p className="text-sm text-muted-foreground">
                      Hoặc kéo thả file vào đây
                    </p>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Upload Button */}
          {file && !result && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Bắt đầu Import
                </>
              )}
            </Button>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                {progress < 20 && 'Đang đọc file...'}
                {progress >= 20 && progress < 50 && 'Đang parse JSON...'}
                {progress >= 50 && progress < 100 && 'Đang generate embeddings và insert vào database...'}
                {progress === 100 && 'Hoàn tất!'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {result && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900 mb-2">
                  Import thành công!
                </p>
                <div className="space-y-1 text-sm text-green-800">
                  <p>Sections xử lý: {result.stats?.sections_processed}</p>
                  <p>Chunks tạo: {result.stats?.chunks_created}</p>
                  <p>Records insert: {result.stats?.records_inserted}</p>
                  {result.stats?.sections_skipped > 0 && (
                    <p className="text-amber-600">
                      Sections bỏ qua: {result.stats.sections_skipped}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Reset Button */}
          {result && (
            <Button
              onClick={() => {
                setFile(null)
                setResult(null)
                setError(null)
                setProgress(0)
              }}
              variant="outline"
              className="w-full"
            >
              Import file khác
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hướng dẫn sử dụng</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Chuẩn bị file JSON chứa 21 CFR Part 101 regulations</li>
            <li>Đảm bảo file có cấu trúc đúng (xem ví dụ bên trên)</li>
            <li>Click "Chọn file JSON" hoặc kéo thả file vào ô upload</li>
            <li>Click "Bắt đầu Import" và đợi xử lý (có thể mất 5-15 phút tùy kích thước file)</li>
            <li>Sau khi hoàn tất, kiểm tra Knowledge Base trong Admin panel</li>
          </ol>

          <Alert className="mt-4">
            <AlertDescription>
              <strong>Lưu ý:</strong> Quá trình import sẽ gọi OpenAI API nhiều lần để generate embeddings.
              Chi phí ước tính: $0.50-2.00 cho toàn bộ 21 CFR Part 101 (tùy kích thước file).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
