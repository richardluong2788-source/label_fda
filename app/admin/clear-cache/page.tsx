'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ClearVisionCachePage() {
  const [reportId, setReportId] = useState('')
  const [loading, setLoading] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReanalyze = async () => {
    if (!reportId.trim()) {
      setError('Vui lòng nhập Report ID')
      return
    }
    
    setError(null)
    setResult(null)
    setReanalyzing(true)

    try {
      // Delete vision cache for the report
      const deleteRes = await fetch('/api/admin/delete-vision-cache-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: reportId.trim() }),
      })
      
      const data = await deleteRes.json()
      
      if (!deleteRes.ok) {
        setError(data.error || 'Không thể xóa cache')
        return
      }
      
      setResult({ 
        success: true, 
        message: data.message || 'Cache vision đã được xóa. Upload lại ảnh để phân tích mới.',
        reportId: reportId.trim(),
        cachedImagesDeleted: data.cachedImagesDeleted
      })
      setReportId('')
    } catch (err) {
      setError(String(err))
    } finally {
      setReanalyzing(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Xóa Vision Cache</h1>
        <p className="text-muted-foreground mb-6">
          Nhập Report ID để xóa cache phân tích vision và phân tích lại với logic mới
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Report ID</label>
            <Input
              placeholder="VD: a23b042d-3e2c-449d-a7a0-e1b9470a9f39"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              disabled={loading || reanalyzing}
            />
          </div>

          <Button 
            onClick={handleReanalyze} 
            disabled={reanalyzing || !reportId.trim()} 
            className="w-full"
            variant="default"
          >
            {reanalyzing ? 'Đang xóa cache...' : 'Xóa Vision Cache'}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Cache vision sẽ bị xóa. Upload lại ảnh sản phẩm để phân tích mới với logic multi-column.
          </p>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive">
              Lỗi: {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700 space-y-2">
              <p className="font-medium">Thành công!</p>
              <p className="text-sm">{result.message}</p>
              {result.reportId && <p className="text-xs">Report ID: {result.reportId}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
